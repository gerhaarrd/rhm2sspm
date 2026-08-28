use std::io::Write;
use std::path::{Path, PathBuf};

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine;
use serde::{Deserialize, Serialize};
use tauri::Manager;

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

/// A small (96px) JPEG thumbnail as a data URL, for cover art in a list
/// of many maps at once -- real cover files run several MB each (some
/// installed clients even store them as WebP), so inlining the originals
/// into a picker with a hundred-odd rows would be exactly the kind of
/// slow, unresponsive load this app has already had to fix once.
fn thumbnail_data_url(cover: &[u8]) -> Option<String> {
    let jpeg = rhmsspm_core::rhm::thumbnail_jpeg(cover, 96)?;
    Some(format!("data:image/jpeg;base64,{}", BASE64.encode(jpeg)))
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct MapSummary {
    path: String,
    title: String,
    mappers: Vec<String>,
    duration_ms: i64,
    note_count: usize,
    quantum_note_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct CompareReport {
    a: MapSummary,
    b: MapSummary,
    /// Notes present (same time + position, within float rounding) in both.
    matching_notes: usize,
    /// Notes only `a` has.
    only_in_a: usize,
    /// Notes only `b` has.
    only_in_b: usize,
}

/// Reads two map files (any supported format, independently) and
/// reports how their notes and metadata differ -- e.g. to check whether
/// two exports of "the same" map actually agree, or how much a hand
/// edit changed.
#[tauri::command]
fn compare_maps(path_a: String, path_b: String) -> Result<CompareReport, String> {
    type NoteKey = (i64, i32, i32);
    let read_one = |path_str: &str| -> Result<(MapSummary, Vec<NoteKey>), String> {
        let path = Path::new(path_str);
        let bytes = std::fs::read(path).map_err(|e| format!("failed to read {path_str}: {e}"))?;
        let rhm = rhmsspm_core::read_any(source_format(path), &bytes).map_err(|e| e.to_string())?;
        let quantum_note_count = rhm
            .map
            .notes
            .iter()
            .filter(|n| !n.is_grid_aligned())
            .count();
        // Round to a fixed-point grid dense enough to treat float
        // rounding as equal, coarse enough that this isn't just an
        // identity check.
        let key_notes = rhm
            .map
            .notes
            .iter()
            .map(|n| {
                (
                    n.time,
                    (n.x * 1000.0).round() as i32,
                    (n.y * 1000.0).round() as i32,
                )
            })
            .collect();
        let summary = MapSummary {
            path: path_str.to_string(),
            title: rhm.map.title.clone(),
            mappers: rhm.map.mappers.clone(),
            duration_ms: rhm.map.duration,
            note_count: rhm.map.notes.len(),
            quantum_note_count,
        };
        Ok((summary, key_notes))
    };

    let (a, a_notes) = read_one(&path_a)?;
    let (b, b_notes) = read_one(&path_b)?;

    // Counted per key, not deduplicated into a set -- a chart can
    // legitimately have two notes stacked at the exact same time and
    // position (confirmed against real maps), and a plain HashSet
    // intersection collapses those into one, misreporting a perfectly
    // preserved duplicate as "1 only in A, 1 only in B".
    fn counts(notes: &[NoteKey]) -> std::collections::HashMap<NoteKey, usize> {
        let mut map = std::collections::HashMap::new();
        for &key in notes {
            *map.entry(key).or_insert(0) += 1;
        }
        map
    }
    let a_counts = counts(&a_notes);
    let b_counts = counts(&b_notes);

    let mut matching_notes = 0;
    for (key, &a_count) in &a_counts {
        let b_count = b_counts.get(key).copied().unwrap_or(0);
        matching_notes += a_count.min(b_count);
    }
    let only_in_a = a_notes.len() - matching_notes;
    let only_in_b = b_notes.len() - matching_notes;

    Ok(CompareReport {
        a,
        b,
        matching_notes,
        only_in_a,
        only_in_b,
    })
}

#[cfg(test)]
mod compare_maps_tests {
    use super::*;
    use rhmsspm_core::rhm::{Rhm, RhmMap, RhmNote};

    fn map_with_notes(notes: Vec<RhmNote>) -> RhmMap {
        RhmMap {
            online_id: None,
            online_status: None,
            legacy_id: None,
            song_name: String::new(),
            mappers: Vec::new(),
            title: "Test".to_string(),
            tags: Vec::new(),
            duration: 1000,
            difficulty: 0,
            custom_difficulty_name: String::new(),
            star_rating: 0.0,
            notes,
            audio_file_name: String::new(),
            image_path: None,
            audio_timing_mode: None,
            timing_points: Vec::new(),
            extra: serde_json::Map::new(),
        }
    }

    /// A chart can legitimately have two notes stacked at the exact same
    /// time and position (confirmed against a real downloaded map) --
    /// the old `HashSet`-based comparison collapsed those into one and
    /// misreported a perfectly identical duplicate as "1 only in A, 1
    /// only in B" even though nothing actually differed.
    #[test]
    fn duplicate_notes_at_the_same_spot_are_not_reported_as_a_mismatch() {
        let notes = vec![
            RhmNote {
                time: 100,
                x: 1.0,
                y: 1.0,
            },
            RhmNote {
                time: 100,
                x: 1.0,
                y: 1.0,
            },
            RhmNote {
                time: 200,
                x: 0.0,
                y: 0.0,
            },
        ];
        let bytes = rhmsspm_core::rhm::write(&Rhm {
            map: map_with_notes(notes),
            audio: Vec::new(),
            cover: Vec::new(),
        })
        .unwrap();

        let dir = std::env::temp_dir().join(format!(
            "rhm2sspm-compare-test-{}-{:?}",
            std::process::id(),
            std::thread::current().id()
        ));
        std::fs::create_dir_all(&dir).unwrap();
        let path_a = dir.join("a.rhm");
        let path_b = dir.join("b.rhm");
        std::fs::write(&path_a, &bytes).unwrap();
        std::fs::write(&path_b, &bytes).unwrap();

        let report =
            compare_maps(path_a.display().to_string(), path_b.display().to_string()).unwrap();

        assert_eq!(report.matching_notes, 3);
        assert_eq!(report.only_in_a, 0);
        assert_eq!(report.only_in_b, 0);

        std::fs::remove_dir_all(&dir).ok();
    }
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
    /// Shifts every note and timing point by this many ms (negative
    /// moves everything earlier) -- fixes a chart that's out of sync
    /// with its audio.
    time_offset_ms: Option<i64>,
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
    if let Some(offset) = o.time_offset_ms {
        rhmsspm_core::shift_notes(map, offset);
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

    // Catches a writer bug before it ever reaches disk.
    rhmsspm_core::read_any(target, &output)
        .map_err(|e| format!("converted output failed to verify (re-parse): {e}"))?;

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

    // Re-read the bytes actually persisted to disk (not the in-memory
    // copy above) -- catches a truncated/corrupted write, not just a
    // writer bug.
    let written = std::fs::read(&out_path).map_err(|e| e.to_string())?;
    if let Err(e) = rhmsspm_core::read_any(target, &written) {
        let _ = std::fs::remove_file(&out_path);
        return Err(format!(
            "wrote {} but it failed to verify afterwards ({e}) -- the file was removed, please try again",
            out_path.display()
        ));
    }

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct BuildInfo {
    version: String,
    /// Short git commit SHA this binary was built from, so a running
    /// app can be matched back to the exact source/release it came
    /// from. "unknown" if `git` wasn't available at build time (e.g. a
    /// source tarball without the `.git` directory).
    commit: String,
}

#[tauri::command]
fn get_build_info(app: tauri::AppHandle) -> BuildInfo {
    BuildInfo {
        version: app.package_info().version.to_string(),
        commit: env!("GIT_COMMIT_SHA").to_string(),
    }
}

/// Roots under which each supported game keeps its own map library, one
/// per platform this app targets. Confirmed against the real games on
/// Linux; the Windows paths follow Godot's standard per-project
/// `user://` convention but haven't been verified on an actual Windows
/// install.
fn game_map_dirs() -> Vec<(&'static str, PathBuf)> {
    let mut roots: Vec<PathBuf> = Vec::new();
    #[cfg(target_os = "linux")]
    if let Ok(home) = std::env::var("HOME") {
        roots.push(PathBuf::from(home).join(".local/share"));
    }
    #[cfg(target_os = "windows")]
    if let Ok(appdata) = std::env::var("APPDATA") {
        roots.push(PathBuf::from(appdata));
    }

    let mut candidates = Vec::new();
    for root in &roots {
        candidates.push(("Rhythia", root.join("Rhythia/maps")));
        candidates.push(("Novastra", root.join("Novastra/charts")));
    }
    candidates
}

/// `Folder` games (Rhythia/Godot, Novastra) keep loose map files in a
/// directory the frontend can scan directly with `resolve_map_paths`.
/// `Capo` (the Steam release of Rhythia) is a different, non-Godot client
/// that caches maps as loose JSON + hash-named blob files indexed by its
/// own SQLite database rather than as `.rhm` files -- it needs its own
/// import command (`import_capo_maps`) to materialize real `.rhm` files
/// before they can be queued the same way.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "lowercase")]
enum GameSource {
    Folder,
    Capo,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DetectedGame {
    name: String,
    dir: String,
    source: GameSource,
}

/// Which of the games this app knows about are actually installed on
/// this machine, going by whether their map-library folder (or, for Capo,
/// its cache directory) exists.
#[tauri::command]
fn detect_installed_games() -> Vec<DetectedGame> {
    let mut games: Vec<DetectedGame> = game_map_dirs()
        .into_iter()
        .filter(|(_, dir)| dir.is_dir())
        .map(|(name, dir)| DetectedGame {
            name: name.to_string(),
            dir: dir.display().to_string(),
            source: GameSource::Folder,
        })
        .collect();

    if let Some(dir) = rhmsspm_core::capo_data_dir() {
        games.push(DetectedGame {
            name: "Rhythia (Steam)".to_string(),
            dir: dir.display().to_string(),
            source: GameSource::Capo,
        });
    }

    games
}

/// A map ready to show in the installed-maps picker, regardless of which
/// source it came from -- `id` means different things per source (a
/// Capo cache path that still needs materializing vs. a real file path
/// that's already queueable as-is), but the shape shown to the user is
/// the same either way.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InstalledMapSummary {
    id: String,
    title: String,
    mappers: Vec<String>,
    duration_ms: i64,
    note_count: usize,
    difficulty: i32,
    custom_difficulty_name: String,
    star_rating: f32,
    /// Set eagerly for folder games (the cover's already in memory from
    /// reading the file) but left `None` for Capo (fetched lazily via
    /// `get_capo_map_cover` -- listing has to stay cheap there).
    cover_data_url: Option<String>,
}

/// Lists every map the local Capo ("Rhythia (Steam)") client has cached,
/// for a picker -- deliberately cheap (JSON metadata only, no audio/cover
/// I/O or `.rhm` writing), unlike `import_capo_maps`.
#[tauri::command]
fn list_capo_maps() -> Result<Vec<InstalledMapSummary>, String> {
    let data_dir = rhmsspm_core::capo_data_dir()
        .ok_or_else(|| "Rhythia (Steam) is not installed on this machine".to_string())?;
    let entries = rhmsspm_core::capo::list_maps(&data_dir).map_err(|e| e.to_string())?;
    Ok(entries
        .into_iter()
        .map(|e| InstalledMapSummary {
            id: e.json_path.display().to_string(),
            title: e.title,
            mappers: e.mappers,
            duration_ms: e.duration_ms,
            note_count: e.note_count,
            difficulty: e.difficulty,
            custom_difficulty_name: e.custom_difficulty_name,
            star_rating: e.star_rating,
            cover_data_url: None,
        })
        .collect())
}

/// The cover thumbnail for one Capo map (`id` from `list_capo_maps`),
/// fetched lazily and separately from the listing itself -- real cover
/// files run several MB each, so generating all of them up front would
/// undo the whole point of keeping `list_capo_maps` cheap.
///
/// Decoding/resizing a several-MB image is real CPU work, and a plain
/// synchronous command runs inline on one of Tauri's async runtime
/// worker threads rather than a thread dedicated to blocking work --
/// tying one up repeatedly (once per row, however many rows there are)
/// was stalling other IPC traffic on that same worker and made the UI
/// stutter through the whole picker load. `spawn_blocking` moves the
/// actual work onto tokio's blocking-task pool instead.
#[tauri::command]
async fn get_capo_map_cover(id: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data_dir = rhmsspm_core::capo_data_dir()
            .ok_or_else(|| "Rhythia (Steam) is not installed on this machine".to_string())?;
        let maps_dir = data_dir.join("cache").join("maps");
        let json_path = Path::new(&id);
        if !json_path.starts_with(&maps_dir) {
            return Err(format!("not a Capo map id: {id}"));
        }
        let cover =
            rhmsspm_core::capo::read_cover(&data_dir, json_path).map_err(|e| e.to_string())?;
        Ok(thumbnail_data_url(&cover))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Lists every map file already sitting in a detected game folder (e.g.
/// the Godot Rhythia client's `maps/` dir), for the same picker Capo
/// uses. Unlike Capo's cache, these are already real `.rhm`/`.phxm`/
/// `.sspm` files -- `id` here is just the file path, so "importing" a
/// selection is a no-op pass-through, no materializing needed.
///
/// Runs on tokio's blocking pool (see `get_capo_map_cover`) since this
/// reads every file and generates a thumbnail for each, same CPU profile.
#[tauri::command]
async fn list_folder_maps(dir: String) -> Result<Vec<InstalledMapSummary>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut out = Vec::new();
        for path_str in resolve_map_paths(vec![dir]) {
            let path = Path::new(&path_str);
            let bytes =
                std::fs::read(path).map_err(|e| format!("failed to read {path_str}: {e}"))?;
            let rhm =
                rhmsspm_core::read_any(source_format(path), &bytes).map_err(|e| e.to_string())?;
            let cover_data_url = thumbnail_data_url(&rhm.cover);
            out.push(InstalledMapSummary {
                id: path_str,
                title: rhm.map.title,
                mappers: rhm.map.mappers,
                duration_ms: rhm.map.duration,
                note_count: rhm.map.notes.len(),
                difficulty: rhm.map.difficulty,
                custom_difficulty_name: rhm.map.custom_difficulty_name,
                star_rating: rhm.map.star_rating,
                cover_data_url,
            });
        }
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Materializes the given Capo maps (`id`s from `list_capo_maps`) into
/// real `.rhm` files under the OS temp dir, so they can be queued exactly
/// like any other file. Only touches what's asked for -- reading each
/// map's audio and re-zipping it is the expensive part, so importing
/// everything unconditionally made this freeze the UI on a library of any
/// real size.
///
/// Runs on tokio's blocking pool (see `get_capo_map_cover`) -- reading
/// audio and re-compressing a `.rhm` per selected map is the same kind of
/// CPU-bound work that shouldn't run inline on an async worker thread.
#[tauri::command]
async fn import_capo_maps(ids: Vec<String>) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let data_dir = rhmsspm_core::capo_data_dir()
            .ok_or_else(|| "Rhythia (Steam) is not installed on this machine".to_string())?;
        let maps_dir = data_dir.join("cache").join("maps");

        let out_dir = std::env::temp_dir().join("rhm2sspm-capo-import");
        std::fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;

        let mut used_names = std::collections::HashSet::new();
        let mut paths = Vec::with_capacity(ids.len());
        for id in &ids {
            let json_path = Path::new(id);
            if !json_path.starts_with(&maps_dir) {
                return Err(format!("not a Capo map id: {id}"));
            }

            let rhm =
                rhmsspm_core::capo::read_map(&data_dir, json_path).map_err(|e| e.to_string())?;
            let title = rhm.map.title.clone();
            let bytes = rhmsspm_core::write_any(MapFormat::Rhm, rhm).map_err(|e| e.to_string())?;

            let base_name = sanitize_file_name(&title);
            let mut file_name = format!("{base_name}.rhm");
            let mut n = 2;
            while !used_names.insert(file_name.clone()) {
                file_name = format!("{base_name} ({n}).rhm");
                n += 1;
            }

            let out_path = out_dir.join(&file_name);
            std::fs::write(&out_path, &bytes).map_err(|e| e.to_string())?;
            paths.push(out_path.display().to_string());
        }
        Ok(paths)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Replaces characters that are invalid (or awkward) in a file name on
/// either Windows or Linux with `_`, so an arbitrary map title can be used
/// directly as a file name.
fn sanitize_file_name(title: &str) -> String {
    let cleaned: String = title
        .chars()
        .map(|c| {
            if c.is_control() || "\\/:*?\"<>|".contains(c) {
                '_'
            } else {
                c
            }
        })
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        "untitled".to_string()
    } else {
        trimmed.to_string()
    }
}

/// Files this process was launched with (double-clicked, or "open
/// with...") -- read once by the frontend on startup. Argv[0] is the
/// executable path itself, so only later args are considered.
#[tauri::command]
fn get_launch_files() -> Vec<String> {
    std::env::args()
        .skip(1)
        .filter(|a| is_convertible_path(Path::new(a)))
        .collect()
}

/// Bundles a set of already-converted files into one `.zip`, ready to
/// share. `readme`, when given, is written in as `README.txt` -- the
/// desktop app uses this for a pack description (map list + a note
/// about how it was made).
#[tauri::command]
fn export_zip(paths: Vec<String>, dest: String, readme: Option<String>) -> Result<(), String> {
    let file = std::fs::File::create(&dest).map_err(|e| format!("failed to create {dest}: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    if let Some(readme) = readme {
        zip.start_file("README.txt", options)
            .map_err(|e| e.to_string())?;
        zip.write_all(readme.as_bytes())
            .map_err(|e| e.to_string())?;
    }

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

/// Extracts every convertible map file (`.rhm`/`.phxm`/`.npk`/`.sspm`)
/// out of a `.zip` (e.g. a downloaded map pack) into a fresh temp
/// directory, and returns their paths so the caller can queue them like
/// any other file. Non-map entries in the zip are skipped.
#[tauri::command]
fn extract_zip_maps(zip_path: String) -> Result<Vec<String>, String> {
    let file =
        std::fs::File::open(&zip_path).map_err(|e| format!("failed to open {zip_path}: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

    let stem = Path::new(&zip_path)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("pack");
    let dest_dir = std::env::temp_dir().join(format!(
        "rhm2sspm-{stem}-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or_default()
    ));
    std::fs::create_dir_all(&dest_dir).map_err(|e| e.to_string())?;

    let mut extracted = Vec::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let Some(entry_path) = entry.enclosed_name() else {
            continue; // skip anything with a suspicious path (zip-slip)
        };
        if !is_convertible_path(&entry_path) {
            continue;
        }
        let file_name = entry_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("map")
            .to_string();
        let out_path = dest_dir.join(&file_name);
        let mut out_file = std::fs::File::create(&out_path).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        extracted.push(out_path.display().to_string());
    }

    Ok(extracted)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must be the first plugin registered. When a second instance is
        // launched (e.g. double-clicking another map file while the app
        // is already open), this fires in the *original* process with
        // the new instance's argv instead of a second window opening.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            use tauri::Emitter;
            let paths: Vec<String> = argv
                .into_iter()
                .skip(1)
                .filter(|a| is_convertible_path(Path::new(a)))
                .collect();
            if !paths.is_empty() {
                let _ = app.emit("file-opened", paths);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // Active: tauri.conf.json's `plugins.updater` has a real pubkey
        // and points at this repo's GitHub releases. Signing itself
        // happens in CI (release.yml, via TAURI_SIGNING_PRIVATE_KEY),
        // not here -- see docs/auto-update.md.
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
            export_zip,
            extract_zip_maps,
            get_launch_files,
            get_build_info,
            detect_installed_games,
            list_capo_maps,
            list_folder_maps,
            get_capo_map_cover,
            import_capo_maps,
            compare_maps
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
