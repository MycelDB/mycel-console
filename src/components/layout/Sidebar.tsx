import { NavLink } from "react-router-dom";
import { Button, Text, themeClasses } from "../typography";
import {
  buildNavigation,
  consoleBranding,
  currentConsoleFeatures,
  navigationCapabilityState,
  type ConsolePrincipalContext,
} from "../../features/console";
import type { PrincipalSession } from "../../types/auth";
import type { Theme } from "../../types/theme";

export type SidebarProps = {
  session: PrincipalSession;
  theme: Theme;
  loggingOut: boolean;
  principalContext?: ConsolePrincipalContext | null;
  onToggleTheme: () => void;
  onLogout: () => void;
};

type IconKey =
  | "dashboard"
  | "activity"
  | "account"
  | "spaces"
  | "principals"
  | "models"
  | "automations"
  | "semantic"
  | "cluster"
  | "backups";

const navIconPaths: Record<IconKey, string[]> = {
  dashboard: ["M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z"],
  activity: ["M4 13h4l2-6 4 12 2-6h4", "M4 5h16", "M4 19h16"],
  account: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z", "M4 21a8 8 0 0 1 16 0H4Z"],
  spaces: [
    "M4 5a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v2H4V5Z",
    "M4 11h16v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6Z",
  ],
  principals: [
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M17 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    "M3 20a6 6 0 0 1 12 0H3Z",
    "M14 18a5 5 0 0 1 7 2h-5a7 7 0 0 0-2-2Z",
  ],
  models: [
    "M12 3a5 5 0 0 0-3 9v3h6v-3a5 5 0 0 0-3-9Z",
    "M8 15h8v5H8v-5Z",
    "M10 20h4",
  ],
  automations: [
    "M12 3v3",
    "M12 18v3",
    "M3 12h3",
    "M18 12h3",
    "M6.6 6.6 8.7 8.7",
    "M15.3 15.3l2.1 2.1",
    "M17.4 6.6l-2.1 2.1",
    "M8.7 15.3l-2.1 2.1",
    "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  ],
  semantic: [
    "M12 4a4 4 0 0 0-4 4c0 1.2.5 2.3 1.4A4 4 0 0 0 8 17h8a4 4 0 0 0-.3-7.6A4 4 0 0 0 12 4Z",
    "M9 17v3",
    "M15 17v3",
    "M9 20h6",
  ],
  cluster: [
    "M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M18 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M12 23a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M8.5 6l2.2 10",
    "M15.5 6l-2.2 10",
    "M8.5 5h7",
  ],
  backups: ["M5 5h11l3 3v11H5V5Z", "M8 5v5h7V5", "M8 16h8"],
};

function NavItemIcon({ id }: { id: string }) {
  const paths = navIconPaths[id as IconKey] ?? ["M4 6h16M4 12h16M4 18h16"];
  return (
    <svg
      className="h-4 w-4 shrink-0"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

export function Sidebar({
  session,
  theme,
  loggingOut,
  principalContext,
  onToggleTheme,
  onLogout,
}: SidebarProps) {
  const features = currentConsoleFeatures.filter(
    (feature) =>
      feature.id !== "cluster" ||
      principalContext?.clusterRuntime?.engine === "raft",
  );
  const sections = buildNavigation(
    features,
    navigationCapabilityState(principalContext),
  );
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900/80">
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.3em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        {consoleBranding.currentDisplayName}
      </Text>
      <nav className="mt-8 space-y-5" aria-label="Main navigation">
        {sections.map((section) => (
          <div key={section.group}>
            <Text
              as="p"
              size="xs"
              intent="subtle"
              className="mb-2 px-3 uppercase tracking-wide"
            >
              {section.label}
            </Text>
            <div className="space-y-1">
              {section.features.map((item) =>
                item.availability === "disabled" ? (
                  <span
                    key={item.route}
                    aria-disabled="true"
                    className={`flex cursor-not-allowed items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${themeClasses.text.parts.quietLight} ${themeClasses.text.parts.darkFaint}`}
                    title="The current principal is missing a required capability for this feature."
                  >
                    <NavItemIcon id={item.id} />
                    <span>{item.label}</span>
                  </span>
                ) : (
                  <NavLink
                    key={item.route}
                    className={({ isActive }) =>
                      [
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                        isActive
                          ? `bg-sky-50 text-sky-900 dark:bg-sky-950 dark:text-sky-100`
                          : `${themeClasses.text.parts.bodyLight} hover:bg-slate-200 ${themeClasses.text.hover.primary} ${themeClasses.text.parts.darkSecondary} dark:hover:bg-slate-800`,
                      ].join(" ")
                    }
                    to={item.route}
                  >
                    <NavItemIcon id={item.id} />
                    <span>{item.label}</span>
                  </NavLink>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-3 pt-8">
        <NavLink
          className={`block rounded-lg border ${themeClasses.border.input} ${themeClasses.surface.sunken} p-3 transition hover:bg-slate-50 dark:hover:bg-slate-900`}
          to="/me"
        >
          <Text
            as="p"
            size="xs"
            intent="subtle"
            className="uppercase tracking-wide"
          >
            Session
          </Text>
          <Text
            as="p"
            size="sm"
            className={`mt-1 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            Signed in as{" "}
            <span
              className={`font-medium ${themeClasses.text.parts.headingLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {session.username}
            </span>
          </Text>
          <Text
            as="p"
            size="xs"
            intent="muted"
            className="mt-1 truncate"
            title={session.addr}
          >
            {session.addr}
          </Text>
        </NavLink>
        <button
          type="button"
          className={`flex w-full items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} transition hover:bg-slate-200 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary} dark:hover:bg-slate-800`}
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} theme`}
        >
          <span>{theme === "dark" ? "Dark theme" : "Light theme"}</span>
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
        <Button
          className="w-full"
          variant="secondary"
          onClick={onLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out…" : "Logout"}
        </Button>
      </div>
    </aside>
  );
}
