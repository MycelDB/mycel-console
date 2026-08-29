import { themeClasses } from "./themeClasses";

export type MetricTone =
  "neutral" | "default" | "success" | "warning" | "danger";

export function metricToneClass(tone: MetricTone = "neutral") {
  if (tone === "success") return "text-emerald-700 dark:text-emerald-300";
  if (tone === "warning") return "text-amber-700 dark:text-amber-300";
  if (tone === "danger") return "text-rose-700 dark:text-rose-300";
  return themeClasses.text.primary;
}
