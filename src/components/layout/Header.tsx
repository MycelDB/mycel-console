import { Button, Text } from "../typography";
import type { PrincipalSession } from "../../types/auth";

export type HeaderProps = {
  session: PrincipalSession;
  loggingOut: boolean;
  onLogout: () => void;
};

export function Header({ session, loggingOut, onLogout }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex min-w-0 items-center gap-6">
        <div className="min-w-0">
          <Text as="p" size="xs" intent="muted">
            Cluster
          </Text>
          <Text as="p" size="sm" className="truncate font-medium text-slate-900 dark:text-slate-100">
            {session.addr}
          </Text>
        </div>
        <div className="min-w-0">
          <Text as="p" size="xs" intent="muted">
            Principal
          </Text>
          <Text as="p" size="sm" className="truncate font-medium text-slate-900 dark:text-slate-100">
            {session.username}
          </Text>
        </div>
      </div>
      <Button variant="secondary" onClick={onLogout} disabled={loggingOut}>
        {loggingOut ? "Logging out…" : "Logout"}
      </Button>
    </header>
  );
}
