//! Reader for Rhythia's `.rhm` map container.
//!
//! A `.rhm` file is a plain zip archive with up to three entries:
//! `map` (required, UTF-8 JSON), `audio` (optional, raw bytes), and
//! `cover` (optional, raw bytes). Field names in the JSON are PascalCase,
//! matching what the game itself writes.

use std::io::{Cursor, Read, Write};

use serde::{Deserialize, Serialize};

use crate::error::{ConvertError, Result};

/// True when `bytes` starts with the PNG signature.
fn is_png(bytes: &[u8]) -> bool {
    bytes.starts_with(b"\x89PNG\r\n\x1a\n")
}

/// Returns `bytes` as genuine PNG data, transcoding if it isn't already.
/// `.phxm`/`.npk` both hard-require the cover to actually be PNG
/// (confirmed against the real games: mislabeling a JPEG cover as
/// `cover.png` makes their loader -- which calls a PNG-specific decoder
/// regardless of the source format -- log `ERR_FILE_CORRUPT` and show a
/// broken image, though the rest of the chart still imports and plays
/// fine). Returns `None` only if `bytes` isn't a decodable image at all,
/// in which case the caller should drop the cover rather than ship
/// something broken.
pub(crate) fn to_png(bytes: &[u8]) -> Option<Vec<u8>> {
    if bytes.is_empty() {
        return None;
    }
    if is_png(bytes) {
        return Some(bytes.to_vec());
    }
    let img = image::load_from_memory(bytes).ok()?;
    let mut png = Vec::new();
    img.write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
        .ok()?;
    Some(png)
}

/// Downscales `bytes` (any image format this build can decode) to fit
/// within `max_dim` on its longest side and re-encodes as JPEG -- for a
/// small picker thumbnail rather than shipping a multi-MB original cover
/// (real ones run several MB, some clients even store them as WebP).
/// `None` if `bytes` isn't a decodable image, same as [`to_png`].
pub fn thumbnail_jpeg(bytes: &[u8], max_dim: u32) -> Option<Vec<u8>> {
    if bytes.is_empty() {
        return None;
    }
    let img = image::load_from_memory(bytes).ok()?;
    let thumb = img.thumbnail(max_dim, max_dim).into_rgb8();
    let mut jpeg = Vec::new();
    thumb
        .write_to(&mut Cursor::new(&mut jpeg), image::ImageFormat::Jpeg)
        .ok()?;
    Some(jpeg)
}

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

impl RhmNote {
    /// True for a real 3x3 grid position (0, 1 or 2 on both axes);
    /// anything else is an off-grid "quantum" note.
    pub fn is_grid_aligned(&self) -> bool {
        self.x.fract() == 0.0
            && self.y.fract() == 0.0
            && (0.0..=2.0).contains(&self.x)
            && (0.0..=2.0).contains(&self.y)
    }
}

/// Some real `.rhm` files write an explicit JSON `null` for a string
/// field instead of omitting the key (confirmed against a real file
/// with `"CustomDifficultyName":null`) -- `#[serde(default)]` alone
/// only covers the key being *absent*, not present-but-null, so this
/// closes that gap by treating either the same way.
pub(crate) fn null_to_default<'de, D>(deserializer: D) -> std::result::Result<String, D::Error>
where
    D: serde::Deserializer<'de>,
{
    Ok(Option::<String>::deserialize(deserializer)?.unwrap_or_default())
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
    #[serde(rename = "SongName", default, deserialize_with = "null_to_default")]
    pub song_name: String,
    #[serde(rename = "Mappers", default)]
    pub mappers: Vec<String>,
    #[serde(rename = "Title", default, deserialize_with = "null_to_default")]
    pub title: String,
    #[serde(rename = "Tags", default)]
    pub tags: Vec<String>,
    /// Track duration in milliseconds.
    #[serde(rename = "Duration")]
    pub duration: i64,
    /// Preset difficulty slot (0..=4 in the current game).
    #[serde(rename = "Difficulty")]
    pub difficulty: i32,
    #[serde(
        rename = "CustomDifficultyName",
        default,
        deserialize_with = "null_to_default"
    )]
    pub custom_difficulty_name: String,
    #[serde(rename = "StarRating", default)]
    pub star_rating: f32,
    #[serde(rename = "Notes")]
    pub notes: Vec<RhmNote>,
    #[serde(
        rename = "AudioFileName",
        default,
        deserialize_with = "null_to_default"
    )]
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

