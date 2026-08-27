use std::io::Write;
use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};

/// Metadata preview for a queued map, regardless of source/target format:
/// every format shares the same handful of concepts (title, mappers,
/// difficulty, notes...), so one shape covers all of them.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MapPreview {
    path: String,
    title: String,
    song_name: String,
    mappers: Vec<String>,
    duration_ms: i64,
    note_count: usize,
    quantum_note_count: usize,
    difficulty: i32,
    custom_difficulty_name: String,
    star_rating: f32,
    has_audio: bool,
    has_cover: bool,
    cover_data_url: Option<String>,
    timing_points_count: usize,
    /// Exact byte size of the file this conversion will produce (computed
    /// by actually running the conversion in memory, not estimated).
    output_bytes: usize,
    /// Non-blocking sanity-check messages -- informational, conversion
    /// proceeds anyway.
    warnings: Vec<String>,
    /// Note count per time bucket across the track, normalized to 0..=1
    /// against the densest bucket. Fixed-size so the UI can draw a
    /// sparkline without needing the full note list.
    note_density: Vec<f32>,
}

const DENSITY_BUCKETS: usize = 48;

fn note_density_histogram(times_ms: &[i64], duration_ms: i64) -> Vec<f32> {
    let mut counts = [0u32; DENSITY_BUCKETS];
    let span = if duration_ms > 0 {
        duration_ms
    } else {
        times_ms.iter().copied().max().unwrap_or(0).max(1)
    };
    for &time in times_ms {
        let ratio = (time.max(0) as f64 / span as f64).clamp(0.0, 0.999_999);
        let bucket = (ratio * DENSITY_BUCKETS as f64) as usize;
        counts[bucket.min(DENSITY_BUCKETS - 1)] += 1;
    }
    let peak = counts.iter().copied().max().unwrap_or(0).max(1) as f32;
    counts.iter().map(|c| *c as f32 / peak).collect()
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ConversionOutcome {
    input_path: String,
    output_path: String,
    title: String,
    note_count: usize,
    quantum_note_count: usize,
    duration_ms: i64,
    has_audio: bool,
    has_cover: bool,
    preserved_timing_points: usize,
    output_bytes: usize,
}

fn cover_mime(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        "image/png"
    } else if bytes.starts_with(b"\xff\xd8\xff") {
        "image/jpeg"
    } else if bytes.starts_with(b"GIF8") {
        "image/gif"
    } else {
        "application/octet-stream"
    }
}

fn cover_data_url(cover: &[u8]) -> Option<String> {
    (!cover.is_empty())
        .then(|| format!("data:{};base64,{}", cover_mime(cover), BASE64.encode(cover)))
}

use rhmsspm_core::MapFormat;

fn is_convertible_path(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .and_then(MapFormat::from_ext)
        .is_some()
}

fn source_format(path: &Path) -> MapFormat {
    path.extension()
        .and_then(|e| e.to_str())
        .and_then(MapFormat::from_ext)
        .unwrap_or(MapFormat::Rhm)
}

/// User edits made in the metadata editor before conversion. `None`
/// fields are left as the source map originally had them.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MetadataOverrides {
    title: Option<String>,
    song_name: Option<String>,
    mappers: Option<Vec<String>>,
    difficulty: Option<i32>,
    custom_difficulty_name: Option<String>,
}

fn apply_overrides(map: &mut rhmsspm_core::rhm::RhmMap, overrides: Option<MetadataOverrides>) {
    let Some(o) = overrides else { return };
    if let Some(v) = o.title {
        map.title = v;
    }
    if let Some(v) = o.song_name {
        map.song_name = v;
    }
    if let Some(v) = o.mappers {
        map.mappers = v;
    }
    if let Some(v) = o.difficulty {
        map.difficulty = v;
    }
    if let Some(v) = o.custom_difficulty_name {
        map.custom_difficulty_name = v;
    }
}

