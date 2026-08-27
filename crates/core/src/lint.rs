//! Non-blocking sanity checks for a parsed `.rhm` map. These never stop a
//! conversion -- they just surface things worth a mapper's attention
//! before they end up on the other side as a broken `.sspm`.

use crate::rhm::Rhm;

const DURATION_TOLERANCE_MS: i64 = 2000;

pub fn lint(rhm: &Rhm) -> Vec<String> {
    let mut warnings = Vec::new();
    let notes = &rhm.map.notes;

    if notes.is_empty() {
        warnings.push("O mapa não contém nenhuma nota.".to_string());
    }

    if let Some(max_time) = notes.iter().map(|n| n.time).max() {
        if rhm.map.duration <= 0 {
            warnings.push("Duração da faixa não informada (0ms) no mapa.".to_string());
        } else if max_time > rhm.map.duration + DURATION_TOLERANCE_MS {
            warnings.push(format!(
                "A última nota ({max_time}ms) ocorre depois do fim informado da faixa ({}ms).",
                rhm.map.duration
            ));
        }
    }

    let negative_count = notes.iter().filter(|n| n.time < 0).count();
    if negative_count > 0 {
        warnings.push(format!(
            "{negative_count} nota(s) com tempo negativo serão ajustadas para 0ms."
        ));
    }

    let out_of_range_count = notes
        .iter()
        .filter(|n| !(-1.0..=10.0).contains(&n.x) || !(-1.0..=10.0).contains(&n.y))
        .count();
    if out_of_range_count > 0 {
        warnings.push(format!(
            "{out_of_range_count} nota(s) com posição bem fora do grid padrão (0-2) -- confira se não é um dado corrompido."
        ));
    }

    if rhm.audio.is_empty() {
        warnings.push("Mapa sem áudio embutido.".to_string());
    } else if !looks_like_mp3(&rhm.audio) {
        warnings.push("O áudio embutido não parece ser um MP3 válido.".to_string());
    }

    if !rhm.cover.is_empty() && !looks_like_image(&rhm.cover) {
        warnings
            .push("A capa embutida não parece ser uma imagem válida (PNG/JPEG/GIF).".to_string());
    }

    warnings
}

fn looks_like_mp3(bytes: &[u8]) -> bool {
    bytes.starts_with(b"ID3") || (bytes.len() >= 2 && bytes[0] == 0xff && (bytes[1] & 0xe0) == 0xe0)
}

fn looks_like_image(bytes: &[u8]) -> bool {
    bytes.starts_with(b"\x89PNG\r\n\x1a\n")
        || bytes.starts_with(b"\xff\xd8\xff")
        || bytes.starts_with(b"GIF8")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rhm::{RhmMap, RhmNote};

    fn base_map() -> RhmMap {
        RhmMap {
            online_id: None,
            online_status: None,
            legacy_id: Some("id".into()),
            song_name: "song".into(),
            mappers: vec![],
            title: "title".into(),
            tags: vec![],
            duration: 10_000,
            difficulty: 0,
            custom_difficulty_name: String::new(),
            star_rating: 0.0,
            notes: vec![RhmNote {
                time: 1000,
                x: 1.0,
                y: 1.0,
            }],
            audio_file_name: String::new(),
            image_path: None,
            audio_timing_mode: None,
            timing_points: vec![],
            extra: serde_json::Map::new(),
        }
    }

    #[test]
    fn flags_missing_audio() {
        let rhm = Rhm {
            map: base_map(),
            audio: vec![],
            cover: vec![],
        };
        let warnings = lint(&rhm);
        assert!(warnings.iter().any(|w| w.contains("sem áudio")));
    }

    #[test]
    fn flags_note_past_duration() {
        let mut map = base_map();
        map.notes.push(RhmNote {
            time: 50_000,
            x: 0.0,
            y: 0.0,
        });
        let rhm = Rhm {
            map,
            audio: vec![0xff, 0xfb, 0x90, 0x00],
            cover: vec![],
        };
        let warnings = lint(&rhm);
        assert!(warnings
            .iter()
            .any(|w| w.contains("depois do fim informado")));
    }

    #[test]
    fn clean_map_has_no_warnings() {
        let map = base_map();
        let rhm = Rhm {
            map,
            audio: vec![0xff, 0xfb, 0x90, 0x00],
            cover: vec![],
        };
        assert!(lint(&rhm).is_empty());
    }
}
