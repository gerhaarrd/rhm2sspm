//! Reader/writer for the `.sspm` v2 binary map format (Sound Space+ / Rhythia).
//!
//! Layout (all integers little-endian):
//!
//! ```text
//! [0..4)    magic "SS+m"
//! [4..6)    version u16 = 2
//! [6..10)   reserved
//! [10..30)  content hash (sha1 of marker_definitions || markers, the
//!           convention used by the pysspm-rhythia community library;
//!           no reader -- including the game itself -- verifies this on
//!           load, so it is a best-effort fingerprint, not a functional
//!           requirement)
//! [30..34)  last_ms u32
//! [34..38)  note_count u32
//! [38..42)  marker_count u32
//! [42..43)  difficulty u8
//! [43..45)  rating u16 (star_rating * 10)
//! [45..46)  contains_audio u8 (bool)
//! [46..47)  contains_cover u8 (bool)
//! [47..48)  requires_mod u8 (bool)
//! [48..128) 5x (offset u64, length u64): custom_data, audio, cover, marker_defs, markers
//! ...       map_id, map_name, song_name (u16-len-prefixed strings), mapper_count u16, mappers[]
//! ...       [custom data block]
//! ...       [audio bytes] [cover bytes]
//! ...       marker definitions, then markers
//! ```
//!
//! Each marker/note is `ms:u32, marker_type:u8, flag:u8` followed by either
//! two u8 grid coordinates (`flag == 0`) or two f32 coordinates for an
//! off-grid "quantum" note (`flag == 1`).

use std::collections::HashMap;
use std::io::{Cursor, Read};

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use sha1::{Digest, Sha1};

use crate::error::{ConvertError, Result};

pub const MAGIC: [u8; 4] = *b"SS+m";
pub const VERSION: u16 = 2;

pub const TYPE_INT8: u8 = 0x01;
pub const TYPE_UINT16: u8 = 0x02;
pub const TYPE_UINT32: u8 = 0x03;
pub const TYPE_UINT64: u8 = 0x04;
pub const TYPE_FLOAT32: u8 = 0x05;
pub const TYPE_FLOAT64: u8 = 0x06;
pub const TYPE_POSITION: u8 = 0x07;
pub const TYPE_BUFFER: u8 = 0x08;
pub const TYPE_STRING: u8 = 0x09;
pub const TYPE_LONG_BUFFER: u8 = 0x0a;
pub const TYPE_LONG_STRING: u8 = 0x0b;
pub const TYPE_ARRAY: u8 = 0x0c;

const INVALID_ID_CHARS: [char; 9] = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];