/// Reads a `.rhm`/`.phxm`/`.npk`/`.sspm` file and actually runs the
/// conversion in memory (without writing anything) so the UI can show a
/// preview card -- including the exact output size -- as soon as a file
/// is queued. `target_format` picks the destination; omit it to get the
/// same smart default `convert_map_file` uses.
#[tauri::command]
fn preview_map(path: String, target_format: Option<MapFormat>) -> Result<MapPreview, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("failed to read {path}: {e}"))?;
    let input = Path::new(&path);
    let source = source_format(input);
    let target = target_format.unwrap_or_else(|| MapFormat::default_target(source));

    let rhm = rhmsspm_core::read_any(source, &bytes).map_err(|e| e.to_string())?;

    let quantum_note_count = rhm
        .map
        .notes
        .iter()
        .filter(|n| !n.is_grid_aligned())
        .count();
    let cover_url = cover_data_url(&rhm.cover);
    let mappers = rhm.map.mappers.clone();
    let song_name = rhm.map.song_name.clone();
    let difficulty = rhm.map.difficulty;
    let custom_difficulty_name = rhm.map.custom_difficulty_name.clone();
    let star_rating = rhm.map.star_rating;
    let timing_points_count = rhm.map.timing_points.len();
    let has_audio = !rhm.audio.is_empty();
    let has_cover = !rhm.cover.is_empty();
    let warnings = rhmsspm_core::lint(&rhm);
    let times: Vec<i64> = rhm.map.notes.iter().map(|n| n.time).collect();
    let note_density = note_density_histogram(&times, rhm.map.duration);
    let note_count = rhm.map.notes.len();
    let duration_ms = rhm.map.duration;
    let title = rhm.map.title.clone();

    let output = rhmsspm_core::write_any(target, rhm).map_err(|e| e.to_string())?;

    Ok(MapPreview {
        path,
        title,
        song_name,
        mappers,
        duration_ms,
        note_count,
        quantum_note_count,
        difficulty,
        custom_difficulty_name,
        star_rating,
        has_audio,
        has_cover,
        cover_data_url: cover_url,
        timing_points_count,
        output_bytes: output.len(),
        warnings,
        note_density,
    })
}

fn audio_mime(bytes: &[u8]) -> &'static str {
    if bytes.starts_with(b"ID3")
        || (bytes.len() >= 2 && bytes[0] == 0xff && (bytes[1] & 0xe0) == 0xe0)
    {
        "audio/mpeg"
    } else if bytes.starts_with(b"OggS") {
        "audio/ogg"
    } else if bytes.starts_with(b"RIFF") {
        "audio/wav"
    } else {
        "application/octet-stream"
    }
}

/// Reads and base64-encodes a map's embedded audio, for the "preview
/// audio" button. Not called eagerly for every queued file (audio can be
/// several MB) -- only when the user actually asks to play one.
#[tauri::command]
fn get_audio_data_url(path: String) -> Result<Option<String>, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("failed to read {path}: {e}"))?;
    let source = source_format(Path::new(&path));
    let audio = rhmsspm_core::read_any(source, &bytes)
        .map_err(|e| e.to_string())?
        .audio;
    if audio.is_empty() {
        return Ok(None);
    }
    Ok(Some(format!(
        "data:{};base64,{}",
        audio_mime(&audio),
        BASE64.encode(&audio)
    )))
}

/// Expands a mix of `.rhm`/`.phxm`/`.npk`/`.sspm` file paths and
/// directory paths (e.g. from a drag-and-drop drop event) into a flat,
/// deduplicated list, recursing into directories.
#[tauri::command]
fn resolve_map_paths(paths: Vec<String>) -> Vec<String> {
    let mut out = Vec::new();
    for raw in paths {
        let path = Path::new(&raw);
        if path.is_dir() {
            for entry in walkdir::WalkDir::new(path)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if is_convertible_path(entry.path()) {
                    out.push(entry.path().display().to_string());
                }
            }
        } else if is_convertible_path(path) {
            out.push(raw);
        }
    }
    out.sort();
    out.dedup();
    out
}

