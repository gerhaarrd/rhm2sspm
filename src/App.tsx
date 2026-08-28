import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  convertMapFile,
  exportZip,
  extractZipMaps,
  getBuildInfo,
  getLaunchFiles,
  pickMapFiles,
  pickOutputFolder,
  pickZipDestination,
  pickZipToImport,
  previewMap,
  resolveMapPaths,
} from "./lib/backend";
import {
  appendHistory,
  checkAndUpdateLastSeenVersion,
  clearHistory,
  hasSeenOnboarding,
  loadHistory,
  loadOutputDir,
  loadQueue,
  loadRecentOutputDirs,
  loadViewMode,
  markOnboardingSeen,
  saveOutputDir,
  saveQueue,
  saveViewMode,
} from "./lib/storage";
import { defaultTargetFormat, MAP_FORMATS, sourceFormatFromPath } from "./lib/mapFormat";
import { applyTheme, loadTheme, saveTheme, type ThemeMode } from "./lib/theme";
import type { Locale } from "./lib/i18n";
import { setLocale } from "./lib/i18n";
import { useTranslation } from "./lib/useTranslation";
import { checkForUpdate } from "./lib/updates";
import { toast } from "./lib/toast";
import { Dropzone } from "./components/Dropzone";
import { HistoryPanel } from "./components/HistoryPanel";
import { BatchEditPanel } from "./components/BatchEditPanel";
import { ChangelogPopup } from "./components/ChangelogPopup";
import { ComparePanel } from "./components/ComparePanel";
import { InstalledGamesPanel } from "./components/InstalledGamesPanel";
import { Onboarding } from "./components/Onboarding";
import { CHANGELOG } from "./lib/changelog";
import { MetadataEditor } from "./components/MetadataEditor";
import { QueueItem } from "./components/QueueItem";
import { QueueItemGrid } from "./components/QueueItemGrid";
import { QueueToolbar, type SortKey, type ViewMode } from "./components/QueueToolbar";
import { SessionStats } from "./components/SessionStats";
import { Toaster } from "./components/Toaster";
import {
  IconArchive,
  IconBolt,
  IconClock,
  IconCompare,
  IconDownload,
  IconFileZip,
  IconFolder,
  IconGamepad,
  IconGlobe,
  IconGrid,
  IconMonitor,
  IconMoon,
  IconMore,
  IconPencil,
  IconSpinner,
  IconSun,
  IconUpload,
} from "./components/Icons";
import type { HistoryEntry, MapFormat, MetadataOverrides, QueueEntry } from "./types";

const THEME_CYCLE: ThemeMode[] = ["dark", "light", "system"];
const THEME_ICON: Record<ThemeMode, typeof IconSun> = {
  dark: IconMoon,
  light: IconSun,
  system: IconMonitor,
};
const LOCALE_CYCLE: Locale[] = ["pt-BR", "en", "es"];
const LOCALE_SHORT: Record<Locale, string> = { "pt-BR": "PT", en: "EN", es: "ES" };

function idFor(path: string) {
  return path;
}

const STATUS_ORDER: Record<QueueEntry["status"], number> = {
  error: 0,
  loading: 1,
  ready: 2,
  converting: 3,
  done: 4,
};

