//! Reads maps straight out of the Steam release of Rhythia's local cache.
//!
//! That build (internally named "CapoRhythia" -- a different, non-Godot
//! client from the one at `Rhythia/maps`) doesn't keep `.rhm` zip files at
//! all: every map it has ever opened is cached as a loose JSON file under
//! `CapoRhythia/cache/maps/<hash>.json`, using the *exact same* PascalCase
//! schema as `.rhm`'s `map` entry, with `AudioFileName`/`ImagePath` pointing
//! at separate blob files (`cache/audio/<hash>`, `cache/covers/<hash>`,
//! no extension) instead of embedding the bytes. Confirmed against a real
//! install: `~/.config/CapoRhythia/rhythia.db`'s `Maps` table rows match
//! `cache/maps/*.json` 1:1, so the JSON files alone are enough -- no need
//! to touch the SQLite database.

use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::rhm::{Rhm, RhmMap};

/// One map found in the Capo client's local cache. Listing this is cheap
/// (JSON parse only, no audio/cover I/O) -- it's meant for a picker the
/// user narrows down *before* anything gets materialized into a real
/// `.rhm` file, since that step is the expensive one.
#[derive(Debug, Clone)]
pub struct CapoMapEntry {
    pub json_path: PathBuf,
    pub title: String,
    pub mappers: Vec<String>,
    pub duration_ms: i64,
    pub note_count: usize,
    pub difficulty: i32,
    pub custom_difficulty_name: String,
    pub star_rating: f32,
}

/// Locates the Capo client's data directory, if installed: `~/.config/CapoRhythia`
/// on Linux, `%APPDATA%\CapoRhythia` on Windows (mirrors the `Environment.
/// ApplicationData` folder a .NET app -- which this is, going by its EF Core
/// migration strings -- would use on each platform).
pub fn capo_data_dir() -> Option<PathBuf> {
    let base = capo_base_dir()?;
    let dir = base.join("CapoRhythia");
    dir.join("cache").join("maps").is_dir().then_some(dir)
}

#[cfg(target_os = "windows")]
fn capo_base_dir() -> Option<PathBuf> {
    std::env::var_os("APPDATA").map(PathBuf::from)
}

#[cfg(not(target_os = "windows"))]
fn capo_base_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".config"))
}

/// Lists every map cached under `data_dir` (as returned by [`capo_data_dir`]).
/// Entries that fail to parse as a map are skipped rather than failing the
/// whole listing -- the cache can outlive a schema change in the game itself.
pub fn list_maps(data_dir: &Path) -> Result<Vec<CapoMapEntry>> {
    let maps_dir = data_dir.join("cache").join("maps");
    let mut out = Vec::new();
    for entry in std::fs::read_dir(&maps_dir)? {
        let path = entry?.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let Ok(bytes) = std::fs::read(&path) else {
            continue;
        };
        let Ok(map) = serde_json::from_slice::<RhmMap>(&bytes) else {
            continue;
        };
        out.push(CapoMapEntry {
            title: map.title,
            mappers: map.mappers,
            duration_ms: map.duration,
            note_count: map.notes.len(),
            difficulty: map.difficulty,
            custom_difficulty_name: map.custom_difficulty_name,
            star_rating: map.star_rating,
            json_path: path,
        });
    }
    out.sort_by_key(|entry| entry.title.to_lowercase());
    Ok(out)
}

/// Reads one cached map (its `json_path` from [`list_maps`]) into the
/// shared [`Rhm`] shape, resolving its audio/cover blobs relative to
/// `data_dir` and normalizing the file-name-ish fields so nothing leaks
/// Capo's internal cache paths into whatever this gets converted to.
pub fn read_map(data_dir: &Path, json_path: &Path) -> Result<Rhm> {
    let bytes = std::fs::read(json_path)?;
    let mut map: RhmMap = serde_json::from_slice(&bytes)?;

    let audio = resolve_blob(data_dir, &map.audio_file_name);
    let cover = map
        .image_path
        .as_deref()
        .map(|p| resolve_blob(data_dir, p))
        .unwrap_or_default();

    map.audio_file_name = if audio.is_empty() {
        String::new()
    } else {
        "audio".to_string()
    };
    map.image_path = (!cover.is_empty()).then(|| "cover".to_string());

    Ok(Rhm { map, audio, cover })
}

