import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";
import { getBackupStatus, listBackups } from "../../../services/adminService";
import type {
  BackupStatusResponse,
  BackupSummaryInfo,
  ListBackupsInput,
  ListBackupsResponse,
} from "../../../types/backups";

export type BackupStatusCardProps = {
  getBackupStatusService?: () => Promise<BackupStatusResponse>;
  listBackupsService?: (input?: ListBackupsInput) => Promise<ListBackupsResponse>;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  status: BackupStatusResponse | null;
  backups: BackupSummaryInfo[];
};

export function BackupStatusCard({
  getBackupStatusService = getBackupStatus,
  listBackupsService = listBackups,
}: BackupStatusCardProps) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    status: null,
    backups: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const [status, backups] = await Promise.all([
          getBackupStatusService(),
          listBackupsService({ pageSize: 3, pageToken: "" }),
        ]);
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            status,
            backups: backups.backups,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : String(error),
            status: null,
            backups: [],
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [getBackupStatusService, listBackupsService]);

  const currentStatus = state.status?.status;
  const lastBackup = state.backups[0];
  const lastSuccessAt = currentStatus?.lastSuccessAt || lastBackup?.completedAt || "";
  const nextRunAt = currentStatus?.nextRunAt || "";
  const statusLabel = currentStatus?.state || (lastBackup ? "Available" : "Unknown");

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Backups
        </Text>
        <Link className="text-sm font-medium text-sky-300 hover:text-sky-200" to="/backups">
          Manage backups
        </Link>
      </div>

      {state.loading ? (
        <Text intent="muted" className="mt-6 text-slate-600 dark:text-slate-400">
          Loading backup status...
        </Text>
      ) : state.error ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-950/30 p-4" role="alert">
          <Text as="p" className="font-medium text-red-200">
            Backup status unavailable
          </Text>
          <Text intent="muted" size="sm" className="mt-1 text-red-200/80">
            {state.error}
          </Text>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Current state" value={statusLabel} badge />
            <Metric label="Last successful backup" value={formatTimestamp(lastSuccessAt)} />
            <Metric label="Next scheduled run" value={formatTimestamp(nextRunAt)} />
          </div>

          <div>
            <Text as="p" size="sm" className="font-medium text-slate-800 dark:text-slate-200">
              Recent backup files
            </Text>
            {state.backups.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-4">
                <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">
                  No backup files found.
                </Text>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                {state.backups.map((backup) => (
                  <li key={backup.backupId} className="flex items-center justify-between gap-4 p-3">
                    <div className="min-w-0">
                      <Text as="p" size="sm" className="truncate font-medium text-slate-900 dark:text-slate-100">
                        {backup.archiveName || backup.backupId}
                      </Text>
                      <Text intent="muted" size="sm" className="mt-1 text-slate-500">
                        {formatTimestamp(backup.completedAt || backup.createdAt)}
                      </Text>
                    </div>
                    <Text intent="muted" size="sm" className="shrink-0 text-right text-slate-600 dark:text-slate-400">
                      <span className="block">{formatBytes(backup.sizeBytes)}</span>
                      <span className="block text-xs">{formatArchiveFormat(backup.archiveFormat)}</span>
                    </Text>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

type MetricProps = {
  label: string;
  value: string;
  badge?: boolean;
};

function Metric({ label, value, badge = false }: MetricProps) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1">
        {badge ? (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
            {value}
          </span>
        ) : (
          <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
        )}
      </dd>
    </div>
  );
}

function formatTimestamp(value: string): string {
  if (!value) {
    return "Not available";
  }
  return value.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

function formatArchiveFormat(format: string): string {
  if (!format || format === "BACKUP_ARCHIVE_FORMAT_UNSPECIFIED") {
    return "Format unknown";
  }
  return format.replace("BACKUP_ARCHIVE_FORMAT_", "").replace(/_/g, ".");
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Size unknown";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