export default function App() {
  const { t, tn, locale } = useTranslation();
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [outputDir, setOutputDir] = useState<string | null>(() => loadOutputDir());
  const [isDragActive, setIsDragActive] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showBatchEdit, setShowBatchEdit] = useState(false);
  const [showRecentDirs, setShowRecentDirs] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode());
  const [showOnboarding, setShowOnboarding] = useState(() => !hasSeenOnboarding());
  const [changelogToShow, setChangelogToShow] = useState<{ version: string; items: string[] } | null>(
    null,
  );
  const [showCompare, setShowCompare] = useState(false);
  const [showInstalledGames, setShowInstalledGames] = useState(false);
  const [buildInfo, setBuildInfo] = useState<{ version: string; commit: string } | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const cycleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = THEME_CYCLE[(THEME_CYCLE.indexOf(prev) + 1) % THEME_CYCLE.length];
      saveTheme(next);
      return next;
    });
  }, []);

  const cycleLocale = useCallback(() => {
    const next = LOCALE_CYCLE[(LOCALE_CYCLE.indexOf(locale) + 1) % LOCALE_CYCLE.length];
    setLocale(next);
  }, [locale]);

  const handleCheckForUpdate = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const result = await checkForUpdate();
      if (result.kind === "not-configured") {
        toast.info(t("toast.updateNotConfigured"));
      } else if (result.kind === "up-to-date") {
        toast.success(t("toast.updateUpToDate"));
      } else {
        toast.info(t("toast.updateAvailable", { version: result.version }));
        try {
          await result.install();
        } catch (err) {
          toast.error(t("toast.updateInstallFailed", { error: String(err) }));
        }
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [t]);

  const addPaths = useCallback(async (paths: string[]) => {
    let mapPaths: string[];
    try {
      mapPaths = await resolveMapPaths(paths);
    } catch (err) {
      toast.error(t("toast.dropFailed", { error: String(err) }));
      return;
    }

    const existing = new Set(entriesRef.current.map((e) => e.path));
    const fresh = mapPaths.filter((p) => !existing.has(p));
    if (fresh.length === 0) return;

    const previouslyConverted = new Map(history.map((h) => [h.inputPath, h.convertedAt]));
    for (const path of fresh) {
      const convertedAt = previouslyConverted.get(path);
      if (convertedAt) {
        toast.info(
          t("toast.duplicateFile", {
            file: path.split(/[\\/]/).pop() ?? path,
            date: new Date(convertedAt).toLocaleDateString(locale),
          }),
        );
      }
    }

    setEntries((prev) => [
      ...prev,
      ...fresh.map<QueueEntry>((path) => ({
        id: idFor(path),
        path,
        status: "loading",
        preview: null,
        outcome: null,
        error: null,
        overrides: null,
        targetFormat: defaultTargetFormat(sourceFormatFromPath(path)),
        pinned: false,
      })),
    ]);

    for (const path of fresh) {
      const targetFormat = defaultTargetFormat(sourceFormatFromPath(path));
      previewMap(path, targetFormat)
        .then((preview) => {
          setEntries((prev) =>
            prev.map((e) => (e.id === idFor(path) ? { ...e, status: "ready", preview } : e)),
          );
        })
        .catch((err) => {
          const message = String(err);
          setEntries((prev) =>
            prev.map((e) =>
              e.id === idFor(path) ? { ...e, status: "error", error: message } : e,
            ),
          );
          toast.error(`${path.split(/[\\/]/).pop()}: ${message}`);
        });
    }
  }, [t, history, locale]);

  const setTargetFormat = useCallback((id: string, targetFormat: MapFormat) => {
    const entry = entriesRef.current.find((e) => e.id === id);
    if (!entry) return;

    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, targetFormat, status: "loading", preview: null } : e)),
    );

    previewMap(entry.path, targetFormat)
      .then((preview) => {
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: "ready", preview } : e)),
        );
      })
      .catch((err) => {
        const message = String(err);
        setEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, status: "error", error: message } : e)),
        );
        toast.error(`${entry.preview?.title ?? entry.path}: ${message}`);
      });
  }, []);

  const togglePinned = useCallback((id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, pinned: !e.pinned } : e)));
  }, []);

  useEffect(() => {
    const unlisten = getCurrentWebview().onDragDropEvent((event) => {
      if (event.payload.type === "over") {
        setIsDragActive(true);
      } else if (event.payload.type === "drop") {
        setIsDragActive(false);
        void addPaths(event.payload.paths);
      } else {
        setIsDragActive(false);
      }
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [addPaths]);

  // Files opened via "open with" / double-click: on first launch (this
  // instance's own argv) and on later ones (forwarded from the single
  // running instance -- see get_launch_files/file-opened on the Rust side).
  useEffect(() => {
    void getLaunchFiles().then((paths) => {
      if (paths.length > 0) void addPaths(paths);
    });
    const unlisten = listen<string[]>("file-opened", (event) => {
      void addPaths(event.payload);
    });
    return () => {
      unlisten.then((f) => f());
    };
  }, [addPaths]);

  // Restore the queue from the last session, once, on mount. Only the
  // path + overrides + target format + pinned state are persisted --
  // preview/audio/outcome are re-fetched/re-run fresh here, same as a
  // freshly-dropped file.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const persisted = loadQueue();
    if (persisted.length === 0) return;

    setEntries(
      persisted.map((p) => ({
        id: idFor(p.path),
        path: p.path,
        status: "loading",
        preview: null,
        outcome: null,
        error: null,
        overrides: p.overrides,
        targetFormat: p.targetFormat,
        pinned: p.pinned,
      })),
    );

    for (const p of persisted) {
      previewMap(p.path, p.targetFormat)
        .then((preview) => {
          setEntries((prev) =>
            prev.map((e) => (e.id === idFor(p.path) ? { ...e, status: "ready", preview } : e)),
          );
        })
        .catch((err) => {
          const message = String(err);
          setEntries((prev) =>
            prev.map((e) =>
              e.id === idFor(p.path) ? { ...e, status: "error", error: message } : e,
            ),
          );
        });
    }
  }, []);

  useEffect(() => {
    void getBuildInfo().then(setBuildInfo);
  }, []);

  // Show what's new once, if this launch is running a newer version than
  // last time (typically right after an auto-update relaunches) -- never
  // on a fresh install, since there's no "previous version" to compare.
  useEffect(() => {
    void getVersion().then((version) => {
      const previous = checkAndUpdateLastSeenVersion(version);
      if (!previous || previous === version) return;
      const changelogLocale = locale === "pt-BR" ? "pt" : locale === "es" ? "es" : "en";
      const items = CHANGELOG[version]?.[changelogLocale];
      if (items) setChangelogToShow({ version, items });
    });
  }, [locale]);

  // Persist the queue (path + overrides + target format + pinned) after
  // every change, so it survives closing and reopening the app.
  useEffect(() => {
    saveQueue(
      entries.map((e) => ({
        path: e.path,
        overrides: e.overrides,
        targetFormat: e.targetFormat,
        pinned: e.pinned,
      })),
    );
  }, [entries]);

  const browseFiles = useCallback(async () => {
    const paths = await pickMapFiles();
    void addPaths(paths);
  }, [addPaths]);

  const importZip = useCallback(async () => {
    const zipPath = await pickZipToImport();
    if (!zipPath) return;
    try {
      const paths = await extractZipMaps(zipPath);
      if (paths.length === 0) {
        toast.info(t("toast.zipImportEmpty"));
        return;
      }
      void addPaths(paths);
    } catch (err) {
      toast.error(t("toast.zipImportFailed", { error: String(err) }));
    }
  }, [addPaths, t]);

  const changeViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    saveViewMode(mode);
  }, []);

  const chooseOutputDir = useCallback(async () => {
    const dir = await pickOutputFolder();
    if (dir) {
      setOutputDir(dir);
      saveOutputDir(dir);
    }
  }, []);

  const selectRecentOutputDir = useCallback((dir: string) => {
    setOutputDir(dir);
    saveOutputDir(dir);
    setShowRecentDirs(false);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    setPlayingId((prev) => (prev === id ? null : prev));
  }, []);

  const togglePlay = useCallback((id: string) => {
    setPlayingId((prev) => (prev === id ? null : id));
  }, []);

  const saveOverrides = useCallback((id: string, overrides: MetadataOverrides) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, overrides } : e)));
  }, []);

  const applyBatchTitleReplace = useCallback(
    (find: string, replace: string) => {
      const changed = entriesRef.current.filter((e) => {
        if (e.status !== "ready" && e.status !== "error") return false;
        const currentTitle = e.overrides?.title ?? e.preview?.title ?? "";
        return currentTitle.includes(find);
      }).length;

      setEntries((prev) =>
        prev.map((e) => {
          if (e.status !== "ready" && e.status !== "error") return e;
          const currentTitle = e.overrides?.title ?? e.preview?.title ?? "";
          if (!currentTitle.includes(find)) return e;
          return {
            ...e,
            overrides: { ...e.overrides, title: currentTitle.split(find).join(replace) },
          };
        }),
      );
      if (changed > 0) toast.success(tn("toast.batchEditApplied", changed));
    },
    [tn],
  );

  const exportAll = useCallback(async () => {
    const done = entriesRef.current.filter((e) => e.status === "done" && e.outcome);
    if (done.length === 0) return;

    const dest = await pickZipDestination();
    if (!dest) return;

    const readme = [
      t("pack.readme.header", { n: done.length }),
      "",
      ...done.map((e) => `- ${e.outcome!.title} (${e.targetFormat})`),
      "",
      t("pack.readme.footer"),
    ].join("\n");

    setIsExporting(true);
    try {
      await exportZip(
        done.map((e) => e.outcome!.outputPath),
        dest,
        readme,
      );
      toast.success(tn("toast.zipExported", done.length));
    } catch (err) {
      toast.error(t("toast.zipExportFailed", { error: String(err) }));
    } finally {
      setIsExporting(false);
    }
  }, [t, tn]);

  const convertEntries = useCallback(
    async (targets: QueueEntry[]) => {
      if (targets.length === 0) return;
      setIsConverting(true);

      setEntries((prev) =>
        prev.map((e) =>
          targets.some((target) => target.id === e.id) ? { ...e, status: "converting", error: null } : e,
        ),
      );

      let failures = 0;
      await Promise.allSettled(
        targets.map(async (entry) => {
          try {
            const outcome = await convertMapFile(
              entry.path,
              outputDir,
              entry.targetFormat,
              entry.overrides,
            );
            setEntries((prev) =>
              prev.map((e) => (e.id === entry.id ? { ...e, status: "done", outcome } : e)),
            );
            setHistory(
              appendHistory({
                id: crypto.randomUUID(),
                title: outcome.title,
                inputPath: entry.path,
                outputPath: outcome.outputPath,
                noteCount: outcome.noteCount,
                quantumNoteCount: outcome.quantumNoteCount,
                durationMs: outcome.durationMs,
                convertedAt: new Date().toISOString(),
              }),
            );
          } catch (err) {
            failures++;
            const message = String(err);
            setEntries((prev) =>
              prev.map((e) =>
                e.id === entry.id ? { ...e, status: "error", error: message } : e,
              ),
            );
            toast.error(`${entry.preview?.title ?? entry.path}: ${message}`);
          }
        }),
      );

      if (failures === 0 && targets.length > 0) {
        toast.success(tn("toast.conversionDone", targets.length));
      }

      setIsConverting(false);
    },
    [outputDir, tn],
  );

  const convertAll = useCallback(() => {
    const pending = entriesRef.current.filter((e) => e.status === "ready" || e.status === "error");
    void convertEntries(pending);
  }, [convertEntries]);

  const convertToAllFormats = useCallback(
    async (id: string) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (!entry) return;
      const source = sourceFormatFromPath(entry.path);
      const targets = MAP_FORMATS.filter((f) => f !== source);

      const results = await Promise.allSettled(
        targets.map((format) => convertMapFile(entry.path, outputDir, format, entry.overrides)),
      );

      let successCount = 0;
      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        successCount++;
        const outcome = result.value;
        setHistory(
          appendHistory({
            id: crypto.randomUUID(),
            title: outcome.title,
            inputPath: entry.path,
            outputPath: outcome.outputPath,
            noteCount: outcome.noteCount,
            quantumNoteCount: outcome.quantumNoteCount,
            durationMs: outcome.durationMs,
            convertedAt: new Date().toISOString(),
          }),
        );
      }

      if (successCount === targets.length) {
        toast.success(t("toast.allFormatsDone", { n: successCount }));
      } else if (successCount > 0) {
        toast.error(t("toast.allFormatsPartial", { ok: successCount, total: targets.length }));
      } else {
        toast.error(t("toast.allFormatsFailed"));
      }
    },
    [outputDir, t],
  );

  const retryOne = useCallback(
    (id: string) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (entry) void convertEntries([entry]);
    },
    [convertEntries],
  );

  const requeueFromHistory = useCallback(
    (inputPath: string) => {
      setShowHistory(false);
      void addPaths([inputPath]);
    },
    [addPaths],
  );

  const clearHistoryList = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  // Keyboard shortcuts: Ctrl/Cmd+O adds files, Ctrl/Cmd+Enter converts the
  // queue, Delete removes the selected item.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        void browseFiles();
      } else if (mod && e.key === "Enter") {
        e.preventDefault();
        convertAll();
      } else if (e.key === "Delete" && !isTyping && selectedId) {
        e.preventDefault();
        removeEntry(selectedId);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [browseFiles, convertAll, removeEntry, selectedId]);

  const visibleEntries = useMemo(() => {
    const needle = filterText.trim().toLowerCase();
    let list = entries;
    if (needle) {
      list = list.filter((e) => {
        const haystack = [
          e.preview?.title,
          e.preview?.songName,
          e.preview?.mappers?.join(" "),
          e.path,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = (a.preview?.title ?? a.path).localeCompare(b.preview?.title ?? b.path);
          break;
        case "duration":
          cmp = (a.preview?.durationMs ?? 0) - (b.preview?.durationMs ?? 0);
          break;
        case "status":
          cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          break;
        case "difficulty":
          cmp = (a.preview?.difficulty ?? 0) - (b.preview?.difficulty ?? 0);
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    // Pinned entries always float to the top, regardless of sort key.
    sorted.sort((a, b) => Number(b.pinned) - Number(a.pinned));

    return sorted;
  }, [entries, filterText, sortKey, sortAsc]);

  const pendingCount = entries.filter((e) => e.status === "ready" || e.status === "error").length;
  const doneCount = entries.filter((e) => e.status === "done").length;

  return (
    <div className="relative flex h-screen flex-col bg-[rgb(var(--bg))] text-[rgb(var(--ink))]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.16),_transparent_70%)]"
      />

      <header className="relative z-10 flex items-center justify-between border-b border-[rgb(var(--ink)/0.06)] bg-[rgb(var(--ink)/0.015)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500">
            <IconGrid className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1
              className="text-sm font-semibold leading-tight"
              title={
                buildInfo
                  ? t("app.buildInfo", { version: buildInfo.version, commit: buildInfo.commit })
                  : undefined
              }
            >
              rhm2sspm
            </h1>
            <p className="text-xs leading-tight text-[rgb(var(--ink)/0.4)]">{t("app.subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleLocale}
            title={t("locale.tooltip", { locale: LOCALE_SHORT[locale] })}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
          >
            <IconGlobe className="h-3.5 w-3.5" />
            {LOCALE_SHORT[locale]}
          </button>
          <button
            type="button"
            onClick={cycleTheme}
            title={t("theme.tooltip", { mode: t(`theme.${theme}`) })}
            className="flex items-center justify-center rounded-lg p-2 text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
          >
            {(() => {
              const ThemeIcon = THEME_ICON[theme];
              return <ThemeIcon className="h-3.5 w-3.5" />;
            })()}
          </button>
          <button
            type="button"
            onClick={() => setShowHistory(true)}
            title={t("header.history.tooltip")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
          >
            <IconClock className="h-3.5 w-3.5" />
            {t("header.history")}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={chooseOutputDir}
              title={outputDir ?? t("header.outputDir.tooltip")}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
            >
              <IconFolder className="h-3.5 w-3.5" />
              <span className="max-w-40 truncate">{outputDir ?? t("header.outputDir.default")}</span>
            </button>
            {loadRecentOutputDirs().length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRecentDirs((v) => !v);
                }}
                title={t("header.outputDir.recent.tooltip")}
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--elevated))] text-[9px] text-[rgb(var(--ink)/0.5)] ring-1 ring-[rgb(var(--ink)/0.15)] transition hover:text-[rgb(var(--ink)/0.9)]"
              >
                ▾
              </button>
            )}
            {showRecentDirs && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowRecentDirs(false)} />
                <div className="absolute right-0 top-full z-40 mt-1 max-w-72 min-w-full rounded-lg bg-[rgb(var(--elevated))] p-1 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]">
                  {loadRecentOutputDirs().map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => selectRecentOutputDir(dir)}
                      className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-[rgb(var(--ink)/0.75)] transition hover:bg-[rgb(var(--ink)/0.08)]"
                      title={dir}
                    >
                      {dir}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={browseFiles}
            title={t("header.add.tooltip")}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
          >
            <IconUpload className="h-3.5 w-3.5" />
            {t("header.add")}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((v) => !v)}
              title={t("header.more.tooltip")}
              className="flex items-center justify-center rounded-lg p-2 text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)]"
            >
              <IconMore className="h-3.5 w-3.5" />
            </button>
            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg bg-[rgb(var(--elevated))] p-1 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      void importZip();
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[rgb(var(--ink)/0.75)] transition hover:bg-[rgb(var(--ink)/0.08)]"
                  >
                    <IconFileZip className="h-3.5 w-3.5" />
                    {t("header.more.importZip")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowInstalledGames(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[rgb(var(--ink)/0.75)] transition hover:bg-[rgb(var(--ink)/0.08)]"
                  >
                    <IconGamepad className="h-3.5 w-3.5" />
                    {t("header.more.installedGames")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      setShowCompare(true);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-[rgb(var(--ink)/0.75)] transition hover:bg-[rgb(var(--ink)/0.08)]"
                  >
                    <IconCompare className="h-3.5 w-3.5" />
                    {t("header.more.compare")}
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleCheckForUpdate()}
            disabled={isCheckingUpdate}
            title={t("header.checkUpdates.tooltip")}
            className="flex items-center justify-center rounded-lg p-2 text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink)/0.9)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCheckingUpdate ? (
              <IconSpinner className="h-3.5 w-3.5" />
            ) : (
              <IconDownload className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </header>

      {entries.length > 0 && (
        <QueueToolbar
          filterText={filterText}
          onFilterTextChange={setFilterText}
          sortKey={sortKey}
          onSortKeyChange={setSortKey}
          sortAsc={sortAsc}
          onToggleSortDir={() => setSortAsc((v) => !v)}
          resultCount={visibleEntries.length}
          viewMode={viewMode}
          onViewModeChange={changeViewMode}
        />
      )}

      <main className="relative z-10 flex min-h-0 flex-1 flex-col">
        {entries.length === 0 ? (
          <Dropzone isDragActive={isDragActive} onBrowse={browseFiles} />
        ) : (
          <ul
            className={
              viewMode === "grid"
                ? "grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 overflow-y-auto px-6 py-4"
                : "min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-4"
            }
          >
            {visibleEntries.map((entry) =>
              viewMode === "grid" ? (
                <QueueItemGrid
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.id === selectedId}
                  onSelect={setSelectedId}
                  onRemove={removeEntry}
                  onReveal={(path) => revealItemInDir(path)}
                  onRetry={retryOne}
                  isPlaying={entry.id === playingId}
                  onTogglePlay={togglePlay}
                  onEdit={setEditingId}
                  onTargetFormatChange={setTargetFormat}
                  onConvertToAllFormats={convertToAllFormats}
                  onTogglePin={togglePinned}
                />
              ) : (
                <QueueItem
                  key={entry.id}
                  entry={entry}
                  isSelected={entry.id === selectedId}
                  onSelect={setSelectedId}
                  onRemove={removeEntry}
                  onReveal={(path) => revealItemInDir(path)}
                  onRetry={retryOne}
                  isPlaying={entry.id === playingId}
                  onTogglePlay={togglePlay}
                  onEdit={setEditingId}
                  onTargetFormatChange={setTargetFormat}
                  onConvertToAllFormats={convertToAllFormats}
                  onTogglePin={togglePinned}
                />
              ),
            )}
          </ul>
        )}

        {isDragActive && entries.length > 0 && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-[rgb(var(--bg))]/90 backdrop-blur-sm">
            <p className="text-lg font-semibold text-blue-300">{t("dragOverlay.drop")}</p>
          </div>
        )}
      </main>

      {entries.length > 0 && (
        <footer className="relative z-10 flex items-center justify-between border-t border-[rgb(var(--ink)/0.06)] px-6 py-4">
          <p className="text-xs text-[rgb(var(--ink)/0.4)]">
            <SessionStats entries={entries} />
          </p>
          <div className="flex items-center gap-2">
            {pendingCount > 1 && (
              <button
                type="button"
                onClick={() => setShowBatchEdit(true)}
                title={t("footer.batchEdit.tooltip")}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--ink)/0.7)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink))]"
              >
                <IconPencil className="h-4 w-4" />
                {t("footer.batchEdit")}
              </button>
            )}
            {doneCount > 0 && (
              <button
                type="button"
                onClick={() => void exportAll()}
                disabled={isExporting}
                title={t("footer.exportZip.tooltip")}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-[rgb(var(--ink)/0.7)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.06)] hover:text-[rgb(var(--ink))] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconArchive className="h-4 w-4" />
                {isExporting ? t("footer.exportZip.loading") : t("footer.exportZip")}
              </button>
            )}
            <button
              type="button"
              onClick={convertAll}
              disabled={pendingCount === 0 || isConverting}
              title={t("footer.convert.tooltip")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconBolt className="h-4 w-4" />
              {isConverting
                ? t("footer.convert.loading")
                : pendingCount > 0
                  ? t("footer.convert", { n: pendingCount })
                  : t("footer.convert.done")}
            </button>
          </div>
        </footer>
      )}

      {editingId &&
        (() => {
          const editingEntry = entries.find((e) => e.id === editingId);
          if (!editingEntry?.preview) return null;
          return (
            <MetadataEditor
              preview={editingEntry.preview}
              current={editingEntry.overrides}
              onSave={(overrides) => saveOverrides(editingId, overrides)}
              onClose={() => setEditingId(null)}
            />
          );
        })()}

      {showOnboarding && (
        <Onboarding
          onClose={() => {
            markOnboardingSeen();
            setShowOnboarding(false);
          }}
        />
      )}

      {showCompare && <ComparePanel onClose={() => setShowCompare(false)} />}

      {showInstalledGames && (
        <InstalledGamesPanel
          onImport={(paths) => void addPaths(paths)}
          onClose={() => setShowInstalledGames(false)}
        />
      )}

      {changelogToShow && (
        <ChangelogPopup
          version={changelogToShow.version}
          items={changelogToShow.items}
          onClose={() => setChangelogToShow(null)}
        />
      )}

      {showBatchEdit && (
        <BatchEditPanel
          entries={entries.filter((e) => e.status === "ready" || e.status === "error")}
          onApply={applyBatchTitleReplace}
          onClose={() => setShowBatchEdit(false)}
        />
      )}

      {showHistory && (
        <HistoryPanel
          entries={history}
          onClose={() => setShowHistory(false)}
          onRequeue={requeueFromHistory}
          onReveal={(path) => revealItemInDir(path)}
          onClear={clearHistoryList}
        />
      )}

      <Toaster />
    </div>
  );
}
