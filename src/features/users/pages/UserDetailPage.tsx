import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button, Alert, H2, Select, Text } from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import { getPrincipal as defaultGetPrincipal, listDomains as defaultListDomains, listPrincipalCapabilities as defaultListPrincipalCapabilities, listPrincipalRoles as defaultListPrincipalRoles, listPrincipalSessions as defaultListPrincipalSessions, listSpaces as defaultListSpaces, revokePrincipalCapability as defaultRevokePrincipalCapability, revokePrincipalRole as defaultRevokePrincipalRole, revokePrincipalSession as defaultRevokePrincipalSession, revokePrincipalSessions as defaultRevokePrincipalSessions, setPrincipalCapabilitiesForScope as defaultSetPrincipalCapabilitiesForScope, setPrincipalRolesForScope as defaultSetPrincipalRolesForScope } from "../../../services/adminService";
import type { AccessScopeInput, ListPrincipalCapabilitiesResponse, ListPrincipalRolesResponse, PrincipalCapabilityGrantInfo, PrincipalRoleGrantInfo, RevokePrincipalCapabilityInput, RevokePrincipalCapabilityResponse, RevokePrincipalRoleInput, RevokePrincipalRoleResponse, SetPrincipalCapabilitiesForScopeInput, SetPrincipalCapabilitiesForScopeResponse, SetPrincipalRolesForScopeInput, SetPrincipalRolesForScopeResponse } from "../../../types/access";
import type { ListDomainsInput, ListDomainsResponse, DomainInfo } from "../../../types/domains";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../types/spaces";
import type { ListPrincipalSessionsInput, ListPrincipalSessionsResponse, PrincipalInfo, PrincipalSessionInfo, RevokePrincipalSessionInput, RevokePrincipalSessionsResponse } from "../../../types/users";
import { principalIdOf } from "../../../types/users";
import { UserStateBadge } from "../components/UserStateBadge";

