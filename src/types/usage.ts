export type UsageScopeKind = "space" | "domain" | "unknown";

export type UsageScopeInput = {
  kind?: "space" | "domain" | "";
  spaceId?: string;
  domainId?: string;
};

export type UsageScopeInfo = {
  kind: UsageScopeKind;
  spaceId: string;
  domainId: string;
};

export type UsageSourceRevisionInfo = {
  source: string;
  revision: string;
};

export type UsageRevisionInfo = {
  revisionToken: string;
  sourceRevisions: UsageSourceRevisionInfo[];
};

export type UsageAccountingState =
  | "USAGE_ACCOUNTING_STATE_UNSPECIFIED"
  | "USAGE_ACCOUNTING_STATE_READY"
  | "USAGE_ACCOUNTING_STATE_REBUILDING"
  | "USAGE_ACCOUNTING_STATE_RECONCILING"
  | "USAGE_ACCOUNTING_STATE_STALE"
  | "USAGE_ACCOUNTING_STATE_DRIFT_DETECTED"
  | "USAGE_ACCOUNTING_STATE_UNAVAILABLE";

export type UsageListMode =
  | "USAGE_LIST_MODE_SPACES"
  | "USAGE_LIST_MODE_DOMAINS_IN_SPACE"
  | "USAGE_LIST_MODE_SPACE_WITH_DOMAIN_BREAKDOWN";

export type DomainInclusionMode =
  | "DOMAIN_INCLUSION_MODE_UNSPECIFIED"
  | "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM"
  | "DOMAIN_INCLUSION_MODE_RETAINED_ALL"
  | "DOMAIN_INCLUSION_MODE_SYSTEM_ONLY";

export type UsageUnit =
  | "USAGE_UNIT_UNSPECIFIED"
  | "USAGE_UNIT_BYTES"
  | "USAGE_UNIT_COUNT";

export type UsageAuthority =
  | "USAGE_AUTHORITY_UNSPECIFIED"
  | "USAGE_AUTHORITY_RAFT_COMMITTED_EXACT"
  | "USAGE_AUTHORITY_STATE_MACHINE_EXACT"
  | "USAGE_AUTHORITY_OBSERVED_APPROXIMATE"
  | "USAGE_AUTHORITY_REBUILDABLE_OPERATIONAL";

export type UsageStatusSeverity =
  | "USAGE_STATUS_SEVERITY_UNSPECIFIED"
  | "USAGE_STATUS_SEVERITY_INFO"
  | "USAGE_STATUS_SEVERITY_WARNING"
  | "USAGE_STATUS_SEVERITY_BLOCKER";

export type UsageStatusReason =
  | "USAGE_STATUS_REASON_UNSPECIFIED"
  | "USAGE_STATUS_REASON_COUNTERS_REBUILDING"
  | "USAGE_STATUS_REASON_COUNTER_STALE"
  | "USAGE_STATUS_REASON_RECONCILIATION_DRIFT"
  | "USAGE_STATUS_REASON_METRIC_UNAVAILABLE"
  | "USAGE_STATUS_REASON_METRIC_NOT_QUOTA_SAFE"
  | "USAGE_STATUS_REASON_UNSUPPORTED_SCOPE"
  | "USAGE_STATUS_REASON_UNSUPPORTED_REVISION"
  | "USAGE_STATUS_REASON_DIAGNOSTIC_COLLECTOR_UNAVAILABLE"
  | "USAGE_STATUS_REASON_UNAUTHORIZED";

export type UsageStatusInfo = {
  reason: UsageStatusReason | string;
  severity: UsageStatusSeverity | string;
  message: string;
  scope?: UsageScopeInfo | null;
  metricName: string;
  evidence: Record<string, string>;
};

export type UsageMetricInfo = {
  name: string;
  metricVersion: number;
  value: number;
  unit: UsageUnit | string;
  authority: UsageAuthority | string;
  quotaSafe: boolean;
  hardLimitEligible: boolean;
  observedAt: string;
  asOfRevision?: UsageRevisionInfo | null;
  labels: Record<string, string>;
};

export type UsageSnapshotInfo = {
  scope?: UsageScopeInfo | null;
  domainInclusion: DomainInclusionMode | string;
  observedAt: string;
  asOfRevision?: UsageRevisionInfo | null;
  accountingState: UsageAccountingState | string;
  quotaSafeComplete: boolean;
  metrics: UsageMetricInfo[];
  blockers: UsageStatusInfo[];
  warnings: UsageStatusInfo[];
};

export type UsageAccountingHealthInfo = {
  scope?: UsageScopeInfo | null;
  observedAt: string;
  state: UsageAccountingState | string;
  asOfRevision?: UsageRevisionInfo | null;
  quotaSafeReady: boolean;
  blockers: UsageStatusInfo[];
  warnings: UsageStatusInfo[];
  rebuildingScopeCount: number;
  staleScopeCount: number;
  driftScopeCount: number;
  diagnosticCollectorUnavailableCount: number;
};

export type GetUsageInput = {
  scope: UsageScopeInput;
  domainInclusion?: DomainInclusionMode | string;
  includeDiagnosticPhysical?: boolean;
  requireQuotaSafe?: boolean;
  maxStalenessSeconds?: number;
  metricNames?: string[];
};

export type BatchGetUsageInput = {
  requests: GetUsageInput[];
};

export type BatchUsageResultInfo = {
  scope?: UsageScopeInfo | null;
  snapshot?: UsageSnapshotInfo | null;
  status?: UsageStatusInfo | null;
};

export type BatchGetUsageResponseInfo = {
  results: BatchUsageResultInfo[];
};

export type ListUsageInput = {
  parent?: UsageScopeInput | null;
  mode?: UsageListMode | string;
  domainInclusion?: DomainInclusionMode | string;
  includeDiagnosticPhysical?: boolean;
  requireQuotaSafe?: boolean;
  maxStalenessSeconds?: number;
  pageSize?: number;
  pageToken?: string;
  metricNames?: string[];
};

export type ListUsageResponseInfo = {
  snapshots: UsageSnapshotInfo[];
  nextPageToken: string;
};

export type GetUsageAccountingHealthInput = {
  scope?: UsageScopeInput | null;
  includeReconciliation?: boolean;
  includeDiagnosticCollectors?: boolean;
};
