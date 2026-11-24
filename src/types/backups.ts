export type BackupArchiveFormat =
  | "BACKUP_ARCHIVE_FORMAT_UNSPECIFIED"
  | "BACKUP_ARCHIVE_FORMAT_ZIP"
  | "BACKUP_ARCHIVE_FORMAT_TAR"
  | "BACKUP_ARCHIVE_FORMAT_TAR_GZ"
  | "BACKUP_ARCHIVE_FORMAT_TAR_ZST";

export type BackupCaptureProvider =
  | "BACKUP_CAPTURE_PROVIDER_UNSPECIFIED"
  | "BACKUP_CAPTURE_PROVIDER_AUTO"
  | "BACKUP_CAPTURE_PROVIDER_FILESYSTEM_IMMUTABLE_COPY"
  | "BACKUP_CAPTURE_PROVIDER_CSI_VOLUME_SNAPSHOT"
  | "BACKUP_CAPTURE_PROVIDER_AWS_EBS_SNAPSHOT";

export type BackupQuiesceReadProfile =
  | "BACKUP_QUIESCE_READ_PROFILE_UNSPECIFIED"
  | "BACKUP_QUIESCE_READ_PROFILE_CONTROL_ONLY"
  | "BACKUP_QUIESCE_READ_PROFILE_STRICT_READ_ONLY";

export type BackupDeploymentMode =
  | "BACKUP_DEPLOYMENT_MODE_UNSPECIFIED"
  | "BACKUP_DEPLOYMENT_MODE_STANDALONE"
  | "BACKUP_DEPLOYMENT_MODE_CLUSTERED";

export type BackupOperationState =
  | "BACKUP_OPERATION_STATE_UNSPECIFIED"
  | "BACKUP_OPERATION_STATE_PENDING"
  | "BACKUP_OPERATION_STATE_PREFLIGHTING"
  | "BACKUP_OPERATION_STATE_WAITING_FOR_CONVERGENCE"
  | "BACKUP_OPERATION_STATE_READY"
  | "BACKUP_OPERATION_STATE_CHECKPOINTING"
  | "BACKUP_OPERATION_STATE_QUIESCING"
  | "BACKUP_OPERATION_STATE_CAPTURING"
  | "BACKUP_OPERATION_STATE_UPLOADING"
  | "BACKUP_OPERATION_STATE_VALIDATING"
  | "BACKUP_OPERATION_STATE_RELEASING_QUIESCE"
  | "BACKUP_OPERATION_STATE_FINALIZING"
  | "BACKUP_OPERATION_STATE_SUCCEEDED"
  | "BACKUP_OPERATION_STATE_FAILED"
  | "BACKUP_OPERATION_STATE_CANCELING"
  | "BACKUP_OPERATION_STATE_CANCELED";

export type ValidationOptionsInfo = {
  includeArtifactChecks: boolean;
  includeExternalDependencyChecks: boolean;
  includeCapacityEstimates: boolean;
  requireCompleteMarker: boolean;
};

export type RetentionPolicyInfo = {
  keepLastSuccessful: number;
  keepForSeconds: number;
  deleteIncompleteAfterSeconds: number;
};

export type DerivedSubsystemPolicyInfo = {
  subsystem: string;
  mode: string;
};

export type BackupPolicyInfo = {
  defaultRepositoryId: string;
  captureProvider: BackupCaptureProvider;
  quiesceReadProfile: BackupQuiesceReadProfile;
  allowReadOnlyDuringQuiesce: boolean;
  derivedSubsystems: DerivedSubsystemPolicyInfo[];
  retentionPolicy?: RetentionPolicyInfo | null;
  validationOptions?: ValidationOptionsInfo | null;
};

export type SecretReferenceInfo = {
  scheme: string;
  name: string;
  namespace: string;
  path: string;
  keys: Record<string, string>;
  description: string;
};

export type EncryptionPolicyInfo = {
  mode: string;
  keyRef?: SecretReferenceInfo | null;
  kmsKeyId: string;
  requireBucketDefaultEncryption: boolean;
};

export type S3CompatibleRepositoryConfigInfo = {
  bucket: string;
  prefix: string;
  region: string;
  endpointUri: string;
  forcePathStyle: boolean;
  disableTls: boolean;
};

export type ValidationBlockerInfo = {
  reason: string;
  detail: string;
  retryable: boolean;
  fieldPath: string;
};

export type ValidationProbeResultInfo = {
  name: string;
  state: string;
  detail: string;
  checkedAt: string;
};

export type BackupRepositoryValidationSummaryInfo = {
  state: string;
  checkedAt: string;
  probes: ValidationProbeResultInfo[];
  blockers: ValidationBlockerInfo[];
  sanitizedError: string;
};

