//! Reader/writer for Rhythia's `.phxm` map container -- the format used
//! by the current ("rewrite") client, distinct from the legacy `.rhm`.
//!
//! Verified against the game's own source (`Rhythia/Client`,
//! `scripts/map/MapParser.cs` and `scripts/map/Map.cs`), not reverse
//! engineered from files alone. Layout:
//!
//! A zip archive with `metadata.json` (JSON), `objects.phxmo` (binary
//! notes), and optionally `audio.<ext>`, `cover.png`, `video.mp4`.
//!
//! `objects.phxmo`: `u32` type count, `u32` note count, then per note
//! `u32` ms, `u8` quantum flag, then either `u8 x, u8 y` (grid) or
//! `f32 x, f32 y` (quantum -- stored in the client's native
//! -1..=1-centered space instead of the grid bytes' 0..=2). `x` maps
//! directly (byte as-is, or `+1` for quantum); `y` is flipped as well as
//! shifted (`2.0 - byte`, or `1.0 - quantum_y`) -- the client's vertical
//! convention is inverted relative to RHM's, confirmed by a real
//! in-game test (a note placed at the top rendered at the bottom
//! without this flip). Trailing per-object-type counts (timing points,
//! brightness, etc.) are ignored: the game always writes zero for them
//! today, and RHM/SSPM have no equivalent slots for them anyway.
//!
//! Video isn't carried over -- neither RHM nor SSPM has a slot for it,
//! and Sound Space+ can't play it back regardless.

use std::io::{Cursor, Write};

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use serde::Deserialize;
use serde_json::Value;

use crate::error::{ConvertError, Result};
use crate::rhm::{read_entry, Rhm, RhmMap, RhmNote};

#[derive(Debug, Default, Deserialize)]
struct PhxmMeta {
    #[serde(rename = "ID", default)]
    id: String,
    #[serde(rename = "Artist", default)]
    artist: String,
    #[serde(rename = "ArtistLink", default)]
    artist_link: String,
    #[serde(rename = "ArtistPlatform", default)]
    artist_platform: String,
    #[serde(rename = "Title", default)]
    title: String,
    #[serde(rename = "Rating", default)]
    rating: f32,
    #[serde(rename = "Mappers", default)]
    mappers: Vec<String>,
    #[serde(rename = "Difficulty", default)]
    difficulty: i32,
    #[serde(rename = "DifficultyName", default)]
    difficulty_name: String,
    #[serde(rename = "Length", default)]
    length: i64,
    #[serde(rename = "HasAudio", default)]
    has_audio: bool,
    #[serde(rename = "HasCover", default)]
    has_cover: bool,
    #[serde(rename = "AudioExt", default)]
    audio_ext: String,
}

fn parse_objects(bytes: &[u8]) -> Result<Vec<RhmNote>> {
    let mut r = Cursor::new(bytes);
    let _type_count = r
        .read_u32::<LittleEndian>()
        .map_err(|_| ConvertError::InvalidPhxm("objects.phxmo truncated (type count)".into()))?;
    let note_count = r
        .read_u32::<LittleEndian>()
        .map_err(|_| ConvertError::InvalidPhxm("objects.phxmo truncated (note count)".into()))?;

    let mut notes = Vec::with_capacity(note_count as usize);
    for _ in 0..note_count {
        let ms = r
            .read_u32::<LittleEndian>()
            .map_err(|_| ConvertError::InvalidPhxm("objects.phxmo truncated (note ms)".into()))?;
        let quantum = r.read_u8().map_err(|_| {
            ConvertError::InvalidPhxm("objects.phxmo truncated (quantum flag)".into())
        })? != 0;

        let (x, y) = if quantum {
            let x = r.read_f32::<LittleEndian>().map_err(|_| {
                ConvertError::InvalidPhxm("objects.phxmo truncated (quantum x)".into())
            })?;
            let y = r.read_f32::<LittleEndian>().map_err(|_| {
                ConvertError::InvalidPhxm("objects.phxmo truncated (quantum y)".into())
            })?;
            // Native -1..=1-centered space -> RHM/SSPM's 0..=2 space.
            // Y is flipped (`1.0 - y`, not `1.0 + y`): confirmed by a
            // real in-game test that the client's vertical convention
            // is inverted relative to RHM's.
            (x + 1.0, 1.0 - y)
        } else {
            let x = r.read_u8().map_err(|_| {
                ConvertError::InvalidPhxm("objects.phxmo truncated (grid x)".into())
            })?;
            let y = r.read_u8().map_err(|_| {
                ConvertError::InvalidPhxm("objects.phxmo truncated (grid y)".into())
            })?;
            (x as f32, 2.0 - y as f32)
        };

        notes.push(RhmNote {
            time: ms as i64,
            x,
            y,
        });
    }

    Ok(notes)
}

