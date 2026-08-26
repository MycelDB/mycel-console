import { getClusterRuntimeStatus, getMyAccess, listPrincipalCapabilities, listPrincipalRoles } from "../../services/adminService";
import type { AccessScopeInfo, ListPrincipalCapabilitiesResponse, ListPrincipalRolesResponse, MyAccessInfo } from "../../types/access";
import type { PrincipalSession } from "../../types/auth";
import type { ClusterRuntimeStatusInfo } from "../../types/cluster";
import type { CapabilityGrantSummary, CapabilityScope, PrincipalCapabilityState } from "./capabilities";
import { capability, completeCapabilities, hasCapability, unknownCapabilities } from "./capabilities";

export type ConsolePrincipalContext = {
  session: PrincipalSession;
  roles: string[];
  capabilities: string[];
  capabilityState: PrincipalCapabilityState;
  warnings: string[];
  clusterRuntime?: ClusterRuntimeStatusInfo;
};

export type PrincipalContextServices = {
  getMyAccessService?: () => Promise<MyAccessInfo>;
  listPrincipalRolesService?: (principalId: string) => Promise<ListPrincipalRolesResponse>;
  listPrincipalCapabilitiesService?: (principalId: string) => Promise<ListPrincipalCapabilitiesResponse>;
  getClusterRuntimeStatusService?: () => Promise<ClusterRuntimeStatusInfo>;
};

export async function loadConsolePrincipalContext(
  session: PrincipalSession,
  services: PrincipalContextServices = {},
): Promise<ConsolePrincipalContext> {
  const myAccess = services.getMyAccessService ?? getMyAccess;
  const myAccessResult = await settleAccessCall(() => myAccess());
  if (myAccessResult.ok) {
    const access = myAccessResult.value;
    const roles = access.effectiveRoles;
    const capabilities = access.effectiveCapabilities;
    const stateCapabilities = access.capabilities.length > 0
      ? access.capabilities.map((item) => capability(item.capability, item.scope ? { kind: scopeKind(item.scope.kind), spaceId: item.scope.spaceId, domainId: item.scope.domainId } : undefined))
      : [
        ...capabilities.map((item) => capability(item)),
        ...roleCapabilitySummaries(roles),
      ];
    return enrichConsolePrincipalContext({
      session,
      roles,
      capabilities,
      capabilityState: access.complete ? completeCapabilities(stateCapabilities) : { kind: "partial", roles, warnings: access.warnings },
      warnings: access.warnings,
    }, services);
  }

  return loadConsolePrincipalContextViaAdminDiscovery(session, services, myAccessResult.error);
}

async function loadConsolePrincipalContextViaAdminDiscovery(
  session: PrincipalSession,
  services: PrincipalContextServices,
  myAccessError: string,
): Promise<ConsolePrincipalContext> {
  const listRoles = services.listPrincipalRolesService ?? listPrincipalRoles;
  const listCapabilities = services.listPrincipalCapabilitiesService ?? listPrincipalCapabilities;
  const rolesResult = await settleAccessCall(() => listRoles(session.principalId));
  const capabilitiesResult = await settleAccessCall(() => listCapabilities(session.principalId));
  const warnings: string[] = [`Self access unavailable: ${friendlyAccessDiscoveryError(myAccessError)}`];

  if (!rolesResult.ok) warnings.push(`Roles unavailable: ${friendlyAccessDiscoveryError(rolesResult.error)}`);
  if (!capabilitiesResult.ok) warnings.push(`Capabilities unavailable: ${friendlyAccessDiscoveryError(capabilitiesResult.error)}`);

  const roles = rolesResult.ok ? rolesResult.value.effectiveRoles : [];
  const capabilities = capabilitiesResult.ok ? capabilitiesResult.value.effectiveCapabilities : [];

  if (capabilitiesResult.ok) {
    return enrichConsolePrincipalContext({ session, roles, capabilities, capabilityState: completeCapabilities([...capabilitySummaries(capabilitiesResult.value), ...roleCapabilitySummaries(roles)]), warnings }, services);
  }
  if (rolesResult.ok) {
    return enrichConsolePrincipalContext({ session, roles, capabilities, capabilityState: { kind: "partial", roles, warnings }, warnings }, services);
  }
  return enrichConsolePrincipalContext({ session, roles, capabilities, capabilityState: unknownCapabilities(warnings), warnings }, services);
}

async function enrichConsolePrincipalContext(
  context: ConsolePrincipalContext,
  services: PrincipalContextServices,
): Promise<ConsolePrincipalContext> {
  if (!hasCapability(context.capabilityState, { capability: "cluster.read" })) return context;
  const getRuntime = services.getClusterRuntimeStatusService ?? getClusterRuntimeStatus;
  try {
    return { ...context, clusterRuntime: await getRuntime() };
  } catch {
    return context;
  }
}

function scopeKind(kind: string): CapabilityScope["kind"] {
  switch (kind) {
    case "space":
    case "domain":
    case "resource":
      return kind;
    default:
      return "system";
  }
}

export function roleCapabilitySummaries(roles: string[]): CapabilityGrantSummary[] {
  const out: CapabilityGrantSummary[] = [];
  const seen = new Set<string>();

  for (const role of roles) {
    for (const capability of roleCapabilities(role)) {
      pushUnique(out, seen, { capability });
    }
  }

  return out;
}

