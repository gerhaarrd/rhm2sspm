use std::fs;
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::atomic::{AtomicUsize, Ordering};

use anstream::{eprintln, println};
use anyhow::Context;
use clap::{Parser, ValueEnum};
use owo_colors::OwoColorize;
use rayon::prelude::*;
use rhmsspm_core::MapFormat;

#[derive(Clone, Copy, Debug, ValueEnum)]
#[value(rename_all = "lower")]
enum FormatArg {
    Rhm,
    Phxm,
    Npk,
    Sspm,
}

impl From<FormatArg> for MapFormat {
    fn from(value: FormatArg) -> Self {
        match value {
            FormatArg::Rhm => MapFormat::Rhm,
            FormatArg::Phxm => MapFormat::Phxm,
            FormatArg::Npk => MapFormat::Npk,
            FormatArg::Sspm => MapFormat::Sspm,
        }
    }
}

/// Convert Rhythia .rhm/.phxm and Nova .npk maps to .sspm (Sound Space+)
/// and back, or freely between any of the four. Target format defaults
/// to .sspm (or .rhm, for .sspm inputs) unless --to is given.
#[derive(Parser)]
#[command(name = "rhm2sspm", version, about)]
struct Args {
    /// .rhm/.phxm/.npk/.sspm files, or directories to scan recursively.
    #[arg(required = true)]
    inputs: Vec<PathBuf>,

    /// Write converted files here instead of next to each input.
    #[arg(short, long)]
    output: Option<PathBuf>,

    /// Target format. Defaults to .sspm, or .rhm when converting *from*
    /// .sspm -- pass explicitly to convert to .phxm/.npk, or to override
    /// the default in either direction.
    #[arg(short = 't', long, value_enum)]
    to: Option<FormatArg>,

    /// Validate that each conversion would succeed (parse, convert,
    /// re-parse the result) without writing anything to disk.
    #[arg(long)]
    check: bool,

    /// Shift every note and timing point by this many milliseconds
    /// (negative moves everything earlier) -- fixes a chart that's out
    /// of sync with its audio.
    #[arg(long, allow_hyphen_values = true)]
    offset_ms: Option<i64>,

    /// Print per-map details (note count, quantum notes, duration, media).
    #[arg(short, long)]
    verbose: bool,
}

fn is_convertible(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .and_then(MapFormat::from_ext)
        .is_some()
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

fn convert_one(
    path: &Path,
    output_dir: Option<&Path>,
    to: Option<MapFormat>,
    offset_ms: Option<i64>,
    check: bool,
    verbose: bool,
) -> anyhow::Result<()> {
    let source = path
        .extension()
        .and_then(|e| e.to_str())
        .and_then(MapFormat::from_ext)
        .unwrap_or(MapFormat::Rhm);
    let target = to.unwrap_or_else(|| MapFormat::default_target(source));

    let bytes = fs::read(path)?;
    let mut rhm = rhmsspm_core::read_any(source, &bytes)?;
    if let Some(offset) = offset_ms {
        rhmsspm_core::shift_notes(&mut rhm.map, offset);
    }

    let summary = format!(
        "{} notes={} quantum={} duration={}ms audio={} cover={} timing_points={}",
        rhm.map.title,
        rhm.map.notes.len(),
        rhm.map
            .notes
            .iter()
            .filter(|n| !n.is_grid_aligned())
            .count(),
        rhm.map.duration,
        if rhm.audio.is_empty() { "no" } else { "yes" },
        if rhm.cover.is_empty() { "no" } else { "yes" },
        rhm.map.timing_points.len(),
    );
    let file_name = rhmsspm_core::output_file_name(path, target.ext());
    let output = rhmsspm_core::write_any(target, rhm)?;

    // Verify the bytes we're about to hand off actually parse back --
    // catches writer bugs the same way a corrupt-on-disk file would,
    // before it ever touches the filesystem (or in --check mode, at all).
    rhmsspm_core::read_any(target, &output)
        .context("converted output failed to verify (re-parse)")?;

    if check {
        println!(
            "{} {} {}",
            "✓".green().bold(),
            path.display(),
            format!("(check: would write {file_name}, {} bytes)", output.len()).dimmed()
        );
        if verbose {
            println!("  {}", summary.dimmed());
        }
        return Ok(());
    }

    let out_path = match output_dir {
        Some(dir) => {
            fs::create_dir_all(dir)?;
            dir.join(file_name)
        }
        None => path.with_file_name(file_name),
    };
    if out_path == path {
        anyhow::bail!(
            "refusing to overwrite the input ({} -> same path); pick a different --to format or --output directory",
            path.display()
        );
    }
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
            "{} no .rhm, .phxm, .npk or .sspm files found in the given input(s)",
            "error:".red().bold()
        );
        return ExitCode::FAILURE;
    }

    let to = args.to.map(MapFormat::from);
    let failures = AtomicUsize::new(0);
    files.par_iter().for_each(|file| {
        if let Err(err) = convert_one(
            file,
            args.output.as_deref(),
            to,
            args.offset_ms,
            args.check,
            args.verbose,
        ) {
            eprintln!("{} {}: {err}", "✗".red().bold(), file.display());
            failures.fetch_add(1, Ordering::Relaxed);
        }
    });

    let failures = failures.load(Ordering::Relaxed);
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
