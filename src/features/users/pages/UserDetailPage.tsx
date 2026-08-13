import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { getUser as defaultGetUser, listSpaces as defaultListSpaces, listUserSessions as defaultListUserSessions, revokeUserSession as defaultRevokeUserSession, revokeUserSessions as defaultRevokeUserSessions } from "../../../services/adminService";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../types/spaces";
import type { ListUserSessionsInput, ListUserSessionsResponse, RevokeUserSessionInput, RevokeUserSessionsResponse, UserInfo, UserSessionInfo } from "../../../types/users";
import { principalIdOf } from "../../../types/users";
import { UserStateBadge } from "../components/UserStateBadge";

export type UserDetailPageProps = {
  getUserService?: (userId: string) => Promise<UserInfo>;
  listUserSessionsService?: (input: ListUserSessionsInput) => Promise<ListUserSessionsResponse>;
  listSpacesService?: (input: ListSpacesInput) => Promise<ListSpacesResponse>;
  revokeUserSessionService?: (input: RevokeUserSessionInput) => Promise<void>;
  revokeUserSessionsService?: (userId: string) => Promise<RevokeUserSessionsResponse>;
};

export function UserDetailPage({ getUserService = defaultGetUser, listUserSessionsService = defaultListUserSessions, listSpacesService = defaultListSpaces, revokeUserSessionService = defaultRevokeUserSession, revokeUserSessionsService = defaultRevokeUserSessions }: UserDetailPageProps) {
  const { userId = "" } = useParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sessions, setSessions] = useState<UserSessionInfo[]>([]);
  const [ownedSpaces, setOwnedSpaces] = useState<SpaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<{ kind: "one"; sessionId: string } | { kind: "all" } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function load() {
    if (!userId) {
      setError("Principal ID is required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [userResponse, sessionsResponse, spacesResponse] = await Promise.all([
        getUserService(userId),
        listUserSessionsService({ userId, pageSize: 100, includeInactive: false }),
        listSpacesService({ pageSize: 100, includeArchived: true }),
      ]);
      setUser(userResponse);
      setSessions(sessionsResponse.sessions);
      setOwnedSpaces(spacesResponse.spaces.filter((space) => space.owner?.id === userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load principal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!userId) return;
      try {
        await load();
      } finally {
        if (cancelled) return;
      }
    })();
    return () => { cancelled = true; };
  }, [getUserService, listSpacesService, listUserSessionsService, userId]);

  async function confirmRevoke() {
    if (!confirm || !userId) return;
    setActionLoading(true);
    setError("");
    try {
      if (confirm.kind === "one") await revokeUserSessionService({ userId, authSessionId: confirm.sessionId });
      else await revokeUserSessionsService(userId);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to="/principals">← Back to principals</Link>
        <Text as="p" size="sm" className="mt-4 font-medium uppercase tracking-[0.3em] text-cyan-300">Principal detail</Text>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <H2 className="text-slate-900 dark:text-slate-100">{user?.username || userId || "Principal"}</H2>
          {user?.state && <UserStateBadge state={user.state} />}
        </div>
        <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">Inspect principal identity and active auth sessions.</Text>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {loading ? <Loading /> : user ? <UserIdentity user={user} /> : null}
      {!loading && <UserSessionsTable sessions={sessions} onRevokeSession={(sessionId) => setConfirm({ kind: "one", sessionId })} onRevokeAll={() => setConfirm({ kind: "all" })} />}
      {!loading && <OwnedSpaces spaces={ownedSpaces} />}
      {!loading && <SemanticDiagnosticsNote ownedSpaceCount={ownedSpaces.length} />}
      {confirm && (
        <ConfirmRevokeDialog
          kind={confirm.kind}
          sessionId={confirm.kind === "one" ? confirm.sessionId : undefined}
          loading={actionLoading}
          onCancel={() => setConfirm(null)}
          onConfirm={() => void confirmRevoke()}
        />
      )}
    </section>
  );
}

function Loading() {
  return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">Loading principal…</Text></div>;
}

function UserIdentity({ user }: { user: UserInfo }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
        <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Identity</Text>
        <dl className="mt-4 space-y-3">
          <DetailRow label="Principal ID" value={principalIdOf(user)} />
          <DetailRow label="Username" value={user.username} />
          <DetailRow label="State" value={user.state} />
        </dl>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
        <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Timestamps</Text>
        <dl className="mt-4 space-y-3">
          <DetailRow label="Created" value={formatTimestamp(user.createTime)} />
          <DetailRow label="Updated" value={formatTimestamp(user.updateTime)} />
        </dl>
      </div>
    </div>
  );
}

