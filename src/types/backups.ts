export type BackupArchiveFormat =
  | "BACKUP_ARCHIVE_FORMAT_UNSPECIFIED"
  | "BACKUP_ARCHIVE_FORMAT_ZIP"
  | "BACKUP_ARCHIVE_FORMAT_TAR"
  | "BACKUP_ARCHIVE_FORMAT_TAR_GZ"
  | "BACKUP_ARCHIVE_FORMAT_TAR_ZST";

export type BackupScheduleKind = "" | "interval" | "daily" | "weekly";

export type BackupPolicyInfo = {
  enabled: boolean;
  backupDir: string;
  intervalSeconds: number;
  retentionCount: number;
  includeLogs: boolean;
  quiesceDrainTimeoutSeconds: number;
  backupTimeoutSeconds: number;
  retryAfterSeconds: number;
  statusHistoryLimit: number;
  allowReadsDuringBackup: boolean;
  scheduleKind: BackupScheduleKind;
  timeOfDay: string;
  timezone: string;
  weekdays: number[];
  runMissed: boolean;
  archiveFormat: BackupArchiveFormat;
};

export type QuiesceParticipantStatusInfo = {
  name: string;
  quiesced: boolean;
  active: number;
  reason: string;
  mode: string;
  source: string;
  since: string;
  lastError: string;
};

export type BackupStatusInfo = {
  backupId: string;
  state: string;
  startedAt: string;
  completedAt: string;
  archivePath: string;
  manifestPath: string;
  error: string;
  participants: QuiesceParticipantStatusInfo[];
  lastSuccessAt: string;
  nextRunAt: string;
};

export type BackupSummaryInfo = {
  backupId: string;
  archiveName: string;
  createdAt: string;
  completedAt: string;
  sizeBytes: number;
  checksumSha256: string;
  includeLogs: boolean;
  archiveFormat: BackupArchiveFormat;
};

export type QuiesceStatusInfo = {
  participants: QuiesceParticipantStatusInfo[];
};

export type BackupStatusResponse = {
  status?: BackupStatusInfo | null;
  quiesce?: QuiesceStatusInfo | null;
};

export type ListBackupsInput = {
  pageSize?: number;
  pageToken?: string;
};

export type ListBackupsResponse = {
  backups: BackupSummaryInfo[];
  nextPageToken: string;
};

export type TriggerBackupInput = {
  reason?: string;
};

export type TriggerBackupResponse = {
  status?: BackupStatusInfo | null;
  backup?: BackupSummaryInfo | null;
};

export type DeleteBackupResponse = {
  backupId: string;
};

export type ClusterBackupState =
  | "CLUSTER_BACKUP_STATE_UNSPECIFIED"
  | "CLUSTER_BACKUP_STATE_PENDING"
  | "CLUSTER_BACKUP_STATE_WAITING_FOR_CLUSTER_CONVERGENCE"
  | "CLUSTER_BACKUP_STATE_READY"
  | "CLUSTER_BACKUP_STATE_QUIESCING"
  | "CLUSTER_BACKUP_STATE_CAPTURING"
  | "CLUSTER_BACKUP_STATE_VALIDATING"
  | "CLUSTER_BACKUP_STATE_SUCCEEDED"
  | "CLUSTER_BACKUP_STATE_FAILED"
  | "CLUSTER_BACKUP_STATE_CANCELING"
  | "CLUSTER_BACKUP_STATE_CANCELED";

export type ClusterBackupNodeArtifactInfo = {
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

export type ClusterBackupBlockerInfo = {
  nodeName: string;
  nodeId: string;
  raftNodeId: number;
  raftGroup: string;
  reason: string;
  appliedIndex: number;
  commitIndex: number;
  detail: string;
};

export type ClusterBackupStatusInfo = {
  backupSetId: string;
  state: string;
  clusterId: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
  expectedNodes: number;
  manifestUri: string;
  nodes: ClusterBackupNodeArtifactInfo[];
  failedPhase: string;
  error: string;
  raftBarriers: Record<string, number>;
  stateCode: ClusterBackupState;
  blockers: ClusterBackupBlockerInfo[];
  cancelRequested: boolean;
  currentPhase: string;
  retryAfterSeconds: number;
};

export type ClusterBackupSetSummaryInfo = {
  backupSetId: string;
  state: string;
  clusterId: string;
  createdAt: string;
  completedAt: string;
  expectedNodes: number;
  manifestUri: string;
  nodes: ClusterBackupNodeArtifactInfo[];
};

export type StartClusterBackupInput = {
  reason?: string;
  outputDir: string;
  archiveFormat?: BackupArchiveFormat;
  idempotencyKey?: string;
  convergenceTimeoutSeconds?: number;
};

export type StartClusterBackupResponse = {
  status?: ClusterBackupStatusInfo | null;
  backupSet?: ClusterBackupSetSummaryInfo | null;
};

export type GetClusterBackupStatusInput = {
  backupSetId?: string;
};

export type GetClusterBackupStatusResponse = {
  status?: ClusterBackupStatusInfo | null;
};

export type CancelClusterBackupInput = {
  backupSetId: string;
  reason?: string;
};

export type CancelClusterBackupResponse = {
  status?: ClusterBackupStatusInfo | null;
};

export type ListClusterBackupsInput = {
  pageSize?: number;
  pageToken?: string;
};

export type ListClusterBackupsResponse = {
  backupSets: ClusterBackupSetSummaryInfo[];
  nextPageToken: string;
};

export type ValidateClusterBackupSetInput = {
  backupSetPath: string;
};

export type ValidateClusterBackupSetResponse = {
  valid: boolean;
  errors: string[];
  backupSet?: ClusterBackupSetSummaryInfo | null;
};
