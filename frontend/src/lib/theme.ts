// engineered by Maro Elias Goth
import { writable } from "svelte/store";

export type ThemePreference = "light" | "dark" | "system";
export type AppliedTheme = "light" | "dark";

const themeKey = "pfadi_theme";
const mediaQuery = "(prefers-color-scheme: dark)";

export const themePreference = writable<ThemePreference>("system");
export const appliedTheme = writable<AppliedTheme>("light");

const resolveSystemTheme = (): AppliedTheme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia(mediaQuery).matches ? "dark" : "light";
};

const applyTheme = (theme: AppliedTheme) => {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  appliedTheme.set(theme);
};

const applyPreference = (preference: ThemePreference) => {
  themePreference.set(preference);
  if (preference === "system") {
    applyTheme(resolveSystemTheme());
    return;
  }
  applyTheme(preference);
};

export const initTheme = () => {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(themeKey) as ThemePreference | null;
  const preference: ThemePreference =
    stored === "light" || stored === "dark" || stored === "system" ? stored : "system";

  applyPreference(preference);

  const mq = window.matchMedia(mediaQuery);
  mq.addEventListener("change", () => {
    let current: ThemePreference = "system";
    themePreference.subscribe((value) => (current = value))();
    if (current === "system") {
      applyTheme(resolveSystemTheme());
    }
  });
};

export const setThemePreference = (preference: ThemePreference) => {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(themeKey, preference);
  }
  applyPreference(preference);
};

export const toggleTheme = () => {
  let current: AppliedTheme = "light";
  appliedTheme.subscribe((value) => (current = value))();
  const next: AppliedTheme = current === "dark" ? "light" : "dark";
  setThemePreference(next);
};