export function capabilitySummaries(response: ListPrincipalCapabilitiesResponse): CapabilityGrantSummary[] {
  const out: CapabilityGrantSummary[] = [];
  const seen = new Set<string>();

  for (const grant of response.grants) {
    pushUnique(out, seen, {
      capability: grant.capability,
      scope: mapAccessScope(grant.scope),
    });
  }

  for (const capability of response.effectiveCapabilities) {
    pushUnique(out, seen, { capability });
  }

  return out;
}

export function roleCapabilities(role: string): string[] {
  switch (canonicalRole(role)) {
    case "system.admin":
      return ["*"];
    case "identity.admin":
      return ["identity.principal.read", "identity.principal.create", "identity.principal.update", "identity.credential.set", "identity.session.manage", "identity.session.delegate", "identity.grant.manage"];
    case "space.admin":
      return ["space.read", "space.create", "space.update", "space.manage_access", "space.archive", "space.delete", "domain.read", "domain.create", "domain.update", "domain.delete"];
    case "semantic.admin":
      return ["semantic.search", "semantic.manage", "space.read", "domain.read", "inference.profile.read", "inference.audit.read"];
    case "inference.admin":
      return ["inference.catalog.read", "inference.catalog.manage", "inference.profile.read", "inference.profile.manage", "inference.credential.read", "inference.credential.manage", "inference.grant.manage", "inference.policy.manage", "inference.audit.read"];
    case "automation.admin":
      return ["automation.read", "automation.manage", "automation.run", "space.read", "domain.read", "inference.profile.read", "inference.audit.read"];
    case "backup.operator":
      return ["backup.manage"];
    case "cluster.operator":
      return ["cluster.read", "cluster.manage"];
    case "audit.reader":
      return ["audit.read"];
    case "space.owner":
      return ["space.read", "space.update", "space.manage_access", "domain.read", "domain.create", "domain.update", "domain.delete", "graph.read", "graph.write", "graph.delete", "query.run", "blob.read", "blob.write", "blob.delete", "metadata.read", "metadata.write", "semantic.search"];
    case "space.editor":
      return ["space.read", "domain.read", "graph.read", "graph.write", "query.run", "blob.read", "blob.write", "metadata.read", "metadata.write", "semantic.search"];
    case "space.viewer":
      return ["space.read", "domain.read", "graph.read", "query.run", "blob.read", "metadata.read", "semantic.search"];
    case "automation.worker":
      return ["automation.worker"];
    case "semantic.maintenance":
      return ["semantic.manage", "graph.read", "query.run"];
    case "import.worker":
      return ["graph.read", "graph.write", "blob.read", "blob.write", "query.run"];
    default:
      return [];
  }
}

export function canonicalRole(role: string): string {
  switch (role.trim().toLowerCase()) {
    case "system_admin":
    case "system.admin":
      return "system.admin";
    case "user_admin":
    case "identity.admin":
    case "operator_admin":
      return "identity.admin";
    case "space_admin":
    case "space.admin":
      return "space.admin";
    case "semantic_admin":
    case "semantic.admin":
      return "semantic.admin";
    case "inference_admin":
    case "inference.admin":
      return "inference.admin";
    case "automation_admin":
    case "automation.admin":
      return "automation.admin";
    case "automation_worker":
    case "automation.worker":
      return "automation.worker";
    case "space_owner":
    case "space.owner":
      return "space.owner";
    case "space_editor":
    case "space.editor":
      return "space.editor";
    case "space_viewer":
    case "space.viewer":
      return "space.viewer";
    case "semantic_maintenance":
    case "semantic.maintenance":
      return "semantic.maintenance";
    case "import_worker":
    case "import.worker":
      return "import.worker";
    case "storage_admin":
    case "backup.operator":
      return "backup.operator";
    case "mesh_admin":
    case "cluster.operator":
      return "cluster.operator";
    case "audit_reader":
    case "audit.reader":
      return "audit.reader";
    default:
      return role.trim();
  }
}

export function mapAccessScope(scope?: AccessScopeInfo | null): CapabilityScope | undefined {
  if (!scope) return undefined;
  const type = scope.type.toLowerCase();
  if (type.includes("domain")) return { kind: "domain", spaceId: emptyToUndefined(scope.spaceId), domainId: emptyToUndefined(scope.domainId) };
  if (type.includes("space")) return { kind: "space", spaceId: emptyToUndefined(scope.spaceId) };
  if (type.includes("resource")) return { kind: "resource", id: emptyToUndefined(scope.domainId) ?? emptyToUndefined(scope.spaceId) };
  return { kind: "system" };
}

type SettledAccessCall<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

async function settleAccessCall<T>(fn: () => Promise<T>): Promise<SettledAccessCall<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function accessDiscoveryPermissionDenied(error: string): boolean {
  const lower = error.toLowerCase();
  return lower.includes("permissiondenied") || lower.includes("permission denied") || lower.includes("principal management capability is required");
}

export function friendlyAccessDiscoveryError(error: string): string {
  if (accessDiscoveryPermissionDenied(error)) {
    return "principal management capability is required for access discovery; daemon APIs still authorize individual actions";
  }
  return error;
}

function pushUnique(out: CapabilityGrantSummary[], seen: Set<string>, summary: CapabilityGrantSummary) {
  const key = `${summary.capability}:${JSON.stringify(summary.scope ?? null)}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(summary);
}

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}
