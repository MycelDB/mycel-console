import { formatEnumLabel, themeClasses } from "../../../components/typography";

export function clusterBadgeClass(value: string) {
  switch (value) {
    case "clustered":
    case "active":
    case "self":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "standalone":
      return `bg-slate-200 ${themeClasses.text.parts.strongLight} dark:bg-slate-800 ${themeClasses.text.parts.darkStrong}`;
    case "pass":
    case "ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "unreachable":
    case "failed":
    case "fail":
    case "blocked":
    case "no_leader":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "warning":
    case "lagging":
    case "degraded":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "divergent":
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "consistent":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    default:
      return "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }
}

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${clusterBadgeClass(value)}`}
      title={value}
    >
      {formatEnumLabel(value)}
    </span>
  );
}

export function CountStatusBadge({
  label,
  status,
  value,
}: {
  label: string;
  status: string;
  value: number;
}) {
  const accessibleLabel = `${label}: ${value} (${formatEnumLabel(status)})`;
  return (
    <span
      aria-label={accessibleLabel}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${clusterBadgeClass(status)}`}
      title={accessibleLabel}
    >
      {value}
    </span>
  );
}

export function CheckBadge({ ok }: { ok: boolean }) {
  return <StatusBadge value={ok ? "pass" : "fail"} />;
}

export function HelpIcon({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        aria-label={`${label}: ${description}`}
        className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 ${themeClasses.surface.elevated} text-[10px] font-bold ${themeClasses.text.parts.subtleLight} dark:border-slate-700 ${themeClasses.text.parts.darkSecondary}`}
        role="img"
        tabIndex={0}
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute left-0 top-5 z-20 hidden w-72 rounded-md border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-3 text-left text-xs normal-case tracking-normal ${themeClasses.text.parts.bodyLight} shadow-lg group-hover:block group-focus-within:block dark:border-slate-700 ${themeClasses.text.parts.darkStrong}`}
        role="tooltip"
      >
        <span
          className={`block font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {label}
        </span>
        <span className="mt-1 block">{description}</span>
      </span>
    </span>
  );
}
