export const themeClasses = {
  text: {
    // Text-token survey, 2026-08-18: existing call sites overwhelmingly used
    // muted as text-slate-500/dark:text-slate-400 and subtle as
    // text-slate-600/dark:text-slate-400. The previous subtle dark value
    // (slate-500) was darker than the real UI, including PageHeader copy on
    // panel surfaces; slate-400 preserves the current intent and improves
    // contrast on dark panel surfaces (slate-400 over slate-900/70 on slate-950
    // is ~7.27:1; slate-500 was ~3.92:1). The recurring dark slate-300 pair is a
    // deliberately brighter secondary role, kept distinct instead of folded
    // into subtle.
    primary: "text-slate-900 dark:text-slate-100",
    muted: "text-slate-500 dark:text-slate-400",
    subtle: "text-slate-600 dark:text-slate-400",
    secondary: "text-slate-600 dark:text-slate-300",
    body: "text-slate-700 dark:text-slate-300",
    strong: "text-slate-800 dark:text-slate-200",
    heading: "text-slate-950 dark:text-white",
    danger: "text-red-700 dark:text-red-300",
    inverse: "text-white",
    hover: {
      primary: "hover:text-slate-950 dark:hover:text-slate-100",
    },
    parts: {
      headingLight: "text-slate-950",
      primaryLight: "text-slate-900",
      strongLight: "text-slate-800",
      bodyLight: "text-slate-700",
      subtleLight: "text-slate-600",
      mutedLight: "text-slate-500",
      quietLight: "text-slate-400",
      inverseSoft: "text-slate-100",
      darkPrimary: "dark:text-slate-100",
      darkStrong: "dark:text-slate-200",
      darkSecondary: "dark:text-slate-300",
      darkMuted: "dark:text-slate-400",
      darkSubtle: "dark:text-slate-400",
      darkQuiet: "dark:text-slate-500",
      darkFaint: "dark:text-slate-600",
    },
  },
  surface: {
    app: "bg-slate-50 dark:bg-slate-950",
    chrome: "bg-slate-50 dark:bg-slate-950/90",
    panel: "bg-white dark:bg-slate-900/70",
    elevated: "bg-white shadow-sm dark:bg-slate-900 dark:shadow-none",
    sunken: "bg-white dark:bg-slate-950/60",
    tabActive: "bg-white dark:bg-slate-950",
    tableHeader: "bg-slate-50 dark:bg-slate-900/80",
    danger: "bg-red-50 dark:bg-red-950/60",
    input: "bg-white dark:bg-slate-950",
  },
  border: {
    default: "border-slate-200 dark:border-slate-800",
    input: "border-slate-300 dark:border-slate-700",
    danger: "border-red-300/60 dark:border-red-500/40",
  },
  interactive: {
    primary: "bg-sky-500 text-white hover:bg-sky-400",
    secondary: "hover:bg-slate-100 dark:hover:bg-slate-800",
  },
  focus: {
    ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500",
    ringSubtle:
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50",
  },
  form: {
    input:
      "border bg-white text-slate-900 outline-none transition placeholder:text-slate-400 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
  },
};
