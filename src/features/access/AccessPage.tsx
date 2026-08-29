import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { PageHeader } from "../../components/layout/PageHeader";
import {
  Button,
  Alert,
  formatEnumLabel,
  PrincipalLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../components/typography";
import {
  getPrincipal as defaultGetPrincipal,
  listPrincipalCapabilities as defaultListPrincipalCapabilities,
  listPrincipalRoles as defaultListPrincipalRoles,
  listPrincipals as defaultListPrincipals,
} from "../../services/adminService";
import type {
  ListPrincipalCapabilitiesResponse,
  ListPrincipalRolesResponse,
} from "../../types/access";
import type { ListPrincipalsResponse, PrincipalInfo } from "../../types/users";
import { isPrincipalActive, principalIdOf } from "../../types/users";

export type AccessPageProps = {
  getPrincipalService?: (principalId: string) => Promise<PrincipalInfo>;
  listPrincipalsService?: (input?: {
    pageSize?: number;
    includeDisabled?: boolean;
    includeDeleted?: boolean;
  }) => Promise<ListPrincipalsResponse>;
  listPrincipalRolesService?: (
    principalId: string,
  ) => Promise<ListPrincipalRolesResponse>;
  listPrincipalCapabilitiesService?: (
    principalId: string,
  ) => Promise<ListPrincipalCapabilitiesResponse>;
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
        : (
            await listPrincipalsService({
              pageSize: 100,
              includeDisabled: true,
              includeDeleted: false,
            })
          ).principals;
      const accessRows = await Promise.all(
        principals.map(async (principal) => {
          const principalId = principalIdOf(principal);
          try {
            const [roles, capabilities] = await Promise.all([
              listPrincipalRolesService(principalId),
              listPrincipalCapabilitiesService(principalId),
            ]);
            return {
              principal,
              roles,
              capabilities,
              error: "",
            } satisfies AccessRow;
          } catch (err) {
            return {
              principal,
              roles: null,
              capabilities: null,
              error:
                err instanceof Error
                  ? err.message
                  : "Failed to load access grants",
            } satisfies AccessRow;
          }
        }),
      );
      setRows(accessRows);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load principals",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [
    focusedPrincipalId,
    getPrincipalService,
    listPrincipalCapabilitiesService,
    listPrincipalRolesService,
    listPrincipalsService,
  ]);

  const adminCapableCount = useMemo(
    () => rows.filter(isAdminCapable).length,
    [rows],
  );
  const roleGrantCount = useMemo(
    () =>
      rows.reduce((total, row) => total + (row.roles?.grants.length ?? 0), 0),
    [rows],
  );
  const capabilityGrantCount = useMemo(
    () =>
      rows.reduce(
        (total, row) => total + (row.capabilities?.grants.length ?? 0),
        0,
      ),
    [rows],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Roles & capabilities"
        description={`Operators are represented as principals with system roles, explicit capabilities, and scoped authorization grants.${focusedPrincipalId ? " This view is scoped to one principal." : ""}`}
        actions={
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Admin-capable principals"
          value={adminCapableCount}
        />
        <SummaryCard label="Role grants" value={roleGrantCount} />
        <SummaryCard label="Capability grants" value={capabilityGrantCount} />
      </div>

      {loading ? (
        <Panel>
          <Text intent="muted">Loading access…</Text>
        </Panel>
      ) : rows.length === 0 ? (
        <Panel>
          <Text
            as="p"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            No principals found
          </Text>
          <Text intent="muted" size="sm" className="mt-2">
            Create principals before assigning roles or capabilities.
          </Text>
        </Panel>
      ) : (
        <div
          className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
        >
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}>
              <tr>
                <TableHead className="px-4 py-3">Principal</TableHead>
                <TableHead className="px-4 py-3">Login</TableHead>
                <TableHead className="px-4 py-3">Effective roles</TableHead>
                <TableHead className="px-4 py-3">Effective capabilities</TableHead>
                <TableHead className="px-4 py-3">Scoped grants</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row) => {
                const principalId = principalIdOf(row.principal);
                const effectiveRoles = row.roles?.effectiveRoles ?? [];
                const effectiveCapabilities =
                  row.capabilities?.effectiveCapabilities ?? [];
                return (
                  <tr
                    key={principalId}
                    className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <PrincipalLabel
                        principalId={principalId}
                        username={row.principal.username}
                        displayName={row.principal.displayName}
                        link
                      />
                      <div className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
                        {formatEnumLabel(row.principal.state)}
                      </div>
                      {row.error && (
                        <Text intent="danger" size="sm" className="mt-2">
                          {row.error}
                        </Text>
                      )}
                    </td>
                    <td className="px-4 py-3">{loginLabel(row.principal)}</td>
                    <td className="px-4 py-3">
                      <TokenList
                        values={effectiveRoles}
                        empty="No effective roles"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <TokenList
                        values={effectiveCapabilities}
                        empty="No effective capabilities"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <GrantList row={row} />
                    </td>
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
  return (
    roles.some((role) => role.toLowerCase().includes("admin")) ||
    capabilities.some((capability) => ADMIN_CAPABILITIES.has(capability))
  );
}

function loginLabel(principal: PrincipalInfo) {
  if (!isPrincipalActive(principal)) return "Disabled";
  if (principal.loginEnabled === false) return "Login disabled";
  return "Login enabled";
}

function GrantList({ row }: { row: AccessRow }) {
  const roleGrants = row.roles?.grants ?? [];
  const capabilityGrants = row.capabilities?.grants ?? [];
  if (roleGrants.length === 0 && capabilityGrants.length === 0)
    return (
      <span className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
        No direct grants
      </span>
    );
  return (
    <div className="space-y-2">
      {roleGrants.map((grant) => (
        <GrantToken
          key={grant.roleGrantId}
          label={grant.role}
          scope={scopeLabel(grant.scope)}
        />
      ))}
      {capabilityGrants.map((grant) => (
        <GrantToken
          key={grant.capabilityGrantId}
          label={grant.capability}
          scope={scopeLabel(grant.scope)}
        />
      ))}
    </div>
  );
}

function GrantToken({ label, scope }: { label: string; scope: string }) {
  return (
    <div>
      <span className={`rounded bg-slate-100 px-2 py-1 font-mono text-xs ${themeClasses.text.parts.bodyLight} dark:bg-slate-800 ${themeClasses.text.parts.darkStrong}`}>
        {label}
      </span>
      <span className={`ml-2 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
        {scope}
      </span>
    </div>
  );
}

function TokenList({ values, empty }: { values: string[]; empty: string }) {
  if (values.length === 0)
    return <span className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>{empty}</span>;
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <span
          key={value}
          className="rounded bg-sky-50 px-2 py-1 font-mono text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200"
        >
          {value}
        </span>
      ))}
    </div>
  );
}

function scopeLabel(
  scope?: { type?: string; spaceId?: string; domainId?: string } | null,
) {
  if (!scope) return "scope not reported";
  const type = formatEnumLabel(scope.type, "Scope");
  if (scope.domainId)
    return `${type} · ${shortScopeId(scope.spaceId) || "space?"}/${shortScopeId(scope.domainId)}`;
  if (scope.spaceId) return `${type} · ${shortScopeId(scope.spaceId)}`;
  return type || "scope not reported";
}

function shortScopeId(value?: string) {
  if (!value) return "";
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Panel>
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <div className={`mt-2 text-3xl font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {value}
      </div>
    </Panel>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
    >
      {children}
    </div>
  );
}
