import { useTranslation } from "../lib/useTranslation";

export type SortKey = "name" | "duration" | "status" | "difficulty";

const SORT_KEYS: SortKey[] = ["name", "duration", "status", "difficulty"];

export function QueueToolbar({
  filterText,
  onFilterTextChange,
  sortKey,
  onSortKeyChange,
  sortAsc,
  onToggleSortDir,
  resultCount,
}: {
  filterText: string;
  onFilterTextChange: (value: string) => void;
  sortKey: SortKey;
  onSortKeyChange: (key: SortKey) => void;
  sortAsc: boolean;
  onToggleSortDir: () => void;
  resultCount: number;
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
    </div>
  );
}