/// Reads just a cached map's cover bytes, skipping its (often much
/// larger) audio blob entirely -- for generating a picker thumbnail
/// without paying for a multi-MB audio read per row.
pub fn read_cover(data_dir: &Path, json_path: &Path) -> Result<Vec<u8>> {
    let bytes = std::fs::read(json_path)?;
    let map: RhmMap = serde_json::from_slice(&bytes)?;
    Ok(map
        .image_path
        .as_deref()
        .map(|p| resolve_blob(data_dir, p))
        .unwrap_or_default())
}

fn resolve_blob(data_dir: &Path, rel: &str) -> Vec<u8> {
    if rel.is_empty() {
        return Vec::new();
    }
    let rel = rel.trim_start_matches(['/', '\\']);
    std::fs::read(data_dir.join(rel)).unwrap_or_default()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Builds a throwaway `cache/maps` + `cache/audio` + `cache/covers`
    /// layout shaped exactly like a real Capo install (confirmed against
    /// `~/.config/CapoRhythia` on a real machine) under a unique temp dir,
    /// auto-removed on drop.
    struct FakeCapoDir(PathBuf);

    impl FakeCapoDir {
        fn new() -> Self {
            let dir = std::env::temp_dir().join(format!(
                "rhm2sspm-capo-test-{}-{:?}",
                std::process::id(),
                std::thread::current().id()
            ));
            std::fs::create_dir_all(dir.join("cache/maps")).unwrap();
            std::fs::create_dir_all(dir.join("cache/audio")).unwrap();
            std::fs::create_dir_all(dir.join("cache/covers")).unwrap();
            Self(dir)
        }
    }

    impl Drop for FakeCapoDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn lists_and_reads_a_cached_map_resolving_its_blobs() {
        let dir = FakeCapoDir::new();

        std::fs::write(dir.0.join("cache/audio/songhash"), b"fake-mp3-bytes").unwrap();
        std::fs::write(dir.0.join("cache/covers/coverhash"), b"fake-jpeg-bytes").unwrap();
        std::fs::write(
            dir.0.join("cache/maps/maphash.json"),
            r#"{
                "OnlineId": null, "OnlineStatus": null, "LegacyId": null,
                "SongName": "Test Song", "Mappers": ["someone"], "Title": "Test Song",
                "Duration": 1000, "Difficulty": 3, "CustomDifficultyName": null,
                "StarRating": 4.2, "Notes": [{"Time": 100, "X": 1, "Y": 1}],
                "AudioFileName": "/cache/audio/songhash",
                "ImagePath": "/cache/covers/coverhash",
                "AudioTimingMode": null, "TimingPoints": []
            }"#,
        )
        .unwrap();

        let entries = list_maps(&dir.0).unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].title, "Test Song");
        assert_eq!(entries[0].mappers, vec!["someone".to_string()]);

        let rhm = read_map(&dir.0, &entries[0].json_path).unwrap();
        assert_eq!(rhm.audio, b"fake-mp3-bytes");
        assert_eq!(rhm.cover, b"fake-jpeg-bytes");
        assert_eq!(rhm.map.notes.len(), 1);
        assert_eq!(rhm.map.image_path, Some("cover".to_string()));
        assert_eq!(rhm.map.audio_file_name, "audio");

        // read_cover gets the same bytes without touching the audio file.
        let cover = read_cover(&dir.0, &entries[0].json_path).unwrap();
        assert_eq!(cover, b"fake-jpeg-bytes");
    }

    #[test]
    fn skips_files_that_do_not_parse_as_a_map() {
        let dir = FakeCapoDir::new();
        std::fs::write(dir.0.join("cache/maps/garbage.json"), b"not json at all").unwrap();
        assert_eq!(list_maps(&dir.0).unwrap().len(), 0);
    }
}
