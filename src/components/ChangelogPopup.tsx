import { useTranslation } from "../lib/useTranslation";
import { IconCheck, IconX } from "./Icons";

export function ChangelogPopup({
  version,
  items,
  onClose,
}: {
  version: string;
  items: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-[rgb(var(--elevated))] p-4 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">
            {t("changelog.title", { version })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-[rgb(var(--ink)/0.7)]">
              <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30"
        >
          {t("onboarding.dismiss")}
        </button>
      </div>
    </div>
  );
}
