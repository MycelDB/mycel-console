import type { DomainInfo } from "../../../../types/domains";
import type { SpaceInfo } from "../../../../types/spaces";
import type { SemanticGenerationRuleSummary } from "../../../../types/semantic";
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

export type RuleDraft = {
  semanticRuleId: string;
  spaceId: string;
  domainId: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  labels: string;
  triggerEvents: string;
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
  vectorStore: string;
  searchable: boolean;
  physicalIndex: string;
};

export type SearchDraft = {
  spaceId: string;
  domainId: string;
  semanticRuleId: string;
  embeddingBindingKey: string;
  query: string;
  limit: string;
  minScore: string;
};

export type SemanticTab = "rules" | "activity";
