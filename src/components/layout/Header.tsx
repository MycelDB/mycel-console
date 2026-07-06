import { Button, Text } from "../typography";
import type { OperatorSession } from "../../types/auth";

export type HeaderProps = {
  session: OperatorSession;
  loggingOut: boolean;
  onLogout: () => void;
};

export function Header({ session, loggingOut, onLogout }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6">
      <div className="flex min-w-0 items-center gap-6">
        <div className="min-w-0">
          <Text as="p" size="xs" intent="muted" className="text-slate-500">
            Cluster
          </Text>
          <Text as="p" size="sm" className="truncate font-medium text-slate-100">
            {session.addr}
          </Text>
        </div>
        <div className="min-w-0">
          <Text as="p" size="xs" intent="muted" className="text-slate-500">
            Operator
          </Text>
          <Text as="p" size="sm" className="truncate font-medium text-slate-100">
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
