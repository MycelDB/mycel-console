import { Link } from "react-router-dom";
import { Button, Text } from "../typography";
import type { ConsolePrincipalContext } from "../../features/console";
import type { PrincipalSession } from "../../types/auth";

export type HeaderProps = {
  session: PrincipalSession;
  principalContext?: ConsolePrincipalContext | null;
  principalContextLoading?: boolean;
  loggingOut: boolean;
  onLogout: () => void;
};

export function Header({ session, principalContext, principalContextLoading = false, loggingOut, onLogout }: HeaderProps) {
  const roleCount = principalContext?.roles.length ?? 0;
  const capabilityCount = principalContext?.capabilities.length ?? 0;
  const capabilityState = principalContext?.capabilityState.kind ?? "unknown";
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
          <Text as="p" size="xs" intent={principalContext?.warnings.length ? "danger" : "muted"} className="truncate text-slate-500 dark:text-slate-400">
            {principalContextLoading
              ? "Loading access…"
              : capabilityState === "complete"
                ? `${roleCount} role${roleCount === 1 ? "" : "s"} · ${capabilityCount} capabilit${capabilityCount === 1 ? "y" : "ies"}`
                : capabilityState === "partial"
                  ? `Partial access context · ${roleCount} role${roleCount === 1 ? "" : "s"}`
                  : "Access context unavailable"}
          </Text>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800" to="/me">
          Account
        </Link>
        <Button variant="secondary" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? "Logging out…" : "Logout"}
        </Button>
      </div>
    </header>
  );
}
