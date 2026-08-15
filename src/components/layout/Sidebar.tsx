import { NavLink } from "react-router-dom";
import { Text } from "../typography";
import { buildNavigation, consoleBranding, currentConsoleFeatures, navigationCapabilityState, type ConsolePrincipalContext } from "../../features/console";

import type { Theme } from "../../types/theme";

export type SidebarProps = {
  theme: Theme;
  principalContext?: ConsolePrincipalContext | null;
  onToggleTheme: () => void;
};

export function Sidebar({ theme, principalContext, onToggleTheme }: SidebarProps) {
  const sections = buildNavigation(currentConsoleFeatures, navigationCapabilityState(principalContext));
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <Text
        as="p"
        size="sm"
        className="font-medium uppercase tracking-[0.3em] text-cyan-300"
      >
        {consoleBranding.currentDisplayName}
      </Text>
      <nav className="mt-8 space-y-5" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.group}>
            <Text as="p" size="xs" intent="subtle" className="mb-2 px-3 uppercase tracking-wide">
              {section.label}
            </Text>
            <div className="space-y-1">
              {section.features.map((item) => (
                item.availability === "disabled" ? (
                  <span
                    key={item.route}
                    aria-disabled="true"
                    className="block cursor-not-allowed rounded-md px-3 py-2 text-sm font-medium text-slate-400 dark:text-slate-600"
                    title="The current principal is missing a required capability for this feature."
                  >
                    {item.label}
                  </span>
                ) : (
                  <NavLink
                    key={item.route}
                    className={({ isActive }) =>
                      [
                        "block rounded-md px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                          : "text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                      ].join(" ")
                    }
                    to={item.route}
                  >
                    {item.label}
                  </NavLink>
                )
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-2 pt-8">
        <Text as="span" size="xs" intent="subtle" className="block uppercase tracking-wide">
          Theme
        </Text>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <span>{theme === "dark" ? "Dark theme" : "Light theme"}</span>
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
      </div>
    </aside>
  );
}
