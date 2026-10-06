import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  ConfirmationDialog,
  FieldHint,
  formatEnumLabel,
  Input,
  Tabs,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import {
  cancelClusterBackup as defaultCancelClusterBackup,
  deleteBackup as defaultDeleteBackup,
  getBackupPolicy as defaultGetBackupPolicy,
  getBackupStatus as defaultGetBackupStatus,
  getClusterBackupStatus as defaultGetClusterBackupStatus,
  listBackups as defaultListBackups,
  listClusterBackups as defaultListClusterBackups,
  startClusterBackup as defaultStartClusterBackup,
  triggerBackup as defaultTriggerBackup,
  updateBackupPolicy as defaultUpdateBackupPolicy,
  validateClusterBackupSet as defaultValidateClusterBackupSet,
} from "../../../services/adminService";
import type {
  BackupArchiveFormat,
  BackupPolicyInfo,
  BackupScheduleKind,
  BackupStatusResponse,
  BackupSummaryInfo,
  CancelClusterBackupInput,
  CancelClusterBackupResponse,
  ClusterBackupSetSummaryInfo,
  ClusterBackupStatusInfo,
  DeleteBackupResponse,
  GetClusterBackupStatusInput,
  GetClusterBackupStatusResponse,
  ListBackupsInput,
  ListBackupsResponse,
  ListClusterBackupsInput,
  ListClusterBackupsResponse,
  StartClusterBackupInput,
  StartClusterBackupResponse,
  TriggerBackupInput,
  TriggerBackupResponse,
  ValidateClusterBackupSetInput,
  ValidateClusterBackupSetResponse,
} from "../../../types/backups";

