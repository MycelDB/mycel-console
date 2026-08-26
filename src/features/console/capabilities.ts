export type CapabilityScopeKind = "system" | "space" | "domain" | "resource";

export type CapabilityScope = {
  kind: CapabilityScopeKind;
  id?: string;
  spaceId?: string;
  domainId?: string;
  resourceId?: string;
};

export type CapabilityRequirement = {
  capability: string;
  scope?: CapabilityScopeKind | CapabilityScope;
  optional?: boolean;
};

export type CapabilityGrantSummary = {
  capability: string;
  scope?: CapabilityScope;
};

export type PrincipalCapabilityState =
  | { kind: "complete"; capabilities: CapabilityGrantSummary[] }
  | { kind: "partial"; roles: string[]; warnings: string[] }
  | { kind: "unknown"; warnings: string[] };

export type FeatureFallback = "hide" | "disabled" | "readonly";

export type FeatureAvailability = "visible" | "disabled" | "readonly" | "hidden";

export type CapabilityEvaluation = {
  available: boolean;
  missing: CapabilityRequirement[];
  optionalMissing: CapabilityRequirement[];
};

export function completeCapabilities(capabilities: CapabilityGrantSummary[]): PrincipalCapabilityState {
  return { kind: "complete", capabilities };
}

export function unknownCapabilities(warnings: string[] = []): PrincipalCapabilityState {
  return { kind: "unknown", warnings };
}

export function capability(capabilityName: string, scope?: CapabilityScope): CapabilityGrantSummary {
  return { capability: capabilityName, scope };
}

export function requirement(capabilityName: string, scope?: CapabilityRequirement["scope"], optional = false): CapabilityRequirement {
  return { capability: capabilityName, scope, optional };
}

export function evaluateRequirements(
  state: PrincipalCapabilityState,
  requirements: CapabilityRequirement[],
): CapabilityEvaluation {
  const missing: CapabilityRequirement[] = [];
  const optionalMissing: CapabilityRequirement[] = [];

  for (const req of requirements) {
    const matched = hasCapability(state, req);
    if (matched) continue;
    if (req.optional) optionalMissing.push(req);
    else missing.push(req);
  }

  return { available: missing.length === 0, missing, optionalMissing };
}

export function hasCapability(state: PrincipalCapabilityState, req: CapabilityRequirement): boolean {
  if (!req.capability.trim()) return true;
  if (state.kind !== "complete") return false;
  return state.capabilities.some((grant) => capabilityMatches(grant, req));
}

export function capabilityMatches(grant: CapabilityGrantSummary, req: CapabilityRequirement): boolean {
  if (grant.capability === "*") return true;
  if (!capabilityNameSatisfies(canonicalCapabilityName(grant.capability), canonicalCapabilityName(req.capability))) return false;
  if (!req.scope) return true;
  if (!grant.scope) return false;

  if (typeof req.scope === "string") {
    return grant.scope.kind === req.scope;
  }

  return scopeMatches(grant.scope, req.scope);
}

export function scopeMatches(grantScope: CapabilityScope, requiredScope: CapabilityScope): boolean {
  if (grantScope.kind !== requiredScope.kind) return false;
  return fieldMatches(grantScope.id, requiredScope.id)
    && fieldMatches(grantScope.spaceId, requiredScope.spaceId)
    && fieldMatches(grantScope.domainId, requiredScope.domainId)
    && fieldMatches(grantScope.resourceId, requiredScope.resourceId);
}

export function featureAvailability(
  state: PrincipalCapabilityState,
  requirements: CapabilityRequirement[],
  fallback: FeatureFallback = "hide",
): FeatureAvailability {
  const evaluation = evaluateRequirements(state, requirements);
  if (evaluation.available) return "visible";
  if (fallback === "disabled") return "disabled";
  if (fallback === "readonly") return "readonly";
  return "hidden";
}

export function capabilityNameSatisfies(grantCapability: string, requiredCapability: string): boolean {
  if (grantCapability === requiredCapability) return true;
  if (grantCapability === "cluster.manage" && requiredCapability === "cluster.read") return true;
  if (grantCapability === "inference.admin" && requiredCapability.startsWith("inference.")) return true;
  if (grantCapability === "inference.catalog.manage" && requiredCapability === "inference.catalog.read") return true;
  if (grantCapability === "inference.profile.manage" && requiredCapability === "inference.profile.read") return true;
  if (grantCapability === "inference.credential.manage" && requiredCapability === "inference.credential.read") return true;
  if (grantCapability === "automation.manage" && requiredCapability === "automation.read") return true;
  if (grantCapability === "identity.principal.update" && requiredCapability === "identity.principal.read") return true;
  if (grantCapability === "semantic.manage" && requiredCapability === "semantic.search") return true;
  if (grantCapability === "backup.manage" && requiredCapability === "backup.read") return true;
  return false;
}

