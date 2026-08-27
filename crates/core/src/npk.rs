//! Reader/writer for `.npk` map files from Nova (a separate rhythm game
//! by Pyrama, not a Rhythia client) -- <https://pyrama.itch.io/nova>.
//!
//! Unlike `.phxm`, this was reverse engineered from a single real sample
//! file (no public source/spec was found), so treat it as best-effort:
//! it covers what that one file contains, and may not hold for every
//! `formatVersion`. That said, a file produced by [`write`] has been
//! confirmed against the real game (dropped into `user://queued/`,
//! which is how the game itself imports charts): it validates, imports,
//! and is actually playable, notes and all. The one issue that testing
//! caught -- a cover mislabeled as PNG when it wasn't -- is what
//! `crate::rhm::to_png` transcodes below. It omits `profile.png` (the
//! uploader's account picture in real exports -- we have no real one to
//! put there, and the game imported fine without it).
//!
//! A zip archive containing `metadata.json`, `chart.nch` (JSON, despite
//! the extension), an audio file and usually a cover image (named after
//! the track, not by a fixed name), and often a `profile.png`.
//!
//! `chart.nch` notes are `{x, y, t}` in a native -1..=1-centered space
//! (always floats, no separate grid/quantum flag). `x` gets a +1 shift to
//! land in the same 0..=2 space RHM/SSPM use, matching `.phxm`; `y` is
//! *also* flipped (`1.0 - y`, not `1.0 + y`) -- Nova is an unrelated
//! game with its own vertical convention, confirmed inverted relative to
//! Rhythia's by a real in-game test (a note placed at the top rendered
//! at the bottom without this flip).
//! `beats`/`glides`/non-tempo `events` have no RHM/SSPM equivalent and
//! are stashed verbatim in `extra` instead of being dropped (round-tripped
//! back out verbatim on write); `tempo` events map onto RHM's timing
//! points, which are conceptually the same thing. Metadata fields with no
//! modeled slot (`mapCreatorPersonalLink`, `previewStartTime`,
//! `previewDuration`, `formatVersion`, `ssqeVersion`) are preserved the
//! same way.

use std::io::{Cursor, Write};

use serde::Deserialize;
use serde_json::Value;

use crate::error::{ConvertError, Result};
use crate::rhm::{read_entry, Rhm, RhmMap, RhmNote, RhmTimingPoint};

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NpkMeta {
    #[serde(default)]
    song_title: String,
    #[serde(default)]
    song_artist: String,
    #[serde(default)]
    map_creator: String,
    #[serde(flatten)]
    rest: serde_json::Map<String, Value>,
}

#[derive(Debug, Deserialize)]
struct NpkNote {
    x: f32,
    y: f32,
    t: i64,
}

#[derive(Debug, Default, Deserialize)]
struct NpkChart {
    #[serde(default)]
    notes: Vec<NpkNote>,
    #[serde(default)]
    events: Vec<Value>,
    #[serde(flatten)]
    rest: serde_json::Map<String, Value>,
}

fn find_entry_by(names: &[String], predicate: impl Fn(&str) -> bool) -> Option<&str> {
    names.iter().map(String::as_str).find(|n| predicate(n))
}

/// Extra-field key prefix used for round-tripping fields this reader
/// doesn't otherwise model (see module docs).
const EXTRA_PREFIX: &str = "npk";

fn title_case_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
        None => String::new(),
    }
}

fn audio_ext(bytes: &[u8]) -> &'static str {
    if bytes.len() >= 4 && &bytes[0..4] == b"OggS" {
        "ogg"
    } else {
        "mp3"
    }
}

fn split_artist_title(combined: &str) -> (String, String) {
    match combined.split_once(" - ") {
        Some((artist, title)) => (artist.to_string(), title.to_string()),
        None => (String::new(), combined.to_string()),
    }
}

