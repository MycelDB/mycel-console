import { NavLink } from "react-router-dom";
import { Text } from "../typography";

import type { Theme } from "../../types/theme";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Users", to: "/users" },
  { label: "Spaces", to: "/spaces" },
  { label: "Backups", to: "/backups" },
  { label: "Cluster", to: "/cluster" },
  { label: "Operators", to: "/operators" },
  { label: "Semantic", to: "/semantic" },
  { label: "Maintenance", to: "/maintenance" },
  { label: "Inference", to: "/inference" },
  { label: "Settings", to: "/settings" },
];

export type SidebarProps = {
  theme: Theme;
  onToggleTheme: () => void;
};

export function Sidebar({ theme, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <Text
        as="p"
        size="sm"
        className="font-medium uppercase tracking-[0.3em] text-cyan-300"
      >
        Mycel Admin
      </Text>
      <nav className="mt-8 space-y-2" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                "block rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100"
                  : "text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              ].join(" ")
            }
            to={item.to}
          >
            {item.label}
          </NavLink>
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
