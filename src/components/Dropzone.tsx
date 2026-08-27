import { useTranslation } from "../lib/useTranslation";
import { IconUpload } from "./Icons";

/** Highlights ".rhm"/".sspm" tokens inside the (already translated) title
 * sentence, without needing a JSX-aware template per language. */
function highlightExtensions(text: string) {
  const parts = text.split(/(\.rhm|\.sspm)/);
  return parts.map((part, i) =>
    part === ".rhm" || part === ".sspm" ? (
      <span key={i} className="text-blue-400">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Dropzone({
  isDragActive,
  onBrowse,
}: {
  isDragActive: boolean;
  onBrowse: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-500 shadow-lg shadow-blue-900/30 transition-transform ${
          isDragActive ? "scale-110" : ""
        }`}
      >
        <IconUpload className="h-9 w-9 text-white" />
      </div>
      <div>
        <p className="text-lg font-semibold text-[rgb(var(--ink)/0.9)]">
          {highlightExtensions(t("dropzone.title"))}
        </p>
        <p className="mt-1 text-sm text-[rgb(var(--ink)/0.45)]">{t("dropzone.subtitle")}</p>
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="rounded-xl bg-[rgb(var(--ink)/0.07)] px-4 py-2 text-sm font-medium text-[rgb(var(--ink)/0.85)] ring-1 ring-[rgb(var(--ink)/0.1)] transition hover:bg-[rgb(var(--ink)/0.12)]"
      >
        {t("dropzone.browse")}
      </button>
    </div>
  );
}