/// Sanitizes a map id for filesystem/spec safety, mirroring what SSPM
/// readers already do on load (strip commas, replace reserved chars).
pub fn sanitize_map_id(raw: &str) -> String {
    raw.chars()
        .filter(|c| *c != ',')
        .map(|c| {
            if INVALID_ID_CHARS.contains(&c) {
                '_'
            } else {
                c
            }
        })
        .collect()
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SspmNote {
    pub ms: u32,
    pub x: f32,
    pub y: f32,
}

impl SspmNote {
    /// A note is grid-aligned when both coordinates are whole numbers in
    /// the single-byte range; anything else is an off-grid "quantum" note
    /// and must round-trip through float32 to avoid losing precision.
    pub fn is_grid_aligned(&self) -> bool {
        self.x.fract() == 0.0
            && self.y.fract() == 0.0
            && (0.0..=255.0).contains(&self.x)
            && (0.0..=255.0).contains(&self.y)
    }
}

/// One custom-data field value. Only the variants this tool needs to
/// write are modeled; readers of arbitrary SSPM files should extend this.
#[derive(Debug, Clone)]
pub enum CustomValue {
    Int8(i8),
    Str(String),
    LongStr(String),
}

impl CustomValue {
    fn type_id(&self) -> u8 {
        match self {
            CustomValue::Int8(_) => TYPE_INT8,
            CustomValue::Str(_) => TYPE_STRING,
            CustomValue::LongStr(_) => TYPE_LONG_STRING,
        }
    }

    fn write(&self, buf: &mut Vec<u8>) {
        match self {
            CustomValue::Int8(v) => buf.push(*v as u8),
            CustomValue::Str(s) => write_str(buf, s, false),
            CustomValue::LongStr(s) => write_str(buf, s, true),
        }
    }
}

fn write_str(buf: &mut Vec<u8>, s: &str, long: bool) {
    let bytes = s.as_bytes();
    if long {
        buf.write_u32::<LittleEndian>(bytes.len() as u32).unwrap();
    } else {
        buf.write_u16::<LittleEndian>(bytes.len() as u16).unwrap();
    }
    buf.extend_from_slice(bytes);
}

fn read_str(r: &mut Cursor<&[u8]>, long: bool) -> Result<String> {
    let len = if long {
        r.read_u32::<LittleEndian>()?
    } else {
        r.read_u16::<LittleEndian>()? as u32
    } as usize;
    let mut buf = vec![0u8; len];
    r.read_exact(&mut buf)?;
    Ok(String::from_utf8_lossy(&buf).into_owned())
}

/// Builds a spec-compliant SSPM v2 file byte-for-byte.
#[derive(Debug, Clone, Default)]
pub struct SspmBuilder {
    pub map_id: String,
    pub map_name: String,
    pub song_name: String,
    pub mappers: Vec<String>,
    pub difficulty: u8,
    pub star_rating: f32,
    pub requires_mod: bool,
    pub notes: Vec<SspmNote>,
    pub audio: Vec<u8>,
    pub cover: Vec<u8>,
    /// Extra custom-data fields, e.g. `difficulty_name`. Unknown fields
    /// are ignored by conformant readers, so this is safe to extend.
    pub custom_fields: Vec<(String, CustomValue)>,
}

impl SspmBuilder {
    pub fn build(&self) -> Vec<u8> {
        let note_count = self.notes.len() as u32;
        let last_ms = self.notes.iter().map(|n| n.ms).max().unwrap_or(0);

        let map_id = sanitize_map_id(&self.map_id);

        let mut strings = Vec::new();
        write_str(&mut strings, &map_id, false);
        write_str(&mut strings, &self.map_name, false);
        write_str(&mut strings, &self.song_name, false);
        strings
            .write_u16::<LittleEndian>(self.mappers.len() as u16)
            .unwrap();
        for mapper in &self.mappers {
            write_str(&mut strings, mapper, false);
        }

        let mut custom_data = Vec::new();
        custom_data
            .write_u16::<LittleEndian>(self.custom_fields.len() as u16)
            .unwrap();
        for (name, value) in &self.custom_fields {
            write_str(&mut custom_data, name, false);
            custom_data.push(value.type_id());
            value.write(&mut custom_data);
        }

        // "ssp_note": one definition holding a single POSITION value.
        let mut marker_defs = Vec::new();
        marker_defs.push(1u8); // definition count
        write_str(&mut marker_defs, "ssp_note", false);
        marker_defs.push(1u8); // value count
        marker_defs.push(TYPE_POSITION);
        marker_defs.push(0x00); // terminator

        let mut markers = Vec::new();
        for note in &self.notes {
            markers.write_u32::<LittleEndian>(note.ms).unwrap();
            markers.push(0u8); // marker type: index 0 ("ssp_note")
            if note.is_grid_aligned() {
                markers.push(0u8);
                markers.push(note.x as u8);
                markers.push(note.y as u8);
            } else {
                markers.push(1u8);
                markers.write_f32::<LittleEndian>(note.x).unwrap();
                markers.write_f32::<LittleEndian>(note.y).unwrap();
            }
        }

        let header_len = 10usize;
        let hash_len = 20usize;
        let metadata_len = 18usize;
        let pointers_len = 80usize;

        let mut offset = header_len + hash_len + metadata_len + pointers_len + strings.len();

        let custom_data_offset = offset;
        offset += custom_data.len();

        let audio_offset = if self.audio.is_empty() { 0 } else { offset };
        offset += self.audio.len();

        let cover_offset = if self.cover.is_empty() { 0 } else { offset };
        offset += self.cover.len();

        let marker_defs_offset = offset;
        offset += marker_defs.len();

        let marker_offset = offset;

        let marker_hash = {
            let mut hasher = Sha1::new();
            hasher.update(&marker_defs);
            hasher.update(&markers);
            hasher.finalize()
        };

        let mut out = Vec::with_capacity(offset + markers.len());
        out.extend_from_slice(&MAGIC);
        out.write_u16::<LittleEndian>(VERSION).unwrap();
        out.extend_from_slice(&[0u8; 4]); // reserved
        out.extend_from_slice(&marker_hash);

        out.write_u32::<LittleEndian>(last_ms).unwrap();
        out.write_u32::<LittleEndian>(note_count).unwrap();
        out.write_u32::<LittleEndian>(note_count).unwrap(); // marker_count == note_count (notes-only file)
        out.push(self.difficulty);
        out.write_u16::<LittleEndian>((self.star_rating * 10.0).round() as u16)
            .unwrap();
        out.push(if self.audio.is_empty() { 0 } else { 1 });
        out.push(if self.cover.is_empty() { 0 } else { 1 });
        out.push(if self.requires_mod { 1 } else { 0 });

        let write_ptr = |out: &mut Vec<u8>, offset: usize, len: usize| {
            out.write_u64::<LittleEndian>(offset as u64).unwrap();
            out.write_u64::<LittleEndian>(len as u64).unwrap();
        };
        write_ptr(
            &mut out,
            if custom_data.len() > 2 {
                custom_data_offset
            } else {
                0
            },
            if custom_data.len() > 2 {
                custom_data.len()
            } else {
                0
            },
        );
        write_ptr(&mut out, audio_offset, self.audio.len());
        write_ptr(&mut out, cover_offset, self.cover.len());
        write_ptr(&mut out, marker_defs_offset, marker_defs.len());
        write_ptr(&mut out, marker_offset, markers.len());

        out.extend_from_slice(&strings);
        out.extend_from_slice(&custom_data);
        out.extend_from_slice(&self.audio);
        out.extend_from_slice(&self.cover);
        out.extend_from_slice(&marker_defs);
        out.extend_from_slice(&markers);

        debug_assert_eq!(out.len(), marker_offset + markers.len());
        out
    }
}

/// A parsed SSPM v2 file, used for round-trip verification and for
/// `.sspm -> .rhm` reverse conversion.
#[derive(Debug, Clone)]
pub struct ParsedSspm {
    pub map_id: String,
    pub map_name: String,
    pub song_name: String,
    pub mappers: Vec<String>,
    pub difficulty: u8,
    pub rating: u16,
    pub last_ms: u32,
    pub notes: Vec<SspmNote>,
    pub audio: Vec<u8>,
    pub cover: Vec<u8>,
    pub stored_hash: [u8; 20],
    pub computed_hash: [u8; 20],
    /// String-valued custom-data fields (e.g. `difficulty_name`, or this
    /// tool's own `rhm_extra_json`). Non-string fields are skipped, not
    /// dropped-with-an-error, so unrelated custom data doesn't break
    /// parsing.
    pub custom_strings: HashMap<String, String>,
}

/// Walks a custom-data block just far enough to collect string-valued
/// fields by name; every other value type is read and discarded so the
/// cursor stays aligned for the next field.
fn read_custom_strings(bytes: &[u8], offset: u64, len: u64) -> Result<HashMap<String, String>> {
    let mut out = HashMap::new();
    if len < 2 {
        return Ok(out);
    }
    let mut r = Cursor::new(bytes);
    r.set_position(offset);
    let field_count = r.read_u16::<LittleEndian>()?;

    for _ in 0..field_count {
        let name = read_str(&mut r, false)?;
        let type_id = r.read_u8()?;
        let array_type = if type_id == TYPE_ARRAY {
            Some(r.read_u8()?)
        } else {
            None
        };
        skip_or_capture_value(&mut r, type_id, array_type, &name, &mut out)?;
    }
    Ok(out)
}

fn skip_or_capture_value(
    r: &mut Cursor<&[u8]>,
    type_id: u8,
    array_type: Option<u8>,
    field_name: &str,
    out: &mut HashMap<String, String>,
) -> Result<()> {
    match type_id {
        TYPE_INT8 => {
            r.read_i8()?;
        }
        TYPE_UINT16 => {
            r.read_u16::<LittleEndian>()?;
        }
        TYPE_UINT32 => {
            r.read_u32::<LittleEndian>()?;
        }
        TYPE_UINT64 => {
            r.read_u64::<LittleEndian>()?;
        }
        TYPE_FLOAT32 => {
            r.read_f32::<LittleEndian>()?;
        }
        TYPE_FLOAT64 => {
            r.read_f64::<LittleEndian>()?;
        }
        TYPE_POSITION => {
            if r.read_u8()? == 0 {
                r.read_u8()?;
                r.read_u8()?;
            } else {
                r.read_f32::<LittleEndian>()?;
                r.read_f32::<LittleEndian>()?;
            }
        }
        TYPE_BUFFER => {
            let n = r.read_u16::<LittleEndian>()? as i64;
            r.set_position((r.position() as i64 + n) as u64);
        }
        TYPE_STRING => {
            let s = read_str(r, false)?;
            out.insert(field_name.to_string(), s);
        }
        TYPE_LONG_BUFFER => {
            let n = r.read_u32::<LittleEndian>()? as i64;
            r.set_position((r.position() as i64 + n) as u64);
        }
        TYPE_LONG_STRING => {
            let s = read_str(r, true)?;
            out.insert(field_name.to_string(), s);
        }
        TYPE_ARRAY => {
            // 4-byte total length covers everything else in the array
            // (count + values), so we can skip it as one opaque blob.
            let total_len = r.read_u32::<LittleEndian>()? as i64;
            r.set_position((r.position() as i64 + total_len) as u64);
            let _ = array_type;
        }
        _ => {
            return Err(ConvertError::InvalidSspm(format!(
                "unknown custom data type {type_id:#x}"
            )))
        }
    }
    Ok(())
}

pub fn read(bytes: &[u8]) -> Result<ParsedSspm> {
    if bytes.len() < 128 {
        return Err(ConvertError::InvalidSspm("file too short".into()));
    }
    if bytes[0..4] != MAGIC {
        return Err(ConvertError::InvalidSspm(
            "bad magic (expected 'SS+m')".into(),
        ));
    }

    let mut r = Cursor::new(bytes);
    r.set_position(4);
    let version = r.read_u16::<LittleEndian>()?;
    if version != VERSION {
        return Err(ConvertError::UnsupportedSspmVersion(version));
    }
    r.set_position(10);
    let mut stored_hash = [0u8; 20];
    r.read_exact(&mut stored_hash)?;

    let last_ms = r.read_u32::<LittleEndian>()?;
    let note_count = r.read_u32::<LittleEndian>()?;
    let _marker_count = r.read_u32::<LittleEndian>()?;
    let difficulty = r.read_u8()?;
    let rating = r.read_u16::<LittleEndian>()?;
    let has_audio = r.read_u8()? != 0;
    let has_cover = r.read_u8()? != 0;
    let _requires_mod = r.read_u8()? != 0;

    let read_ptr = |r: &mut Cursor<&[u8]>| -> Result<(u64, u64)> {
        Ok((r.read_u64::<LittleEndian>()?, r.read_u64::<LittleEndian>()?))
    };
    let (custom_off, custom_len) = read_ptr(&mut r)?;
    let (audio_off, audio_len) = read_ptr(&mut r)?;
    let (cover_off, cover_len) = read_ptr(&mut r)?;
    let (defs_off, defs_len) = read_ptr(&mut r)?;
    let (marker_off, marker_len) = read_ptr(&mut r)?;

    let map_id = read_str(&mut r, false)?;
    let map_name = read_str(&mut r, false)?;
    let song_name = read_str(&mut r, false)?;
    let mapper_count = r.read_u16::<LittleEndian>()?;
    let mut mappers = Vec::with_capacity(mapper_count as usize);
    for _ in 0..mapper_count {
        mappers.push(read_str(&mut r, false)?);
    }

    let audio = if has_audio && audio_len > 0 {
        bytes[audio_off as usize..(audio_off + audio_len) as usize].to_vec()
    } else {
        Vec::new()
    };
    let cover = if has_cover && cover_len > 0 {
        bytes[cover_off as usize..(cover_off + cover_len) as usize].to_vec()
    } else {
        Vec::new()
    };

    // Only the single-definition "ssp_note" layout this tool writes is
    // supported for round-trip verification.
    let mut dr = Cursor::new(bytes);
    dr.set_position(defs_off);
    let def_count = dr.read_u8()?;
    if def_count != 1 {
        return Err(ConvertError::InvalidSspm(
            "unsupported marker definitions for verification".into(),
        ));
    }
    let def_id = read_str(&mut dr, false)?;
    if def_id != "ssp_note" {
        return Err(ConvertError::InvalidSspm(format!(
            "unexpected marker definition '{def_id}'"
        )));
    }

    let marker_bytes = &bytes[marker_off as usize..(marker_off + marker_len) as usize];
    let mut mr = Cursor::new(marker_bytes);
    let mut notes = Vec::with_capacity(note_count as usize);
    for _ in 0..note_count {
        let ms = mr.read_u32::<LittleEndian>()?;
        let _marker_type = mr.read_u8()?;
        let flag = mr.read_u8()?;
        let (x, y) = if flag == 0 {
            (mr.read_u8()? as f32, mr.read_u8()? as f32)
        } else {
            (
                mr.read_f32::<LittleEndian>()?,
                mr.read_f32::<LittleEndian>()?,
            )
        };
        notes.push(SspmNote { ms, x, y });
    }

    let computed_hash: [u8; 20] = {
        let defs_bytes = &bytes[defs_off as usize..(defs_off + defs_len) as usize];
        let mut hasher = Sha1::new();
        hasher.update(defs_bytes);
        hasher.update(marker_bytes);
        hasher.finalize().into()
    };

    let custom_strings = read_custom_strings(bytes, custom_off, custom_len)?;

    Ok(ParsedSspm {
        map_id,
        map_name,
        song_name,
        mappers,
        difficulty,
        rating,
        last_ms,
        notes,
        audio,
        cover,
        stored_hash,
        computed_hash,
        custom_strings,
    })
}
