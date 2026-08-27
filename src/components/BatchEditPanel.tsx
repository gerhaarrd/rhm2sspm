import { useMemo, useState } from "react";
import type { QueueEntry } from "../types";
import { useTranslation } from "../lib/useTranslation";
import { IconX } from "./Icons";

const inputClass =
  "w-full rounded-lg bg-[rgb(var(--ink)/0.05)] px-3 py-1.5 text-sm text-[rgb(var(--ink)/0.9)] ring-1 ring-[rgb(var(--ink)/0.1)] outline-none transition focus:bg-[rgb(var(--ink)/0.08)] focus:ring-blue-500/40";

function displayTitle(entry: QueueEntry): string {
  return entry.overrides?.title ?? entry.preview?.title ?? "";
}

export function BatchEditPanel({
  entries,
  onApply,
  onClose,
}: {
  entries: QueueEntry[];
  onApply: (find: string, replace: string) => void;
  onClose: () => void;
}) {
  const { t, tn } = useTranslation();
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");

  const matchCount = useMemo(() => {
    if (!find) return 0;
    return entries.filter((e) => displayTitle(e).includes(find)).length;
  }, [entries, find]);

  const apply = () => {
    if (!find) return;
    onApply(find, replace);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-[rgb(var(--elevated))] p-4 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">
            {t("batchEdit.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-[rgb(var(--ink)/0.5)]">
          {t("batchEdit.description", { n: entries.length })}
        </p>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[rgb(var(--ink)/0.5)]">
              {t("batchEdit.find")}
            </span>
            <input
              autoFocus
              className={inputClass}
              placeholder={t("batchEdit.find.placeholder")}
              value={find}
              onChange={(e) => setFind(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-[rgb(var(--ink)/0.5)]">
              {t("batchEdit.replace")}
            </span>
            <input
              className={inputClass}
              placeholder={t("batchEdit.replace.placeholder")}
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
            />
          </label>
        </div>

        <p className="mt-3 text-xs text-[rgb(var(--ink)/0.4)]">
          {find ? tn("batchEdit.matchCount", matchCount) : t("batchEdit.matchCount.empty")}
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[rgb(var(--ink)/0.6)] transition hover:bg-[rgb(var(--ink)/0.06)]"
          >
            {t("editor.cancel")}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={matchCount === 0}
            className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("batchEdit.apply")}
          </button>
        </div>
      </div>
    </div>
  );
}
