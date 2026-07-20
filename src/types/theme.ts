export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "mycel_admin_theme";

export function storedTheme(): Theme {
  const theme = localStorage.getItem(THEME_STORAGE_KEY);
  return theme === "light" || theme === "dark" ? theme : "dark";
}
