import type { HistoryEntry } from "../types";

const OUTPUT_DIR_KEY = "rhm2sspm.outputDir";
const HISTORY_KEY = "rhm2sspm.history";
const HISTORY_LIMIT = 200;

export function loadOutputDir(): string | null {
  try {
    return localStorage.getItem(OUTPUT_DIR_KEY);
  } catch {
    return null;
  }
}

export function saveOutputDir(dir: string | null) {
  try {
    if (dir) localStorage.setItem(OUTPUT_DIR_KEY, dir);
    else localStorage.removeItem(OUTPUT_DIR_KEY);
  } catch {
    // best-effort; e.g. private browsing contexts may throw
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
