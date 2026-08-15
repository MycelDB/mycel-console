import {
  capability,
  capabilityMatches,
  completeCapabilities,
  evaluateRequirements,
  featureAvailability,
  hasCapability,
  requirement,
  scopeMatches,
  unknownCapabilities,
} from "./capabilities";

const state = completeCapabilities([
  capability("space.read", { kind: "space", spaceId: "sp_main" }),
  capability("cluster.read", { kind: "system" }),
]);

test("matches exact capability and scoped requirement", () => {
  expect(hasCapability(state, requirement("space.read", { kind: "space", spaceId: "sp_main" }))).toBe(true);
  expect(hasCapability(state, requirement("space.read", { kind: "space", spaceId: "sp_other" }))).toBe(false);
});

test("matches scope kind requirements without requiring an id", () => {
  expect(hasCapability(state, requirement("space.read", "space"))).toBe(true);
  expect(hasCapability(state, requirement("cluster.read", "system"))).toBe(true);
  expect(hasCapability(state, requirement("cluster.read", "space"))).toBe(false);
});

test("does not grant capabilities when discovery is unknown", () => {
  expect(hasCapability(unknownCapabilities(["not loaded"]), requirement("space.read"))).toBe(false);
});

test("tracks required and optional missing requirements separately", () => {
  const result = evaluateRequirements(state, [
    requirement("space.read", { kind: "space", spaceId: "sp_main" }),
    requirement("access.read"),
    requirement("inference.catalog.read", undefined, true),
  ]);

  expect(result.available).toBe(false);
  expect(result.missing.map((req) => req.capability)).toEqual(["access.read"]);
  expect(result.optionalMissing.map((req) => req.capability)).toEqual(["inference.catalog.read"]);
});

test("optional requirements do not block availability", () => {
  const result = evaluateRequirements(state, [requirement("semantic.read", undefined, true)]);

  expect(result.available).toBe(true);
  expect(result.missing).toEqual([]);
  expect(result.optionalMissing.map((req) => req.capability)).toEqual(["semantic.read"]);
});

test("maps failed requirements to feature fallback availability", () => {
  const requirements = [requirement("access.read")];

  expect(featureAvailability(state, requirements, "hide")).toBe("hidden");
  expect(featureAvailability(state, requirements, "disabled")).toBe("disabled");
  expect(featureAvailability(state, requirements, "readonly")).toBe("readonly");
});

test("scope matching treats unspecified required fields as wildcards", () => {
  expect(scopeMatches({ kind: "domain", spaceId: "sp", domainId: "dom" }, { kind: "domain", spaceId: "sp" })).toBe(true);
  expect(scopeMatches({ kind: "domain", spaceId: "sp", domainId: "dom" }, { kind: "domain", spaceId: "other" })).toBe(false);
});

test("capabilityMatches requires the same canonical capability name", () => {
  expect(capabilityMatches(capability("CAPABILITY_SPACE_READ", { kind: "space" }), requirement("space.read", "space"))).toBe(true);
  expect(capabilityMatches(capability("space.read", { kind: "space" }), requirement("space.write", "space"))).toBe(false);
});

test("wildcard capability satisfies scoped requirements", () => {
  expect(hasCapability(completeCapabilities([capability("*")]), requirement("space.read", { kind: "space", spaceId: "sp_main" }))).toBe(true);
});

test("semantic search does not satisfy semantic management", () => {
  const semanticState = completeCapabilities([capability("CAPABILITY_SEMANTIC_SEARCH")]);

  expect(hasCapability(semanticState, requirement("semantic.search"))).toBe(true);
  expect(hasCapability(semanticState, requirement("semantic.manage"))).toBe(false);
});

test("manage capabilities satisfy matching read requirements", () => {
  expect(hasCapability(completeCapabilities([capability("CAPABILITY_MESH_MANAGE")]), requirement("cluster.read"))).toBe(true);
  expect(hasCapability(completeCapabilities([capability("inference.catalog.manage")]), requirement("inference.catalog.read"))).toBe(true);
  expect(hasCapability(completeCapabilities([capability("backup.manage")]), requirement("backup.read"))).toBe(true);
  expect(hasCapability(completeCapabilities([capability("backup.read")]), requirement("backup.manage"))).toBe(false);
});
