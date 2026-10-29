import type { DomainInfo } from "../../../../types/domains";
import type { SpaceInfo } from "../../../../types/spaces";
import type {
  SemanticGenerationRuleSummary,
  SemanticProviderBudgetPolicy,
} from "../../../../types/semantic";
import type {
  SemanticMaintenanceStatusInfo,
  SemanticMaintenanceWorkItemInfo,
} from "../../../../types/semanticMaintenance";

export type SemanticRow = {
  space: SpaceInfo;
  domain?: DomainInfo;
  rule: SemanticGenerationRuleSummary;
};

export type SpaceMaintenance = {
  status: SemanticMaintenanceStatusInfo | null;
  work: SemanticMaintenanceWorkItemInfo[];
  error: string;
};

export type UsageByRule = Record<
  string,
  {
    requestCount: number;
    failedCount: number;
    deniedCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }
>;

export type ProfileOption = {
  value: string;
  label: string;
  spaceId: string;
  domainIds: string[];
};

export type DraftMode = "create" | "edit";

export type VectorStoreCatalogState =
  | { kind: "loading"; message: string }
  | { kind: "ready"; message: string }
  | { kind: "empty"; message: string }
  | { kind: "unauthorized"; message: string }
  | { kind: "unsupported"; message: string }
  | { kind: "error"; message: string };

export type RuleDraft = {
  semanticRuleId: string;
  spaceId: string;
  domainId: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  labels: string;
  triggerEvents: string[];
  triggerEventProblem: string;
  dirtyCooldown: string;
  selectorMode: string;
  selectorGql: string;
  targetAlias: string;
  maxResults: string;
  sourceMode: string;
  includeProperties: string;
  excludeProperties: string;
  contextGql: string;
  bindingKey: string;
  purpose: string;
  intelligenceProfile: string;
  vectorStoreId: string;
  vectorStoreLegacyRef: string;
  bindingMetadata?: Record<string, unknown> | null;
  providerBudget?: SemanticProviderBudgetPolicy | null;
  searchable: boolean;
  physicalIndex: string;
};

export type SemanticTab = "rules" | "activity";
