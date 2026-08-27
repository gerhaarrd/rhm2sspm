export type ThemeMode = "dark" | "light" | "system";

const THEME_KEY = "rhm2sspm.theme";

export function loadTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    // fall through to default
  }
  return "system";
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, mode);
  } catch {
    // best-effort
  }
}

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}