pub fn read(bytes: &[u8]) -> Result<Rhm> {
    let mut archive =
        zip::ZipArchive::new(Cursor::new(bytes)).map_err(ConvertError::InvalidPhxmContainer)?;

    let meta_json = read_entry(&mut archive, "metadata.json")?
        .ok_or(ConvertError::MissingPhxmEntry("metadata.json"))?;
    let meta: PhxmMeta =
        serde_json::from_slice(&meta_json).map_err(ConvertError::InvalidPhxmMetadata)?;

    let objects = read_entry(&mut archive, "objects.phxmo")?
        .ok_or(ConvertError::MissingPhxmEntry("objects.phxmo"))?;
    let notes = parse_objects(&objects)?;

    let audio = if meta.has_audio {
        read_entry(&mut archive, &format!("audio.{}", meta.audio_ext))?.unwrap_or_default()
    } else {
        Vec::new()
    };
    let cover = if meta.has_cover {
        read_entry(&mut archive, "cover.png")?.unwrap_or_default()
    } else {
        Vec::new()
    };

    let display_name = if meta.artist.trim().is_empty() {
        meta.title.clone()
    } else {
        format!("{} - {}", meta.artist, meta.title)
    };

    let mut extra = serde_json::Map::new();
    if !meta.artist_link.is_empty() {
        extra.insert("ArtistLink".to_string(), meta.artist_link.into());
    }
    if !meta.artist_platform.is_empty() {
        extra.insert("ArtistPlatform".to_string(), meta.artist_platform.into());
    }

    let map = RhmMap {
        online_id: None,
        online_status: None,
        legacy_id: (!meta.id.is_empty()).then_some(meta.id),
        song_name: display_name.clone(),
        mappers: meta.mappers,
        title: display_name,
        tags: Vec::new(),
        duration: meta.length,
        difficulty: meta.difficulty,
        custom_difficulty_name: meta.difficulty_name,
        star_rating: meta.rating,
        notes,
        audio_file_name: if meta.has_audio {
            format!("audio.{}", meta.audio_ext)
        } else {
            String::new()
        },
        image_path: meta.has_cover.then(|| "cover".to_string()),
        audio_timing_mode: None,
        timing_points: Vec::new(),
        extra,
    };

    Ok(Rhm { map, audio, cover })
}

fn audio_ext(bytes: &[u8]) -> &'static str {
    // Matches the game's own detection (`Map.cs`'s constructor): "OggS"
    // magic means ogg, anything else is treated as mp3.
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

fn write_objects(notes: &[RhmNote]) -> Vec<u8> {
    let mut buf = Vec::new();
    buf.write_u32::<LittleEndian>(12).unwrap(); // object type count, matches the game's own encoder
    buf.write_u32::<LittleEndian>(notes.len() as u32).unwrap();
    for note in notes {
        buf.write_u32::<LittleEndian>(note.time.max(0) as u32)
            .unwrap();
        if note.is_grid_aligned() {
            buf.write_u8(0).unwrap();
            buf.write_u8(note.x.round() as u8).unwrap();
            // Inverse of the read-side `2.0 - y` flip.
            buf.write_u8((2.0 - note.y).round() as u8).unwrap();
        } else {
            buf.write_u8(1).unwrap();
            // Reverse of the read-side shift/flip.
            buf.write_f32::<LittleEndian>(note.x - 1.0).unwrap();
            buf.write_f32::<LittleEndian>(1.0 - note.y).unwrap();
        }
    }
    for _ in 0..11 {
        buf.write_u32::<LittleEndian>(0).unwrap(); // timing/brightness/.../text counts, always 0
    }
    buf
}

