import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, ErrorBox, H2, Text } from "../../components/typography";
import { getPrincipal as defaultGetPrincipal, listPrincipalCapabilities as defaultListPrincipalCapabilities, listPrincipalRoles as defaultListPrincipalRoles, listPrincipals as defaultListPrincipals } from "../../services/adminService";
import type { ListPrincipalCapabilitiesResponse, ListPrincipalRolesResponse } from "../../types/access";
import type { ListPrincipalsResponse, PrincipalInfo } from "../../types/users";
import { isPrincipalActive, principalIdOf } from "../../types/users";

export type AccessPageProps = {
  getPrincipalService?: (principalId: string) => Promise<PrincipalInfo>;
  listPrincipalsService?: (input?: { pageSize?: number; includeDisabled?: boolean; includeDeleted?: boolean }) => Promise<ListPrincipalsResponse>;
  listPrincipalRolesService?: (principalId: string) => Promise<ListPrincipalRolesResponse>;
  listPrincipalCapabilitiesService?: (principalId: string) => Promise<ListPrincipalCapabilitiesResponse>;
};

type AccessRow = {
  principal: PrincipalInfo;
  roles: ListPrincipalRolesResponse | null;
  capabilities: ListPrincipalCapabilitiesResponse | null;
  error: string;
};

const ADMIN_CAPABILITIES = new Set([
  "CAPABILITY_DAEMON_CONFIGURE",
  "CAPABILITY_MESH_MANAGE",
  "CAPABILITY_IDENTITY_PRINCIPAL_READ",
  "CAPABILITY_IDENTITY_PRINCIPAL_CREATE",
  "CAPABILITY_IDENTITY_PRINCIPAL_UPDATE",
  "CAPABILITY_IDENTITY_CREDENTIAL_SET",
  "CAPABILITY_IDENTITY_SESSION_DELEGATE",
  "CAPABILITY_IDENTITY_SESSION_MANAGE",
  "CAPABILITY_IDENTITY_GRANT_MANAGE",
]);

export function AccessPage({
  getPrincipalService = defaultGetPrincipal,
  listPrincipalsService = defaultListPrincipals,
  listPrincipalRolesService = defaultListPrincipalRoles,
  listPrincipalCapabilitiesService = defaultListPrincipalCapabilities,
}: AccessPageProps) {
  const { principalId = "" } = useParams();
  const focusedPrincipalId = principalId;
  const [rows, setRows] = useState<AccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const principals = focusedPrincipalId
        ? [await getPrincipalService(focusedPrincipalId)]
        : (await listPrincipalsService({ pageSize: 100, includeDisabled: true, includeDeleted: false })).principals;
      const accessRows = await Promise.all(
        principals.map(async (principal) => {
          const principalId = principalIdOf(principal);
          try {
            const [roles, capabilities] = await Promise.all([
              listPrincipalRolesService(principalId),
              listPrincipalCapabilitiesService(principalId),
            ]);
            return { principal, roles, capabilities, error: "" } satisfies AccessRow;
          } catch (err) {
            return {
              principal,
              roles: null,
              capabilities: null,
              error: err instanceof Error ? err.message : "Failed to load access grants",
            } satisfies AccessRow;
          }
        }),
      );
      setRows(accessRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load principals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [focusedPrincipalId, getPrincipalService, listPrincipalCapabilitiesService, listPrincipalRolesService, listPrincipalsService]);

  const adminCapableCount = useMemo(() => rows.filter(isAdminCapable).length, [rows]);
  const roleGrantCount = useMemo(() => rows.reduce((total, row) => total + (row.roles?.grants.length ?? 0), 0), [rows]);
  const capabilityGrantCount = useMemo(() => rows.reduce((total, row) => total + (row.capabilities?.grants.length ?? 0), 0), [rows]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">Access management</Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Roles & capabilities</H2>
          <Text intent="muted" className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Operators are represented as principals with system roles, explicit capabilities, and scoped authorization grants.
            {focusedPrincipalId ? " This view is scoped to one principal." : ""}
          </Text>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Admin-capable principals" value={adminCapableCount} />
        <SummaryCard label="Role grants" value={roleGrantCount} />
        <SummaryCard label="Capability grants" value={capabilityGrantCount} />
      </div>

      {loading ? (
        <Panel><Text intent="muted" className="text-slate-600 dark:text-slate-400">Loading access…</Text></Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">No principals found</Text>
          <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">Create principals before assigning roles or capabilities.</Text>
        </Panel>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Principal</th>
                <th className="px-4 py-3">Login</th>
                <th className="px-4 py-3">Effective roles</th>
                <th className="px-4 py-3">Effective capabilities</th>
                <th className="px-4 py-3">Scoped grants</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row) => {
                const principalId = principalIdOf(row.principal);
                const effectiveRoles = row.roles?.effectiveRoles ?? [];
                const effectiveCapabilities = row.capabilities?.effectiveCapabilities ?? [];
                return (
                  <tr key={principalId} className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/principals/${encodeURIComponent(principalId)}`}>{row.principal.username || principalId}</Link>
                      <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">{principalId}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{row.principal.state}</div>
                      {row.error && <Text intent="danger" size="sm" className="mt-2">{row.error}</Text>}
                    </td>
                    <td className="px-4 py-3">{loginLabel(row.principal)}</td>
                    <td className="px-4 py-3"><TokenList values={effectiveRoles} empty="No effective roles" /></td>
                    <td className="px-4 py-3"><TokenList values={effectiveCapabilities} empty="No effective capabilities" /></td>
                    <td className="px-4 py-3"><GrantList row={row} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function isAdminCapable(row: AccessRow) {
  const roles = row.roles?.effectiveRoles ?? [];
  const capabilities = row.capabilities?.effectiveCapabilities ?? [];
  return roles.some((role) => role.toLowerCase().includes("admin")) || capabilities.some((capability) => ADMIN_CAPABILITIES.has(capability));
}

function loginLabel(principal: PrincipalInfo) {
  if (!isPrincipalActive(principal)) return "Disabled";
  if (principal.loginEnabled === false) return "Login disabled";
  return "Login enabled";
}

function GrantList({ row }: { row: AccessRow }) {
  const roleGrants = row.roles?.grants ?? [];
  const capabilityGrants = row.capabilities?.grants ?? [];
  if (roleGrants.length === 0 && capabilityGrants.length === 0) return <span className="text-slate-500 dark:text-slate-400">No direct grants</span>;
  return (
    <div className="space-y-2">
      {roleGrants.map((grant) => <GrantToken key={grant.roleGrantId} label={grant.role} scope={scopeLabel(grant.scope)} />)}
      {capabilityGrants.map((grant) => <GrantToken key={grant.capabilityGrantId} label={grant.capability} scope={scopeLabel(grant.scope)} />)}
    </div>
  );
}

function GrantToken({ label, scope }: { label: string; scope: string }) {
  return <div><span className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{label}</span><span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{scope}</span></div>;
}

function TokenList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0) return <span className="text-slate-500 dark:text-slate-400">{empty}</span>;
  return <div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className="rounded bg-sky-50 px-2 py-1 font-mono text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200">{value}</span>)}</div>;
}

function scopeLabel(scope?: { type?: string; spaceId?: string; domainId?: string } | null) {
  if (!scope) return "scope not reported";
  if (scope.domainId) return `${scope.type} · ${scope.spaceId || "space?"}/${scope.domainId}`;
  if (scope.spaceId) return `${scope.type} · ${scope.spaceId}`;
  return scope.type || "scope not reported";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <Panel><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div></Panel>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">{children}</div>;
}
