import { useEffect, useRef, useState } from "react";
import type { MapFormat, QueueEntry } from "../types";
import { difficultyColor, difficultyName, formatDuration } from "../lib/format";
import { getAudioDataUrl } from "../lib/backend";
import { MAP_FORMATS, sourceFormatFromPath } from "../lib/mapFormat";
import { toast } from "../lib/toast";
import { useTranslation } from "../lib/useTranslation";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconExternal,
  IconLayers,
  IconMusic,
  IconPause,
  IconPencil,
  IconPin,
  IconPlay,
  IconRefresh,
  IconSpinner,
  IconTrash,
} from "./Icons";

/** Compact card counterpart to `QueueItem`, for the grid view -- same
 * actions, laid out around a bigger cover instead of a row. */
export function QueueItemGrid({
  entry,
  isSelected,
  onSelect,
  onRemove,
  onReveal,
  onRetry,
  isPlaying,
  onTogglePlay,
  onEdit,
  onTargetFormatChange,
  onConvertToAllFormats,
  onTogglePin,
}: {
  entry: QueueEntry;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onReveal: (path: string) => void;
  onRetry: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: (id: string) => void;
  onEdit: (id: string) => void;
  onTargetFormatChange: (id: string, format: MapFormat) => void;
  onConvertToAllFormats: (id: string) => Promise<void>;
  onTogglePin: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { preview, outcome, status, error, overrides, targetFormat, pinned } = entry;
  const fileLabel = entry.path.split(/[\\/]/).pop() ?? entry.path;
  const sourceFormat = sourceFormatFromPath(entry.path);
  const canPickFormat = status === "ready" || status === "error";
  const [isConvertingAll, setIsConvertingAll] = useState(false);

  const displayTitle = overrides?.title ?? preview?.title;
  const displayDifficulty = overrides?.difficulty ?? preview?.difficulty ?? 0;
  const displayCustomDiffName = overrides?.customDifficultyName ?? preview?.customDifficultyName ?? "";

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!isPlaying) audioRef.current?.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioUrl && isPlaying) audioRef.current?.play();
  }, [audioUrl, isPlaying]);

  const togglePlay = async () => {
    if (isPlaying) {
      onTogglePlay(entry.id);
      return;
    }
    if (audioUrl) {
      onTogglePlay(entry.id);
      audioRef.current?.play();
      return;
    }
    setIsLoadingAudio(true);
    try {
      const url = await getAudioDataUrl(entry.path);
      if (!url) {
        toast.error(t("toast.audioMissing"));
        return;
      }
      setAudioUrl(url);
      onTogglePlay(entry.id);
    } catch (err) {
      toast.error(t("toast.audioLoadFailed", { error: String(err) }));
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <li
      onClick={() => onSelect(entry.id)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl ring-1 transition hover:bg-[rgb(var(--ink)/0.05)] ${
        pinned ? "bg-amber-500/[0.04]" : "bg-[rgb(var(--ink)/0.03)]"
      } ${isSelected ? "ring-blue-500/50" : pinned ? "ring-amber-500/25" : "ring-[rgb(var(--ink)/0.06)]"}`}
    >
      <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-gradient-to-br from-blue-600/40 to-indigo-500/40">
        {preview?.coverDataUrl ? (
          <img src={preview.coverDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <IconMusic className="h-8 w-8 text-[rgb(var(--ink)/0.6)]" />
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(entry.id);
          }}
          title={pinned ? t("queueItem.unpin") : t("queueItem.pin")}
          className={`absolute right-1.5 top-1.5 rounded-lg bg-black/40 p-1.5 backdrop-blur transition hover:bg-black/60 ${
            pinned ? "text-amber-400" : "text-white/70 opacity-0 group-hover:opacity-100"
          }`}
        >
          <IconPin className="h-3.5 w-3.5" filled={pinned} />
        </button>
        {preview?.hasAudio && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void togglePlay();
            }}
            title={isPlaying ? t("queueItem.pausePreview") : t("queueItem.playPreview")}
            className="absolute bottom-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-blue-200 backdrop-blur transition hover:bg-black/70"
          >
            {isLoadingAudio ? (
              <IconSpinner className="h-3 w-3" />
            ) : isPlaying ? (
              <IconPause className="h-3 w-3" />
            ) : (
              <IconPlay className="h-3 w-3" />
            )}
          </button>
        )}
        {(status === "loading" || status === "converting") && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <IconSpinner
              className={`h-6 w-6 ${status === "converting" ? "text-blue-300" : "text-white/70"}`}
            />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 p-2.5">
        <p className="truncate text-xs font-semibold text-[rgb(var(--ink)/0.9)]" title={displayTitle}>
          {displayTitle || fileLabel}
        </p>

        {status === "error" ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-400">
            <IconAlert className="h-3 w-3 shrink-0" />
            <span className="truncate">{error}</span>
          </p>
        ) : status === "done" && outcome ? (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
            <IconCheck className="h-3 w-3 shrink-0" />
            <span>{t("queueItem.notes", { n: outcome.noteCount })}</span>
          </p>
        ) : preview ? (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${difficultyColor(displayDifficulty)}`}
            >
              {difficultyName(displayDifficulty, displayCustomDiffName)}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-[rgb(var(--ink)/0.5)]">
              <IconClock className="h-2.5 w-2.5" /> {formatDuration(preview.durationMs)}
            </span>
          </div>
        ) : (
          <div className="mt-1 h-3 w-24 animate-shimmer rounded bg-gradient-to-r from-[rgb(var(--ink)/0.05)] via-[rgb(var(--ink)/0.1)] to-[rgb(var(--ink)/0.05)]" />
        )}

        <div className="mt-2 flex items-center gap-1">
          <select
            value={targetFormat}
            disabled={!canPickFormat}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => onTargetFormatChange(entry.id, e.target.value as MapFormat)}
            title={t("queueItem.targetFormat.tooltip")}
            className="min-w-0 flex-1 rounded-lg bg-[rgb(var(--ink)/0.06)] px-1.5 py-1 text-[10px] font-medium text-[rgb(var(--ink)/0.7)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.1)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {MAP_FORMATS.filter((f) => f !== sourceFormat).map((f) => (
              <option key={f} value={f}>
                .{f}
              </option>
            ))}
          </select>
          {canPickFormat && (
            <button
              type="button"
              disabled={isConvertingAll}
              onClick={async (e) => {
                e.stopPropagation();
                setIsConvertingAll(true);
                try {
                  await onConvertToAllFormats(entry.id);
                } finally {
                  setIsConvertingAll(false);
                }
              }}
              title={t("queueItem.convertAllFormats.tooltip")}
              className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isConvertingAll ? (
                <IconSpinner className="h-3.5 w-3.5" />
              ) : (
                <IconLayers className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {status === "done" && outcome && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReveal(outcome.outputPath);
              }}
              title={t("queueItem.revealFolder")}
              className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
            >
              <IconExternal className="h-3.5 w-3.5" />
            </button>
          )}
          {status === "error" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry(entry.id);
              }}
              title={t("queueItem.retry")}
              className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
            >
              <IconRefresh className="h-3.5 w-3.5" />
            </button>
          )}
          {preview && status !== "converting" && status !== "loading" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(entry.id);
              }}
              title={t("queueItem.editMetadata")}
              className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </button>
          )}
          {status !== "converting" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }}
              title={t("queueItem.remove")}
              className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.3)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => onTogglePlay(entry.id)}
          className="hidden"
        />
      )}
    </li>
  );
}
