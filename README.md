# rhm2sspm

Converts map files between [Rhythia](https://rhythia.com) `.rhm`/`.phxm`, [Nova](https://pyrama.itch.io/nova) `.npk`, and [Sound Space+](https://ssplus.co) `.sspm` — any format to any other. Timing offsets and off-grid ("quantum") notes are preserved exactly; nothing gets rounded or silently dropped.

A native desktop app (Windows + Linux) with drag-and-drop, batch conversion, metadata editing, history, and auto-update — plus a CLI and a Rust library for anyone who wants to build on top of the conversion logic directly. Available in English, Portuguese and Spanish.

Desktop app highlights:
- Pick the output format per file (any of the four), or convert one file to all three other formats at once
- List/grid view, pinning, and the queue survives closing and reopening the app
- Batch find-and-replace across queued titles (e.g. strip `ft. X`)
- Shift a chart's notes by N ms to fix audio desync
- Warns if a file was already converted before
- Double-click a `.rhm`/`.phxm`/`.npk`/`.sspm` file (or "Open with…") to launch straight into the queue, or drop in a `.zip` pack to queue everything inside it
- Browse maps already installed by a detected Rhythia/Nova install and queue them directly
- Compare two files of "the same" map (e.g. two exports) to see exactly how their notes differ
- Export bundles a `README.txt` describing the pack alongside the maps
- Every write is re-read and verified before being reported as done
- Shows what's new after an auto-update installs

## Install (desktop app)

Grab the latest installer from [Releases](https://github.com/gerhaarrd/rhm2sspm/releases):

- **Windows**: `rhm2sspm_x64-setup.exe` or `rhm2sspm_x64_en-US.msi`
- **Linux**: `rhm2sspm_amd64.AppImage` or `rhm2sspm_amd64.deb`

The Windows and Linux builds aren't code-signed yet, so Windows SmartScreen may warn on first run — click "More info" → "Run anyway".

**Linux audio preview**: the in-app audio player uses GStreamer through WebKitGTK. If preview playback stays silent, install the plugin packages for your distro, e.g. on Arch/CachyOS:

```bash
sudo pacman -S --needed gst-plugins-base gst-plugins-good gst-plugins-bad gst-plugins-ugly gst-libav gst-plugin-pipewire
```

## What's preserved

- **Note timing**: stored as absolute milliseconds across every source format, so offsets are copied as-is — no unit conversion, no rounding error.
- **Quantum notes**: off-grid notes keep their exact float position via SSPM's float32 marker encoding, instead of being snapped to the 3x3 grid.
- **BPM/timing points, tags, online id/status**: fields SSPM has no native slot for are packed into an SSPM custom-data field, and restored if you convert that `.sspm` back to `.rhm`.
- **`.npk`'s tempo events**: mapped onto the same timing-point concept as `.rhm`; any `beats`/`glides`/other event types (which have no RHM/SSPM equivalent) are preserved verbatim in custom data rather than dropped, even though Sound Space+ won't render them.
- **Cover art of any format**: `.phxm`/`.npk` both require the cover to actually be PNG data, so a non-PNG cover (e.g. a JPEG from a `.rhm` source) is transcoded rather than dropped or shipped mislabeled.

`.phxm` support is implemented straight from the game's own source ([`Rhythia/Client`](https://github.com/Rhythia/Client)) -- reading and writing. `.npk` was reverse engineered from a single real sample file (no public spec exists) -- treat it as best-effort -- but a file produced by this tool has been confirmed to actually import and play in the real game (Nova auto-imports anything dropped into its `queued` folder, which made this possible to test directly).

## CLI

```bash
rhm2sspm [OPTIONS] <INPUTS>...

Arguments:
  <INPUTS>...  .rhm/.phxm/.npk/.sspm files, or directories to scan recursively

Options:
  -o, --output <OUTPUT>        Write converted files here instead of next to each input
  -t, --to <rhm|phxm|npk|sspm> Target format (default: .sspm, or .rhm for .sspm inputs)
      --check                 Validate every conversion without writing anything to disk
      --offset-ms <MS>        Shift every note and timing point by this many ms
  -v, --verbose                Print per-map details (note count, quantum notes, duration, media)
```

Defaults to whichever direction matches each input file's extension (`.sspm` in, `.rhm` out; anything else in, `.sspm` out); pass `--to` to convert to any of the four formats explicitly, e.g. `rhm2sspm song.rhm --to phxm`. Mixed batches and directories are converted in parallel, and every output is re-parsed to verify it before being reported as written.

## Building from source

Requires Rust (stable) and Node.js 20+.

```bash
# CLI
cargo build --release -p rhm2sspm

# Desktop app
npm ci
npm run tauri build
```

On Linux you'll also need the WebKitGTK/Tauri system dependencies (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml) for the exact package list).

## License

[MIT](LICENSE) — do whatever you want with this, just keep the credit.