/// Converts one map from whatever format its extension indicates to
/// `target_format` (defaulting to `.sspm`, or `.rhm` for `.sspm`
/// sources, when omitted), writing next to the source file unless
/// `output_dir` is given. `overrides`, when present, are applied to the
/// map before conversion (title/mapper/difficulty edits made in the UI).
#[tauri::command]
fn convert_map_file(
    input_path: String,
    output_dir: Option<String>,
    target_format: Option<MapFormat>,
    overrides: Option<MetadataOverrides>,
) -> Result<ConversionOutcome, String> {
    let bytes =
        std::fs::read(&input_path).map_err(|e| format!("failed to read {input_path}: {e}"))?;
    let input = Path::new(&input_path);
    let source = source_format(input);
    let target = target_format.unwrap_or_else(|| MapFormat::default_target(source));

    let mut rhm = rhmsspm_core::read_any(source, &bytes).map_err(|e| e.to_string())?;
    apply_overrides(&mut rhm.map, overrides);

    let note_count = rhm.map.notes.len();
    let quantum_note_count = rhm
        .map
        .notes
        .iter()
        .filter(|n| !n.is_grid_aligned())
        .count();
    let duration_ms = rhm.map.duration;
    let has_audio = !rhm.audio.is_empty();
    let has_cover = !rhm.cover.is_empty();
    let preserved_timing_points = rhm.map.timing_points.len();
    let title = rhm.map.title.clone();
    let file_name = rhmsspm_core::output_file_name(input, target.ext());
    let output = rhmsspm_core::write_any(target, rhm).map_err(|e| e.to_string())?;

    let out_dir: PathBuf = match output_dir {
        Some(dir) => PathBuf::from(dir),
        None => input.parent().map(Path::to_path_buf).unwrap_or_default(),
    };
    std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    let out_path = out_dir.join(&file_name);
    if out_path == input {
        return Err(format!(
            "refusing to overwrite the input ({}); pick a different target format or output folder",
            input.display()
        ));
    }
    std::fs::write(&out_path, &output).map_err(|e| e.to_string())?;

    Ok(ConversionOutcome {
        input_path,
        output_path: out_path.display().to_string(),
        title,
        note_count,
        quantum_note_count,
        duration_ms,
        has_audio,
        has_cover,
        preserved_timing_points,
        output_bytes: output.len(),
    })
}

/// Bundles a set of already-converted files into one `.zip`, ready to share.
#[tauri::command]
fn export_zip(paths: Vec<String>, dest: String) -> Result<(), String> {
    let file = std::fs::File::create(&dest).map_err(|e| format!("failed to create {dest}: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut used_names = std::collections::HashSet::new();
    for path_str in &paths {
        let path = Path::new(path_str);
        let base_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("map")
            .to_string();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("bin");
        let stem = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or(&base_name)
            .to_string();

        // Disambiguate collisions (e.g. same file name converted to two
        // different output folders) instead of silently overwriting one
        // entry inside the archive.
        let mut name = base_name.clone();
        let mut suffix = 1;
        while !used_names.insert(name.clone()) {
            name = format!("{stem} ({suffix}).{ext}");
            suffix += 1;
        }

        let bytes = std::fs::read(path).map_err(|e| format!("failed to read {path_str}: {e}"))?;
        zip.start_file(name, options).map_err(|e| e.to_string())?;
        zip.write_all(&bytes).map_err(|e| e.to_string())?;
    }
    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Wired up but dormant: tauri.conf.json's `plugins.updater` has
        // an empty pubkey/endpoints (a real signing key and release
        // endpoint don't exist yet -- the plugin requires *some* config
        // to be present, or it panics on startup instead of degrading
        // gracefully). With it empty, `check()` cleanly returns
        // EmptyEndpoints instead of finding anything -- see
        // docs/auto-update.md for what turning this on for real requires.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            // Remember size and position, but not maximized/fullscreen:
            // restoring "maximized" against a monitor/workspace layout
            // that has since changed (a very ordinary thing to happen
            // between app launches) can leave the window stuck off
            // whatever's currently visible, which is worse than just
            // reopening at a sane default size.
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(
                    tauri_plugin_window_state::StateFlags::SIZE
                        | tauri_plugin_window_state::StateFlags::POSITION,
                )
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            preview_map,
            convert_map_file,
            resolve_map_paths,
            get_audio_data_url,
            export_zip
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
