use std::fs;
use std::path::PathBuf;

fn testdata(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../testdata")
        .join(name)
}

/// Real `.rhm` files can write an explicit JSON `null` for a string
/// field (confirmed: `"CustomDifficultyName":null`) instead of omitting
/// the key -- `#[serde(default)]` alone doesn't cover that, only a
/// missing key. Regression test for that fix.
#[test]
fn reads_rhm_with_explicit_null_custom_difficulty_name() {
    let bytes = fs::read(testdata(
        "Neocoretex - Somebody That I Used To Drrrrr (Cut).rhm",
    ))
    .unwrap();
    let rhm = rhmsspm_core::rhm::read(&bytes).unwrap();
    assert_eq!(rhm.map.custom_difficulty_name, "");
    assert!(!rhm.map.notes.is_empty());

    let report = rhmsspm_core::convert::convert_rhm(rhm).unwrap();
    assert!(report.note_count > 0);
}

/// A real, minimal (1x1 white pixel) PNG -- used to confirm a genuinely
/// PNG-format cover *does* survive the `.phxm`/`.npk` writers, as the
/// counterpart to the "non-PNG cover gets dropped" behavior covered by
/// the round-trip tests below.
const MINIMAL_PNG: &[u8] = &[
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0,
    0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68, 65, 84, 120, 156, 99, 248, 255, 255, 63, 0, 5,
    254, 2, 254, 13, 239, 70, 184, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
];

