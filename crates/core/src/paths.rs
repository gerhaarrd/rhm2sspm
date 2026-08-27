use std::path::Path;

/// Swaps a trailing suffix for a new extension by string matching rather
/// than [`Path::with_extension`] -- that method treats the *last* `.`
/// anywhere in the file name as the extension boundary, which mangles
/// titles containing a period (e.g. "... ft. Young Thug.rhm" would
/// become "... ft.sspm").
fn swap_extension(input: &Path, old_suffix: &str, new_ext: &str) -> String {
    let name = input
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("output");
    let stem = if name.len() >= old_suffix.len()
        && name[name.len() - old_suffix.len()..].eq_ignore_ascii_case(old_suffix)
    {
        &name[..name.len() - old_suffix.len()]
    } else {
        name
    };
    format!("{stem}.{new_ext}")
}

pub fn sspm_file_name(input: &Path) -> String {
    swap_extension(input, ".rhm", "sspm")
}

/// The reverse-direction counterpart: swaps a trailing `.sspm` for
/// `.rhm`, avoiding the same last-dot pitfall.
pub fn rhm_file_name(input: &Path) -> String {
    swap_extension(input, ".sspm", "rhm")
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
    fn reverse_direction_swaps_sspm_for_rhm() {
        let input = Path::new("goreshit - slavik goblins.sspm");
        assert_eq!(rhm_file_name(input), "goreshit - slavik goblins.rhm");
    }
}
