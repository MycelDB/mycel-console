import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";
import { currentConsoleFeatures, navigationCapabilityState, visibleFeatures, type ConsoleFeature, type ConsolePrincipalContext } from "../../console";

const shortcutDefinitions: Record<string, { label?: string; description: string }> = {
  principals: { label: "Manage principals", description: "List, filter, create, disable, and delete human principals." },
  spaces: { label: "View spaces", description: "Inspect spaces and ownership across the cluster." },
  access: { description: "Review principal roles, capabilities, and scoped access." },
  maintenance: { description: "Run and monitor operational maintenance workflows." },
};

const shortcutIds = ["principals", "spaces", "access", "maintenance"];

export type ShortcutGridProps = {
  principalContext?: ConsolePrincipalContext | null;
};

export function ShortcutGrid({ principalContext }: ShortcutGridProps) {
  const shortcuts = dashboardShortcuts(currentConsoleFeatures, principalContext);
  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Shortcuts
      </Text>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.route}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 transition hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-700 dark:hover:bg-sky-950/30"
            to={shortcut.route}
          >
            <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">
              {shortcut.shortcutLabel}
            </Text>
            <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
              {shortcut.shortcutDescription}
            </Text>
          </Link>
        ))}
      </div>
    </article>
  );
}

export function dashboardShortcuts(features: ConsoleFeature[], principalContext?: ConsolePrincipalContext | null) {
  const visibleById = new Map(visibleFeatures(features, navigationCapabilityState(principalContext)).map((feature) => [feature.id, feature]));
  return shortcutIds
    .map((id) => {
      const feature = visibleById.get(id);
      const shortcut = shortcutDefinitions[id];
      if (!feature || !shortcut) return null;
      return {
        ...feature,
        shortcutLabel: shortcut.label ?? feature.label,
        shortcutDescription: shortcut.description,
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => feature !== null);
}
