//! RHM -> SSPM conversion.
//!
//! Note timing is copied verbatim (both formats store absolute
//! milliseconds, so there is no unit conversion to get wrong) and every
//! note keeps its exact float position, so off-grid "quantum" notes are
//! written using SSPM's float32 marker encoding instead of being rounded
//! onto the 3x3 grid. RHM fields that SSPM has no native slot for
//! (online id/status, tags, audio timing mode, BPM timing points) are not
//! dropped: they are packed into an SSPM custom-data field so a
//! sufficiently motivated reader (or a future `sspm -> rhm` path) can
//! recover them.

use serde::Serialize;

use crate::error::Result;
use crate::rhm::{self, Rhm};
use crate::sspm::{CustomValue, SspmBuilder, SspmNote};

pub const RHM_EXTRA_FIELD: &str = "rhm_extra_json";

#[derive(Debug, Clone, Serialize)]
struct RhmExtra<'a> {
    #[serde(skip_serializing_if = "Option::is_none")]
    online_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    online_status: Option<&'a str>,
    #[serde(skip_serializing_if = "<[String]>::is_empty")]
    tags: &'a [String],
    #[serde(skip_serializing_if = "Option::is_none")]
    audio_timing_mode: Option<&'a str>,
    #[serde(skip_serializing_if = "<[rhm::RhmTimingPoint]>::is_empty")]
    timing_points: &'a [rhm::RhmTimingPoint],
    /// Any JSON fields the game writes that this tool doesn't know about
    /// yet, preserved verbatim so a future schema change doesn't silently
    /// lose data on conversion.
    #[serde(flatten)]
    unknown: serde_json::Map<String, serde_json::Value>,
}

impl RhmExtra<'_> {
    fn is_empty(&self) -> bool {
        self.online_id.is_none()
            && self.online_status.is_none()
            && self.tags.is_empty()
            && self.audio_timing_mode.is_none()
            && self.timing_points.is_empty()
            && self.unknown.is_empty()
    }
}

#[derive(Debug, Clone)]
pub struct ConversionReport {
    pub title: String,
    pub note_count: usize,
    pub quantum_note_count: usize,
    pub duration_ms: i64,
    pub has_audio: bool,
    pub has_cover: bool,
    pub preserved_timing_points: usize,
    pub output: Vec<u8>,
}

pub fn convert_rhm_bytes(rhm_bytes: &[u8]) -> Result<ConversionReport> {
    let rhm = rhm::read(rhm_bytes)?;
    convert_rhm(rhm)
}

pub fn convert_rhm(rhm: Rhm) -> Result<ConversionReport> {
    let Rhm { map, audio, cover } = rhm;

    let mut notes: Vec<SspmNote> = map
        .notes
        .iter()
        .map(|n| SspmNote {
            ms: n.time.max(0) as u32,
            x: n.x,
            y: n.y,
        })
        .collect();
    // SSPM readers expect markers in chronological order.
    notes.sort_by_key(|n| n.ms);
    let quantum_note_count = notes.iter().filter(|n| !n.is_grid_aligned()).count();

    let mut custom_fields = Vec::new();
    if !map.custom_difficulty_name.is_empty() {
        custom_fields.push((
            "difficulty_name".to_string(),
            CustomValue::Str(map.custom_difficulty_name.clone()),
        ));
    }

    let extra = RhmExtra {
        online_id: map.online_id,
        online_status: map.online_status.as_deref(),
        tags: &map.tags,
        audio_timing_mode: map.audio_timing_mode.as_deref(),
        timing_points: &map.timing_points,
        unknown: map.extra.clone(),
    };
    let preserved_timing_points = map.timing_points.len();
    if !extra.is_empty() {
        let json = serde_json::to_string(&extra).expect("RhmExtra always serializes");
        custom_fields.push((RHM_EXTRA_FIELD.to_string(), CustomValue::LongStr(json)));
    }

    let map_id = map.legacy_id.clone().unwrap_or_else(|| {
        let mapper_part = map.mappers.join("_");
        let title_part = map.title.replace(' ', "_");
        format!("{mapper_part}_{title_part}")
    });

    let builder = SspmBuilder {
        map_id,
        map_name: map.title.clone(),
        song_name: map.song_name.clone(),
        mappers: map.mappers.clone(),
        difficulty: map.difficulty.clamp(0, 255) as u8,
        star_rating: map.star_rating,
        requires_mod: false,
        notes,
        audio,
        cover,
        custom_fields,
    };

    let has_audio = !builder.audio.is_empty();
    let has_cover = !builder.cover.is_empty();
    let note_count = builder.notes.len();
    let output = builder.build();

    Ok(ConversionReport {
        title: map.title,
        note_count,
        quantum_note_count,
        duration_ms: map.duration,
        has_audio,
        has_cover,
        preserved_timing_points,
        output,
    })
}
