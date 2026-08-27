import { useState } from "react";
import type { MapPreview, MetadataOverrides } from "../types";
import { difficultyLevels } from "../lib/format";
import { useTranslation } from "../lib/useTranslation";
import { IconX } from "./Icons";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[rgb(var(--ink)/0.5)]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg bg-[rgb(var(--ink)/0.05)] px-3 py-1.5 text-sm text-[rgb(var(--ink)/0.9)] ring-1 ring-[rgb(var(--ink)/0.1)] outline-none transition focus:bg-[rgb(var(--ink)/0.08)] focus:ring-blue-500/40";

export function MetadataEditor({
  preview,
  current,
  onSave,
  onClose,
}: {
  preview: MapPreview;
  current: MetadataOverrides | null;
  onSave: (overrides: MetadataOverrides) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(current?.title ?? preview.title);
  const [songName, setSongName] = useState(current?.songName ?? preview.songName);
  const [mappers, setMappers] = useState((current?.mappers ?? preview.mappers).join(", "));
  const [difficulty, setDifficulty] = useState(current?.difficulty ?? preview.difficulty);
  const [customDifficultyName, setCustomDifficultyName] = useState(
    current?.customDifficultyName ?? preview.customDifficultyName,
  );

  const save = () => {
    onSave({
      title: title.trim() || preview.title,
      songName: songName.trim() || preview.songName,
      mappers: mappers
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
      difficulty,
      customDifficultyName: customDifficultyName.trim(),
    });
    onClose();
  };

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
          <h2 className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">{t("editor.title")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[rgb(var(--ink)/0.5)] transition hover:bg-[rgb(var(--ink)/0.1)] hover:text-[rgb(var(--ink))]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label={t("editor.mapTitle")}>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t("editor.songName")}>
            <input
              className={inputClass}
              value={songName}
              onChange={(e) => setSongName(e.target.value)}
            />
          </Field>
          <Field label={t("editor.mappers")}>
            <input
              className={inputClass}
              value={mappers}
              onChange={(e) => setMappers(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("editor.difficulty")}>
              <select
                className={inputClass}
                value={difficulty}
                onChange={(e) => setDifficulty(Number(e.target.value))}
              >
                {difficultyLevels().map((name, i) => (
                  <option key={i} value={i} className="bg-[rgb(var(--elevated))] text-[rgb(var(--ink))]">
                    {name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("editor.customDifficultyName")}>
              <input
                className={inputClass}
                placeholder={t("editor.customDifficultyName.placeholder")}
                value={customDifficultyName}
                onChange={(e) => setCustomDifficultyName(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[rgb(var(--ink)/0.6)] transition hover:bg-[rgb(var(--ink)/0.06)]"
          >
            {t("editor.cancel")}
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-blue-900/30"
          >
            {t("editor.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
