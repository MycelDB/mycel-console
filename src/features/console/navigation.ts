import type { ConsoleFeature, ConsoleNavGroup, FeatureWithAvailability } from "./featureRegistry";
import { visibleFeatures } from "./featureRegistry";
import type { PrincipalCapabilityState } from "./capabilities";

export type ConsoleNavSection = {
  group: ConsoleNavGroup;
  label: string;
  features: FeatureWithAvailability[];
};

export const navGroupOrder: ConsoleNavGroup[] = [
  "environment",
  "data",
  "intelligence",
  "administration",
  "operations",
];

export const navGroupLabels: Record<ConsoleNavGroup, string> = {
  environment: "Overview",
  data: "Data",
  intelligence: "Intelligence",
  administration: "Administration",
  operations: "Operations",
};

export function buildNavigation(features: ConsoleFeature[], state: PrincipalCapabilityState): ConsoleNavSection[] {
  const visible = visibleFeatures(features, state).sort(compareFeatures);
  const sections = new Map<ConsoleNavGroup, FeatureWithAvailability[]>();

  for (const feature of visible) {
    const group = sections.get(feature.navGroup) ?? [];
    group.push(feature);
    sections.set(feature.navGroup, group);
  }

  return navGroupOrder
    .filter((group) => sections.has(group))
    .map((group) => ({
      group,
      label: navGroupLabels[group],
      features: sections.get(group) ?? [],
    }));
}

export function compareFeatures(a: Pick<ConsoleFeature, "order" | "label" | "route">, b: Pick<ConsoleFeature, "order" | "label" | "route">): number {
  const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;
  const labelCompare = a.label.localeCompare(b.label);
  if (labelCompare !== 0) return labelCompare;
  return a.route.localeCompare(b.route);
}
