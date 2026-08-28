import { useTranslation } from "../lib/useTranslation";
import { IconArchive, IconLayers, IconPencil, IconUpload } from "./Icons";

function Tip({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[rgb(var(--ink)/0.9)]">{title}</p>
        <p className="text-xs text-[rgb(var(--ink)/0.5)]">{body}</p>
      </div>
    </div>
  );
}

export function Onboarding({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-6">
      <div className="w-full max-w-md rounded-2xl bg-[rgb(var(--elevated))] p-5 shadow-2xl ring-1 ring-[rgb(var(--ink)/0.1)]">
        <h2 className="text-base font-semibold text-[rgb(var(--ink)/0.9)]">{t("onboarding.title")}</h2>
        <p className="mt-1 text-xs text-[rgb(var(--ink)/0.5)]">{t("onboarding.subtitle")}</p>

        <div className="mt-5 space-y-4">
          <Tip
            icon={<IconUpload className="h-4 w-4" />}
            title={t("onboarding.drop.title")}
            body={t("onboarding.drop.body")}
          />
          <Tip
            icon={<IconLayers className="h-4 w-4" />}
            title={t("onboarding.format.title")}
            body={t("onboarding.format.body")}
          />
          <Tip
            icon={<IconPencil className="h-4 w-4" />}
            title={t("onboarding.edit.title")}
            body={t("onboarding.edit.body")}
          />
          <Tip
            icon={<IconArchive className="h-4 w-4" />}
            title={t("onboarding.export.title")}
            body={t("onboarding.export.body")}
          />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full rounded-lg bg-gradient-to-br from-blue-600 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30"
        >
          {t("onboarding.dismiss")}
        </button>
      </div>
    </div>
  );
}
