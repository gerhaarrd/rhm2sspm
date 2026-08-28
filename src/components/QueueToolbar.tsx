import { useTranslation } from "../lib/useTranslation";
import { IconGrid3, IconList } from "./Icons";

export type SortKey = "name" | "duration" | "status" | "difficulty";
export type ViewMode = "list" | "grid";

const SORT_KEYS: SortKey[] = ["name", "duration", "status", "difficulty"];

export function QueueToolbar({
  filterText,
  onFilterTextChange,
  sortKey,
  onSortKeyChange,
  sortAsc,
  onToggleSortDir,
  resultCount,
  viewMode,
  onViewModeChange,
}: {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  sortAsc: boolean;
  onToggleSortDir: () => void;
  resultCount: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 border-b border-[rgb(var(--ink)/0.06)] px-6 py-2.5">
      <input
        type="text"
        value={filterText}
        onChange={(e) => onFilterTextChange(e.target.value)}
        placeholder={t("toolbar.filterPlaceholder")}
        className="min-w-0 flex-1 rounded-lg bg-[rgb(var(--ink)/0.05)] px-3 py-1.5 text-xs text-[rgb(var(--ink)/0.85)] placeholder:text-[rgb(var(--ink)/0.3)] ring-1 ring-[rgb(var(--ink)/0.1)] outline-none transition focus:bg-[rgb(var(--ink)/0.08)] focus:ring-blue-500/40"
      />
      <select
        value={sortKey}
        onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
        className="rounded-lg bg-[rgb(var(--ink)/0.05)] px-2 py-1.5 text-xs text-[rgb(var(--ink)/0.7)] ring-1 ring-[rgb(var(--ink)/0.1)] outline-none transition hover:bg-[rgb(var(--ink)/0.08)]"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key} className="bg-[rgb(var(--elevated))] text-[rgb(var(--ink))]">
            {t(`toolbar.sort.${key}`)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onToggleSortDir}
        title={sortAsc ? t("toolbar.sortAsc") : t("toolbar.sortDesc")}
        className="rounded-lg px-2 py-1.5 text-xs text-[rgb(var(--ink)/0.6)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.08)] hover:text-[rgb(var(--ink)/0.9)]"
      >
        {sortAsc ? "↑" : "↓"}
      </button>
      {filterText && (
        <span className="shrink-0 text-xs text-[rgb(var(--ink)/0.35)]">
          {t("toolbar.results", { n: resultCount })}
        </span>
      )}
      <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-[rgb(var(--ink)/0.05)] p-0.5 ring-1 ring-[rgb(var(--ink)/0.1)]">
        <button
          type="button"
          onClick={() => onViewModeChange("list")}
          title={t("toolbar.viewList")}
          className={`rounded-md p-1.5 transition ${
            viewMode === "list"
              ? "bg-[rgb(var(--ink)/0.12)] text-[rgb(var(--ink)/0.9)]"
              : "text-[rgb(var(--ink)/0.5)] hover:text-[rgb(var(--ink)/0.8)]"
          }`}
        >
          <IconList className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          title={t("toolbar.viewGrid")}
          className={`rounded-md p-1.5 transition ${
            viewMode === "grid"
              ? "bg-[rgb(var(--ink)/0.12)] text-[rgb(var(--ink)/0.9)]"
              : "text-[rgb(var(--ink)/0.5)] hover:text-[rgb(var(--ink)/0.8)]"
          }`}
        >
          <IconGrid3 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
