import { useEffect, useRef, useState } from "react";
import type { QueueEntry } from "../types";
import { difficultyColor, difficultyName, formatBytes, formatDuration } from "../lib/format";
import { getAudioDataUrl } from "../lib/backend";
import { toast } from "../lib/toast";
import { useTranslation } from "../lib/useTranslation";
import { NoteDensity } from "./NoteDensity";
import {
  IconAlert,
  IconCheck,
  IconClock,
  IconExternal,
  IconMusic,
  IconPause,
  IconPencil,
  IconPlay,
  IconRefresh,
  IconSpinner,
  IconTrash,
} from "./Icons";

function Badge({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        className || "bg-[rgb(var(--ink)/0.06)] text-[rgb(var(--ink)/0.7)] ring-[rgb(var(--ink)/0.1)]"
      }`}
    >
      {children}
    </span>
  );
}

export function QueueItem({
  entry,
  isSelected,
  onSelect,
  onRemove,
  onReveal,
  onRetry,
  isPlaying,
  onTogglePlay,
  onEdit,
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
}) {
  const { t, tn } = useTranslation();
  const { preview, outcome, status, error, overrides } = entry;
  const fileLabel = entry.path.split(/[\\/]/).pop() ?? entry.path;

  const displayTitle = overrides?.title ?? preview?.title;
  const displayMappers = overrides?.mappers ?? preview?.mappers;
  const displaySongName = overrides?.songName ?? preview?.songName;
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
      className={`group flex items-center gap-4 rounded-2xl bg-[rgb(var(--ink)/0.03)] p-3 ring-1 transition hover:bg-[rgb(var(--ink)/0.05)] ${
        isSelected ? "ring-blue-500/50" : "ring-[rgb(var(--ink)/0.06)]"
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600/40 to-indigo-500/40 ring-1 ring-[rgb(var(--ink)/0.1)]">
        {preview?.coverDataUrl ? (
          <img src={preview.coverDataUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <IconMusic className="h-6 w-6 text-[rgb(var(--ink)/0.6)]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[rgb(var(--ink)/0.9)]">
          {displayTitle || fileLabel}
        </p>
        <p className="truncate text-xs text-[rgb(var(--ink)/0.45)]">
          {displayMappers?.length ? displayMappers.join(", ") : "—"}
          {displaySongName ? ` · ${displaySongName}` : ""}
        </p>

        {status === "error" ? (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
            <IconAlert className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{error}</span>
          </p>
        ) : status === "done" && outcome ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
            <IconCheck className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-emerald-300/90">{outcome.outputPath}</span>
          </p>
        ) : preview ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {preview.hasAudio && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void togglePlay();
                }}
                title={isPlaying ? t("queueItem.pausePreview") : t("queueItem.playPreview")}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-300 transition hover:bg-blue-500/30"
              >
                {isLoadingAudio ? (
                  <IconSpinner className="h-3 w-3" />
                ) : isPlaying ? (
                  <IconPause className="h-2.5 w-2.5" />
                ) : (
                  <IconPlay className="h-2.5 w-2.5" />
                )}
              </button>
            )}
            <NoteDensity density={preview.noteDensity} />
            <Badge className={difficultyColor(displayDifficulty)}>
              {difficultyName(displayDifficulty, displayCustomDiffName)}
            </Badge>
            {overrides && (
              <Badge className="bg-blue-500/15 text-blue-300 ring-blue-500/30">
                {t("queueItem.edited")}
              </Badge>
            )}
            <Badge>
              <IconClock className="h-3 w-3" /> {formatDuration(preview.durationMs)}
            </Badge>
            <Badge>{t("queueItem.notes", { n: preview.noteCount })}</Badge>
            {preview.timingPointsCount > 0 && (
              <Badge>{t("queueItem.timingPoints", { n: preview.timingPointsCount })}</Badge>
            )}
            <Badge>~{formatBytes(preview.outputBytes)}</Badge>
            {preview.warnings.length > 0 && (
              <Badge
                className="bg-orange-500/15 text-orange-300 ring-orange-500/30"
                title={preview.warnings.join("\n")}
              >
                <IconAlert className="h-3 w-3" /> {tn("queueItem.warnings", preview.warnings.length)}
              </Badge>
            )}
          </div>
        ) : (
          <div className="mt-1.5 h-4 w-40 animate-shimmer rounded bg-gradient-to-r from-[rgb(var(--ink)/0.05)] via-[rgb(var(--ink)/0.1)] to-[rgb(var(--ink)/0.05)]" />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {status === "loading" && <IconSpinner className="h-5 w-5 text-[rgb(var(--ink)/0.4)]" />}
        {status === "converting" && <IconSpinner className="h-5 w-5 text-blue-400" />}
        {status === "done" && outcome && (
          <>
            <span className="hidden text-xs text-[rgb(var(--ink)/0.35)] sm:inline">
              {formatBytes(outcome.outputBytes)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReveal(outcome.outputPath);
              }}
              title={t("queueItem.revealFolder")}
              className="rounded-lg p-2 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
            >
              <IconExternal className="h-4 w-4" />
            </button>
          </>
        )}
        {status === "error" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry(entry.id);
            }}
            title={t("queueItem.retry")}
            className="rounded-lg p-2 text-[rgb(var(--ink)/0.4)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconRefresh className="h-4 w-4" />
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
            className="rounded-lg p-2 text-[rgb(var(--ink)/0.4)] opacity-0 transition group-hover:opacity-100 hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconPencil className="h-4 w-4" />
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
            className="rounded-lg p-2 text-[rgb(var(--ink)/0.3)] opacity-0 transition group-hover:opacity-100 hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        )}
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