export function canonicalCapabilityName(capabilityName: string): string {
  switch (capabilityName.trim()) {
    case "CAPABILITY_IDENTITY_PRINCIPAL_CREATE":
    case "identity.principal.create":
      return "identity.principal.create";
    case "CAPABILITY_IDENTITY_PRINCIPAL_UPDATE":
    case "identity.principal.update":
      return "identity.principal.update";
    case "CAPABILITY_IDENTITY_PRINCIPAL_READ":
    case "identity.principal.read":
    case "principal.read":
      return "identity.principal.read";
    case "CAPABILITY_IDENTITY_GRANT_MANAGE":
    case "identity.grant.manage":
    case "access.read":
    case "access.write":
      return "identity.grant.manage";
    case "CAPABILITY_IDENTITY_CREDENTIAL_SET":
    case "identity.credential.set":
      return "identity.credential.set";
    case "CAPABILITY_IDENTITY_SESSION_MANAGE":
    case "identity.session.manage":
      return "identity.session.manage";
    case "CAPABILITY_IDENTITY_SESSION_DELEGATE":
    case "identity.session.delegate":
      return "identity.session.delegate";
    case "CAPABILITY_SPACE_CREATE":
    case "space.create":
      return "space.create";
    case "CAPABILITY_SPACE_READ":
    case "space.read":
      return "space.read";
    case "CAPABILITY_SPACE_UPDATE":
    case "space.update":
      return "space.update";
    case "CAPABILITY_SPACE_MANAGE_ACCESS":
    case "space.manage_access":
      return "space.manage_access";
    case "CAPABILITY_SPACE_ARCHIVE":
    case "space.archive":
      return "space.archive";
    case "CAPABILITY_SPACE_DELETE":
    case "space.delete":
      return "space.delete";
    case "CAPABILITY_DOMAIN_READ":
    case "domain.read":
      return "domain.read";
    case "CAPABILITY_DOMAIN_CREATE":
    case "domain.create":
      return "domain.create";
    case "CAPABILITY_DOMAIN_UPDATE":
    case "domain.update":
      return "domain.update";
    case "CAPABILITY_DOMAIN_DELETE":
    case "domain.delete":
      return "domain.delete";
    case "CAPABILITY_GRAPH_READ":
    case "graph.read":
      return "graph.read";
    case "CAPABILITY_GRAPH_WRITE":
    case "graph.write":
      return "graph.write";
    case "CAPABILITY_GRAPH_DELETE":
    case "graph.delete":
      return "graph.delete";
    case "CAPABILITY_QUERY_RUN":
    case "query.run":
      return "query.run";
    case "CAPABILITY_SEMANTIC_SEARCH":
    case "semantic.search":
      return "semantic.search";
    case "CAPABILITY_SEMANTIC_MANAGE":
    case "semantic.manage":
      return "semantic.manage";
    case "CAPABILITY_AUTOMATION_MANAGE":
    case "automation.manage":
      return "automation.manage";
    case "CAPABILITY_AUTOMATION_READ":
    case "automation.read":
      return "automation.read";
    case "CAPABILITY_INFERENCE_ADMIN":
    case "inference.admin":
      return "inference.admin";
    case "CAPABILITY_INFERENCE_CATALOG_READ":
    case "inference.catalog.read":
      return "inference.catalog.read";
    case "CAPABILITY_INFERENCE_CATALOG_MANAGE":
    case "inference.catalog.manage":
      return "inference.catalog.manage";
    case "CAPABILITY_INFERENCE_PROFILE_READ":
    case "inference.profile.read":
      return "inference.profile.read";
    case "CAPABILITY_INFERENCE_PROFILE_MANAGE":
    case "inference.profile.manage":
      return "inference.profile.manage";
    case "CAPABILITY_INFERENCE_CREDENTIAL_READ":
    case "inference.credential.read":
      return "inference.credential.read";
    case "CAPABILITY_INFERENCE_CREDENTIAL_MANAGE":
    case "inference.credential.manage":
      return "inference.credential.manage";
    case "CAPABILITY_INFERENCE_GRANT_MANAGE":
    case "inference.grant.manage":
      return "inference.grant.manage";
    case "CAPABILITY_INFERENCE_POLICY_MANAGE":
    case "inference.policy.manage":
      return "inference.policy.manage";
    case "CAPABILITY_INFERENCE_AUDIT_READ":
    case "inference.audit.read":
      return "inference.audit.read";
    case "CAPABILITY_AUDIT_READ":
    case "audit.read":
      return "audit.read";
    case "CAPABILITY_AUDIT_WRITE":
    case "audit.write":
      return "audit.write";
    case "CAPABILITY_DAEMON_CONFIGURE":
    case "daemon.configure":
      return "daemon.configure";
    case "CAPABILITY_MESH_MANAGE":
    case "cluster.manage":
      return "cluster.manage";
    case "CAPABILITY_CLUSTER_READ":
    case "cluster.read":
      return "cluster.read";
    case "CAPABILITY_SYSTEM_BACKUP_SPACE":
    case "backup.manage":
      return "backup.manage";
    case "CAPABILITY_BACKUP_READ":
    case "backup.read":
      return "backup.read";
    default:
      return capabilityName.trim();
  }
}

function fieldMatches(grantValue: string | undefined, requiredValue: string | undefined): boolean {
  return requiredValue === undefined || grantValue === requiredValue;
}
