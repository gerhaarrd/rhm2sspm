//! `.sspm -> .rhm` reverse conversion.
//!
//! SSPM has no native slot for several RHM fields (online id/status,
//! tags, audio timing mode, BPM timing points). When the `.sspm` being
//! converted was itself produced by this tool, those fields survive in
//! the `rhm_extra_json` custom-data field ([`crate::convert::RHM_EXTRA_FIELD`])
//! and are restored here; otherwise they're simply absent, same as a
//! freshly-created RHM map.

use serde::Deserialize;

use crate::convert::RHM_EXTRA_FIELD;
use crate::rhm::{Rhm, RhmMap, RhmNote, RhmTimingPoint};
use crate::sspm::ParsedSspm;

#[derive(Debug, Default, Deserialize)]
struct RhmExtra {
    online_id: Option<i64>,
    online_status: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    audio_timing_mode: Option<String>,
    #[serde(default)]
    timing_points: Vec<RhmTimingPoint>,
    #[serde(flatten)]
    unknown: serde_json::Map<String, serde_json::Value>,
}

pub fn sspm_to_rhm(sspm: ParsedSspm) -> Rhm {
    let extra: RhmExtra = sspm
        .custom_strings
        .get(RHM_EXTRA_FIELD)
        .and_then(|json| serde_json::from_str(json).ok())
        .unwrap_or_default();

    let notes = sspm
        .notes
        .iter()
        .map(|n| RhmNote {
            time: n.ms as i64,
            x: n.x,
            y: n.y,
        })
        .collect();

    let has_cover = !sspm.cover.is_empty();
    let has_audio = !sspm.audio.is_empty();
    let custom_difficulty_name = sspm
        .custom_strings
        .get("difficulty_name")
        .cloned()
        .unwrap_or_default();

    let map = RhmMap {
        online_id: extra.online_id,
        online_status: extra.online_status,
        legacy_id: Some(sspm.map_id),
        song_name: sspm.song_name,
        mappers: sspm.mappers,
        title: sspm.map_name,
        tags: extra.tags,
        duration: sspm.last_ms as i64,
        difficulty: sspm.difficulty as i32,
        custom_difficulty_name,
        star_rating: sspm.rating as f32 / 10.0,
        notes,
        audio_file_name: if has_audio {
            "audio.mp3".to_string()
        } else {
            String::new()
        },
        image_path: has_cover.then(|| "cover".to_string()),
        audio_timing_mode: extra.audio_timing_mode,
        timing_points: extra.timing_points,
        extra: extra.unknown,
    };

    Rhm {
        map,
        audio: sspm.audio,
        cover: sspm.cover,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_basic_fields() {
        let sspm = ParsedSspm {
            map_id: "abc123".into(),
            map_name: "My Map".into(),
            song_name: "My Song".into(),
            mappers: vec!["Alice".into(), "Bob".into()],
            difficulty: 3,
            rating: 42,
            last_ms: 90_000,
            notes: vec![crate::sspm::SspmNote {
                ms: 1000,
                x: 1.0,
                y: 2.0,
            }],
            audio: vec![0xff, 0xfb, 0x90, 0x00],
            cover: vec![],
            stored_hash: [0; 20],
            computed_hash: [0; 20],
            custom_strings: Default::default(),
        };

        let rhm = sspm_to_rhm(sspm);
        assert_eq!(rhm.map.title, "My Map");
        assert_eq!(rhm.map.song_name, "My Song");
        assert_eq!(rhm.map.mappers, vec!["Alice", "Bob"]);
        assert_eq!(rhm.map.legacy_id.as_deref(), Some("abc123"));
        assert_eq!(rhm.map.difficulty, 3);
        assert!((rhm.map.star_rating - 4.2).abs() < 1e-4);
        assert_eq!(rhm.map.duration, 90_000);
        assert_eq!(rhm.map.notes.len(), 1);
        assert_eq!(rhm.map.image_path, None);
        assert!(rhm.cover.is_empty());
    }

    #[test]
    fn restores_timing_points_from_rhm_extra_json() {
        let mut custom_strings = std::collections::HashMap::new();
        custom_strings.insert(
            RHM_EXTRA_FIELD.to_string(),
            r#"{"timing_points":[{"OffsetMs":100,"Bpm":128.0}],"tags":["foo"]}"#.to_string(),
        );
        let sspm = ParsedSspm {
            map_id: "id".into(),
            map_name: "n".into(),
            song_name: "s".into(),
            mappers: vec![],
            difficulty: 0,
            rating: 0,
            last_ms: 0,
            notes: vec![],
            audio: vec![],
            cover: vec![],
            stored_hash: [0; 20],
            computed_hash: [0; 20],
            custom_strings,
        };

        let rhm = sspm_to_rhm(sspm);
        assert_eq!(rhm.map.timing_points.len(), 1);
        assert_eq!(rhm.map.timing_points[0].offset_ms, 100);
        assert_eq!(rhm.map.tags, vec!["foo"]);
    }
}
