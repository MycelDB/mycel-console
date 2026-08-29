import { formatEnumLabel } from "../../../components/typography";

export type InferenceTab =
  | "packages"
  | "endpoints"
  | "models"
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
