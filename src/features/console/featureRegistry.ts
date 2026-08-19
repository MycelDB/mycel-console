import type { CapabilityRequirement, FeatureAvailability, FeatureFallback, PrincipalCapabilityState } from "./capabilities";
import { featureAvailability } from "./capabilities";

export type ConsoleNavGroup = "environment" | "data" | "automation" | "inference" | "administration" | "operations" | "settings";

export type ConsoleFeature = {
  id: string;
  label: string;
  route: string;
  navGroup: ConsoleNavGroup;
  requirements: CapabilityRequirement[];
  fallback?: FeatureFallback;
  description?: string;
  order?: number;
};

export type FeatureWithAvailability = ConsoleFeature & {
  availability: FeatureAvailability;
};

export const currentConsoleFeatures: ConsoleFeature[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    navGroup: "environment",
    requirements: [],
    description: "Capability-filtered console landing page.",
    order: 10,
  },
  {
    id: "account",
    label: "Account",
    route: "/me",
    navGroup: "environment",
    requirements: [],
    description: "Current principal account and access context.",
    order: 15,
  },
  {
    id: "principals",
    label: "Principals",
    route: "/principals",
    navGroup: "administration",
    requirements: [{ capability: "identity.principal.read" }],
    fallback: "hide",
    description: "Principal inventory and lifecycle administration.",
    order: 20,
  },
  {
    id: "spaces",
    label: "Spaces",
    route: "/spaces",
    navGroup: "environment",
    requirements: [{ capability: "space.read" }],
    fallback: "readonly",
    description: "Accessible mycel spaces and space detail entry point.",
    order: 20,
  },
  {
    id: "backups",
    label: "Backups",
    route: "/backups",
    navGroup: "operations",
    requirements: [{ capability: "backup.read" }],
    fallback: "hide",
    description: "Backup status, policy, and operator actions.",
    order: 30,
  },
  {
    id: "cluster",
    label: "Cluster",
    route: "/cluster",
    navGroup: "operations",
    requirements: [{ capability: "cluster.read" }],
    fallback: "hide",
    description: "Cluster, raft, and consistency diagnostics.",
    order: 20,
  },
  {
    id: "semantic",
    label: "Semantic",
    route: "/semantic",
    navGroup: "data",
    requirements: [{ capability: "semantic.search", optional: true }],
    fallback: "disabled",
    description: "Placeholder for semantic index/search visibility.",
    order: 40,
  },
  {
    id: "maintenance",
    label: "Maintenance",
    route: "/maintenance",
    navGroup: "operations",
    requirements: [{ capability: "semantic.manage" }],
    fallback: "hide",
    description: "Operational maintenance workflows.",
    order: 40,
  },
  {
    id: "inference",
    label: "Inference",
    route: "/inference",
    navGroup: "inference",
    requirements: [{ capability: "inference.catalog.read" }],
    fallback: "hide",
    description: "Inference packages, endpoints, models, vector stores, and capabilities.",
    order: 10,
  },
  {
    id: "settings",
    label: "Settings",
    route: "/settings",
    navGroup: "settings",
    requirements: [],
    description: "Local console preferences and connection settings.",
    order: 90,
  },
];

export function featuresWithAvailability(
  features: ConsoleFeature[],
  state: PrincipalCapabilityState,
): FeatureWithAvailability[] {
  return features.map((feature) => ({
    ...feature,
    availability: featureAvailability(state, feature.requirements, feature.fallback),
  }));
}

export function visibleFeatures(features: ConsoleFeature[], state: PrincipalCapabilityState): FeatureWithAvailability[] {
  return featuresWithAvailability(features, state).filter((feature) => feature.availability !== "hidden");
}