export type UserDetailPageProps = {
  getPrincipalService?: (principalId: string) => Promise<PrincipalInfo>;
  listPrincipalRolesService?: (principalId: string) => Promise<ListPrincipalRolesResponse>;
  listPrincipalCapabilitiesService?: (principalId: string) => Promise<ListPrincipalCapabilitiesResponse>;
  revokePrincipalRoleService?: (input: RevokePrincipalRoleInput) => Promise<RevokePrincipalRoleResponse>;
  revokePrincipalCapabilityService?: (input: RevokePrincipalCapabilityInput) => Promise<RevokePrincipalCapabilityResponse>;
  setPrincipalRolesForScopeService?: (input: SetPrincipalRolesForScopeInput) => Promise<SetPrincipalRolesForScopeResponse>;
  setPrincipalCapabilitiesForScopeService?: (input: SetPrincipalCapabilitiesForScopeInput) => Promise<SetPrincipalCapabilitiesForScopeResponse>;
  listPrincipalSessionsService?: (input: ListPrincipalSessionsInput) => Promise<ListPrincipalSessionsResponse>;
  listSpacesService?: (input: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  revokePrincipalSessionService?: (input: RevokePrincipalSessionInput) => Promise<void>;
  revokePrincipalSessionsService?: (principalId: string) => Promise<RevokePrincipalSessionsResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

type DetailTab = "overview" | "access" | "sessions";
type RevokeDialog = { kind: "role"; grantId: string; label: string; reason: string } | { kind: "capability"; grantId: string; label: string; reason: string } | { kind: "session"; sessionId: string } | { kind: "allSessions" };

type GrantForm = {
  role: string;
  capability: string;
  scopeType: "system" | "space" | "domain";
  spaceId: string;
  domainId: string;
  reason: string;
};

const ROLE_OPTIONS = ["automation.admin", "inference.admin", "semantic.admin", "space.admin", "space.owner", "space.editor", "space.viewer", "identity.admin", "backup.operator", "cluster.operator", "audit.reader", "system.admin"];
const CAPABILITY_OPTIONS = [
  "CAPABILITY_SPACE_READ", "CAPABILITY_SPACE_UPDATE", "CAPABILITY_SPACE_MANAGE_ACCESS", "CAPABILITY_SPACE_ARCHIVE", "CAPABILITY_SPACE_DELETE", "CAPABILITY_SPACE_CREATE",
  "CAPABILITY_DOMAIN_READ", "CAPABILITY_DOMAIN_CREATE", "CAPABILITY_DOMAIN_UPDATE", "CAPABILITY_DOMAIN_DELETE",
  "CAPABILITY_GRAPH_READ", "CAPABILITY_GRAPH_WRITE", "CAPABILITY_GRAPH_DELETE", "CAPABILITY_QUERY_RUN", "CAPABILITY_SEMANTIC_SEARCH", "CAPABILITY_SEMANTIC_MANAGE",
  "CAPABILITY_BLOB_READ", "CAPABILITY_BLOB_WRITE", "CAPABILITY_BLOB_DELETE", "CAPABILITY_METADATA_READ", "CAPABILITY_METADATA_WRITE",
  "CAPABILITY_IDENTITY_PRINCIPAL_READ", "CAPABILITY_IDENTITY_PRINCIPAL_CREATE", "CAPABILITY_IDENTITY_PRINCIPAL_UPDATE", "CAPABILITY_IDENTITY_CREDENTIAL_SET", "CAPABILITY_IDENTITY_SESSION_DELEGATE", "CAPABILITY_IDENTITY_SESSION_MANAGE", "CAPABILITY_IDENTITY_GRANT_MANAGE",
  "CAPABILITY_INFERENCE_CATALOG_READ", "CAPABILITY_INFERENCE_CATALOG_MANAGE", "CAPABILITY_INFERENCE_PROFILE_READ", "CAPABILITY_INFERENCE_PROFILE_MANAGE", "CAPABILITY_INFERENCE_CREDENTIAL_READ", "CAPABILITY_INFERENCE_CREDENTIAL_MANAGE", "CAPABILITY_INFERENCE_GRANT_MANAGE", "CAPABILITY_INFERENCE_POLICY_MANAGE", "CAPABILITY_INFERENCE_AUDIT_READ", "CAPABILITY_INFERENCE_INVOKE",
  "CAPABILITY_AUTOMATION_READ", "CAPABILITY_AUTOMATION_MANAGE", "CAPABILITY_AUTOMATION_RUN", "CAPABILITY_AUTOMATION_WORKER",
  "CAPABILITY_DAEMON_CONFIGURE", "CAPABILITY_CLUSTER_READ", "CAPABILITY_MESH_MANAGE", "CAPABILITY_SYSTEM_BACKUP_SPACE",
];

const ROLE_CAPABILITIES: Record<string, string[]> = {
  "system.admin": ["*"],
  "identity.admin": ["CAPABILITY_IDENTITY_PRINCIPAL_READ", "CAPABILITY_IDENTITY_PRINCIPAL_CREATE", "CAPABILITY_IDENTITY_PRINCIPAL_UPDATE", "CAPABILITY_IDENTITY_CREDENTIAL_SET", "CAPABILITY_IDENTITY_SESSION_MANAGE", "CAPABILITY_IDENTITY_SESSION_DELEGATE", "CAPABILITY_IDENTITY_GRANT_MANAGE"],
  "space.admin": ["CAPABILITY_SPACE_READ", "CAPABILITY_SPACE_CREATE", "CAPABILITY_SPACE_UPDATE", "CAPABILITY_SPACE_MANAGE_ACCESS", "CAPABILITY_SPACE_ARCHIVE", "CAPABILITY_SPACE_DELETE", "CAPABILITY_DOMAIN_READ", "CAPABILITY_DOMAIN_CREATE", "CAPABILITY_DOMAIN_UPDATE", "CAPABILITY_DOMAIN_DELETE"],
  "semantic.admin": ["CAPABILITY_SEMANTIC_SEARCH", "CAPABILITY_SEMANTIC_MANAGE", "CAPABILITY_INFERENCE_PROFILE_READ", "CAPABILITY_INFERENCE_AUDIT_READ"],
  "inference.admin": ["CAPABILITY_INFERENCE_CATALOG_READ", "CAPABILITY_INFERENCE_CATALOG_MANAGE", "CAPABILITY_INFERENCE_PROFILE_READ", "CAPABILITY_INFERENCE_PROFILE_MANAGE", "CAPABILITY_INFERENCE_CREDENTIAL_READ", "CAPABILITY_INFERENCE_CREDENTIAL_MANAGE", "CAPABILITY_INFERENCE_GRANT_MANAGE", "CAPABILITY_INFERENCE_POLICY_MANAGE", "CAPABILITY_INFERENCE_AUDIT_READ"],
  "automation.admin": ["CAPABILITY_AUTOMATION_READ", "CAPABILITY_AUTOMATION_MANAGE", "CAPABILITY_AUTOMATION_RUN", "CAPABILITY_INFERENCE_PROFILE_READ", "CAPABILITY_INFERENCE_AUDIT_READ"],
  "backup.operator": ["CAPABILITY_SYSTEM_BACKUP_SPACE"],
  "cluster.operator": ["CAPABILITY_CLUSTER_READ", "CAPABILITY_MESH_MANAGE"],
  "space.owner": ["CAPABILITY_SPACE_READ", "CAPABILITY_SPACE_UPDATE", "CAPABILITY_SPACE_MANAGE_ACCESS", "CAPABILITY_DOMAIN_READ", "CAPABILITY_DOMAIN_CREATE", "CAPABILITY_DOMAIN_UPDATE", "CAPABILITY_DOMAIN_DELETE", "CAPABILITY_GRAPH_READ", "CAPABILITY_GRAPH_WRITE", "CAPABILITY_GRAPH_DELETE", "CAPABILITY_QUERY_RUN", "CAPABILITY_BLOB_READ", "CAPABILITY_BLOB_WRITE", "CAPABILITY_BLOB_DELETE", "CAPABILITY_METADATA_READ", "CAPABILITY_METADATA_WRITE", "CAPABILITY_SEMANTIC_SEARCH"],
  "space.editor": ["CAPABILITY_SPACE_READ", "CAPABILITY_DOMAIN_READ", "CAPABILITY_GRAPH_READ", "CAPABILITY_GRAPH_WRITE", "CAPABILITY_QUERY_RUN", "CAPABILITY_BLOB_READ", "CAPABILITY_BLOB_WRITE", "CAPABILITY_METADATA_READ", "CAPABILITY_METADATA_WRITE", "CAPABILITY_SEMANTIC_SEARCH"],
  "space.viewer": ["CAPABILITY_SPACE_READ", "CAPABILITY_DOMAIN_READ", "CAPABILITY_GRAPH_READ", "CAPABILITY_QUERY_RUN", "CAPABILITY_BLOB_READ", "CAPABILITY_METADATA_READ", "CAPABILITY_SEMANTIC_SEARCH"],
  "automation.worker": ["CAPABILITY_AUTOMATION_WORKER"],
};

export function UserDetailPage({
  getPrincipalService = defaultGetPrincipal,
  listPrincipalRolesService = defaultListPrincipalRoles,
  listPrincipalCapabilitiesService = defaultListPrincipalCapabilities,
  revokePrincipalRoleService = defaultRevokePrincipalRole,
  revokePrincipalCapabilityService = defaultRevokePrincipalCapability,
  setPrincipalRolesForScopeService = defaultSetPrincipalRolesForScope,
  setPrincipalCapabilitiesForScopeService = defaultSetPrincipalCapabilitiesForScope,
  listPrincipalSessionsService = defaultListPrincipalSessions,
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  revokePrincipalSessionService = defaultRevokePrincipalSession,
  revokePrincipalSessionsService = defaultRevokePrincipalSessions,
  principalContext,
}: UserDetailPageProps) {
  const { principalId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const routePrincipalId = principalId;
  const [activeTab, setActiveTab] = useState<DetailTab>((searchParams.get("tab") as DetailTab) || "overview");
  const [user, setUser] = useState<PrincipalInfo | null>(null);
  const [roles, setRoles] = useState<ListPrincipalRolesResponse>({ grants: [], effectiveRoles: [] });
  const [capabilities, setCapabilities] = useState<ListPrincipalCapabilitiesResponse>({ grants: [], effectiveCapabilities: [] });
  const [sessions, setSessions] = useState<PrincipalSessionInfo[]>([]);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [ownedSpaces, setOwnedSpaces] = useState<SpaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revokeDialog, setRevokeDialog] = useState<RevokeDialog | null>(null);
  const canManageSessions = canUseCapability(principalContext, "identity.session.manage");
  const canManageGrants = canUseCapability(principalContext, "identity.grant.manage");

  async function load() {
    if (!routePrincipalId) {
      setError("Principal ID is required");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [userResponse, roleResponse, capabilityResponse, sessionsResponse, spacesResponse] = await Promise.all([
        getPrincipalService(routePrincipalId),
        listPrincipalRolesService(routePrincipalId),
        listPrincipalCapabilitiesService(routePrincipalId),
        listPrincipalSessionsService({ principalId: routePrincipalId, pageSize: 100, includeInactive: false }),
        listSpacesService({ pageSize: 100, includeArchived: true }),
      ]);
      setUser(userResponse);
      setRoles(roleResponse);
      setCapabilities(capabilityResponse);
      setSessions(sessionsResponse.sessions);
      setSpaces(spacesResponse.spaces);
      setOwnedSpaces(spacesResponse.spaces.filter((space) => space.owner?.id === routePrincipalId));
    } catch (err) {
      setError(errorMessage(err, "Failed to load principal"));
    } finally {
      setLoading(false);
    }
  }

  async function reloadAccess() {
    if (!routePrincipalId) return;
    const [roleResponse, capabilityResponse] = await Promise.all([listPrincipalRolesService(routePrincipalId), listPrincipalCapabilitiesService(routePrincipalId)]);
    setRoles(roleResponse);
    setCapabilities(capabilityResponse);
  }

  useEffect(() => { void load(); }, [getPrincipalService, listPrincipalCapabilitiesService, listPrincipalRolesService, listPrincipalSessionsService, listSpacesService, routePrincipalId]);

  useEffect(() => {
    const tab = searchParams.get("tab") as DetailTab | null;
    if (tab === "access" || tab === "sessions" || tab === "overview") setActiveTab(tab);
  }, [searchParams]);

  function chooseTab(tab: DetailTab) {
    setActiveTab(tab);
    setSearchParams(tab === "overview" ? {} : { tab });
  }

  async function confirmRevoke() {
    if (!revokeDialog || !routePrincipalId) return;
    setActionLoading(true);
    setError("");
    setMessage("");
    try {
      if (revokeDialog.kind === "session") {
        await revokePrincipalSessionService({ principalId: routePrincipalId, authSessionId: revokeDialog.sessionId });
        setMessage("Session revoked.");
        await load();
      } else if (revokeDialog.kind === "allSessions") {
        const response = await revokePrincipalSessionsService(routePrincipalId);
        setMessage(`${response.revokedCount} session${response.revokedCount === 1 ? "" : "s"} revoked.`);
        await load();
      } else if (revokeDialog.kind === "role") {
        await revokePrincipalRoleService({ principalId: routePrincipalId, roleGrantId: revokeDialog.grantId, reason: revokeDialog.reason });
        setMessage("Role grant revoked.");
        await reloadAccess();
      } else {
        await revokePrincipalCapabilityService({ principalId: routePrincipalId, capabilityGrantId: revokeDialog.grantId, reason: revokeDialog.reason });
        setMessage("Capability grant revoked.");
        await reloadAccess();
      }
      setRevokeDialog(null);
    } catch (err) {
      setError(errorMessage(err, "Failed to revoke grant"));
    } finally {
      setActionLoading(false);
    }
  }

  const directGrantCount = (roles.grants.length || 0) + (capabilities.grants.length || 0);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Administration / Principals"
        title={user?.username || routePrincipalId || "Principal"}
        backLink={{ to: "/principals", label: "← Back to principals" }}
        badge={user?.state ? <UserStateBadge state={user.state} /> : null}
        description="Inspect principal identity, roles, capabilities, and active auth sessions."
      />

      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Principal detail sections">
          {(["overview", "access", "sessions"] as DetailTab[]).map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`rounded-t-lg border px-4 py-2 text-sm font-medium transition ${activeTab === tab ? "border-slate-200 border-b-white bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"}`} onClick={() => chooseTab(tab)}>{tab === "overview" ? "Overview" : tab === "access" ? "Roles & capabilities" : "Sessions"}</button>)}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{message}</div>}
      {loading ? <Loading /> : user && activeTab === "overview" ? <><UserIdentity user={user} /><OwnedSpaces spaces={ownedSpaces} /></> : null}
      {!loading && activeTab === "access" && <AccessPanel principal={user} roles={roles} capabilities={capabilities} directGrantCount={directGrantCount} canManage={canManageGrants} spaces={spaces} listDomainsService={listDomainsService} onRefresh={() => void reloadAccess()} onSaveRoles={async (input) => { await setPrincipalRolesForScopeService(input); }} onSaveCapabilities={async (input) => { await setPrincipalCapabilitiesForScopeService(input); await reloadAccess(); }} onRevokeRole={(grant) => setRevokeDialog({ kind: "role", grantId: grant.roleGrantId, label: grant.role, reason: "" })} onRevokeCapability={(grant) => setRevokeDialog({ kind: "capability", grantId: grant.capabilityGrantId, label: grant.capability, reason: "" })} />}
      {!loading && activeTab === "sessions" && <UserSessionsTable sessions={sessions} canRevoke={canManageSessions} onRevokeSession={(sessionId) => setRevokeDialog({ kind: "session", sessionId })} onRevokeAll={() => setRevokeDialog({ kind: "allSessions" })} />}
      {revokeDialog && <ConfirmRevokeDialog dialog={revokeDialog} setDialog={setRevokeDialog} loading={actionLoading} onCancel={() => setRevokeDialog(null)} onConfirm={() => void confirmRevoke()} />}
    </section>
  );
}

