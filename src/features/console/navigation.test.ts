import { capability, completeCapabilities, unknownCapabilities } from "./capabilities";
import type { ConsoleFeature } from "./featureRegistry";
import { featuresWithAvailability, visibleFeatures } from "./featureRegistry";
import { buildNavigation } from "./navigation";

const features: ConsoleFeature[] = [
  { id: "spaces", label: "Spaces", route: "/spaces", navGroup: "environment", requirements: [{ capability: "space.read" }], fallback: "readonly", order: 20 },
  { id: "dashboard", label: "Dashboard", route: "/dashboard", navGroup: "environment", requirements: [], order: 10 },
  { id: "cluster", label: "Cluster", route: "/cluster", navGroup: "operations", requirements: [{ capability: "cluster.read" }], fallback: "hide", order: 10 },
  { id: "access", label: "Access", route: "/access", navGroup: "administration", requirements: [{ capability: "access.read" }], fallback: "disabled", order: 10 },
];

test("computes feature availability from capability state", () => {
  const state = completeCapabilities([capability("space.read", { kind: "space" })]);

  const availabilityById = Object.fromEntries(featuresWithAvailability(features, state).map((feature) => [feature.id, feature.availability]));

  expect(availabilityById.dashboard).toBe("visible");
  expect(availabilityById.spaces).toBe("visible");
  expect(availabilityById.cluster).toBe("hidden");
  expect(availabilityById.access).toBe("disabled");
});

test("visibleFeatures removes hidden features but keeps disabled and readonly features", () => {
  const state = unknownCapabilities();

  const ids = visibleFeatures(features, state).map((feature) => feature.id);

  expect(ids).toEqual(["spaces", "dashboard", "access"]);
});

test("buildNavigation orders groups and features deterministically", () => {
  const state = completeCapabilities([
    capability("space.read", { kind: "space" }),
    capability("cluster.read", { kind: "system" }),
    capability("access.read", { kind: "system" }),
  ]);

  const sections = buildNavigation(features, state);

  expect(sections.map((section) => section.group)).toEqual(["environment", "administration", "operations"]);
  expect(sections[0].features.map((feature) => feature.id)).toEqual(["dashboard", "spaces"]);
  expect(sections[1].features.map((feature) => feature.id)).toEqual(["access"]);
});
