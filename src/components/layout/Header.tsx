import { Button, Text, themeClasses } from "../typography";
import type { ConsolePrincipalContext } from "../../features/console";
import type { PrincipalSession } from "../../types/auth";
import type { Theme } from "../../types/theme";

export type HeaderProps = {
  session: PrincipalSession;
  principalContext?: ConsolePrincipalContext | null;
  principalContextLoading?: boolean;
  loggingOut: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
};

export function Header({
  session,
  loggingOut,
  theme,
  onToggleTheme,
  onLogout,
}: HeaderProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <header
      className={`flex h-14 shrink-0 items-center justify-between border-b ${themeClasses.border.default} ${themeClasses.surface.chrome} px-6`}
    >
      <Text as="p" size="sm" intent="muted" className="truncate">
        Connected to{" "}
        <span className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          {session.addr}
        </span>
      </Text>
      <div className="flex items-center gap-3">
        <Text as="p" size="sm" className={`${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
          Signed in as{" "}
          <span className={`font-medium ${themeClasses.text.parts.headingLight} ${themeClasses.text.parts.darkPrimary}`}>
            {session.username}
          </span>
        </Text>
        <button
          type="button"
          className={`rounded-md border border-slate-300 px-3 py-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} transition hover:bg-slate-100 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary} dark:hover:bg-slate-800`}
          onClick={onToggleTheme}
          aria-label={`Switch to ${nextTheme} theme`}
          title={`Switch to ${nextTheme} theme`}
        >
          <span aria-hidden>{theme === "dark" ? "☾" : "☀"}</span>
        </button>
        <Button variant="secondary" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out…" : "Logout"}
        </Button>
      </div>
    </header>
  );
}
