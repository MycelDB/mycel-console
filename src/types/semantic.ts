export type SemanticRuleState =
  | "SEMANTIC_RULE_STATE_UNSPECIFIED"
  | "SEMANTIC_RULE_STATE_ACTIVE"
  | "SEMANTIC_RULE_STATE_BUILDING"
  | "SEMANTIC_RULE_STATE_STALE"
  | "SEMANTIC_RULE_STATE_DISABLED"
  | "SEMANTIC_RULE_STATE_ERROR";

export type SearchIndexState =
  | "SEARCH_INDEX_STATE_UNSPECIFIED"
  | "SEARCH_INDEX_STATE_READY"
  | "SEARCH_INDEX_STATE_BUILDING"
  | "SEARCH_INDEX_STATE_DEGRADED"
  | "SEARCH_INDEX_STATE_MISSING"
  | "SEARCH_INDEX_STATE_ERROR";

export type SearchIndexStatus = {
  state: SearchIndexState | string;
  liveRecordCount: number;
  lastRebuildAt: string;
  lastError: string;
};

export type SemanticEmbeddingBindingSummary = {
  key: string;
  purpose: string;
  intelligenceProfileId: string;
  intelligenceProfileKey: string;
  vectorStoreId: string;
  vectorStoreKey: string;
  enabled: boolean;
  searchIndex?: SearchIndexStatus | null;
};

export type SemanticRuleStatus = {
  queueDepthPending: number;
  queueDepthRunning: number;
  queueDepthFailedRetryable: number;
  queueDepthFailedPermanent: number;
  lastRefreshAt: string;
  lastBackfillAt: string;
  lastError: string;
};

export type SemanticGenerationRuleSummary = {
  semanticRuleId: string;
  key: string;
  displayName: string;
  description: string;
  spaceId: string;
  domainId: string;
  enabled: boolean;
  state: SemanticRuleState | string;
  bindings: SemanticEmbeddingBindingSummary[];
  status?: SemanticRuleStatus | null;
};

export type SemanticTriggerPolicy = { events: string[]; labels: string[]; debounce: string };
export type SemanticTargetSelector = { mode: string; labels: string[]; gql: string; targetAlias: string; maxResults: number; nodeIds: string[] };
export type SemanticSourceAssemblyPolicy = { mode: string; includeProperties: string[]; excludeProperties: string[]; maxDepth?: number | null; minimumTextLength: number; contextGql: string };
export type SemanticEmbeddingBinding = { key: string; purpose: string; intelligenceProfile: string; intelligenceProfileId: string; vectorStore: string; vectorStoreId: string; enabled: boolean; metadata?: Record<string, unknown> | null };
export type SemanticMaintenancePolicy = { dirtyCooldown: string; maxBatchSize: number; workerConcurrency: number };
export type SemanticStoragePolicy = { searchable: boolean; physicalIndex: string };

export type SemanticGenerationRule = {
  semanticRuleId?: string;
  spaceId: string;
  domainId: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  trigger?: SemanticTriggerPolicy | null;
  selector?: SemanticTargetSelector | null;
  source?: SemanticSourceAssemblyPolicy | null;
  embeddings: SemanticEmbeddingBinding[];
  maintenance?: SemanticMaintenancePolicy | null;
  storage?: SemanticStoragePolicy | null;
  ownerPrincipalId?: string;
  createdByPrincipalId?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SemanticRuleValidationDiagnostic = { severity: string; path: string; message: string };

export type ListSemanticRulesInput = { spaceId: string; domainId?: string; pageSize?: number; pageToken?: string; includeDisabled?: boolean };
export type ListSemanticRulesResponse = { rules: SemanticGenerationRuleSummary[]; nextPageToken: string };
export type GetSemanticRuleInput = { spaceId: string; semanticRuleId: string };
export type GetSemanticRuleResponse = { rule: SemanticGenerationRule | null; summary: SemanticGenerationRuleSummary | null };
export type ValidateSemanticRuleInput = { rule: SemanticGenerationRule };
export type ValidateSemanticRuleResponse = { valid: boolean; diagnostics: SemanticRuleValidationDiagnostic[]; normalizedRule?: SemanticGenerationRule | null };
export type CreateSemanticRuleInput = { rule: SemanticGenerationRule };
export type CreateSemanticRuleResponse = { rule: SemanticGenerationRule | null; summary: SemanticGenerationRuleSummary | null };
export type UpdateSemanticRuleInput = { spaceId: string; semanticRuleId: string; rule: SemanticGenerationRule };
export type UpdateSemanticRuleResponse = { rule: SemanticGenerationRule | null; summary: SemanticGenerationRuleSummary | null };
export type SetSemanticRuleEnabledInput = { spaceId: string; semanticRuleId: string; enabled: boolean };
export type SetSemanticRuleEnabledResponse = { rule: SemanticGenerationRule | null; summary: SemanticGenerationRuleSummary | null };
export type DeleteSemanticRuleInput = { spaceId: string; semanticRuleId: string; purgeVectors?: boolean };
export type DeleteSemanticRuleResponse = { semanticRuleId: string; vectorsPurged: boolean; workItemsDeleted: number; policyDecisionsDeleted: number };

export type SemanticSearchInput = { spaceId: string; domainId: string; semanticRuleId?: string; embeddingBindingKey?: string; query: string; limit?: number; minScore?: number };
export type SemanticSearchResult = { semanticRuleId: string; embeddingBindingKey: string; recordId: string; nodeId: string; score: number; node?: Record<string, unknown> | null; matchedChunkIds: string[]; snippet: string };
export type SemanticSearchResponse = { results: SemanticSearchResult[]; warnings: string[] };