pub fn read(bytes: &[u8]) -> Result<Rhm> {
    let mut archive =
        zip::ZipArchive::new(Cursor::new(bytes)).map_err(ConvertError::InvalidNpkContainer)?;
    let names: Vec<String> = archive.file_names().map(str::to_string).collect();

    let meta_json = read_entry(&mut archive, "metadata.json")?
        .ok_or(ConvertError::MissingNpkEntry("metadata.json"))?;
    let meta: NpkMeta = serde_json::from_slice(&meta_json)
        .map_err(|e| ConvertError::InvalidNpkJson("metadata.json", e))?;

    let chart_json =
        read_entry(&mut archive, "chart.nch")?.ok_or(ConvertError::MissingNpkEntry("chart.nch"))?;
    let chart: NpkChart = serde_json::from_slice(&chart_json)
        .map_err(|e| ConvertError::InvalidNpkJson("chart.nch", e))?;

    let audio_name = find_entry_by(&names, |n| {
        let lower = n.to_ascii_lowercase();
        lower.ends_with(".mp3") || lower.ends_with(".ogg") || lower.ends_with(".wav")
    })
    .map(str::to_string);
    let cover_name = find_entry_by(&names, |n| {
        let lower = n.to_ascii_lowercase();
        (lower.ends_with(".png") || lower.ends_with(".jpg") || lower.ends_with(".jpeg"))
            && lower != "profile.png"
    })
    .map(str::to_string);

    let audio = match &audio_name {
        Some(name) => read_entry(&mut archive, name)?.unwrap_or_default(),
        None => Vec::new(),
    };
    let cover = match &cover_name {
        Some(name) => read_entry(&mut archive, name)?.unwrap_or_default(),
        None => Vec::new(),
    };

    let display_name = if meta.song_artist.trim().is_empty() {
        meta.song_title.clone()
    } else {
        format!("{} - {}", meta.song_artist, meta.song_title)
    };

    let mut timing_points = Vec::new();
    let mut other_events = Vec::new();
    for event in chart.events {
        let is_tempo = event.get("type").and_then(Value::as_str) == Some("tempo");
        let offset_ms = event.get("t").and_then(Value::as_i64);
        let bpm = event.get("bpm").and_then(Value::as_f64);
        match (is_tempo, offset_ms, bpm) {
            (true, Some(offset_ms), Some(bpm)) => {
                timing_points.push(RhmTimingPoint { offset_ms, bpm })
            }
            _ => other_events.push(event),
        }
    }

    let duration = chart
        .notes
        .iter()
        .map(|n| n.t)
        .chain(timing_points.iter().map(|p| p.offset_ms))
        .max()
        .unwrap_or(0);

    let notes = chart
        .notes
        .iter()
        .map(|n| RhmNote {
            time: n.t,
            x: n.x + 1.0,
            // Y is flipped, not just shifted -- see the module docs.
            y: 1.0 - n.y,
        })
        .collect();

    let mut extra = serde_json::Map::new();
    if !other_events.is_empty() {
        extra.insert(format!("{EXTRA_PREFIX}Events"), Value::Array(other_events));
    }
    for (key, value) in chart.rest {
        extra.insert(format!("{EXTRA_PREFIX}{}", title_case_first(&key)), value);
    }
    for (key, value) in meta.rest {
        extra.insert(format!("{EXTRA_PREFIX}{}", title_case_first(&key)), value);
    }

    let map = RhmMap {
        online_id: None,
        online_status: None,
        legacy_id: None,
        song_name: display_name.clone(),
        mappers: if !meta.map_creator.is_empty() {
            vec![meta.map_creator]
        } else {
            Vec::new()
        },
        title: display_name,
        tags: Vec::new(),
        duration,
        difficulty: 0,
        custom_difficulty_name: String::new(),
        star_rating: 0.0,
        notes,
        audio_file_name: audio_name.unwrap_or_default(),
        image_path: cover_name.map(|_| "cover".to_string()),
        audio_timing_mode: None,
        timing_points,
        extra,
    };

    Ok(Rhm { map, audio, cover })
}

