use std::path::Path;

/// Every map container extension this tool reads or writes.
pub const KNOWN_MAP_EXTS: &[&str] = &["rhm", "phxm", "npk", "sspm"];

/// Strips whichever known extension `input` ends with (case-insensitive),
/// by string matching rather than [`Path::file_stem`]/[`Path::with_extension`]
/// -- those treat the *last* `.` anywhere in the file name as the
/// extension boundary, which mangles titles containing a period (e.g.
/// "... ft. Young Thug.rhm" would become "... ft").
fn strip_known_extension(input: &Path) -> &str {
    let name = input
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("output");
    for ext in KNOWN_MAP_EXTS {
        let suffix_len = ext.len() + 1; // + '.'
        if name.len() >= suffix_len {
            let (stem, suffix) = name.split_at(name.len() - suffix_len);
            if suffix[1..].eq_ignore_ascii_case(ext) {
                return stem;
            }
        }
    }
    name
}

/// Builds the output file name for converting `input` to `target_ext`,
/// preserving the original title regardless of periods in it.
pub fn output_file_name(input: &Path, target_ext: &str) -> String {
    format!("{}.{target_ext}", strip_known_extension(input))
}

pub fn sspm_file_name(input: &Path) -> String {
    output_file_name(input, "sspm")
}

/// The reverse-direction counterpart: swaps a trailing `.sspm` (or any
/// other known extension) for `.rhm`.
pub fn rhm_file_name(input: &Path) -> String {
    output_file_name(input, "rhm")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn keeps_periods_inside_the_title() {
        let input = Path::new("Juice WRLD - Bad Boy ft. Young Thug.rhm");
        assert_eq!(
            sspm_file_name(input),
            "Juice WRLD - Bad Boy ft. Young Thug.sspm"
        );
    }

    #[test]
    fn plain_title_still_works() {
        assert_eq!(sspm_file_name(Path::new("song.rhm")), "song.sspm");
    }

    #[test]
    fn missing_extension_still_appends() {
        assert_eq!(sspm_file_name(Path::new("song")), "song.sspm");
    }

    #[test]
    fn swaps_phxm_and_npk_extensions_too() {
        assert_eq!(sspm_file_name(Path::new("song.phxm")), "song.sspm");
        assert_eq!(sspm_file_name(Path::new("song.npk")), "song.sspm");
    }

    #[test]
    fn reverse_direction_swaps_sspm_for_rhm() {
        let input = Path::new("goreshit - slavik goblins.sspm");
        assert_eq!(rhm_file_name(input), "goreshit - slavik goblins.rhm");
    }

    #[test]
    fn output_file_name_supports_any_target_extension() {
        assert_eq!(output_file_name(Path::new("song.rhm"), "phxm"), "song.phxm");
        assert_eq!(output_file_name(Path::new("song.sspm"), "npk"), "song.npk");
    }
}