/// Shifts every note and timing point by `offset_ms` (negative moves
/// everything earlier), clamping so nothing goes before 0 -- a common
/// fix for a chart that's out of sync with its audio. `duration` is
/// adjusted to keep covering both the shifted end of the chart and the
/// original track length.
pub fn shift_notes(map: &mut RhmMap, offset_ms: i64) {
    if offset_ms == 0 {
        return;
    }
    for note in &mut map.notes {
        note.time = (note.time + offset_ms).max(0);
    }
    for point in &mut map.timing_points {
        point.offset_ms = (point.offset_ms + offset_ms).max(0);
    }
    let last_note_ms = map.notes.iter().map(|n| n.time).max().unwrap_or(0);
    map.duration = (map.duration + offset_ms).max(last_note_ms).max(0);
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

pub(crate) fn read_entry(
    archive: &mut zip::ZipArchive<Cursor<&[u8]>>,
    name: &str,
) -> Result<Option<Vec<u8>>> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn is_png_checks_the_real_signature_not_the_file_name() {
        assert!(is_png(b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR"));
        assert!(!is_png(b"\xff\xd8\xff\xe0\x00\x10JFIF")); // JPEG
        assert!(!is_png(b""));
    }

    const MINIMAL_PNG: &[u8] = &[
        137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2,
        0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63,
        0, 5, 254, 2, 254, 13, 239, 70, 184, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
    ];

    #[test]
    fn thumbnail_jpeg_decodes_and_reencodes_a_real_image() {
        let jpeg = thumbnail_jpeg(MINIMAL_PNG, 96).unwrap();
        assert!(jpeg.starts_with(b"\xff\xd8\xff"));
    }

    #[test]
    fn thumbnail_jpeg_is_none_for_empty_or_undecodable_input() {
        assert!(thumbnail_jpeg(b"", 96).is_none());
        assert!(thumbnail_jpeg(b"not an image", 96).is_none());
    }

    fn sample_map(notes: Vec<RhmNote>, duration: i64) -> RhmMap {
        RhmMap {
            online_id: None,
            online_status: None,
            legacy_id: None,
            song_name: String::new(),
            mappers: Vec::new(),
            title: String::new(),
            tags: Vec::new(),
            duration,
            difficulty: 0,
            custom_difficulty_name: String::new(),
            star_rating: 0.0,
            notes,
            audio_file_name: String::new(),
            image_path: None,
            audio_timing_mode: None,
            timing_points: vec![RhmTimingPoint {
                offset_ms: 100,
                bpm: 120.0,
            }],
            extra: serde_json::Map::new(),
        }
    }

    #[test]
    fn shift_notes_moves_notes_timing_points_and_duration() {
        let mut map = sample_map(
            vec![
                RhmNote {
                    time: 100,
                    x: 0.0,
                    y: 0.0,
                },
                RhmNote {
                    time: 200,
                    x: 0.0,
                    y: 0.0,
                },
            ],
            1000,
        );
        shift_notes(&mut map, 50);
        assert_eq!(map.notes[0].time, 150);
        assert_eq!(map.notes[1].time, 250);
        assert_eq!(map.timing_points[0].offset_ms, 150);
        assert_eq!(map.duration, 1050);
    }

    #[test]
    fn shift_notes_clamps_at_zero_for_negative_offsets() {
        let mut map = sample_map(
            vec![RhmNote {
                time: 30,
                x: 0.0,
                y: 0.0,
            }],
            1000,
        );
        shift_notes(&mut map, -100);
        assert_eq!(map.notes[0].time, 0);
        assert_eq!(map.timing_points[0].offset_ms, 0);
        assert_eq!(map.duration, 900);
    }
}
