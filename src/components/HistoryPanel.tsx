import type { HistoryEntry } from "../types";
import { formatDuration } from "../lib/format";
import { useTranslation } from "../lib/useTranslation";
import { IconExternal, IconRefresh, IconTrash, IconX } from "./Icons";

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryPanel({
  entries,
  onClose,
  onRequeue,
  onReveal,
  onClear,
}: {
  entries: HistoryEntry[];
  onClose: () => void;
  onRequeue: (inputPath: string) => void;
  onReveal: (path: string) => void;
  onClear: () => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="absolute inset-0 z-30 flex justify-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full w-full max-w-sm flex-col border-l border-[rgb(var(--ink)/0.1)] bg-[rgb(var(--elevated))] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[rgb(var(--ink)/0.06)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">{t("history.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="flex flex-1 items-center justify-center px-6 text-center text-sm text-[rgb(var(--ink)/0.35)]">
            {t("history.empty")}
          </p>
        ) : (
          <ul className="flex-1 space-y-1.5 overflow-y-auto p-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl bg-[rgb(var(--ink)/0.03)] p-2.5 ring-1 ring-[rgb(var(--ink)/0.06)]"
              >
                <p className="truncate text-sm font-medium text-[rgb(var(--ink)/0.85)]">{entry.title}</p>
                <p className="mt-0.5 text-xs text-[rgb(var(--ink)/0.4)]">
                  {formatWhen(entry.convertedAt, locale)} · {t("queueItem.notes", { n: entry.noteCount })} ·{" "}
                  {formatDuration(entry.durationMs)}
                </p>
                <div className="mt-1.5 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onRequeue(entry.inputPath)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--ink)/0.6)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
                  >
                    <IconRefresh className="h-3 w-3" /> {t("history.requeue")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onReveal(entry.outputPath)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[rgb(var(--ink)/0.6)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
                  >
                    <IconExternal className="h-3 w-3" /> {t("history.openFolder")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <div className="border-t border-[rgb(var(--ink)/0.06)] p-3">
            <button
              type="button"
              onClick={onClear}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-300/80 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <IconTrash className="h-3.5 w-3.5" /> {t("history.clear")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
