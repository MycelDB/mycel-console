import { Button, Text } from "../typography";
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

export function Header({ session, loggingOut, theme, onToggleTheme, onLogout }: HeaderProps) {
  const nextTheme = theme === "dark" ? "light" : "dark";
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-6 dark:border-slate-800 dark:bg-slate-950/90">
      <Text as="p" size="sm" intent="muted" className="truncate text-slate-600 dark:text-slate-400">
        Connected to <span className="font-medium text-slate-900 dark:text-slate-100">{session.addr}</span>
      </Text>
      <div className="flex items-center gap-3">
        <Text as="p" size="sm" className="text-slate-700 dark:text-slate-300">
          Signed in as <span className="font-medium text-slate-950 dark:text-slate-100">{session.username}</span>
        </Text>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
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
