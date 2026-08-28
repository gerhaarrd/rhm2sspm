import { useEffect, useState } from "react";
import type { DetectedGame } from "../types";
import { detectInstalledGames } from "../lib/backend";
import { useTranslation } from "../lib/useTranslation";
import { IconChevronRight, IconFolder, IconSpinner, IconX } from "./Icons";

export function InstalledGamesPanel({
  onPickGame,
  onClose,
}: {
  /** Every source (folder-scanned or Capo alike) opens the same picker
   * modal to choose which maps to actually queue -- see InstalledMapsPanel. */
  onPickGame: (game: DetectedGame) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [games, setGames] = useState<DetectedGame[] | null>(null);

  useEffect(() => {
    void detectInstalledGames().then(setGames);
  }, []);

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
            {t("installedGames.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {games === null ? (
          <div className="flex items-center justify-center py-6">
            <IconSpinner className="h-5 w-5 text-[rgb(var(--ink)/0.4)]" />
          </div>
        ) : games.length === 0 ? (
          <p className="py-4 text-center text-xs text-[rgb(var(--ink)/0.5)]">
            {t("installedGames.none")}
          </p>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <button
                key={game.dir}
                type="button"
                onClick={() => onPickGame(game)}
                className="flex w-full items-center gap-3 rounded-lg bg-[rgb(var(--ink)/0.05)] px-3 py-2.5 text-left text-sm ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.08)]"
              >
                <IconFolder className="h-4 w-4 shrink-0 text-[rgb(var(--ink)/0.4)]" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-[rgb(var(--ink)/0.85)]">{game.name}</span>
                  <span className="block truncate text-xs text-[rgb(var(--ink)/0.4)]">{game.dir}</span>
                </span>
                <IconChevronRight className="h-4 w-4 shrink-0 text-[rgb(var(--ink)/0.3)]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
