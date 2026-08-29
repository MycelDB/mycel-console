export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "mycel_console_theme";

export function storedTheme(): Theme {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  if (theme === "light" || theme === "dark") return theme;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}
