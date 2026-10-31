export type SemanticMaintenanceStatusInfo = {
  enabled: boolean;
  degraded: boolean;
  degradedReason: string;
  queueDepthPending: number;
  queueDepthRunning: number;
  queueDepthFailedRetryable: number;
  queueDepthFailedPermanent: number;
  oldestPendingAgeSeconds: number;
  lastDirtyEventAt: string;
  lastAnalyzedAt: string;
  lastWorkerSuccessAt: string;
  lastWorkerErrorAt: string;
  throttleState: string;
  analyzerRuns: number;
  workerRuns: number;
};

export type GetSemanticMaintenanceStatusInput = { spaceId: string };

export type GetSemanticReliabilityStatusInput = {
  spaceId: string;
  semanticRuleId: string;
  embeddingBindingKey: string;
};

export type SemanticRebuildStatusInfo = {
  rebuildEpoch: string;
  state: string;
  pinnedTargetGraphRevision: string;
  deltaCatchupGraphRevision: string;
  semanticGeneration: string;
  startedAt: string;
  completedAt: string;
  errorMessageSanitized: string;
};

export type SemanticReliabilityStatusInfo = {
  spaceId: string;
  semanticRuleId: string;
  embeddingBindingKey: string;
  latestObservedGraphRevision: string;
  analyzedThroughGraphRevision: string;
  freshThroughGraphRevision: string;
  unresolvedGapCount: string;
  oldestUnresolvedGraphRevision: string;
  configuredFrontierLimit: string;
  retainedWorkItemCount: string;
  semanticGeneration: string;
  capacityState: string;
  degraded: boolean;
  degradedReason: string;
  rebuildRequired: boolean;
  rebuild?: SemanticRebuildStatusInfo | null;
  configuredGapIntervalLimit: string;
  configuredRevisionSpanLimit: string;
  configuredSerializedByteLimit: string;
  retainedGapIntervalCount: string;
  retainedRevisionSpan: string;
  retainedSerializedBytes: string;
};

export type GetSemanticReliabilityStatusResponse = {
  supported: boolean;
  status?: SemanticReliabilityStatusInfo | null;
};

export type SemanticMaintenanceWorkItemInfo = {
  workItemId: string;
  spaceId: string;
  domainId: string;
  semanticRuleId: string;
  embeddingBindingKey: string;
  targetNodeId: string;
  action: string;
  status: string;
  attemptCount: number;
  notBefore: string;
  claimedUntil: string;
  lastErrorCategory: string;
  lastErrorMessageSanitized: string;
  createdAt: string;
  updatedAt: string;
};

export type SemanticMaintenanceWorkActionInput = { spaceId: string; workItemId: string };
export type AnalyzeSemanticDirtyWorkInput = { spaceId: string; semanticRuleId?: string; embeddingBindingKey?: string; limit?: number };
export type AnalyzeSemanticDirtyWorkResponse = { processedEvents: number; enqueuedItems: number };
export type ProcessSemanticDirtyWorkInput = { spaceId: string; limit?: number };
export type ProcessSemanticDirtyWorkResponse = { processedItems: number; completedItems: number; failedItems: number };
export type BackfillSemanticRuleInput = { spaceId: string; semanticRuleId: string; embeddingBindingKey: string; nodeIds?: string[]; force?: boolean; limit?: number; continueOnError?: boolean };
export type BackfillSemanticRuleResponse = { semanticRuleId: string; embeddingBindingKey: string; selectedCount: number; generatedCount: number; skippedCount: number; failedCount: number };

export type ListSemanticMaintenanceWorkInput = { spaceId: string; status?: string; semanticRuleId?: string; embeddingBindingKey?: string; limit?: number };
export type ListSemanticMaintenanceWorkResponse = { items: SemanticMaintenanceWorkItemInfo[] };
