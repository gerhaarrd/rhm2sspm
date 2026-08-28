import { useEffect, useMemo, useState } from "react";
import type { DetectedGame, InstalledMapSummary } from "../types";
import { getCapoMapCover, importCapoMaps, listCapoMaps, listFolderMaps } from "../lib/backend";
import { difficultyColor, difficultyName, formatDuration } from "../lib/format";
import { useTranslation } from "../lib/useTranslation";
import { toast } from "../lib/toast";
import {
  IconCheck,
  IconClock,
  IconDownload,
  IconGamepad,
  IconGrid,
  IconMusic,
  IconSearch,
  IconSpinner,
  IconX,
} from "./Icons";

export function InstalledMapsPanel({
  game,
  onImport,
  onClose,
}: {
  game: DetectedGame;
  onImport: (paths: string[]) => void;
  onClose: () => void;
}) {
  const { t, tn } = useTranslation();
  const [maps, setMaps] = useState<InstalledMapSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    setMaps(null);
    setError(null);
    setSelected(new Set());
    setCovers({});
    const load = game.source === "capo" ? listCapoMaps() : listFolderMaps(game.dir);
    void load.then(setMaps).catch((err) => setError(String(err)));
  }, [game]);

  // Folder games already have coverDataUrl inline; Capo's is deliberately
  // left out of the listing (real cover files run several MB each), so
  // fetch it lazily per map once the list is in, filling thumbnails in
  // progressively instead of blocking the whole picker on all of them.
  useEffect(() => {
    if (!maps) return;
    const inline: Record<string, string> = {};
    for (const m of maps) if (m.coverDataUrl) inline[m.id] = m.coverDataUrl;
    setCovers(inline);

    if (game.source !== "capo") return;
    let cancelled = false;

    // The real fix for the stutter was on the backend (get_capo_map_cover
    // now runs on tokio's blocking pool instead of tying up an async
    // worker thread each call) -- a small worker pool here is just to
    // avoid piling up ~100 requests at once.
    //
    // Applying each result to state immediately was its own source of
    // jank too -- ~100 individual re-renders of the whole list in quick
    // succession -- so results are buffered and flushed in small batches
    // instead of one setCovers call per cover.
    let pending: Record<string, string> = {};
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      flushTimer = null;
      if (cancelled || Object.keys(pending).length === 0) return;
      const batch = pending;
      pending = {};
      setCovers((prev) => ({ ...prev, ...batch }));
    };

    const queue = [...maps];
    const worker = async () => {
      while (!cancelled) {
        const m = queue.shift();
        if (!m) return;
        try {
          const url = await getCapoMapCover(m.id);
          if (!cancelled && url) {
            pending[m.id] = url;
            flushTimer ??= setTimeout(flush, 250);
          }
        } catch {
          // best-effort thumbnail -- a missing one just falls back to the icon
        }
      }
    };
    const CONCURRENCY = 4;
    void Promise.all(Array.from({ length: CONCURRENCY }, worker));

    return () => {
      cancelled = true;
      if (flushTimer) clearTimeout(flushTimer);
    };
  }, [maps, game.source]);

  const filtered = useMemo(() => {
    if (!maps) return [];
    const q = search.trim().toLowerCase();
    if (!q) return maps;
    return maps.filter(
      (m) =>
        m.title.toLowerCase().includes(q) || m.mappers.some((mp) => mp.toLowerCase().includes(q)),
    );
  }, [maps, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of filtered) next.add(m.id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const runImport = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    try {
      const ids = [...selected];
      const paths = game.source === "capo" ? await importCapoMaps(ids) : ids;
      onImport(paths);
      onClose();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[82vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-[rgb(var(--elevated))] shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]"
      >
        <div className="flex items-center justify-between border-b border-[rgb(var(--ink)/0.08)] px-4 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-900/30">
              <IconGamepad className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-[rgb(var(--ink)/0.9)]">
                {game.name}
              </span>
              <span className="block truncate text-xs text-[rgb(var(--ink)/0.45)]">
                {maps ? tn("installedGames.count", maps.length) : t("capoMaps.loading")}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        {error ? (
          <p className="px-4 py-8 text-center text-xs text-red-400">{error}</p>
        ) : maps === null ? (
          <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs text-[rgb(var(--ink)/0.45)]">
            <IconSpinner className="h-4 w-4" />
            {t("capoMaps.loading")}
          </div>
        ) : maps.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-[rgb(var(--ink)/0.5)]">
            {t("capoMaps.empty")}
          </p>
        ) : (
          <>
            <div className="border-b border-[rgb(var(--ink)/0.08)] px-4 py-3">
              <div className="relative">
                <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgb(var(--ink)/0.35)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("capoMaps.search")}
                  className="w-full rounded-lg bg-[rgb(var(--ink)/0.05)] py-1.5 pl-8 pr-3 text-xs text-[rgb(var(--ink)/0.85)] ring-1 ring-[rgb(var(--ink)/0.1)] placeholder:text-[rgb(var(--ink)/0.35)] focus:outline-none focus:ring-[rgb(var(--ink)/0.3)]"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-[rgb(var(--ink)/0.45)]">
                <span className={selected.size > 0 ? "font-medium text-[rgb(var(--ink)/0.7)]" : ""}>
                  {tn("capoMaps.selectedCount", selected.size)}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="underline decoration-dotted underline-offset-2 transition hover:text-[rgb(var(--ink)/0.85)]"
                  >
                    {t("capoMaps.selectAll")}
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="underline decoration-dotted underline-offset-2 transition hover:text-[rgb(var(--ink)/0.85)]"
                  >
                    {t("capoMaps.clearSelection")}
                  </button>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-xs text-[rgb(var(--ink)/0.5)]">
                  {t("capoMaps.none")}
                </p>
              ) : (
                filtered.map((m) => {
                  const isSelected = selected.has(m.id);
                  const cover = covers[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggle(m.id)}
                      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-xs ring-1 transition ${
                        isSelected
                          ? "bg-blue-500/10 ring-blue-500/40"
                          : "bg-[rgb(var(--ink)/0.03)] ring-[rgb(var(--ink)/0.07)] hover:bg-[rgb(var(--ink)/0.06)]"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md transition ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "ring-1 ring-[rgb(var(--ink)/0.25)]"
                        }`}
                      >
                        {isSelected && <IconCheck className="h-3 w-3" />}
                      </span>
                      <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[rgb(var(--ink)/0.08)] ring-1 ring-[rgb(var(--ink)/0.08)]">
                        {cover ? (
                          <img src={cover} alt="" className="h-full w-full object-cover" draggable={false} />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-[rgb(var(--ink)/0.25)]">
                            <IconMusic className="h-4 w-4" />
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate font-medium text-[rgb(var(--ink)/0.88)]">
                            {m.title}
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-[rgb(var(--ink)/0.45)]">
                          {m.mappers.join(", ") || "—"}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${difficultyColor(m.difficulty)}`}
                          >
                            {difficultyName(m.difficulty, m.customDifficultyName)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ink)/0.06)] px-2 py-0.5 text-[10px] font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-inset ring-[rgb(var(--ink)/0.1)]">
                            <IconClock className="h-2.5 w-2.5" /> {formatDuration(m.durationMs)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--ink)/0.06)] px-2 py-0.5 text-[10px] font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-inset ring-[rgb(var(--ink)/0.1)]">
                            <IconGrid className="h-2.5 w-2.5" /> {m.noteCount}
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="border-t border-[rgb(var(--ink)/0.08)] p-3">
              <button
                type="button"
                onClick={() => void runImport()}
                disabled={selected.size === 0 || importing}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-900/30 transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing ? (
                  <>
                    <IconSpinner className="h-3.5 w-3.5" /> {t("capoMaps.importing")}
                  </>
                ) : (
                  <>
                    <IconDownload className="h-3.5 w-3.5" />
                    {tn("capoMaps.importButton", selected.size)}
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
