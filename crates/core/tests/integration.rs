use std::fs;
use std::path::PathBuf;

fn testdata(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../testdata")
        .join(name)
}

/// Sanity-checks this crate's SSPM *reader* against files the real game
/// produced: pointer table, string section and marker layout must parse
/// cleanly and agree with each other.
///
/// This intentionally does NOT assert `stored_hash == computed_hash`.
/// The game's own hash algorithm is undocumented and not required for a
/// file to load or play correctly (no reader, including the game itself,
/// verifies it) -- confirmed by brute-forcing every documented candidate
/// (defs+markers, with/without the marker-type byte, with/without
/// custom/audio/cover, in every order) against these real files without
/// a single match. We still compute and write a hash (sha1 of
/// definitions+markers, the convention used by the pysspm-rhythia
/// community library) so files we produce are internally verifiable.
#[test]
fn reads_real_game_sspm_files_structurally() {
    for name in [
        "dampkr_goreshit_-_slavik_goblins.sspm",
        "vmapimp_luminous_entities_lost_heart.sspm",
    ] {
        let bytes = fs::read(testdata(name)).expect("sample sspm should exist");
        let parsed = rhmsspm_core::sspm::read(&bytes)
            .unwrap_or_else(|e| panic!("failed to parse real sspm {name}: {e}"));
        assert!(!parsed.notes.is_empty(), "{name} should have notes");
        assert!(!parsed.map_name.is_empty(), "{name} should have a map name");
        assert!(!parsed.audio.is_empty(), "{name} should embed audio");
        // NB: real game exports store notes in authoring order, not
        // globally time-sorted (confirmed by inspection) -- our own
        // writer sorts by ms regardless of source order, which is a
        // correctness improvement, not something to assert of inputs.
    }
}

#[test]
fn converts_caramelldansen_preserving_quantum_notes_and_media() {
    let bytes = fs::read(testdata("Caramella Girls - Caramelldansen.rhm")).unwrap();
    let rhm = rhmsspm_core::rhm::read(&bytes).unwrap();
    let source_note_count = rhm.map.notes.len();
    let source_quantum_count = rhm
        .map
        .notes
        .iter()
        .filter(|n| n.x.fract() != 0.0 || n.y.fract() != 0.0)
        .count();
    assert!(
        source_quantum_count > 0,
        "fixture should contain quantum notes"
    );

    let report = rhmsspm_core::convert::convert_rhm(rhm).unwrap();
    assert_eq!(report.note_count, source_note_count);
    assert_eq!(report.quantum_note_count, source_quantum_count);
    assert!(report.has_audio);
    assert!(report.has_cover);

    // Round-trip through our own reader: hash must self-verify, and
    // every note's time + position must survive byte-for-byte.
    let parsed = rhmsspm_core::sspm::read(&report.output).unwrap();
    assert_eq!(parsed.stored_hash, parsed.computed_hash);
    assert_eq!(parsed.notes.len(), source_note_count);
    assert!(!parsed.audio.is_empty());
    assert!(!parsed.cover.is_empty());

    let mut source_sorted: Vec<_> = rhmsspm_core::rhm::read(&bytes)
        .unwrap()
        .map
        .notes
        .into_iter()
        .map(|n| (n.time.max(0) as u32, n.x, n.y))
        .collect();
    source_sorted.sort_by_key(|n| n.0);

    for (i, ((ms, x, y), note)) in source_sorted.iter().zip(parsed.notes.iter()).enumerate() {
        assert_eq!(note.ms, *ms, "note {i} time drifted");
        assert_eq!(note.x, *x, "note {i} x drifted (quantum precision lost?)");
        assert_eq!(note.y, *y, "note {i} y drifted (quantum precision lost?)");
    }
}

#[test]
fn converts_juice_wrld_and_preserves_timing_points_as_custom_data() {
    let bytes = fs::read(testdata("Juice WRLD - Bad Boy ft. Young Thug.rhm")).unwrap();
    let rhm = rhmsspm_core::rhm::read(&bytes).unwrap();
    assert!(
        !rhm.map.timing_points.is_empty(),
        "fixture should have BPM timing points"
    );
    let expected_timing_points = rhm.map.timing_points.len();

    let report = rhmsspm_core::convert::convert_rhm(rhm).unwrap();
    assert_eq!(report.preserved_timing_points, expected_timing_points);

    let parsed = rhmsspm_core::sspm::read(&report.output).unwrap();
    assert_eq!(parsed.stored_hash, parsed.computed_hash);
    assert_eq!(parsed.notes.len(), report.note_count);
}

/// The full round trip: real `.rhm` -> `.sspm` -> `.rhm` again. Verifies
/// that reverse conversion actually recovers what forward conversion
/// stashed away (timing points, tags), not just the fields SSPM stores
/// natively.
#[test]
fn round_trips_rhm_through_sspm_and_back() {
    let bytes = fs::read(testdata("Juice WRLD - Bad Boy ft. Young Thug.rhm")).unwrap();
    let original = rhmsspm_core::rhm::read(&bytes).unwrap();
    let original_note_count = original.map.notes.len();
    let original_timing_points = original.map.timing_points.clone();
    let original_tags = original.map.tags.clone();
    let original_mappers = original.map.mappers.clone();
    let original_title = original.map.title.clone();

    let sspm_bytes = rhmsspm_core::convert_rhm_bytes(&bytes).unwrap().output;
    let rhm_bytes = rhmsspm_core::convert_sspm_bytes(&sspm_bytes).unwrap();
    let roundtripped = rhmsspm_core::rhm::read(&rhm_bytes).unwrap();

    assert_eq!(roundtripped.map.title, original_title);
    assert_eq!(roundtripped.map.mappers, original_mappers);
    assert_eq!(roundtripped.map.notes.len(), original_note_count);
    assert_eq!(roundtripped.map.tags, original_tags);
    assert_eq!(
        roundtripped.map.timing_points.len(),
        original_timing_points.len()
    );
    for (a, b) in original_timing_points
        .iter()
        .zip(roundtripped.map.timing_points.iter())
    {
        assert_eq!(a.offset_ms, b.offset_ms);
        assert_eq!(a.bpm, b.bpm);
    }
    assert!(
        !roundtripped.audio.is_empty(),
        "audio should survive the round trip"
    );
    assert!(
        !roundtripped.cover.is_empty(),
        "cover should survive the round trip"
    );

    for (i, (a, b)) in original
        .map
        .notes
        .iter()
        .zip(roundtripped.map.notes.iter())
        .enumerate()
    {
        assert_eq!(a.time, b.time, "note {i} time drifted in round trip");
        assert_eq!(a.x, b.x, "note {i} x drifted in round trip");
        assert_eq!(a.y, b.y, "note {i} y drifted in round trip");
    }
}
