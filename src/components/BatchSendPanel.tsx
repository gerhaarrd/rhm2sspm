import type { MapBatch } from "../types";
import { useTranslation } from "../lib/useTranslation";
import { IconAlert, IconFolder, IconX } from "./Icons";

export type BatchTarget = "steam" | "chromia";

/** Shown after sending the whole queue to a game at once. For Steam
 * Rhythia the batch folder is already open and the user still has to drag
 * it into the game; for Chromia the maps are already installed in its
 * library, so this is just a confirmation. */
export function BatchSendPanel({
  target,
  batch,
  onOpenFolder,
  onClose,
}: {
  target: BatchTarget;
  batch: MapBatch;
  onOpenFolder: () => void;
  onClose: () => void;
}) {
  const { t, tn } = useTranslation();
  const prefix = target === "steam" ? "steamImport" : "chromiaInstall";
  const steps =
    target === "steam"
      ? ["steamImport.step1", "steamImport.step2", "steamImport.step3"]
      : ["chromiaInstall.step1"];

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
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">
            {tn(`${prefix}.title`, batch.files.length)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {batch.files.length > 0 && (
          <ol className="mb-3 space-y-2">
            {steps.map((key, i) => (
              <li key={key} className="flex gap-2 text-xs text-[rgb(var(--ink)/0.75)]">
                {steps.length > 1 && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-[10px] font-semibold text-blue-400">
                    {i + 1}
                  </span>
                )}
                <span className="pt-0.5">{t(key)}</span>
              </li>
            ))}
          </ol>
        )}

        {batch.failures.length > 0 && (
          <div className="mb-3 rounded-lg bg-red-500/10 p-2 ring-1 ring-red-500/20">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-red-400">
              <IconAlert className="h-3.5 w-3.5" />
              {tn("steamImport.failures", batch.failures.length)}
            </p>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto text-[11px] text-[rgb(var(--ink)/0.6)]">
              {batch.failures.map((f) => (
                <li key={f.path} className="truncate" title={`${f.path}: ${f.error}`}>
                  {f.path.split(/[\\/]/).pop()}: {f.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {batch.files.length > 0 && (
            <button
              type="button"
              onClick={onOpenFolder}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--ink)/0.7)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)]"
            >
              <IconFolder className="h-3.5 w-3.5" />
              {t(`${prefix}.openFolder`)}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-2 text-xs font-semibold text-white"
          >
            {t("steamImport.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