/// Writes a `.npk` zip container from the shared `Rhm` shape. See the
/// module docs for the caveats around writing this format.
pub fn write(rhm: &Rhm) -> Result<Vec<u8>> {
    let (song_artist, song_title) = split_artist_title(&rhm.map.title);
    let map_creator = rhm.map.mappers.first().cloned().unwrap_or_default();

    let mut meta = serde_json::Map::new();
    meta.insert("songTitle".to_string(), song_title.into());
    meta.insert("songArtist".to_string(), song_artist.into());
    meta.insert("mapCreator".to_string(), map_creator.into());
    meta.insert(
        "mapCreatorPersonalLink".to_string(),
        Value::String(String::new()),
    );
    meta.insert("previewStartTime".to_string(), 0.into());
    meta.insert("previewDuration".to_string(), 0.into());
    meta.insert("formatVersion".to_string(), 2.into());
    meta.insert("ssqeVersion".to_string(), Value::String(String::new()));
    for known in [
        "mapCreatorPersonalLink",
        "previewStartTime",
        "previewDuration",
        "formatVersion",
        "ssqeVersion",
    ] {
        let extra_key = format!("{EXTRA_PREFIX}{}", title_case_first(known));
        if let Some(value) = rhm.map.extra.get(&extra_key) {
            meta.insert(known.to_string(), value.clone());
        }
    }
    let metadata_json =
        serde_json::to_vec(&Value::Object(meta)).expect("npk metadata always serializes");

    let mut chart = serde_json::Map::new();
    chart.insert(
        "songOffset".to_string(),
        rhm.map
            .extra
            .get(&format!("{EXTRA_PREFIX}SongOffset"))
            .cloned()
            .unwrap_or_else(|| 0.into()),
    );

    let notes_json: Vec<Value> = rhm
        .map
        .notes
        .iter()
        .map(|n| {
            let mut obj = serde_json::Map::new();
            obj.insert("x".to_string(), (n.x - 1.0).into());
            // Inverse of the read-side flip (`1.0 - y`), not a plain shift.
            obj.insert("y".to_string(), (1.0 - n.y).into());
            obj.insert("t".to_string(), n.time.into());
            Value::Object(obj)
        })
        .collect();
    chart.insert("notes".to_string(), Value::Array(notes_json));

    chart.insert(
        "beats".to_string(),
        rhm.map
            .extra
            .get(&format!("{EXTRA_PREFIX}Beats"))
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );
    chart.insert(
        "glides".to_string(),
        rhm.map
            .extra
            .get(&format!("{EXTRA_PREFIX}Glides"))
            .cloned()
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );

    let mut events: Vec<Value> = rhm
        .map
        .timing_points
        .iter()
        .map(|tp| {
            let mut e = serde_json::Map::new();
            e.insert("type".to_string(), "tempo".into());
            e.insert("t".to_string(), tp.offset_ms.into());
            e.insert("bpm".to_string(), tp.bpm.into());
            Value::Object(e)
        })
        .collect();
    if let Some(Value::Array(other)) = rhm.map.extra.get(&format!("{EXTRA_PREFIX}Events")) {
        events.extend(other.iter().cloned());
    }
    chart.insert("events".to_string(), Value::Array(events));

    let chart_json =
        serde_json::to_vec(&Value::Object(chart)).expect("npk chart always serializes");

    let mut buf = Vec::new();
    let cursor = Cursor::new(&mut buf);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("metadata.json", options)?;
    zip.write_all(&metadata_json)?;

    zip.start_file("chart.nch", options)?;
    zip.write_all(&chart_json)?;

    if !rhm.audio.is_empty() {
        zip.start_file(format!("audio.{}", audio_ext(&rhm.audio)), options)?;
        zip.write_all(&rhm.audio)?;
    }
    // The game's cover loader hard-requires real PNG data regardless of
    // the entry's name -- confirmed against the real game: a JPEG cover
    // written as `cover.png` imports and plays fine, but logs
    // `ERR_FILE_CORRUPT` and shows a broken cover image. Transcode
    // rather than ship a file we know won't load.
    if let Some(cover) = crate::rhm::to_png(&rhm.cover) {
        zip.start_file("cover.png", options)?;
        zip.write_all(&cover)?;
    }

    zip.finish()?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rhm::RhmMap;

    /// Pins the *direction* of the Y flip, not just read/write symmetry
    /// (a round trip alone can't tell a real flip from no flip at all
    /// applied consistently on both sides -- confirmed against a real
    /// 3167-note map downloaded in all four formats: RHM's Y and NPK's
    /// native Y satisfy `rhm_y == 1.0 - npk_native_y` at every note).
    #[test]
    fn note_y_is_flipped_not_just_shifted() {
        let rhm = Rhm {
            map: RhmMap {
                online_id: None,
                online_status: None,
                legacy_id: None,
                song_name: String::new(),
                mappers: Vec::new(),
                title: String::new(),
                tags: Vec::new(),
                duration: 0,
                difficulty: 0,
                custom_difficulty_name: String::new(),
                star_rating: 0.0,
                notes: vec![RhmNote {
                    time: 0,
                    x: 1.0,
                    y: 0.0,
                }],
                audio_file_name: String::new(),
                image_path: None,
                audio_timing_mode: None,
                timing_points: Vec::new(),
                extra: serde_json::Map::new(),
            },
            audio: Vec::new(),
            cover: Vec::new(),
        };

        let bytes = write(&rhm).unwrap();
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes.as_slice())).unwrap();
        let mut chart_json = String::new();
        std::io::Read::read_to_string(&mut archive.by_name("chart.nch").unwrap(), &mut chart_json)
            .unwrap();
        let chart: serde_json::Value = serde_json::from_str(&chart_json).unwrap();
        let y = chart["notes"][0]["y"].as_f64().unwrap();
        assert_eq!(y, 1.0, "RHM y=0.0 should write as native y=1.0, not -1.0");

        let roundtripped = read(&bytes).unwrap();
        assert_eq!(roundtripped.map.notes[0].y, 0.0);
    }
}
