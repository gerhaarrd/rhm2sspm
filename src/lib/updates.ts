import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export type UpdateCheckResult =
  | { kind: "not-configured" }
  | { kind: "up-to-date" }
  | { kind: "available"; version: string; install: () => Promise<void> };

/**
 * Checks for an update via the `updater` plugin. `plugins.updater` in
 * tauri.conf.json has a real signing key and points at this repo's
 * GitHub releases (see docs/auto-update.md) -- but until a release with
 * a signed `latest.json` is actually published, the endpoint 404s and
 * this falls back to `not-configured`, same as it would for a genuine
 * network error. Both read the same way to the user either way.
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
