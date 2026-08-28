import { useState } from "react";
import type { CompareReport } from "../types";
import { compareMaps, pickSingleMapFile } from "../lib/backend";
import { formatDuration } from "../lib/format";
import { useTranslation } from "../lib/useTranslation";
import { toast } from "../lib/toast";
import { IconCheck, IconFolder, IconX } from "./Icons";

function PathPicker({
  label,
  path,
  onPick,
}: {
  label: string;
  path: string | null;
  onPick: () => void;
}) {
  const fileLabel = path?.split(/[\\/]/).pop();
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-full items-center gap-2 rounded-lg bg-[rgb(var(--ink)/0.05)] px-3 py-2 text-left text-xs ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.08)]"
    >
      <IconFolder className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--ink)/0.4)]" />
      <span className="min-w-0 flex-1 truncate">
        {fileLabel ?? <span className="text-[rgb(var(--ink)/0.4)]">{label}</span>}
      </span>
    </button>
  );
}

export function ComparePanel({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const [pathA, setPathA] = useState<string | null>(null);
  const [pathB, setPathB] = useState<string | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const pick = async (which: "a" | "b") => {
    const path = await pickSingleMapFile();
    if (!path) return;
    if (which === "a") setPathA(path);
    else setPathB(path);
    setReport(null);
  };

  const runCompare = async () => {
    if (!pathA || !pathB) return;
    setIsComparing(true);
    try {
      setReport(await compareMaps(pathA, pathB));
    } catch (err) {
      toast.error(String(err));
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-[rgb(var(--elevated))] p-4 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">{t("compare.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <PathPicker label={t("compare.pickA")} path={pathA} onPick={() => void pick("a")} />
          <PathPicker label={t("compare.pickB")} path={pathB} onPick={() => void pick("b")} />
        </div>

        <button
          type="button"
          onClick={() => void runCompare()}
          disabled={!pathA || !pathB || isComparing}
          className="mt-3 w-full rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isComparing ? t("compare.comparing") : t("compare.run")}
        </button>

        {report && (
          <div className="mt-4 space-y-3 rounded-lg bg-[rgb(var(--ink)/0.04)] p-3 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-[rgb(var(--ink)/0.85)]">{report.a.title}</p>
                <p className="text-[rgb(var(--ink)/0.5)]">
                  {t("compare.stats", {
                    notes: report.a.noteCount,
                    quantum: report.a.quantumNoteCount,
                    duration: formatDuration(report.a.durationMs),
                  })}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[rgb(var(--ink)/0.85)]">{report.b.title}</p>
                <p className="text-[rgb(var(--ink)/0.5)]">
                  {t("compare.stats", {
                    notes: report.b.noteCount,
                    quantum: report.b.quantumNoteCount,
                    duration: formatDuration(report.b.durationMs),
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-t border-[rgb(var(--ink)/0.08)] pt-2">
              {report.onlyInA === 0 && report.onlyInB === 0 ? (
                <>
                  <IconCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-300/90">{t("compare.identical")}</span>
                </>
              ) : (
                <span className="text-[rgb(var(--ink)/0.7)]">
                  {t("compare.diff", {
                    matching: report.matchingNotes,
                    onlyA: report.onlyInA,
                    onlyB: report.onlyInB,
                  })}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