function Loading() {
  return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">Loading principal…</Text></div>;
}

function UserIdentity({ user }: { user: PrincipalInfo }) {
  return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Identity"><DetailRow label="Principal ID" value={principalIdOf(user)} /><DetailRow label="Username" value={user.username} /><DetailRow label="Type" value={user.type || "Not reported"} /><DetailRow label="State" value={user.state} /></Panel><Panel title="Timestamps"><DetailRow label="Created" value={formatTimestamp(user.createTime)} /><DetailRow label="Updated" value={formatTimestamp(user.updateTime)} /></Panel></div>;
}

function AccessPanel({ principal, roles, capabilities, directGrantCount, canManage, spaces, listDomainsService, onRefresh, onSaveRoles, onSaveCapabilities, onRevokeRole, onRevokeCapability }: { principal: PrincipalInfo | null; roles: ListPrincipalRolesResponse; capabilities: ListPrincipalCapabilitiesResponse; directGrantCount: number; canManage: boolean; spaces: SpaceInfo[]; listDomainsService: (input: ListDomainsInput) => Promise<ListDomainsResponse>; onRefresh: () => void; onSaveRoles: (input: SetPrincipalRolesForScopeInput) => Promise<void>; onSaveCapabilities: (input: SetPrincipalCapabilitiesForScopeInput) => Promise<void>; onRevokeRole: (grant: PrincipalRoleGrantInfo) => void; onRevokeCapability: (grant: PrincipalCapabilityGrantInfo) => void }) {
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Roles & capabilities</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Choose a scope, check the direct roles and extra direct capabilities, then Save. Role-inherited capabilities are shown checked and locked.</Text></div><Button variant="secondary" onClick={onRefresh}>Refresh</Button></div>
    {!canManage && <Alert>Current principal is missing identity.grant.manage; access grants are read-only.</Alert>}
    <div className="max-w-xs"><SummaryCard label="Direct grants" value={directGrantCount} /></div>
    {principal && <AccessCheckboxEditor principalId={principalIdOf(principal)} roles={roles} capabilities={capabilities} spaces={spaces} listDomainsService={listDomainsService} canManage={canManage} onSaveRoles={onSaveRoles} onSaveCapabilities={onSaveCapabilities} />}
    <RoleGrantTable grants={roles.grants} canManage={canManage} onRevoke={onRevokeRole} />
    <CapabilityGrantTable grants={capabilities.grants} canManage={canManage} onRevoke={onRevokeCapability} />
    {principal && <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Editing access for {principal.username || principalIdOf(principal)}.</Text>}
  </div>;
}