export type BackupRepositoryInfo = {
  repositoryId: string;
  displayName: string;
  provider: string;
  s3?: S3CompatibleRepositoryConfigInfo | null;
  credentialRef?: SecretReferenceInfo | null;
  encryption?: EncryptionPolicyInfo | null;
  tlsCaRef?: SecretReferenceInfo | null;
  devOnly: boolean;
  createTime: string;
  updateTime: string;
  validation?: BackupRepositoryValidationSummaryInfo | null;
};

export type ListBackupRepositoriesInput = {
  pageSize?: number;
  pageToken?: string;
};

export type ListBackupRepositoriesResponse = {
  repositories: BackupRepositoryInfo[];
  nextPageToken: string;
};

export type ValidateBackupRepositoryInput = {
  repositoryId: string;
};

export type ValidateBackupRepositoryResponse = {
  repository?: BackupRepositoryInfo | null;
  validation?: BackupRepositoryValidationSummaryInfo | null;
};

export type BackupRepositoryInput = {
  repositoryId: string;
  displayName?: string;
  provider?: string;
  s3?: S3CompatibleRepositoryConfigInfo | null;
  credentialRef?: SecretReferenceInfo | null;
  encryption?: EncryptionPolicyInfo | null;
  tlsCaRef?: SecretReferenceInfo | null;
  devOnly?: boolean;
};

export type DeleteBackupRepositoryResponse = {
  repositoryId: string;
  state: string;
};

export type BackupNodeArtifactInfo = {
  podName: string;
  nodeId: string;
  ordinal: number;
  raftNodeId: number;
  archiveName: string;
  archiveUri: string;
  manifestName: string;
  manifestUri: string;
  sizeBytes: number;
  checksumSha256: string;
  appliedIndexes: Record<string, number>;
};

export type BackupOperationBlockerInfo = {
  nodeName: string;
  nodeId: string;
  raftNodeId: number;
  raftGroup: string;
  reason: string;
  appliedIndex: number;
  commitIndex: number;
  detail: string;
};

export type ValidationSummaryInfo = {
  state: string;
  checkedAt: string;
  blockers: ValidationBlockerInfo[];
  warnings: string[];
  validatorVersion: string;
  expectedNodeCount: number;
  nodeArtifactCount: number;
  requiredArtifactCount: number;
  validatedArtifactCount: number;
  totalArtifactBytes: number;
  checksumAlgorithm: string;
  errors: string[];
};

export type CompatibilitySummaryInfo = {
  state: string;
  sourceVersion: string;
  daemonVersion: string;
  requiredFeatures: string[];
  blockers: ValidationBlockerInfo[];
  storageFormatVersions: Record<string, string>;
  minRestoreMycelVersion: string;
  maxRestoreMycelVersion: string;
  supportedRestoreTargetModes: string[];
  supportedIdentityModes: string[];
  requiresSameTopology: boolean;
  requiresSourceFencingForPreservedIdentity: boolean;
};

export type BackupSetManifestSummaryInfo = {
  manifestVersion: number;
  manifestUri: string;
  manifestChecksumSha256: string;
  completeMarkerUri: string;
  completeMarkerChecksumSha256: string;
  manifestSizeBytes: number;
  totalArtifactBytes: number;
  artifactCount: number;
};

export type BackupOperationInfo = {
  backupOperationId: string;
  backupSetId: string;
  repositoryId: string;
  deploymentId: string;
  deploymentName: string;
  deploymentMode: BackupDeploymentMode;
  state: BackupOperationState;
  phase: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  expectedNodeCount: number;
  manifestUri: string;
  nodes: BackupNodeArtifactInfo[];
  raftBarriers: Record<string, number>;
  blockers: BackupOperationBlockerInfo[];
  cleanupTasks?: unknown[];
  validation?: ValidationSummaryInfo | null;
  cancelRequested: boolean;
  retryAfterSeconds: number;
  failedPhase: string;
  error: string;
};

export type BackupSetSummaryInfo = {
  backupSetId: string;
  repositoryId: string;
  deploymentId: string;
  deploymentName: string;
  deploymentMode: BackupDeploymentMode;
  state: BackupOperationState;
  createdAt: string;
  completedAt: string;
  expectedNodeCount: number;
  manifestUri: string;
  nodes: BackupNodeArtifactInfo[];
  compatibility?: CompatibilitySummaryInfo | null;
  validation?: ValidationSummaryInfo | null;
  deletionState?: string;
  retentionClass?: string;
  manifest?: BackupSetManifestSummaryInfo | null;
};

