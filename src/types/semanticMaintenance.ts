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

export type GetSemanticMaintenanceStatusInput = {
  spaceId: string;
};

export type SemanticMaintenanceWorkItemInfo = {
  workItemId: string;
  spaceId: string;
  domainId: string;
  semanticIndexId: string;
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

export type SemanticMaintenanceWorkActionInput = {
  spaceId: string;
  workItemId: string;
};

export type AnalyzeSemanticDirtyWorkInput = { spaceId: string; semanticIndexId?: string; limit?: number };
export type AnalyzeSemanticDirtyWorkResponse = { processedEvents: number; enqueuedItems: number };
export type ProcessSemanticDirtyWorkInput = { spaceId: string; limit?: number };
export type ProcessSemanticDirtyWorkResponse = { processedItems: number; completedItems: number; failedItems: number };
export type BackfillSemanticIndexInput = { spaceId: string; semanticIndexId: string; nodeIds?: string[]; force?: boolean; limit?: number; continueOnError?: boolean };
export type BackfillSemanticIndexResponse = { semanticIndexId: string; selectedCount: number; generatedCount: number; skippedCount: number; failedCount: number };

export type ListSemanticMaintenanceWorkInput = {
  spaceId: string;
  status?: string;
  limit?: number;
};

export type ListSemanticMaintenanceWorkResponse = {
  items: SemanticMaintenanceWorkItemInfo[];
};
