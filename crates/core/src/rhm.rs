//! Reader for Rhythia's `.rhm` map container.
//!
//! A `.rhm` file is a plain zip archive with up to three entries:
//! `map` (required, UTF-8 JSON), `audio` (optional, raw bytes), and
//! `cover` (optional, raw bytes). Field names in the JSON are PascalCase,
//! matching what the game itself writes.

use std::io::{Cursor, Read, Write};

use serde::{Deserialize, Serialize};

use crate::error::{ConvertError, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhmNote {
    #[serde(rename = "Time")]
    pub time: i64,
    /// Column on the 3x3 grid (0..=2). Fractional when the note sits
    /// off-grid ("quantum" placement).
    #[serde(rename = "X")]
    pub x: f32,
    #[serde(rename = "Y")]
    pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhmTimingPoint {
    #[serde(rename = "OffsetMs")]
    pub offset_ms: i64,
    #[serde(rename = "Bpm")]
    pub bpm: f64,
}

/// The decoded `map` JSON entry. Fields the game added after this tool
/// was written are captured by `extra` instead of being silently dropped.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RhmMap {
    #[serde(rename = "OnlineId")]
    pub online_id: Option<i64>,
    #[serde(rename = "OnlineStatus")]
    pub online_status: Option<String>,
    /// Stable SSPM-style id. Absent (`null`) on maps that were never
    /// uploaded/shared, in which case a fresh one is derived on export.
    #[serde(rename = "LegacyId")]
    pub legacy_id: Option<String>,
    #[serde(rename = "SongName")]
    pub song_name: String,
    #[serde(rename = "Mappers", default)]
    pub mappers: Vec<String>,
    #[serde(rename = "Title")]
    pub title: String,
    #[serde(rename = "Tags", default)]
    pub tags: Vec<String>,
    /// Track duration in milliseconds.
    #[serde(rename = "Duration")]
    pub duration: i64,
    /// Preset difficulty slot (0..=4 in the current game).
    #[serde(rename = "Difficulty")]
    pub difficulty: i32,
    #[serde(rename = "CustomDifficultyName", default)]
    pub custom_difficulty_name: String,
    #[serde(rename = "StarRating", default)]
    pub star_rating: f32,
    #[serde(rename = "Notes")]
    pub notes: Vec<RhmNote>,
    #[serde(rename = "AudioFileName", default)]
    pub audio_file_name: String,
    #[serde(rename = "ImagePath")]
    pub image_path: Option<String>,
    #[serde(rename = "AudioTimingMode", default)]
    pub audio_timing_mode: Option<String>,
    /// BPM/offset grid used by the map editor. Not needed for SSPM
    /// playback (note times are already absolute ms), but stashed in a
    /// custom-data field on export so it isn't silently lost.
    #[serde(rename = "TimingPoints", default)]
    pub timing_points: Vec<RhmTimingPoint>,

    /// Any JSON fields not modeled above, preserved verbatim.
    #[serde(flatten)]
    pub extra: serde_json::Map<String, serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct Rhm {
    pub map: RhmMap,
    pub audio: Vec<u8>,
    pub cover: Vec<u8>,
}

pub fn read(bytes: &[u8]) -> Result<Rhm> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))?;

    let map_json = read_entry(&mut archive, "map")?.ok_or(ConvertError::MissingEntry("map"))?;
    let map: RhmMap = serde_json::from_slice(&map_json)?;

    let audio = read_entry(&mut archive, "audio")?.unwrap_or_default();
    let cover = read_entry(&mut archive, "cover")?.unwrap_or_default();

    Ok(Rhm { map, audio, cover })
}

/// Writes a `.rhm` zip container: `map` (JSON) always, `audio` when
/// non-empty, `cover` only when the map actually references one (mirrors
/// what the game itself does).
pub fn write(rhm: &Rhm) -> Result<Vec<u8>> {
    let mut buf = Vec::new();
    let cursor = Cursor::new(&mut buf);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let map_json = serde_json::to_vec(&rhm.map)?;
    zip.start_file("map", options)?;
    zip.write_all(&map_json)?;

    if !rhm.audio.is_empty() {
        zip.start_file("audio", options)?;
        zip.write_all(&rhm.audio)?;
    }

    if rhm.map.image_path.is_some() && !rhm.cover.is_empty() {
        zip.start_file("cover", options)?;
        zip.write_all(&rhm.cover)?;
    }

    zip.finish()?;
    Ok(buf)
}

fn read_entry(archive: &mut zip::ZipArchive<Cursor<&[u8]>>, name: &str) -> Result<Option<Vec<u8>>> {
    match archive.by_name(name) {
        Ok(mut file) => {
            let mut buf = Vec::with_capacity(file.size() as usize);
            file.read_to_end(&mut buf)?;
            Ok(Some(buf))
        }
        Err(zip::result::ZipError::FileNotFound) => Ok(None),
        Err(err) => Err(err.into()),
    }
}
