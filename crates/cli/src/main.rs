use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;

use anstream::{eprintln, println};
use clap::Parser;
use owo_colors::OwoColorize;

/// Convert Rhythia .rhm maps to .sspm (Sound Space+) and back, preserving
/// note timing and off-grid ("quantum") positions. Direction is picked
/// automatically from each input file's extension.
#[derive(Parser)]
#[command(name = "rhm2sspm", version, about)]
struct Args {
    /// .rhm/.sspm files, or directories to scan recursively.
    #[arg(required = true)]
    inputs: Vec<PathBuf>,

    /// Write converted files here instead of next to each input.
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Print per-map details (note count, quantum notes, duration, media).
    #[arg(short, long)]
    verbose: bool,
}

fn is_convertible(path: &Path) -> bool {
    matches!(
        path.extension().and_then(|e| e.to_str()),
        Some(e) if e.eq_ignore_ascii_case("rhm") || e.eq_ignore_ascii_case("sspm")
    )
}

fn collect_input_files(inputs: &[PathBuf]) -> Vec<PathBuf> {
    let mut files = Vec::new();
    for input in inputs {
        if input.is_dir() {
            for entry in walkdir::WalkDir::new(input)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                if is_convertible(entry.path()) {
                    files.push(entry.path().to_path_buf());
                }
            }
        } else {
            files.push(input.clone());
        }
    }
    files
}

fn convert_one(path: &Path, output_dir: Option<&Path>, verbose: bool) -> anyhow::Result<()> {
    let is_sspm = path
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("sspm"));

    let bytes = fs::read(path)?;

    let (output, file_name, summary) = if is_sspm {
        let parsed = rhmsspm_core::sspm::read(&bytes)?;
        let quantum = parsed.notes.iter().filter(|n| !n.is_grid_aligned()).count();
        let note_count = parsed.notes.len();
        let rhm = rhmsspm_core::sspm_to_rhm(parsed);
        let summary = format!(
            "{} notes={} quantum={} duration={}ms audio={} cover={} timing_points={}",
            rhm.map.title,
            note_count,
            quantum,
            rhm.map.duration,
            if rhm.audio.is_empty() { "no" } else { "yes" },
            if rhm.cover.is_empty() { "no" } else { "yes" },
            rhm.map.timing_points.len(),
        );
        let output = rhmsspm_core::rhm::write(&rhm)?;
        let file_name = rhmsspm_core::rhm_file_name(path);
        (output, file_name, summary)
    } else {
        let report = rhmsspm_core::convert_rhm_bytes(&bytes)?;
        let file_name = rhmsspm_core::sspm_file_name(path);
        let summary = format!(
            "{} notes={} quantum={} duration={}ms audio={} cover={} timing_points={}",
            report.title,
            report.note_count,
            report.quantum_note_count,
            report.duration_ms,
            if report.has_audio { "yes" } else { "no" },
            if report.has_cover { "yes" } else { "no" },
            report.preserved_timing_points,
        );
        (report.output, file_name, summary)
    };

    let out_path = match output_dir {
        Some(dir) => {
            fs::create_dir_all(dir)?;
            dir.join(file_name)
        }
        None => path.with_file_name(file_name),
    };
    fs::write(&out_path, &output)?;

    println!(
        "{} {} {} {}",
        "✓".green().bold(),
        path.display(),
        "->".dimmed(),
        out_path.display()
    );
    if verbose {
        println!("  {}", summary.dimmed());
    }
    Ok(())
}

fn main() -> ExitCode {
    let args = Args::parse();
    let files = collect_input_files(&args.inputs);

    if files.is_empty() {
        eprintln!(
            "{} no .rhm or .sspm files found in the given input(s)",
            "error:".red().bold()
        );
        return ExitCode::FAILURE;
    }

    let mut failures = 0usize;
    for file in &files {
        if let Err(err) = convert_one(file, args.output.as_deref(), args.verbose) {
            eprintln!("{} {}: {err}", "✗".red().bold(), file.display());
            failures += 1;
        }
    }

    let total = files.len();
    let ok = total - failures;
    println!();
    if failures == 0 {
        println!("{} {ok}/{total} converted", "done:".green().bold());
        ExitCode::SUCCESS
    } else {
        println!(
            "{} {ok}/{total} converted, {failures} failed",
            "done:".yellow().bold()
        );
        ExitCode::FAILURE
    }
}
