# rhm2sspm

Converts [Rhythia](https://rhythia.com) `.rhm` maps to [Sound Space+](https://ssplus.co) `.sspm` — and back. Timing offsets and off-grid ("quantum") notes are preserved exactly; nothing gets rounded or silently dropped.

A native desktop app (Windows + Linux) with drag-and-drop, batch conversion, metadata editing, and history — plus a CLI and a Rust library for anyone who wants to build on top of the conversion logic directly.

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

- **Note timing**: both formats store absolute milliseconds, so offsets are copied as-is — no unit conversion, no rounding error.
- **Quantum notes**: off-grid notes keep their exact float position via SSPM's float32 marker encoding, instead of being snapped to the 3x3 grid.
- **BPM/timing points, tags, online id/status**: fields SSPM has no native slot for are packed into an SSPM custom-data field, and restored if you convert that `.sspm` back to `.rhm`.

## CLI

```bash
rhm2sspm [OPTIONS] <INPUTS>...

Arguments:
  <INPUTS>...  .rhm/.sspm files, or directories to scan recursively

Options:
  -o, --output <OUTPUT>  Write converted files here instead of next to each input
  -v, --verbose          Print per-map details (note count, quantum notes, duration, media)
```

Converts in whichever direction matches each input file's extension; mixed batches and directories work.

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
