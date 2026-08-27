import { t } from "./i18n";

export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}

const DIFFICULTY_COUNT = 5;

/** The 5 preset difficulty names in the current language, in order. */
export function difficultyLevels(): string[] {
  return Array.from({ length: DIFFICULTY_COUNT }, (_, i) => t(`difficulty.${i}`));
}

export function difficultyName(difficulty: number, custom: string): string {
  if (custom.trim()) return custom;
  if (difficulty >= 0 && difficulty < DIFFICULTY_COUNT) return t(`difficulty.${difficulty}`);
  return t("difficulty.fallback", { n: difficulty });
}

const DIFFICULTY_COLORS = [
  "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  "bg-sky-500/15 text-sky-300 ring-sky-500/30",
  "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  "bg-rose-500/15 text-rose-300 ring-rose-500/30",
  "bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/30",
];

export function difficultyColor(difficulty: number): string {
  return (
    DIFFICULTY_COLORS[difficulty] ??
    "bg-[rgb(var(--ink)/0.1)] text-[rgb(var(--ink)/0.7)] ring-[rgb(var(--ink)/0.2)]"
  );
}
