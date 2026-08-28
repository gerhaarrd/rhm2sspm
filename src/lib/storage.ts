import type { HistoryEntry, PersistedQueueEntry } from "../types";

const OUTPUT_DIR_KEY = "rhm2sspm.outputDir";
const RECENT_OUTPUT_DIRS_KEY = "rhm2sspm.recentOutputDirs";
const RECENT_OUTPUT_DIRS_LIMIT = 6;
const HISTORY_KEY = "rhm2sspm.history";
const HISTORY_LIMIT = 200;
const QUEUE_KEY = "rhm2sspm.queue";
const ONBOARDED_KEY = "rhm2sspm.onboarded";
const LAST_SEEN_VERSION_KEY = "rhm2sspm.lastSeenVersion";
const VIEW_MODE_KEY = "rhm2sspm.viewMode";

export function loadOutputDir(): string | null {
  try {
    return localStorage.getItem(OUTPUT_DIR_KEY);
  } catch {
    return null;
  }
}

export function saveOutputDir(dir: string | null) {
  try {
    if (dir) {
      localStorage.setItem(OUTPUT_DIR_KEY, dir);
      const recent = [dir, ...loadRecentOutputDirs().filter((d) => d !== dir)].slice(
        0,
        RECENT_OUTPUT_DIRS_LIMIT,
      );
      localStorage.setItem(RECENT_OUTPUT_DIRS_KEY, JSON.stringify(recent));
    } else {
      localStorage.removeItem(OUTPUT_DIR_KEY);
    }
  } catch {
    // best-effort; e.g. private browsing contexts may throw
  }
}

export function loadRecentOutputDirs(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_OUTPUT_DIRS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
  return next;
}

export function clearHistory() {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // best-effort
  }
}

/** Just enough per-entry state to re-queue on next launch -- previews,
 * audio, and outcomes are re-fetched/re-run fresh, not persisted. */
export function loadQueue(): PersistedQueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PersistedQueueEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveQueue(entries: PersistedQueueEntry[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // best-effort
  }
}

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return true; // don't nag if storage is unavailable
  }
}

export function markOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // best-effort
  }
}

export function loadViewMode(): "list" | "grid" {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function saveViewMode(mode: "list" | "grid") {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // best-effort
  }
}

/** Returns the previously-recorded app version (null on first ever
 * launch), then updates the record to `currentVersion`. */
export function checkAndUpdateLastSeenVersion(currentVersion: string): string | null {
  try {
    const previous = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
    return previous;
  } catch {
    return currentVersion; // pretend nothing changed if storage is unavailable
  }
}