export type StartBackupInput = {
  reason?: string;
  archiveFormat?: BackupArchiveFormat;
  idempotencyKey?: string;
  convergenceTimeoutSeconds?: number;
  repositoryId?: string;
  captureProvider?: BackupCaptureProvider;
  quiesceReadProfile?: BackupQuiesceReadProfile;
  validationOptions?: ValidationOptionsInfo | null;
};

export type StartBackupResponse = {
  operation?: BackupOperationInfo | null;
  backupSet?: BackupSetSummaryInfo | null;
};

export type GetBackupOperationInput = {
  backupSetId?: string;
  backupOperationId?: string;
};

export type GetBackupOperationResponse = {
  operation?: BackupOperationInfo | null;
};

export type CancelBackupOperationInput = {
  backupSetId: string;
  backupOperationId?: string;
  reason?: string;
};

export type CancelBackupOperationResponse = {
  operation?: BackupOperationInfo | null;
};

export type ListBackupOperationsInput = {
  pageSize?: number;
  pageToken?: string;
};

export type ListBackupOperationsResponse = {
  operations: BackupOperationInfo[];
  nextPageToken: string;
};

export type ListBackupSetsInput = {
  repositoryId?: string;
  pageSize?: number;
  pageToken?: string;
};

export type ListBackupSetsResponse = {
  backupSets: BackupSetSummaryInfo[];
  nextPageToken: string;
};

export type ValidateBackupSetInput = {
  repositoryId: string;
  backupSetId: string;
  validationOptions?: ValidationOptionsInfo | null;
};

export type ValidateBackupSetResponse = {
  valid: boolean;
  errors: string[];
  backupSet?: BackupSetSummaryInfo | null;
  validation?: ValidationSummaryInfo | null;
};

export type DeleteBackupSetInput = {
  repositoryId: string;
  backupSetId: string;
  reason?: string;
};

export type DeleteBackupSetResponse = {
  repositoryId: string;
  backupSetId: string;
  state: string;
};

export type PlanRepositoryRetentionInput = {
  repositoryId: string;
  retentionPolicy?: RetentionPolicyInfo | null;
  now?: string;
};

export type ApplyRepositoryRetentionInput = {
  repositoryId: string;
  retentionPolicy?: RetentionPolicyInfo | null;
  reason?: string;
  now?: string;
};

export type RepositoryRetentionActionInfo = {
  backupSetId: string;
  prefix: string;
  action: string;
  reason: string;
  createdAt: string;
  completedAt: string;
  objectCount: number;
  deletedObjects: number;
  retryable: boolean;
  blocked: boolean;
  error: string;
  retentionCutoff: string;
};

export type RepositoryRetentionPlanInfo = {
  repositoryId: string;
  plannedAt: string;
  retentionPolicy?: RetentionPolicyInfo | null;
  dryRun: boolean;
  actions: RepositoryRetentionActionInfo[];
  warnings: string[];
  deletedObjects: number;
};

export type RepositoryRetentionResponse = {
  plan?: RepositoryRetentionPlanInfo | null;
};

export type GetBackupObservabilityInput = {
  repositoryId?: string;
  includeRetentionProbe?: boolean;
  staleOperationAfterSeconds?: number;
  backupFreshnessAfterSeconds?: number;
  incompleteBackupAfterSeconds?: number;
};

export type BackupMetricInfo = {
  name: string;
  description: string;
  unit: string;
  value: number;
  labels: Record<string, string>;
};

export type BackupAlertConditionInfo = {
  name: string;
  severity: string;
  firing: boolean;
  reason: string;
  expression: string;
  labels: Record<string, string>;
  evidence: string[];
};

export type BackupObservabilitySnapshotInfo = {
  observedAt: string;
  repositoryId: string;
  metrics: BackupMetricInfo[];
  alerts: BackupAlertConditionInfo[];
  summaryState: string;
};

export type GetBackupObservabilityResponse = {
  snapshot?: BackupObservabilitySnapshotInfo | null;
};

export type CapacityEstimateInfo = {
  requiredBytes: number;
  availableBytes: number;
  blockers: ValidationBlockerInfo[];
  warnings: string[];
};

export type RestorePlanSummaryInfo = {
  restorePlanId: string;
  repositoryId: string;
  backupSetId: string;
  targetMode: string;
  identityMode: string;
  authSessionPolicy: string;
  restorable: boolean;
  validation?: ValidationSummaryInfo | null;
  compatibility?: CompatibilitySummaryInfo | null;
  capacity?: CapacityEstimateInfo | null;
  derivedActions: DerivedSubsystemPolicyInfo[];
  blockers: ValidationBlockerInfo[];
  plannedAt: string;
};

export type PlanRestoreInput = {
  repositoryId: string;
  backupSetId: string;
  validationOptions?: ValidationOptionsInfo | null;
};

export type PlanRestoreResponse = {
  plan?: RestorePlanSummaryInfo | null;
};
