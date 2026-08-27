import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateCheckResult =
  | { kind: "not-configured" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string; install: () => Promise<void> };

/**
 * Checks for an update via the `updater` plugin. Until `plugins.updater`
 * in tauri.conf.json has a real signing key and release endpoint (see
 * docs/auto-update.md), this always resolves to `not-configured` --
 * the plugin itself reports that cleanly rather than throwing, so
 * there's nothing unsafe about calling it now.
 */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const update = await check();
    if (!update) return { kind: "up-to-date" };
    return {
      kind: "available",
      version: update.version,
      install: async () => {
        await update.downloadAndInstall();
        await relaunch();
      },
    };
  } catch {
    // EmptyEndpoints / missing pubkey / no network -- all read the same
    // to the user: auto-update isn't set up yet.
    return { kind: "not-configured" };
  }
}
