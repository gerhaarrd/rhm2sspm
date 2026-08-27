// Prevents an additional console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // WebKitGTK's DMA-BUF/GBM compositing path fails to negotiate a buffer
    // on a number of real Wayland setups (observed with NVIDIA's driver),
    // crashing the window on launch with "Error 71 (Protocol error)
    // dispatching to Wayland display" or a stream of "Failed to create GBM
    // buffer" errors. This UI has no need for GPU-composited video/canvas
    // layers, so disabling that path costs nothing and avoids the crash.
    // Must be set before Tauri/GTK initializes anything.
    #[cfg(target_os = "linux")]
    {
        // SAFETY: single-threaded, before any other code touches the env.
        unsafe {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
    }

    rhm2sspm_gui_lib::run();
}
