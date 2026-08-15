import { capabilitySummaries, friendlyAccessDiscoveryError, loadConsolePrincipalContext, mapAccessScope, roleCapabilitySummaries } from "./principalContext";
import type { PrincipalSession } from "../../types/auth";

const session: PrincipalSession = { addr: "127.0.0.1:19091", principalId: "prn_alice", username: "alice" };

test("maps access scopes to console capability scopes", () => {
  expect(mapAccessScope({ type: "ACCESS_SCOPE_TYPE_SYSTEM" })).toEqual({ kind: "system" });
  expect(mapAccessScope({ type: "ACCESS_SCOPE_TYPE_SPACE", spaceId: "sp_main" })).toEqual({ kind: "space", spaceId: "sp_main" });
  expect(mapAccessScope({ type: "ACCESS_SCOPE_TYPE_DOMAIN", spaceId: "sp_main", domainId: "dom_default" })).toEqual({ kind: "domain", spaceId: "sp_main", domainId: "dom_default" });
});

test("builds unique capability summaries from direct grants and effective capabilities", () => {
  const summaries = capabilitySummaries({
    grants: [
      { capabilityGrantId: "grant-1", principalId: "prn_alice", capability: "CAPABILITY_SPACE_READ", scope: { type: "ACCESS_SCOPE_TYPE_SPACE", spaceId: "sp_main" } },
      { capabilityGrantId: "grant-2", principalId: "prn_alice", capability: "CAPABILITY_SPACE_READ", scope: { type: "ACCESS_SCOPE_TYPE_SPACE", spaceId: "sp_main" } },
    ],
    effectiveCapabilities: ["CAPABILITY_SPACE_READ", "CAPABILITY_CLUSTER_READ"],
  });

  expect(summaries).toEqual([
    { capability: "CAPABILITY_SPACE_READ", scope: { kind: "space", spaceId: "sp_main" } },
    { capability: "CAPABILITY_SPACE_READ" },
    { capability: "CAPABILITY_CLUSTER_READ" },
  ]);
});

test("derives role bundle capabilities for capability API gaps", () => {
  expect(roleCapabilitySummaries(["inference_admin", "automation.admin", "semantic.admin"]).map((summary) => summary.capability)).toEqual(expect.arrayContaining([
    "inference.catalog.manage",
    "automation.manage",
    "semantic.manage",
  ]));
});

test("loads complete console principal context when capabilities are available", async () => {
  const context = await loadConsolePrincipalContext(session, {
    listPrincipalRolesService: jest.fn().mockResolvedValue({ grants: [], effectiveRoles: ["system_admin"] }),
    listPrincipalCapabilitiesService: jest.fn().mockResolvedValue({ grants: [], effectiveCapabilities: ["CAPABILITY_CLUSTER_READ"] }),
  });

  expect(context.roles).toEqual(["system_admin"]);
  expect(context.capabilities).toEqual(["CAPABILITY_CLUSTER_READ"]);
  expect(context.capabilityState.kind).toBe("complete");
  if (context.capabilityState.kind === "complete") {
    expect(context.capabilityState.capabilities).toEqual(expect.arrayContaining([{ capability: "*" }]));
  }
  expect(context.warnings).toEqual([]);
});

test("sanitizes permission-denied access discovery errors", () => {
  expect(friendlyAccessDiscoveryError('status: PermissionDenied, message: "principal management capability is required", details: []')).toBe("principal management capability is required for access discovery; daemon APIs still authorize individual actions");
});

test("returns partial context when capabilities fail but roles load", async () => {
  const context = await loadConsolePrincipalContext(session, {
    listPrincipalRolesService: jest.fn().mockResolvedValue({ grants: [], effectiveRoles: ["auditor"] }),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error("status: PermissionDenied, message: \"principal management capability is required\", details: []")),
  });

  expect(context.roles).toEqual(["auditor"]);
  expect(context.capabilityState).toEqual({ kind: "partial", roles: ["auditor"], warnings: ["Capabilities unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions"] });
});

test("treats principal-management denied discovery as known empty capabilities", async () => {
  const denied = 'status: PermissionDenied, message: "principal management capability is required", details: []';
  const context = await loadConsolePrincipalContext(session, {
    listPrincipalRolesService: jest.fn().mockRejectedValue(new Error(denied)),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error(denied)),
  });

  expect(context.capabilityState).toEqual({ kind: "complete", capabilities: [] });
  expect(context.warnings).toEqual([
    "Roles unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions",
    "Capabilities unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions",
  ]);
});

test("returns unknown context when role and capability discovery fail", async () => {
  const context = await loadConsolePrincipalContext(session, {
    listPrincipalRolesService: jest.fn().mockRejectedValue(new Error("roles denied")),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error("capabilities denied")),
  });

  expect(context.capabilityState.kind).toBe("unknown");
  expect(context.warnings).toEqual(["Roles unavailable: roles denied", "Capabilities unavailable: capabilities denied"]);
});
