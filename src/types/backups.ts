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