function AccessCheckboxEditor({ principalId, roles, capabilities, spaces, listDomainsService, canManage, onSaveRoles, onSaveCapabilities }: { principalId: string; roles: ListPrincipalRolesResponse; capabilities: ListPrincipalCapabilitiesResponse; spaces: SpaceInfo[]; listDomainsService: (input: ListDomainsInput) => Promise<ListDomainsResponse>; canManage: boolean; onSaveRoles: (input: SetPrincipalRolesForScopeInput) => Promise<void>; onSaveCapabilities: (input: SetPrincipalCapabilitiesForScopeInput) => Promise<void> }) {
  const [form, setForm] = useState<GrantForm>({ role: "", capability: "", scopeType: "space", spaceId: spaces[0]?.spaceId || "", domainId: "", reason: "" });
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const scope = accessScopeFromForm(form);
  const key = scopeKey(scope);

  useEffect(() => {
    if (!form.spaceId || form.scopeType === "system") { setDomains([]); return; }
    let cancelled = false;
    void listDomainsService({ spaceId: form.spaceId, pageSize: 100, includeSystem: false }).then((response) => { if (!cancelled) setDomains(response.domains); }).catch(() => { if (!cancelled) setDomains([]); });
    return () => { cancelled = true; };
  }, [form.spaceId, form.scopeType, listDomainsService]);

  useEffect(() => {
    setSelectedRoles(roles.grants.filter((grant) => scopeKey(grant.scope) === key).map((grant) => grant.role));
    setSelectedCapabilities(capabilities.grants.filter((grant) => scopeKey(grant.scope) === key).map((grant) => grant.capability));
  }, [roles.grants, capabilities.grants, key]);

  const inheritedCapabilities = inheritedCapabilitiesForRoles(selectedRoles);
  const disabled = !canManage || saving || (form.scopeType !== "system" && !form.spaceId) || (form.scopeType === "domain" && !form.domainId);

  async function save() {
    setSaving(true);
    setSaveError("");
    setSaveMessage("");
    try {
      await onSaveRoles({ principalId, scope, roles: selectedRoles, reason: form.reason });
      await onSaveCapabilities({ principalId, scope, capabilities: selectedCapabilities, reason: form.reason });
      setSaveMessage("Access grants saved.");
    } catch (err) {
      setSaveError(errorMessage(err, "Failed to save access grants"));
    } finally { setSaving(false); }
  }

  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Edit selected scope</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Direct roles and direct capabilities for the selected scope. Inherited capabilities are locked.</Text></div><Button disabled={disabled} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button></div>
    {saveError && <Alert>{saveError}</Alert>}
    {saveMessage && <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">{saveMessage}</div>}
    <div className="mt-4"><ScopeEditor form={form} setForm={setForm} spaces={spaces} domains={domains} labelPrefix="Edit " /></div>
    <label className="mt-4 block text-sm font-medium text-slate-900 dark:text-slate-100">Set reason<textarea className="mt-1 block min-h-16 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Audit reason for set operation" /></label>
    <div className="mt-5 grid gap-6 lg:grid-cols-2"><CheckboxGroup title="Direct roles" options={ROLE_OPTIONS} selected={selectedRoles} disabled={disabled} onToggle={(role) => setSelectedRoles((current) => toggleValue(current, role))} /><CheckboxGroup title="Direct capabilities" options={CAPABILITY_OPTIONS} selected={selectedCapabilities} inherited={inheritedCapabilities} disabled={disabled} onToggle={(capability) => setSelectedCapabilities((current) => toggleValue(current, capability))} /></div>
  </div>;
}

function CheckboxGroup({ title, options, selected, inherited = new Set<string>(), disabled, onToggle }: { title: string; options: string[]; selected: string[]; inherited?: Set<string>; disabled: boolean; onToggle: (value: string) => void }) {
  return <div><Text as="h4" className="font-medium text-slate-900 dark:text-slate-100">{title}</Text><div className="mt-3 max-h-80 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3 dark:border-slate-800">{options.map((value) => { const inheritedOnly = inherited.has(value) && !selected.includes(value); const checked = selected.includes(value) || inherited.has(value); return <label key={value} className={`flex items-center justify-between gap-3 rounded px-2 py-1 text-sm ${inheritedOnly ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-slate-200"}`}><span className="font-mono text-xs">{value}</span><span className="flex items-center gap-2"><input aria-label={inheritedOnly ? `${value} inherited` : value} type="checkbox" checked={checked} disabled={disabled || inheritedOnly} onChange={() => onToggle(value)} />{inheritedOnly && <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">role</span>}</span></label>; })}</div></div>;
}

function RoleGrantTable({ grants, canManage, onRevoke }: { grants: PrincipalRoleGrantInfo[]; canManage: boolean; onRevoke: (grant: PrincipalRoleGrantInfo) => void }) {
  return <GrantTable title="Role grants" empty="No direct role grants" headers={["Role", "Scope", "Reason", "Actions"]} rows={grants.map((grant) => [grant.role, scopeLabel(grant.scope), grant.reason || "—", canManage ? <Button key="revoke" variant="secondary" onClick={() => onRevoke(grant)}>Revoke</Button> : <span key="ro" className="text-slate-500 dark:text-slate-400">Read-only</span>])} />;
}

function CapabilityGrantTable({ grants, canManage, onRevoke }: { grants: PrincipalCapabilityGrantInfo[]; canManage: boolean; onRevoke: (grant: PrincipalCapabilityGrantInfo) => void }) {
  return <GrantTable title="Capability grants" empty="No direct capability grants" headers={["Capability", "Scope", "Reason", "Actions"]} rows={grants.map((grant) => [grant.capability, scopeLabel(grant.scope), grant.reason || "—", canManage ? <Button key="revoke" variant="secondary" onClick={() => onRevoke(grant)}>Revoke</Button> : <span key="ro" className="text-slate-500 dark:text-slate-400">Read-only</span>])} />;
}

function GrantTable({ title, empty, headers, rows }: { title: string; empty: string; headers: string[]; rows: Array<Array<ReactNode>> }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70"><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">{title}</Text>{rows.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">{empty}</Text> : <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700 dark:text-slate-300">{cell}</td>)}</tr>)}</tbody></table></div>}</div>;
}

function ScopeEditor({ form, setForm, spaces, domains, labelPrefix = "" }: { form: GrantForm; setForm: (value: GrantForm | ((current: GrantForm) => GrantForm)) => void; spaces: SpaceInfo[]; domains: DomainInfo[]; labelPrefix?: string }) {
  const prefix = labelPrefix.trim();
  const scopeLabelText = (base: string) => prefix ? `${prefix} ${base.toLowerCase()}` : base;
  return <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Scope</Text><div className="mt-3 flex flex-wrap gap-3">{(["system", "space", "domain"] as GrantForm["scopeType"][]).map((scopeType) => <label key={scopeType} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="radio" checked={form.scopeType === scopeType} onChange={() => setForm((current) => ({ ...current, scopeType, domainId: scopeType === "domain" ? current.domainId : "" }))} />{scopeType === "system" ? scopeLabelText("System-wide") : scopeType === "space" ? scopeLabelText("Space") : scopeLabelText("Domain")}</label>)}</div>{form.scopeType !== "system" && <div className="mt-3 grid gap-3 md:grid-cols-2"><Select label={scopeLabelText("Space")} value={form.spaceId} onChange={(spaceId) => setForm((current) => ({ ...current, spaceId, domainId: "" }))} options={spaces.map((space) => ({ value: space.spaceId, label: space.name || space.spaceId, hint: space.spaceId }))} placeholder="Choose space" />{form.scopeType === "domain" && <Select label={scopeLabelText("Domain")} value={form.domainId} onChange={(domainId) => setForm((current) => ({ ...current, domainId }))} options={domains.map((domain) => ({ value: domain.domainId, label: domain.name || domain.key || domain.domainId, hint: domain.domainId }))} placeholder="Choose domain" />}</div>}{form.scopeType === "system" && <Text intent="danger" size="sm" className="mt-3">System-wide grants apply across all spaces. Prefer scoped grants when possible.</Text>}</div>;
}

function UserSessionsTable({ sessions, canRevoke, onRevokeSession, onRevokeAll }: { sessions: PrincipalSessionInfo[]; canRevoke: boolean; onRevokeSession: (sessionId: string) => void; onRevokeAll: () => void }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70"><div className="flex flex-wrap items-center justify-between gap-3"><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Auth sessions</Text>{canRevoke && <Button variant="secondary" onClick={onRevokeAll} disabled={sessions.length === 0}>Revoke all sessions</Button>}</div>{sessions.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No active sessions found.</Text> : <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Session ID</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Expires</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{sessions.map((session) => <tr key={session.authSessionId}><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{session.authSessionId}</td><td className="px-4 py-3">{session.state}</td><td className="px-4 py-3">{formatTimestamp(session.lastSeenTime)}</td><td className="px-4 py-3">{formatTimestamp(session.expireTime)}</td><td className="px-4 py-3">{clientLabel(session)}</td><td className="px-4 py-3">{canRevoke ? <button className="rounded px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50" onClick={() => onRevokeSession(session.authSessionId)}>Revoke</button> : <span className="text-slate-500 dark:text-slate-400">Read-only</span>}</td></tr>)}</tbody></table></div>}</div>;
}

function OwnedSpaces({ spaces }: { spaces: SpaceInfo[] }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70"><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Owned spaces</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Spaces where this principal is the owner.</Text>{spaces.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No owned spaces found.</Text> : <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Space ID</th><th className="px-4 py-3">State</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{spaces.map((space) => <tr key={space.spaceId}><td className="px-4 py-3 font-medium"><Link className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(space.spaceId)}`}>{space.name}</Link></td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{space.spaceId}</td><td className="px-4 py-3">{space.state || "Not reported"}</td></tr>)}</tbody></table></div>}</div>;
}


function ConfirmRevokeDialog({ dialog, setDialog, loading, onCancel, onConfirm }: { dialog: RevokeDialog; setDialog: (dialog: RevokeDialog) => void; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  const title = dialog.kind === "allSessions" ? "Revoke all principal sessions?" : dialog.kind === "session" ? "Revoke this principal session?" : "Revoke grant?";
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-red-400">Revoke</Text><H2 className="mt-2 text-xl text-slate-900 dark:text-slate-100">{title}</H2><Text intent="muted" size="sm" className="mt-3 text-slate-600 dark:text-slate-400">{dialog.kind === "session" ? `Session ${dialog.sessionId} will be revoked.` : dialog.kind === "allSessions" ? "The principal will be signed out from all active clients." : `${dialog.label} will be revoked.`}</Text>{(dialog.kind === "role" || dialog.kind === "capability") && <label className="mt-4 block text-sm font-medium text-slate-900 dark:text-slate-100">Reason<textarea className="mt-1 block min-h-20 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={dialog.reason} onChange={(event) => setDialog({ ...dialog, reason: event.target.value })} placeholder="Audit reason" /></label>}<div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={onCancel} disabled={loading}>Cancel</Button><Button onClick={onConfirm} disabled={loading}>{loading ? "Revoking…" : "Revoke"}</Button></div></div></div>;
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value}</div></div>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70"><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">{title}</Text><dl className="mt-4 space-y-3">{children}</dl></div>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">{value}</dd></div>;
}


