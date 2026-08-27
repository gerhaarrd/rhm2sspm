import { useEffect, useState } from "react";
import { getLocale, subscribeLocale, t, tn, type Locale } from "./i18n";

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale());

  useEffect(() => subscribeLocale(() => setLocaleState(getLocale())), []);

  return { t, tn, locale };
}
