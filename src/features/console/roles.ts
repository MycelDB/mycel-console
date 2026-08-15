export type ConsoleRoleId =
  | "basic-principal"
  | "space-user"
  | "space-maintainer"
  | "automation-author"
  | "inference-admin"
  | "access-admin"
  | "system-operator"
  | "auditor";

export type ConsoleRoleBundle = {
  id: ConsoleRoleId;
  label: string;
  description: string;
  exampleCapabilities: string[];
};

export const consoleRoleBundles: ConsoleRoleBundle[] = [
  {
    id: "basic-principal",
    label: "Basic principal",
    description: "Can authenticate, view their own session context, and enter environment features they can access.",
    exampleCapabilities: ["identity.session.delegate", "space.read"],
  },
  {
    id: "space-user",
    label: "Space user",
    description: "Can inspect assigned spaces/domains and use permitted query, graph, automation, and inference-profile features.",
    exampleCapabilities: ["space.read", "domain.read", "graph.read", "query.run"],
  },
  {
    id: "space-maintainer",
    label: "Space maintainer",
    description: "Can manage space/domain-level configuration, schemas, indexes, and automations in scoped spaces.",
    exampleCapabilities: ["space.read", "domain.update", "graph.write", "semantic.search"],
  },
  {
    id: "automation-author",
    label: "Automation author/operator",
    description: "Can author, enable, disable, run, and inspect graph automations where scoped access allows it.",
    exampleCapabilities: ["automation.read", "automation.manage", "automation.run"],
  },
  {
    id: "inference-admin",
    label: "Inference admin",
    description: "Can manage inference catalog, profiles, credentials, grants, policies, decisions, and usage telemetry.",
    exampleCapabilities: ["inference.catalog.read", "inference.catalog.manage", "inference.credential.manage"],
  },
  {
    id: "access-admin",
    label: "Access admin",
    description: "Can manage principals, roles, capability grants, and service principal visibility.",
    exampleCapabilities: ["identity.principal.read", "identity.principal.update", "identity.grant.manage"],
  },
  {
    id: "system-operator",
    label: "System operator",
    description: "Can inspect and operate cluster, backup, runtime, subsystem, and diagnostics features.",
    exampleCapabilities: ["cluster.read", "cluster.manage", "backup.manage"],
  },
  {
    id: "auditor",
    label: "Auditor/read-only operator",
    description: "Can inspect read-only status, audit trails, inference decisions, usage telemetry, and diagnostic evidence.",
    exampleCapabilities: ["cluster.read", "audit.read", "inference.audit.read"],
  },
];

export function consoleRoleBundleForRole(role: string): ConsoleRoleBundle | undefined {
  return consoleRoleBundles.find((bundle) => bundle.id === consoleRoleBundleIdForRole(role));
}

export function consoleRoleBundleIdForRole(role: string): ConsoleRoleId | undefined {
  switch (role.trim().toLowerCase()) {
    case "system_admin":
    case "system.admin":
      return "system-operator";
    case "user_admin":
    case "operator_admin":
    case "identity.admin":
      return "access-admin";
    case "space_admin":
    case "space.admin":
    case "space_owner":
    case "space.owner":
      return "space-maintainer";
    case "space_editor":
    case "space.editor":
    case "space_viewer":
    case "space.viewer":
      return "space-user";
    case "automation_admin":
    case "automation.admin":
      return "automation-author";
    case "semantic_admin":
    case "semantic.admin":
      return "space-maintainer";
    case "inference_admin":
    case "inference.admin":
      return "inference-admin";
    case "storage_admin":
    case "backup.operator":
    case "mesh_admin":
    case "cluster.operator":
      return "system-operator";
    case "audit_reader":
    case "audit.reader":
      return "auditor";
    default:
      return undefined;
  }
}