/// Writes a `.phxm` zip container from the shared `Rhm` shape, matching
/// the game's own encoder (`MapParser.Encode` in `Rhythia/Client`) byte
/// for byte where it matters for the file to load correctly.
pub fn write(rhm: &Rhm) -> Result<Vec<u8>> {
    let (artist, title) = split_artist_title(&rhm.map.title);
    let id = rhm.map.legacy_id.clone().unwrap_or_else(|| {
        let mapper_part = rhm.map.mappers.join("_");
        format!("{mapper_part}_{}", rhm.map.title.replace(' ', "_"))
    });
    let artist_link = rhm
        .map
        .extra
        .get("ArtistLink")
        .and_then(Value::as_str)
        .unwrap_or("");
    let artist_platform = rhm
        .map
        .extra
        .get("ArtistPlatform")
        .and_then(Value::as_str)
        .unwrap_or("");
    let has_audio = !rhm.audio.is_empty();
    // The game's cover loader hard-requires real PNG data regardless of
    // the entry's name -- see `crate::rhm::to_png` -- so a non-PNG cover
    // (e.g. from a `.rhm` source with a JPEG cover) is transcoded rather
    // than shipped as a `cover.png` that will fail to load.
    let png_cover = crate::rhm::to_png(&rhm.cover);
    let has_cover = png_cover.is_some();
    let ext = if has_audio { audio_ext(&rhm.audio) } else { "" };

    let mut meta = serde_json::Map::new();
    meta.insert("ID".to_string(), id.into());
    meta.insert("Artist".to_string(), artist.into());
    meta.insert("ArtistLink".to_string(), artist_link.into());
    meta.insert("ArtistPlatform".to_string(), artist_platform.into());
    meta.insert("Title".to_string(), title.into());
    meta.insert("Rating".to_string(), (rhm.map.star_rating as f64).into());
    meta.insert(
        "Mappers".to_string(),
        Value::Array(rhm.map.mappers.iter().cloned().map(Value::String).collect()),
    );
    meta.insert("Difficulty".to_string(), rhm.map.difficulty.into());
    meta.insert(
        "DifficultyName".to_string(),
        rhm.map.custom_difficulty_name.clone().into(),
    );
    meta.insert("Length".to_string(), rhm.map.duration.into());
    meta.insert("HasAudio".to_string(), has_audio.into());
    meta.insert("HasCover".to_string(), has_cover.into());
    meta.insert("HasVideo".to_string(), false.into());
    meta.insert("AudioExt".to_string(), ext.into());
    let metadata_json =
        serde_json::to_vec(&Value::Object(meta)).expect("phxm metadata always serializes");

    let objects = write_objects(&rhm.map.notes);

    let mut buf = Vec::new();
    let cursor = Cursor::new(&mut buf);
    let mut zip = zip::ZipWriter::new(cursor);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    zip.start_file("metadata.json", options)?;
    zip.write_all(&metadata_json)?;

    zip.start_file("objects.phxmo", options)?;
    zip.write_all(&objects)?;

    if has_audio {
        zip.start_file(format!("audio.{ext}"), options)?;
        zip.write_all(&rhm.audio)?;
    }
    if let Some(cover) = png_cover {
        zip.start_file("cover.png", options)?;
        zip.write_all(&cover)?;
    }

    zip.finish()?;
    Ok(buf)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Pins the *direction* of the Y flip, not just read/write symmetry
    /// (a round trip alone can't tell a real flip from no flip at all
    /// applied consistently on both sides -- confirmed against a real
    /// 3167-note map downloaded in all four formats: RHM's Y and PHXM's
    /// Y satisfy `rhm_y == 2.0 - phxm_native_y` at every single note).
    #[test]
    fn grid_note_y_is_flipped_not_just_shifted() {
        let notes = [RhmNote {
            time: 0,
            x: 1.0,
            y: 0.0,
        }];
        let bytes = write_objects(&notes);
        // header(8) + ms(4) + quantum_flag(1) + x_byte(1) = offset 14 for y.
        assert_eq!(bytes[14], 2, "RHM y=0.0 should write as grid byte 2, not 0");

        let roundtripped = parse_objects(&bytes).unwrap();
        assert_eq!(roundtripped[0].y, 0.0);
    }

    #[test]
    fn quantum_note_y_is_flipped_not_just_shifted() {
        let notes = [RhmNote {
            time: 0,
            x: 0.5,
            y: 0.0,
        }];
        let bytes = write_objects(&notes);
        // header(8) + ms(4) + quantum_flag(1) + x_f32(4) = offset 17 for y.
        let y_native = f32::from_le_bytes(bytes[17..21].try_into().unwrap());
        assert_eq!(
            y_native, 1.0,
            "RHM y=0.0 should write as native y=1.0, not -1.0"
        );

        let roundtripped = parse_objects(&bytes).unwrap();
        assert_eq!(roundtripped[0].y, 0.0);
    }
}