#[test]
fn phxm_and_npk_writers_keep_a_genuinely_png_cover() {
    let bytes = fs::read(testdata("Caramella Girls - Caramelldansen.rhm")).unwrap();
    let mut rhm = rhmsspm_core::rhm::read(&bytes).unwrap();
    rhm.cover = MINIMAL_PNG.to_vec();

    let phxm_bytes = rhmsspm_core::phxm::write(&rhm).unwrap();
    let as_phxm = rhmsspm_core::phxm::read(&phxm_bytes).unwrap();
    assert_eq!(as_phxm.cover, MINIMAL_PNG);

    let npk_bytes = rhmsspm_core::npk::write(&rhm).unwrap();
    let as_npk = rhmsspm_core::npk::read(&npk_bytes).unwrap();
    assert_eq!(as_npk.cover, MINIMAL_PNG);
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

#[test]
fn converts_phxm_preserving_notes_and_media() {
    let bytes = fs::read(testdata(
        "test_-_test_-_phnx_map_no_cover_video_nothing.phxm",
    ))
    .unwrap();
    let rhm = rhmsspm_core::phxm::read(&bytes).unwrap();
    let source_note_count = rhm.map.notes.len();
    assert!(source_note_count > 0);
    assert!(!rhm.audio.is_empty());

    let report = rhmsspm_core::convert::convert_rhm(rhm).unwrap();
    assert_eq!(report.note_count, source_note_count);
    assert!(report.quantum_note_count > 0, "fixture has quantum notes");
    assert!(report.has_audio);

    let parsed = rhmsspm_core::sspm::read(&report.output).unwrap();
    assert_eq!(parsed.stored_hash, parsed.computed_hash);
    assert_eq!(parsed.notes.len(), source_note_count);
}

#[test]
fn converts_npk_preserving_notes_media_and_tempo() {
    let bytes = fs::read(testdata("sdag_-_novastra_map__-_test.npk")).unwrap();
    let rhm = rhmsspm_core::npk::read(&bytes).unwrap();
    let source_note_count = rhm.map.notes.len();
    assert!(source_note_count > 0);
    assert!(!rhm.audio.is_empty());
    assert!(!rhm.cover.is_empty());
    assert!(
        !rhm.map.timing_points.is_empty(),
        "fixture has a tempo event"
    );

    let report = rhmsspm_core::convert::convert_rhm(rhm).unwrap();
    assert_eq!(report.note_count, source_note_count);
    assert!(report.has_audio);
    assert!(report.has_cover);

    let parsed = rhmsspm_core::sspm::read(&report.output).unwrap();
    assert_eq!(parsed.stored_hash, parsed.computed_hash);
    assert_eq!(parsed.notes.len(), source_note_count);
}

/// The `.phxm` and `.npk` fixtures are exports of the same underlying
/// test map from two different games/clients -- cross-checking their
/// note lists validates both formats' coordinate-space math against
/// each other, independent of either one being "correct" in isolation.
#[test]
fn phxm_and_npk_fixtures_agree_on_notes() {
    let phxm = rhmsspm_core::phxm::read(
        &fs::read(testdata(
            "test_-_test_-_phnx_map_no_cover_video_nothing.phxm",
        ))
        .unwrap(),
    )
    .unwrap();
    let npk =
        rhmsspm_core::npk::read(&fs::read(testdata("sdag_-_novastra_map__-_test.npk")).unwrap())
            .unwrap();

    let mut a: Vec<_> = phxm.map.notes.iter().map(|n| (n.time, n.x, n.y)).collect();
    let mut b: Vec<_> = npk.map.notes.iter().map(|n| (n.time, n.x, n.y)).collect();
    a.sort_by_key(|n| n.0);
    b.sort_by_key(|n| n.0);

    assert_eq!(a.len(), b.len());
    for (i, (x, y)) in a.iter().zip(b.iter()).enumerate() {
        assert_eq!(x.0, y.0, "note {i} time disagrees between phxm and npk");
        assert_eq!(x.1, y.1, "note {i} x disagrees between phxm and npk");
        assert_eq!(x.2, y.2, "note {i} y disagrees between phxm and npk");
    }
}

#[test]
fn round_trips_phxm_through_its_own_writer() {
    let bytes = fs::read(testdata(
        "test_-_test_-_phnx_map_no_cover_video_nothing.phxm",
    ))
    .unwrap();
    let original = rhmsspm_core::phxm::read(&bytes).unwrap();
    let rewritten = rhmsspm_core::phxm::write(&original).unwrap();
    let reparsed = rhmsspm_core::phxm::read(&rewritten).unwrap();

    assert_eq!(reparsed.map.title, original.map.title);
    assert_eq!(reparsed.map.mappers, original.map.mappers);
    assert_eq!(reparsed.audio.len(), original.audio.len());
    assert_eq!(reparsed.map.notes.len(), original.map.notes.len());
    for (i, (a, b)) in original
        .map
        .notes
        .iter()
        .zip(reparsed.map.notes.iter())
        .enumerate()
    {
        assert_eq!(a.time, b.time, "note {i} time drifted");
        assert_eq!(a.x, b.x, "note {i} x drifted");
        assert_eq!(a.y, b.y, "note {i} y drifted");
    }
}

#[test]
fn round_trips_npk_through_its_own_writer() {
    let bytes = fs::read(testdata("sdag_-_novastra_map__-_test.npk")).unwrap();
    let original = rhmsspm_core::npk::read(&bytes).unwrap();
    let rewritten = rhmsspm_core::npk::write(&original).unwrap();
    let reparsed = rhmsspm_core::npk::read(&rewritten).unwrap();

    assert_eq!(reparsed.map.title, original.map.title);
    assert_eq!(reparsed.map.mappers, original.map.mappers);
    assert_eq!(reparsed.audio.len(), original.audio.len());
    // The fixture's cover is actually JPEG bytes under a ".png" name
    // (true of real game exports too, not just this fixture) -- the
    // writer transcodes it to real PNG rather than ship a `cover.png`
    // that won't load (see `npk::write`'s doc comment).
    assert!(!original.cover.starts_with(b"\x89PNG\r\n\x1a\n"));
    assert!(!reparsed.cover.is_empty());
    assert!(reparsed.cover.starts_with(b"\x89PNG\r\n\x1a\n"));
    assert_eq!(
        reparsed.map.timing_points.len(),
        original.map.timing_points.len()
    );
    assert_eq!(reparsed.map.notes.len(), original.map.notes.len());
    for (i, (a, b)) in original
        .map
        .notes
        .iter()
        .zip(reparsed.map.notes.iter())
        .enumerate()
    {
        assert_eq!(a.time, b.time, "note {i} time drifted");
        assert!((a.x - b.x).abs() < 0.0001, "note {i} x drifted");
        assert!((a.y - b.y).abs() < 0.0001, "note {i} y drifted");
    }
}

/// Cross-format conversion, not just round trips through the same
/// format: a real `.rhm` written out as `.phxm` and `.npk` must still
/// parse back with every note intact.
#[test]
fn converts_rhm_to_phxm_and_npk() {
    let bytes = fs::read(testdata("Caramella Girls - Caramelldansen.rhm")).unwrap();
    let rhm = rhmsspm_core::rhm::read(&bytes).unwrap();
    let note_count = rhm.map.notes.len();

    let phxm_bytes = rhmsspm_core::phxm::write(&rhm).unwrap();
    let as_phxm = rhmsspm_core::phxm::read(&phxm_bytes).unwrap();
    assert_eq!(as_phxm.map.notes.len(), note_count);

    let npk_bytes = rhmsspm_core::npk::write(&rhm).unwrap();
    let as_npk = rhmsspm_core::npk::read(&npk_bytes).unwrap();
    assert_eq!(as_npk.map.notes.len(), note_count);
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
