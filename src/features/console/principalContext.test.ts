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

test("loads cluster runtime when principal can read cluster status", async () => {
  const context = await loadConsolePrincipalContext(session, {
    getMyAccessService: jest.fn().mockResolvedValue({
      principal: session,
      effectiveRoles: ["cluster.operator"],
      effectiveCapabilities: ["cluster.read"],
      roles: [],
      capabilities: [{ capability: "cluster.read", source: "role", role: "cluster.operator" }],
      warnings: [],
      complete: true,
    }),
    getClusterRuntimeStatusService: jest.fn().mockResolvedValue({ engine: "static", clusterName: "dev", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 }),
  });

  expect(context.clusterRuntime?.engine).toBe("static");
});

test("loads complete console principal context from self access", async () => {
  const context = await loadConsolePrincipalContext(session, {
    getMyAccessService: jest.fn().mockResolvedValue({
      principal: session,
      effectiveRoles: ["automation.admin"],
      effectiveCapabilities: ["automation.read", "automation.manage"],
      roles: [{ role: "automation.admin", scope: { kind: "domain", spaceId: "sp_main", domainId: "dom_default" }, source: "role_grant" }],
      capabilities: [{ capability: "automation.read", scope: { kind: "domain", spaceId: "sp_main", domainId: "dom_default" }, source: "role", role: "automation.admin" }],
      warnings: [],
      complete: true,
    }),
  });

  expect(context.roles).toEqual(["automation.admin"]);
  expect(context.capabilities).toEqual(["automation.read", "automation.manage"]);
  expect(context.capabilityState.kind).toBe("complete");
  if (context.capabilityState.kind === "complete") {
    expect(context.capabilityState.capabilities).toEqual([{ capability: "automation.read", scope: { kind: "domain", spaceId: "sp_main", domainId: "dom_default" } }]);
  }
  expect(context.warnings).toEqual([]);
});

test("sanitizes permission-denied access discovery errors", () => {
  expect(friendlyAccessDiscoveryError('status: PermissionDenied, message: "principal management capability is required", details: []')).toBe("principal management capability is required for access discovery; daemon APIs still authorize individual actions");
});

test("falls back to partial admin discovery when self access fails and roles load", async () => {
  const context = await loadConsolePrincipalContext(session, {
    getMyAccessService: jest.fn().mockRejectedValue(new Error("self access unavailable")),
    listPrincipalRolesService: jest.fn().mockResolvedValue({ grants: [], effectiveRoles: ["auditor"] }),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error("status: PermissionDenied, message: \"principal management capability is required\", details: []")),
  });

  expect(context.roles).toEqual(["auditor"]);
  expect(context.capabilityState).toEqual({ kind: "partial", roles: ["auditor"], warnings: ["Self access unavailable: self access unavailable", "Capabilities unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions"] });
});

test("reports unavailable context when self access and principal-management discovery are denied", async () => {
  const denied = 'status: PermissionDenied, message: "principal management capability is required", details: []';
  const context = await loadConsolePrincipalContext(session, {
    getMyAccessService: jest.fn().mockRejectedValue(new Error("self access unavailable")),
    listPrincipalRolesService: jest.fn().mockRejectedValue(new Error(denied)),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error(denied)),
  });

  expect(context.capabilityState.kind).toBe("unknown");
  expect(context.warnings).toEqual([
    "Self access unavailable: self access unavailable",
    "Roles unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions",
    "Capabilities unavailable: principal management capability is required for access discovery; daemon APIs still authorize individual actions",
  ]);
});

test("returns unknown context when self, role, and capability discovery fail", async () => {
  const context = await loadConsolePrincipalContext(session, {
    getMyAccessService: jest.fn().mockRejectedValue(new Error("self access unavailable")),
    listPrincipalRolesService: jest.fn().mockRejectedValue(new Error("roles denied")),
    listPrincipalCapabilitiesService: jest.fn().mockRejectedValue(new Error("capabilities denied")),
  });

  expect(context.capabilityState.kind).toBe("unknown");
  expect(context.warnings).toEqual(["Self access unavailable: self access unavailable", "Roles unavailable: roles denied", "Capabilities unavailable: capabilities denied"]);
});