function accessScopeFromForm(form: GrantForm): AccessScopeInput {
  if (form.scopeType === "domain") return { type: "domain", spaceId: form.spaceId, domainId: form.domainId };
  if (form.scopeType === "space") return { type: "space", spaceId: form.spaceId };
  return { type: "system" };
}

function scopeKey(scope?: { type?: string; spaceId?: string; domainId?: string } | null) {
  const type = (scope?.type || "system").replace(/^ACCESS_SCOPE_TYPE_/i, "").toLowerCase();
  return `${type}|${scope?.spaceId || ""}|${scope?.domainId || ""}`;
}

function inheritedCapabilitiesForRoles(roles: string[]) {
  const inherited = new Set<string>();
  for (const role of roles) {
    const caps = ROLE_CAPABILITIES[role] || [];
    if (caps.includes("*")) CAPABILITY_OPTIONS.forEach((capability) => inherited.add(capability));
    else caps.forEach((capability) => inherited.add(capability));
  }
  return inherited;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
}

function scopeLabel(scope?: { type?: string; spaceId?: string; domainId?: string } | null) {
  if (!scope) return "scope not reported";
  if (scope.domainId) return `${scope.type} · ${scope.spaceId || "space?"}/${scope.domainId}`;
  if (scope.spaceId) return `${scope.type} · ${scope.spaceId}`;
  return scope.type || "scope not reported";
}

function clientLabel(session: PrincipalSessionInfo) {
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

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}
