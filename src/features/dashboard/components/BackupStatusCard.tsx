import { useEffect, useState } from "react";
import { Text, TextLink, themeClasses } from "../../../components/typography";
import { getBackupObservability, listBackupSets } from "../../../services/adminService";
import type {
  BackupObservabilitySnapshotInfo,
  BackupSetSummaryInfo,
  GetBackupObservabilityInput,
  GetBackupObservabilityResponse,
  ListBackupSetsInput,
  ListBackupSetsResponse,
} from "../../../types/backups";

export type BackupStatusCardProps = {
  getBackupObservabilityService?: (
    input?: GetBackupObservabilityInput,
  ) => Promise<GetBackupObservabilityResponse>;
  listBackupSetsService?: (
    input: ListBackupSetsInput,
  ) => Promise<ListBackupSetsResponse>;
};

type LoadState = {
  loading: boolean;
  error: string | null;
  snapshot: BackupObservabilitySnapshotInfo | null;
  backupSets: BackupSetSummaryInfo[];
};

export function BackupStatusCard({
  getBackupObservabilityService = getBackupObservability,
  listBackupSetsService = listBackupSets,
}: BackupStatusCardProps) {
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    snapshot: null,
    backupSets: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const observability = await getBackupObservabilityService({
          includeRetentionProbe: true,
        });
        const repositoryId = observability.snapshot?.repositoryId || "";
        const backupSets = repositoryId
          ? await listBackupSetsService({
              repositoryId,
              pageSize: 3,
              pageToken: "",
            })
          : { backupSets: [], nextPageToken: "" };
        if (!cancelled) {
          setState({
            loading: false,
            error: null,
            snapshot: observability.snapshot || null,
            backupSets: backupSets.backupSets,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            loading: false,
            error: error instanceof Error ? error.message : String(error),
            snapshot: null,
            backupSets: [],
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [getBackupObservabilityService, listBackupSetsService]);

  const lastBackup = state.backupSets[0];
  const statusLabel = state.snapshot?.summaryState || "Unknown";
  const firingAlerts = state.snapshot?.alerts.filter((alert) => alert.firing) ?? [];

  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <div className="flex items-center justify-between gap-4">
        <Text
          as="p"
          size="sm"
          className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
        >
          Backups
        </Text>
        <TextLink to="/backups">Manage backups</TextLink>
      </div>

      {state.loading ? (
        <Text intent="muted" className="mt-6">
          Loading backup status...
        </Text>
      ) : state.error ? (
        <div
          className="mt-6 rounded-lg border border-red-500/30 bg-red-950/30 p-4"
          role="alert"
        >
          <Text as="p" className="font-medium text-red-200">
            Backup status unavailable
          </Text>
          <Text intent="danger" size="sm" className="mt-1">
            {state.error}
          </Text>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Repository health" value={statusLabel} badge />
            <Metric
              label="Last backup set"
              value={formatTimestamp(lastBackup?.completedAt || lastBackup?.createdAt)}
            />
            <Metric label="Firing alerts" value={String(firingAlerts.length)} />
          </div>

          <div>
            <Text
              as="p"
              size="sm"
              className={`font-medium ${themeClasses.text.parts.strongLight} ${themeClasses.text.parts.darkStrong}`}
            >
              Recent repository backup sets
            </Text>
            {state.backupSets.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-4">
                <Text intent="muted" size="sm">
                  No repository backup sets found.
                </Text>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                {state.backupSets.map((backup) => (
                  <li
                    key={backup.backupSetId}
                    className="flex items-center justify-between gap-4 p-3"
                  >
                    <div className="min-w-0">
                      <Text
                        as="p"
                        size="sm"
                        className={`truncate font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                      >
                        {backup.backupSetId}
                      </Text>
                      <Text intent="muted" size="sm" className="mt-1">
                        {backup.deploymentName || backup.deploymentId || backup.repositoryId}
                      </Text>
                    </div>
                    <Text intent="muted" size="sm" className="shrink-0 text-right">
                      <span className="block">
                        {formatTimestamp(backup.completedAt || backup.createdAt)}
                      </span>
                      <span className="block text-xs">
                        {formatBackupState(backup.state)}
                      </span>
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
      <dt className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
        {label}
      </dt>
      <dd className="mt-1">
        {badge ? (
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
            {value}
          </span>
        ) : (
          <span className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
            {value}
          </span>
        )}
      </dd>
    </div>
  );
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return "Not available";
  }
  return value
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC")
    .replace(/Z$/, " UTC");
}

function formatBackupState(state: string): string {
  if (!state) return "Unknown";
  return state.replace("BACKUP_OPERATION_STATE_", "").replace(/_/g, " ");
}