export type BackupsPageProps = {
  getBackupPolicyService?: () => Promise<BackupPolicyInfo>;
  updateBackupPolicyService?: (
    input: BackupPolicyInfo,
  ) => Promise<BackupPolicyInfo>;
  getBackupStatusService?: () => Promise<BackupStatusResponse>;
  listBackupsService?: (
    input?: ListBackupsInput,
  ) => Promise<ListBackupsResponse>;
  triggerBackupService?: (
    input?: TriggerBackupInput,
  ) => Promise<TriggerBackupResponse>;
  deleteBackupService?: (backupId: string) => Promise<DeleteBackupResponse>;
  startClusterBackupService?: (
    input: StartClusterBackupInput,
  ) => Promise<StartClusterBackupResponse>;
  getClusterBackupStatusService?: (
    input?: GetClusterBackupStatusInput,
  ) => Promise<GetClusterBackupStatusResponse>;
  cancelClusterBackupService?: (
    input: CancelClusterBackupInput,
  ) => Promise<CancelClusterBackupResponse>;
  listClusterBackupsService?: (
    input?: ListClusterBackupsInput,
  ) => Promise<ListClusterBackupsResponse>;
  validateClusterBackupSetService?: (
    input: ValidateClusterBackupSetInput,
  ) => Promise<ValidateClusterBackupSetResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function BackupsPage({
  getBackupPolicyService = defaultGetBackupPolicy,
  updateBackupPolicyService = defaultUpdateBackupPolicy,
  getBackupStatusService = defaultGetBackupStatus,
  listBackupsService = defaultListBackups,
  triggerBackupService = defaultTriggerBackup,
  deleteBackupService = defaultDeleteBackup,
  startClusterBackupService = defaultStartClusterBackup,
  getClusterBackupStatusService = defaultGetClusterBackupStatus,
  cancelClusterBackupService = defaultCancelClusterBackup,
  listClusterBackupsService = defaultListClusterBackups,
  validateClusterBackupSetService = defaultValidateClusterBackupSet,
  principalContext,
}: BackupsPageProps) {
  const [policy, setPolicy] = useState<BackupPolicyInfo | null>(null);
  const [status, setStatus] = useState<BackupStatusResponse | null>(null);
  const [backups, setBackups] = useState<BackupSummaryInfo[]>([]);
  const [clusterBackups, setClusterBackups] = useState<
    ClusterBackupSetSummaryInfo[]
  >([]);
  const [clusterStatus, setClusterStatus] =
    useState<ClusterBackupStatusInfo | null>(null);
  const [nextPageToken, setNextPageToken] = useState("");
  const [nextClusterPageToken, setNextClusterPageToken] = useState("");
  const [clusterOutputDir, setClusterOutputDir] = useState("");
  const [clusterReason, setClusterReason] = useState(
    "Triggered from Mycel Console",
  );
  const [clusterArchiveFormat, setClusterArchiveFormat] =
    useState<BackupArchiveFormat>("BACKUP_ARCHIVE_FORMAT_TAR_ZST");
  const [clusterConvergenceTimeoutSeconds, setClusterConvergenceTimeoutSeconds] =
    useState(0);
  const [validatePath, setValidatePath] = useState("");
  const [validateResult, setValidateResult] =
    useState<ValidateClusterBackupSetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingClusterMore, setLoadingClusterMore] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [startingClusterBackup, setStartingClusterBackup] = useState(false);
  const [cancelingClusterBackup, setCancelingClusterBackup] = useState(false);
  const [validatingClusterBackup, setValidatingClusterBackup] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BackupSummaryInfo | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "cluster" | "policy">("overview");

  const load = useCallback(
    async ({
      append = false,
      pageToken = "",
    }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      setNotice("");
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const [policyResponse, statusResponse, backupsResponse, clusterResponse] =
          await Promise.all([
            getBackupPolicyService(),
            getBackupStatusService(),
            listBackupsService({ pageSize: 50, pageToken }),
            listClusterBackupsService({ pageSize: 50, pageToken: "" }),
          ]);
        setPolicy(policyResponse);
        setClusterOutputDir((current) => current || policyResponse.backupDir || "");
        setStatus(statusResponse);
        setBackups((current) =>
          append
            ? [...current, ...backupsResponse.backups]
            : backupsResponse.backups,
        );
        setNextPageToken(backupsResponse.nextPageToken);
        setClusterBackups(clusterResponse.backupSets);
        setNextClusterPageToken(clusterResponse.nextPageToken);
        const active = clusterResponse.backupSets.find((backup) =>
          isActiveClusterBackupState(backup.state),
        );
        if (active) {
          try {
            const activeStatus = await getClusterBackupStatusService({
              backupSetId: active.backupSetId,
            });
            setClusterStatus(activeStatus.status || null);
          } catch {
            setClusterStatus(null);
          }
        } else {
          setClusterStatus(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backups");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [
      getBackupPolicyService,
      getBackupStatusService,
      getClusterBackupStatusService,
      listBackupsService,
      listClusterBackupsService,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSavePolicy() {
    if (!policy) return;
    setError("");
    setNotice("");
    setSavingPolicy(true);
    try {
      const updated = await updateBackupPolicyService(policy);
      setPolicy(updated);
      setNotice("Backup policy saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save backup policy",
      );
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleTriggerBackup() {
    setError("");
    setNotice("");
    setTriggering(true);
    try {
      await triggerBackupService({ reason: "Triggered from Mycel Console" });
      setNotice("Backup triggered.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger backup");
    } finally {
      setTriggering(false);
    }
  }

  async function handleStartClusterBackup() {
    setError("");
    setNotice("");
    setStartingClusterBackup(true);
    try {
      const response = await startClusterBackupService({
        reason: clusterReason,
        outputDir: clusterOutputDir,
        archiveFormat: clusterArchiveFormat,
        convergenceTimeoutSeconds: clusterConvergenceTimeoutSeconds,
      });
      if (response.status) setClusterStatus(response.status);
      setNotice(
        `Cluster backup started${response.status?.backupSetId ? `: ${response.status.backupSetId}` : "."}`,
      );
      setActiveTab("cluster");
      await refreshClusterBackups();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start cluster backup",
      );
    } finally {
      setStartingClusterBackup(false);
    }
  }

  async function handleCancelClusterBackup() {
    const backupSetId = clusterStatus?.backupSetId || "";
    if (!backupSetId) return;
    setError("");
    setNotice("");
    setCancelingClusterBackup(true);
    try {
      const response = await cancelClusterBackupService({
        backupSetId,
        reason: "Canceled from Mycel Console",
      });
      if (response.status) setClusterStatus(response.status);
      setNotice(`Cluster backup cancel requested: ${backupSetId}`);
      await refreshClusterBackups();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel cluster backup",
      );
    } finally {
      setCancelingClusterBackup(false);
    }
  }

  async function refreshClusterBackups({ append = false } = {}) {
    if (append) setLoadingClusterMore(true);
    try {
      const response = await listClusterBackupsService({
        pageSize: 50,
        pageToken: append ? nextClusterPageToken : "",
      });
      setClusterBackups((current) =>
        append ? [...current, ...response.backupSets] : response.backupSets,
      );
      setNextClusterPageToken(response.nextPageToken);
    } finally {
      if (append) setLoadingClusterMore(false);
    }
  }

  async function handleValidateClusterBackupSet() {
    setError("");
    setNotice("");
    setValidateResult(null);
    setValidatingClusterBackup(true);
    try {
      const response = await validateClusterBackupSetService({
        backupSetPath: validatePath,
      });
      setValidateResult(response);
      setNotice(
        response.valid
          ? "Cluster backup set is valid."
          : "Cluster backup set validation failed.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to validate cluster backup set",
      );
    } finally {
      setValidatingClusterBackup(false);
    }
  }

  useEffect(() => {
    if (!isActiveClusterBackupStatus(clusterStatus)) return;
    const backupSetId = clusterStatus.backupSetId;
    const timer = window.setInterval(() => {
      void getClusterBackupStatusService({ backupSetId })
        .then((response) => {
          if (response.status) setClusterStatus(response.status);
          if (response.status && !isActiveClusterBackupStatus(response.status)) {
            void refreshClusterBackups();
          }
        })
        .catch(() => undefined);
    }, Math.max(3000, clusterStatus.retryAfterSeconds * 1000 || 5000));
    return () => window.clearInterval(timer);
  }, [clusterStatus, getClusterBackupStatusService]);

  function requestDeleteBackup(backup: BackupSummaryInfo) {
    setError("");
    setNotice("");
    setPendingDelete(backup);
  }

  async function confirmDeleteBackup() {
    if (!pendingDelete) return;
    const backup = pendingDelete;
    setError("");
    setNotice(`Deleting backup: ${backup.backupId}`);
    setDeletingBackupId(backup.backupId);
    try {
      const deleted = await deleteBackupService(backup.backupId);
      setPendingDelete(null);
      await load();
      setNotice(`Backup deleted: ${deleted.backupId || backup.backupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete backup");
    } finally {
      setDeletingBackupId("");
    }
  }

  const canManageBackups = canUseCapability(principalContext, "backup.manage");
  const busy =
    loading ||
    loadingMore ||
    loadingClusterMore ||
    savingPolicy ||
    triggering ||
    startingClusterBackup ||
    cancelingClusterBackup ||
    validatingClusterBackup ||
    Boolean(deletingBackupId);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Backups"
        description="Inspect local backup files, monitor backup state, run async cluster backups, and manage the daemon backup policy."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={busy}
            >
              Refresh
            </Button>
            {canManageBackups && (
              <>
                <Button
                  variant="secondary"
                  onClick={() => void handleTriggerBackup()}
                  disabled={busy}
                >
                  {triggering ? "Triggering…" : "Trigger Local Backup"}
                </Button>
                <Button
                  onClick={() => void handleStartClusterBackup()}
                  disabled={busy || !clusterOutputDir.trim()}
                >
                  {startingClusterBackup ? "Starting…" : "Start Cluster Backup"}
                </Button>
              </>
            )}
          </>
        }
      />

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {loading ? (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-8 text-center`}
        >
          <Text intent="muted">Loading backups…</Text>
        </div>
      ) : (
        <>
          <Tabs
            ariaLabel="Backup sections"
            tabs={[
              { id: "overview", label: "Overview" },
              { id: "cluster", label: "Cluster backups" },
              { id: "policy", label: "Policy" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "overview" && (
            <OverviewPanel
              status={status}
              backups={backups}
              deletingBackupId={deletingBackupId}
              onDelete={requestDeleteBackup}
              canDelete={canManageBackups}
              nextPageToken={nextPageToken}
              loadingMore={loadingMore}
              onLoadMore={() =>
                void load({ append: true, pageToken: nextPageToken })
              }
            />
          )}
          {activeTab === "cluster" && (
            <ClusterBackupsPanel
              current={clusterStatus}
              backups={clusterBackups}
              outputDir={clusterOutputDir}
              reason={clusterReason}
              archiveFormat={clusterArchiveFormat}
              convergenceTimeoutSeconds={clusterConvergenceTimeoutSeconds}
              canManage={canManageBackups}
              starting={startingClusterBackup}
              canceling={cancelingClusterBackup}
              loadingMore={loadingClusterMore}
              nextPageToken={nextClusterPageToken}
              validatePath={validatePath}
              validateResult={validateResult}
              validating={validatingClusterBackup}
              onOutputDirChange={setClusterOutputDir}
              onReasonChange={setClusterReason}
              onArchiveFormatChange={setClusterArchiveFormat}
              onConvergenceTimeoutChange={setClusterConvergenceTimeoutSeconds}
              onStart={() => void handleStartClusterBackup()}
              onCancel={() => void handleCancelClusterBackup()}
              onRefresh={() => void refreshClusterBackups()}
              onLoadMore={() => void refreshClusterBackups({ append: true })}
              onValidatePathChange={setValidatePath}
              onValidate={() => void handleValidateClusterBackupSet()}
            />
          )}
          {activeTab === "policy" && policy && (
            <PolicyPanel
              policy={policy}
              onChange={setPolicy}
              onSave={() => void handleSavePolicy()}
              saving={savingPolicy}
              readOnly={!canManageBackups}
            />
          )}
          <DeleteBackupDialog
            backup={pendingDelete}
            deleting={Boolean(deletingBackupId)}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void confirmDeleteBackup()}
          />
        </>
      )}
    </section>
  );
}

function OverviewPanel({
  status,
  backups,
  deletingBackupId,
  onDelete,
  canDelete,
  nextPageToken,
  loadingMore,
  onLoadMore,
}: {
  status: BackupStatusResponse | null;
  backups: BackupSummaryInfo[];
  deletingBackupId: string;
  onDelete: (backup: BackupSummaryInfo) => void;
  canDelete: boolean;
  nextPageToken: string;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  return (
    <div className="space-y-4" role="tabpanel" aria-label="Backup overview">
      <StatusPanel status={status} />
      <BackupFilesPanel
        backups={backups}
        deletingBackupId={deletingBackupId}
        onDelete={onDelete}
        canDelete={canDelete}
      />
      {nextPageToken && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading more…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

function ClusterBackupsPanel({
  current,
  backups,
  outputDir,
  reason,
  archiveFormat,
  convergenceTimeoutSeconds,
  canManage,
  starting,
  canceling,
  loadingMore,
  nextPageToken,
  validatePath,
  validateResult,
  validating,
  onOutputDirChange,
  onReasonChange,
  onArchiveFormatChange,
  onConvergenceTimeoutChange,
  onStart,
  onCancel,
  onRefresh,
  onLoadMore,
  onValidatePathChange,
  onValidate,
}: {
  current: ClusterBackupStatusInfo | null;
  backups: ClusterBackupSetSummaryInfo[];
  outputDir: string;
  reason: string;
  archiveFormat: BackupArchiveFormat;
  convergenceTimeoutSeconds: number;
  canManage: boolean;
  starting: boolean;
  canceling: boolean;
  loadingMore: boolean;
  nextPageToken: string;
  validatePath: string;
  validateResult: ValidateClusterBackupSetResponse | null;
  validating: boolean;
  onOutputDirChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onArchiveFormatChange: (value: BackupArchiveFormat) => void;
  onConvergenceTimeoutChange: (value: number) => void;
  onStart: () => void;
  onCancel: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  onValidatePathChange: (value: string) => void;
  onValidate: () => void;
}) {
  const active = isActiveClusterBackupStatus(current);
  return (
    <div className="space-y-4" role="tabpanel" aria-label="Cluster backups">
      <article
        className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text
              as="p"
              size="sm"
              className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
            >
              Async cluster backup
            </Text>
            <Text intent="muted" className="mt-2">
              Starts a daemon-coordinated cluster backup operation and polls the
              operation state, blockers, and node artifacts.
            </Text>
          </div>
          <Button variant="secondary" onClick={onRefresh} disabled={loadingMore}>
            Refresh cluster backups
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="Output directory"
            value={outputDir}
            disabled={!canManage || starting}
            onChange={onOutputDirChange}
            hint="Shared or per-pod backup destination path visible to the Mycel daemon pods."
          />
          <Field
            label="Reason"
            value={reason}
            disabled={!canManage || starting}
            onChange={onReasonChange}
            hint="Operator reason recorded with the cluster backup operation."
          />
          <ArchiveFormatField
            value={archiveFormat}
            disabled={!canManage || starting}
            onChange={onArchiveFormatChange}
          />
          <NumberField
            label="Convergence timeout seconds"
            value={convergenceTimeoutSeconds}
            disabled={!canManage || starting}
            onChange={onConvergenceTimeoutChange}
            hint="Optional wait limit for cluster convergence. Zero uses the daemon default."
          />
        </div>
        {canManage ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={onStart} disabled={starting || !outputDir.trim()}>
              {starting ? "Starting…" : "Start cluster backup"}
            </Button>
            {active && (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={canceling || current?.cancelRequested}
              >
                {canceling ? "Canceling…" : "Cancel active backup"}
              </Button>
            )}
          </div>
        ) : (
          <Text intent="muted" className="mt-5">
            Read-only: backup.manage is required to start or cancel cluster
            backups.
          </Text>
        )}
      </article>

      <ClusterBackupStatusPanel current={current} />
      <ClusterBackupHistoryPanel
        backups={backups}
        loadingMore={loadingMore}
        nextPageToken={nextPageToken}
        onLoadMore={onLoadMore}
      />
      <ClusterBackupValidationPanel
        path={validatePath}
        result={validateResult}
        validating={validating}
        canManage={canManage}
        onPathChange={onValidatePathChange}
        onValidate={onValidate}
      />
    </div>
  );
}

function ClusterBackupStatusPanel({
  current,
}: {
  current: ClusterBackupStatusInfo | null;
}) {
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Current cluster backup
      </Text>
      {!current ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No active cluster backup operation.</Text>
        </div>
      ) : (
        <>
          <dl className="mt-5 grid gap-4 md:grid-cols-4">
            <Metric label="Backup set" value={current.backupSetId || "None"} />
            <Metric
              label="State"
              value={formatClusterBackupState(current.stateCode, current.state)}
            />
            <Metric
              label="Phase"
              value={formatEnumLabel(current.currentPhase, "Not available")}
            />
            <Metric
              label="Nodes"
              value={`${current.nodes.length}/${current.expectedNodes || 0}`}
            />
            <Metric label="Cluster" value={current.clusterId || "Unknown"} />
            <Metric label="Created" value={formatTimestamp(current.createdAt)} />
            <Metric label="Updated" value={formatTimestamp(current.updatedAt)} />
            <Metric
              label="Manifest"
              value={current.manifestUri || "Not available"}
            />
          </dl>
          {current.error && <Alert className="mt-4">{current.error}</Alert>}
          {current.cancelRequested && (
            <Alert variant="success" className="mt-4">
              Cancellation has been requested for this backup.
            </Alert>
          )}
          {current.blockers.length > 0 && (
            <ClusterBackupBlockers blockers={current.blockers} />
          )}
          {current.nodes.length > 0 && (
            <ClusterBackupNodes nodes={current.nodes} />
          )}
        </>
      )}
    </article>
  );
}

function ClusterBackupBlockers({
  blockers,
}: {
  blockers: ClusterBackupStatusInfo["blockers"];
}) {
  return (
    <div className="mt-5">
      <Text as="p" className="font-medium">
        Readiness blockers
      </Text>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead
            className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
          >
            <tr>
              <TableHead className="px-4 py-3">Node</TableHead>
              <TableHead className="px-4 py-3">Raft group</TableHead>
              <TableHead className="px-4 py-3">Reason</TableHead>
              <TableHead className="px-4 py-3">Indexes</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            {blockers.map((blocker, index) => (
              <tr key={`${blocker.nodeName}-${blocker.raftGroup}-${index}`}>
                <td className="px-4 py-3">{blocker.nodeName || blocker.nodeId || "Unknown"}</td>
                <td className="px-4 py-3">{blocker.raftGroup || "—"}</td>
                <td className="px-4 py-3">
                  {blocker.reason || blocker.detail || "Blocked"}
                </td>
                <td className="px-4 py-3">
                  {blocker.appliedIndex}/{blocker.commitIndex}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClusterBackupNodes({
  nodes,
}: {
  nodes: ClusterBackupStatusInfo["nodes"];
}) {
  return (
    <div className="mt-5">
      <Text as="p" className="font-medium">
        Node artifacts
      </Text>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
          <thead
            className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
          >
            <tr>
              <TableHead className="px-4 py-3">Pod</TableHead>
              <TableHead className="px-4 py-3">Archive</TableHead>
              <TableHead className="px-4 py-3">Size</TableHead>
              <TableHead className="px-4 py-3">Checksum</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            {nodes.map((node) => (
              <tr key={`${node.podName}-${node.archiveName}`}>
                <td className="px-4 py-3">{node.podName || node.nodeId}</td>
                <td className="px-4 py-3">{node.archiveName || "Pending"}</td>
                <td className="px-4 py-3">{formatBytes(node.sizeBytes)}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {shortChecksum(node.checksumSha256)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClusterBackupHistoryPanel({
  backups,
  loadingMore,
  nextPageToken,
  onLoadMore,
}: {
  backups: ClusterBackupSetSummaryInfo[];
  loadingMore: boolean;
  nextPageToken: string;
  onLoadMore: () => void;
}) {
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Cluster backup sets
      </Text>
      {backups.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No cluster backup sets found.</Text>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead
              className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
            >
              <tr>
                <TableHead className="px-4 py-3">Backup set</TableHead>
                <TableHead className="px-4 py-3">State</TableHead>
                <TableHead className="px-4 py-3">Created</TableHead>
                <TableHead className="px-4 py-3">Nodes</TableHead>
                <TableHead className="px-4 py-3">Manifest</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {backups.map((backup) => (
                <tr key={backup.backupSetId}>
                  <td className="px-4 py-3 font-medium">
                    {backup.backupSetId}
                  </td>
                  <td className="px-4 py-3">
                    {formatEnumLabel(backup.state, "Unknown")}
                  </td>
                  <td className="px-4 py-3">
                    {formatTimestamp(backup.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {backup.nodes.length}/{backup.expectedNodes || 0}
                  </td>
                  <td className="px-4 py-3">{backup.manifestUri || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nextPageToken && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more…" : "Load more cluster backups"}
          </Button>
        </div>
      )}
    </article>
  );
}

function ClusterBackupValidationPanel({
  path,
  result,
  validating,
  canManage,
  onPathChange,
  onValidate,
}: {
  path: string;
  result: ValidateClusterBackupSetResponse | null;
  validating: boolean;
  canManage: boolean;
  onPathChange: (value: string) => void;
  onValidate: () => void;
}) {
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Validate cluster backup set
      </Text>
      <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
        <Field
          label="Backup set path"
          value={path}
          disabled={!canManage || validating}
          onChange={onPathChange}
          hint="Path to a backup-set directory or manifest on the daemon host."
        />
        <Button
          variant="secondary"
          onClick={onValidate}
          disabled={!canManage || validating || !path.trim()}
        >
          {validating ? "Validating…" : "Validate"}
        </Button>
      </div>
      {result && (
        <Alert variant={result.valid ? "success" : undefined} className="mt-4">
          {result.valid
            ? `Valid backup set${result.backupSet?.backupSetId ? `: ${result.backupSet.backupSetId}` : "."}`
            : result.errors.join("; ") || "Backup set validation failed."}
        </Alert>
      )}
    </article>
  );
}

function StatusPanel({ status }: { status: BackupStatusResponse | null }) {
  const current = status?.status;
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Backup status
      </Text>
      <dl className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric
          label="State"
          value={formatEnumLabel(current?.state, "Unknown")}
        />
        <Metric
          label="Last success"
          value={formatTimestamp(current?.lastSuccessAt)}
        />
        <Metric label="Next run" value={formatTimestamp(current?.nextRunAt)} />
        <Metric label="Active backup" value={current?.backupId || "None"} />
      </dl>
      {current?.error && <Alert className="mt-4">{current.error}</Alert>}
    </article>
  );
}

function PolicyPanel({
  policy,
  onChange,
  onSave,
  saving,
  readOnly,
}: {
  policy: BackupPolicyInfo;
  onChange: (policy: BackupPolicyInfo) => void;
  onSave: () => void;
  saving: boolean;
  readOnly: boolean;
}) {
  function set<K extends keyof BackupPolicyInfo>(
    key: K,
    value: BackupPolicyInfo[K],
  ) {
    onChange({ ...policy, [key]: value });
  }

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
          Backup policy
        </Text>
        {readOnly ? (
          <Text intent="muted" size="sm">
            Read-only
          </Text>
        ) : (
          <Button variant="secondary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        )}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CheckboxField
          label="Backups enabled"
          checked={policy.enabled}
          disabled={readOnly}
          onChange={(value) => set("enabled", value)}
          hint="Turns scheduled backups on or off. Manual backups can still be triggered separately if the daemon allows it."
        />
        <CheckboxField
          label="Include logs"
          checked={policy.includeLogs}
          disabled={readOnly}
          onChange={(value) => set("includeLogs", value)}
          hint="Includes daemon log files in backup archives when supported."
        />
        <CheckboxField
          label="Allow reads during backup"
          checked={policy.allowReadsDuringBackup}
          disabled={readOnly}
          onChange={(value) => set("allowReadsDuringBackup", value)}
          hint="Allows read traffic while backup quiescing is active. Writes may still be paused."
        />
        <CheckboxField
          label="Run missed schedule"
          checked={policy.runMissed}
          disabled={readOnly}
          onChange={(value) => set("runMissed", value)}
          hint="If enabled, the daemon may run a missed daily or weekly backup after restart."
        />
        <Field
          label="Backup directory"
          value={policy.backupDir}
          disabled={readOnly}
          onChange={(value) => set("backupDir", value)}
          hint="Filesystem path on the Mycel daemon host or container where backup archives are written."
        />
        <ArchiveFormatField
          value={policy.archiveFormat}
          disabled={readOnly}
          onChange={(value) => set("archiveFormat", value)}
        />
        <ScheduleKindField
          value={policy.scheduleKind || "interval"}
          disabled={readOnly}
          onChange={(value) => set("scheduleKind", value)}
        />
        {(policy.scheduleKind === "" || policy.scheduleKind === "interval") && (
          <NumberField
            label="Interval seconds"
            value={policy.intervalSeconds}
            disabled={readOnly}
            onChange={(value) => set("intervalSeconds", value)}
            hint="Number of seconds between scheduled backup attempts when schedule kind is interval."
          />
        )}
        {(policy.scheduleKind === "daily" ||
          policy.scheduleKind === "weekly") && (
          <Field
            label="Time of day"
            value={policy.timeOfDay}
            disabled={readOnly}
            onChange={(value) => set("timeOfDay", value)}
            hint="Local wall-clock time for daily or weekly backups, in HH:MM 24-hour format."
          />
        )}
        {(policy.scheduleKind === "daily" ||
          policy.scheduleKind === "weekly") && (
          <Field
            label="Timezone"
            value={policy.timezone}
            disabled={readOnly}
            onChange={(value) => set("timezone", value)}
            hint="IANA timezone used for wall-clock schedules, such as UTC or America/Toronto."
          />
        )}
        {policy.scheduleKind === "weekly" && (
          <WeekdaysField
            value={policy.weekdays}
            disabled={readOnly}
            onChange={(value) => set("weekdays", value)}
          />
        )}
        <NumberField
          label="Retention count"
          value={policy.retentionCount}
          disabled={readOnly}
          onChange={(value) => set("retentionCount", value)}
          hint="Maximum number of completed backups to keep before old backups are eligible for deletion."
        />
        <NumberField
          label="Backup timeout seconds"
          value={policy.backupTimeoutSeconds}
          disabled={readOnly}
          onChange={(value) => set("backupTimeoutSeconds", value)}
          hint="Maximum time a backup run may take before it is considered failed."
        />
        <NumberField
          label="Quiesce drain timeout seconds"
          value={policy.quiesceDrainTimeoutSeconds}
          disabled={readOnly}
          onChange={(value) => set("quiesceDrainTimeoutSeconds", value)}
          hint="How long the daemon waits for active work to drain before taking a backup."
        />
        <NumberField
          label="Retry after seconds"
          value={policy.retryAfterSeconds}
          disabled={readOnly}
          onChange={(value) => set("retryAfterSeconds", value)}
          hint="Delay before retrying after a scheduled backup failure."
        />
        <NumberField
          label="Status history limit"
          value={policy.statusHistoryLimit}
          disabled={readOnly}
          onChange={(value) => set("statusHistoryLimit", value)}
          hint="Number of recent backup status records the daemon should retain."
        />
      </div>
    </article>
  );
}

function BackupFilesPanel({
  backups,
  deletingBackupId,
  onDelete,
  canDelete,
}: {
  backups: BackupSummaryInfo[];
  deletingBackupId: string;
  onDelete: (backup: BackupSummaryInfo) => void;
  canDelete: boolean;
}) {
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Backup files
      </Text>
      {backups.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No backup files found.</Text>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead
              className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
            >
              <tr>
                <TableHead className="px-4 py-3">Archive</TableHead>
                <TableHead className="px-4 py-3">Completed</TableHead>
                <TableHead className="px-4 py-3">Size</TableHead>
                <TableHead className="px-4 py-3">Archive format</TableHead>
                <TableHead className="px-4 py-3 text-right">Actions</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {backups.map((backup) => (
                <tr key={backup.backupId}>
                  <td
                    className={`px-4 py-3 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                  >
                    {backup.archiveName || backup.backupId}
                  </td>
                  <td
                    className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                  >
                    {formatTimestamp(backup.completedAt || backup.createdAt)}
                  </td>
                  <td
                    className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                  >
                    {formatBytes(backup.sizeBytes)}
                  </td>
                  <td
                    className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                  >
                    {formatArchiveFormat(backup.archiveFormat)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canDelete ? (
                      <Button
                        variant="secondary"
                        onClick={() => onDelete(backup)}
                        disabled={deletingBackupId === backup.backupId}
                      >
                        {deletingBackupId === backup.backupId
                          ? "Deleting…"
                          : "Delete"}
                      </Button>
                    ) : (
                      <span
                        className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                      >
                        Read-only
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function DeleteBackupDialog({
  backup,
  deleting,
  onCancel,
  onConfirm,
}: {
  backup: BackupSummaryInfo | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!backup) return null;

  return (
    <ConfirmationDialog
      eyebrow="Delete backup"
      title="Confirm delete"
      loading={deleting}
      confirmLabel="Delete backup"
      loadingLabel="Deleting…"
      intent="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      Delete{" "}
      <span
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {backup.archiveName || backup.backupId}
      </span>
      ? This removes the backup archive and manifest from the daemon backup
      directory.
    </ConfirmationDialog>
  );
}

function Field({
  label,
  value,
  disabled = false,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  hint: string;
}) {
  return (
    <label
      className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
    >
      <FieldLabel label={label} hint={hint} />
      <Input
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  disabled = false,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  hint: string;
}) {
  return (
    <label
      className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
    >
      <FieldLabel label={label} hint={hint} />
      <Input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function CheckboxField({
  label,
  checked,
  disabled = false,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  hint: string;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm ${themeClasses.text.parts.strongLight} dark:border-slate-800 dark:bg-slate-950/30 ${themeClasses.text.parts.darkStrong}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="flex items-center gap-1">
        {label}
        <FieldHint label={`${label} help`}>{hint}</FieldHint>
      </span>
    </label>
  );
}

function ArchiveFormatField({
  value,
  disabled = false,
  onChange,
}: {
  value: BackupArchiveFormat;
  disabled?: boolean;
  onChange: (value: BackupArchiveFormat) => void;
}) {
  return (
    <label
      className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
    >
      <FieldLabel
        label="Archive format"
        hint="Backup archive/container format written by the daemon, such as ZIP or TAR.ZST."
      />
      <select
        className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`}
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.value as BackupArchiveFormat)
        }
      >
        <option value="BACKUP_ARCHIVE_FORMAT_ZIP">ZIP</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR">TAR</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_GZ">TAR.GZ</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_ZST">TAR.ZST</option>
      </select>
    </label>
  );
}

function ScheduleKindField({
  value,
  disabled = false,
  onChange,
}: {
  value: BackupScheduleKind;
  disabled?: boolean;
  onChange: (value: BackupScheduleKind) => void;
}) {
  return (
    <label
      className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
    >
      <FieldLabel
        label="Schedule kind"
        hint="Controls whether backups run by interval, once per day, or on selected weekdays."
      />
      <select
        className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as BackupScheduleKind)}
      >
        <option value="interval">Interval</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
    </label>
  );
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekdaysField({
  value,
  disabled = false,
  onChange,
}: {
  value: number[];
  disabled?: boolean;
  onChange: (value: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(
      value.includes(day)
        ? value.filter((item) => item !== day)
        : [...value, day].sort(),
    );
  }
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
      <legend className="px-1">
        <FieldLabel
          label="Weekdays"
          hint="Days when weekly backups run. Sunday is 0 in the API, but the UI shows day names."
        />
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {weekdayLabels.map((label, day) => (
          <label
            key={label}
            className={`flex items-center gap-1 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={value.includes(day)}
              disabled={disabled}
              onChange={() => toggle(day)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      className={`mb-1 flex items-center gap-1 text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
    >
      {label}
      <FieldHint label={`${label} help`}>{hint}</FieldHint>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt
        className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}
      >
        {label}
      </dt>
      <dd
        className={`mt-1 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {value}
      </dd>
    </div>
  );
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not available";
  return value
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC")
    .replace(/Z$/, " UTC");
}

function formatArchiveFormat(format: string): string {
  return format.replace("BACKUP_ARCHIVE_FORMAT_", "").replace(/_/g, ".");
}

function formatClusterBackupState(stateCode?: string, fallback?: string): string {
  if (stateCode && stateCode !== "CLUSTER_BACKUP_STATE_UNSPECIFIED") {
    return stateCode.replace("CLUSTER_BACKUP_STATE_", "").replace(/_/g, " ");
  }
  return formatEnumLabel(fallback, "Unknown");
}

function isActiveClusterBackupStatus(
  status: ClusterBackupStatusInfo | null,
): status is ClusterBackupStatusInfo {
  return Boolean(status && isActiveClusterBackupState(status.stateCode || status.state));
}

function isActiveClusterBackupState(state?: string): boolean {
  const normalized = (state || "").toLowerCase();
  if (!normalized) return false;
  return ![
    "succeeded",
    "failed",
    "canceled",
    "cluster_backup_state_succeeded",
    "cluster_backup_state_failed",
    "cluster_backup_state_canceled",
  ].includes(normalized);
}

function shortChecksum(value: string): string {
  if (!value) return "—";
  if (value.length <= 16) return value;
  return `${value.slice(0, 12)}…${value.slice(-4)}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