function UserSessionsTable({ sessions, onRevokeSession, onRevokeAll }: { sessions: UserSessionInfo[]; onRevokeSession: (sessionId: string) => void; onRevokeAll: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Auth sessions</Text>
        <Button variant="secondary" onClick={onRevokeAll} disabled={sessions.length === 0}>Revoke all sessions</Button>
      </div>
      {sessions.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No active sessions found.</Text> : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Session ID</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{sessions.map((session) => <tr key={session.authSessionId}><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{session.authSessionId}</td><td className="px-4 py-3">{session.state}</td><td className="px-4 py-3">{formatTimestamp(session.lastSeenTime)}</td><td className="px-4 py-3">{formatTimestamp(session.expireTime)}</td><td className="px-4 py-3">{clientLabel(session)}</td><td className="px-4 py-3"><button className="rounded px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50" onClick={() => onRevokeSession(session.authSessionId)}>Revoke</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OwnedSpaces({ spaces }: { spaces: SpaceInfo[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Owned spaces</Text>
      <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Spaces where this principal is the owner.</Text>
      {spaces.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No owned spaces found.</Text> : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Space ID</th><th className="px-4 py-3">State</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{spaces.map((space) => <tr key={space.spaceId}><td className="px-4 py-3 font-medium"><Link className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(space.spaceId)}`}>{space.name}</Link></td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{space.spaceId}</td><td className="px-4 py-3">{space.state || "Not reported"}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SemanticDiagnosticsNote({ ownedSpaceCount }: { ownedSpaceCount: number }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/70 dark:bg-amber-950/30">
      <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic diagnostics</Text>
      <Text intent="muted" size="sm" className="mt-2 max-w-3xl text-slate-700 dark:text-slate-300">
        This panel captures what can be inferred for principal-reported semantic search issues today. The current Admin API can show this principal's state, sessions, owned spaces, space domains, semantic indexes, inference resources, and maintenance state, but it cannot yet directly explain this principal's effective access grants for a target space/domain.
      </Text>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DiagnosticItem status="pass" label="Principal state" detail="Shown above from AdminPrincipalService.GetPrincipal." />
        <DiagnosticItem status="pass" label="Principal auth sessions" detail="Shown above from AdminPrincipalService.ListPrincipalSessions." />
        <DiagnosticItem status={ownedSpaceCount > 0 ? "pass" : "warn"} label="Owned spaces" detail={ownedSpaceCount > 0 ? `${ownedSpaceCount} owned space${ownedSpaceCount === 1 ? "" : "s"} found.` : "No owned spaces found for this user."} />
        <DiagnosticItem status="warn" label="Effective access" detail="Needs a future Admin API such as ExplainEffectiveAccess(principal_id, space_id, domain_id)." />
        <DiagnosticItem status="warn" label="Semantic search explain" detail="Needs a future Admin API such as ExplainSemanticSearch(principal_id, space_id, domain_id, semantic_index_id)." />
        <DiagnosticItem status="warn" label="Next manual checks" detail="Open the relevant space and inspect domains, semantic indexes, inference catalog, credential grants, policies, and maintenance work." />
      </div>
    </div>
  );
}

function DiagnosticItem({ status, label, detail }: { status: "pass" | "warn" | "fail"; label: string; detail: string }) {
  const icon = status === "pass" ? "✅" : status === "fail" ? "❌" : "⚠️";
  return (
    <div className="rounded-lg border border-amber-200 bg-white/70 p-4 dark:border-amber-900/60 dark:bg-slate-950/30">
      <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">{icon} {label}</Text>
      <Text intent="muted" size="sm" className="mt-1 text-slate-700 dark:text-slate-300">{detail}</Text>
    </div>
  );
}

function ConfirmRevokeDialog({ kind, sessionId, loading, onCancel, onConfirm }: { kind: "one" | "all"; sessionId?: string; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-red-400">Revoke sessions</Text>
        <H2 className="mt-2 text-xl text-slate-900 dark:text-slate-100">{kind === "all" ? "Revoke all principal sessions?" : "Revoke this principal session?"}</H2>
        <Text intent="muted" size="sm" className="mt-3 text-slate-600 dark:text-slate-400">
          {kind === "all" ? "The principal will be signed out from all active clients." : `Session ${sessionId} will be revoked and can no longer refresh access.`}
        </Text>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button onClick={onConfirm} disabled={loading}>{loading ? "Revoking…" : "Revoke"}</Button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">{value}</dd></div>;
}

function clientLabel(session: UserSessionInfo) {
  const client = session.client;
  if (!client) return "Not reported";
  return [client.name, client.version, client.platform, client.deviceLabel].filter(Boolean).join(" · ") || "Not reported";
}

function formatTimestamp(value?: string) {
  if (!value) return "Not reported";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}
