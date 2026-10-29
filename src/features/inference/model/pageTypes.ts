import { formatEnumLabel } from "../../../components/typography";

export type ModelCatalogTab =
  | "generative"
  | "embedding"
  | "other"
  | "endpoints"
  | "packages";

export type ModelCatalogKind = "generative" | "embedding" | "other";

export type InferenceTab =
  | ModelCatalogTab
  | "profiles"
  | "credentials"
  | "grants"
  | "policies";

export type InferenceSection = "models" | "access";

export const inferenceOperations = [
  "chat",
  "embeddings",
  "summarize",
  "classify",
  "image_analysis",
];

export const inferenceOperationOptions = inferenceOperations.map(
  (operation) => ({
    value: operation,
    label: formatEnumLabel(operation),
  }),
);

export const generativeInferenceOperationOptions =
  inferenceOperationOptions.filter(
    (option) => option.value !== "embeddings",
  );

export function modelCatalogKind(kind: string): ModelCatalogKind {
  const normalized = kind.trim().toLowerCase();
  if (
    normalized === "generative" ||
    normalized === "model_kind_generative"
  ) {
    return "generative";
  }
  if (
    normalized === "embedding" ||
    normalized === "model_kind_embedding"
  ) {
    return "embedding";
  }
  return "other";
}

export function modelCatalogTab(value: string | null): ModelCatalogTab {
  if (
    value === "generative" ||
    value === "embedding" ||
    value === "other" ||
    value === "endpoints" ||
    value === "packages"
  ) {
    return value;
  }
  return "generative";
}

export function isModelCatalogKind(
  tab: InferenceTab,
): tab is ModelCatalogKind {
  return tab === "generative" || tab === "embedding" || tab === "other";
}

export type CredentialDraft = {
  key: string;
  modelEndpointId: string;
  secretValue: string;
  isDefault: boolean;
};

export type PolicyDraft = {
  spaceId: string;
  domainId: string;
  includeDescendants: boolean;
  effect: string;
  operations: string[];
  reason: string;
};

export type ProfileDraft = {
  key: string;
  displayName: string;
  operation: string;
  purpose: string;
  modelRefs: string[];
  endpointRefs: string[];
  maxOutputTokens: string;
};

export type GrantDraft = {
  spaceId: string;
  domainId: string;
  modelId: string;
  endpointId: string;
  credentialId: string;
  operations: string[];
  includeDescendants: boolean;
  allowBackgroundUse: boolean;
  isDefault: boolean;
  priority: string;
  includeInactive: boolean;
  advancedOpen: boolean;
  semanticRuleId: string;
  nodeId: string;
  credentialRef: string;
  endpointRef: string;
  modelRef: string;
};
