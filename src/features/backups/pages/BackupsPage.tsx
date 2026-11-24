import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Alert,
  Button,
  FieldHint,
  formatEnumLabel,
  Input,
  TableHead,
  Tabs,
  Text,
  themeClasses,
} from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import {
  applyRepositoryRetention as defaultApplyRepositoryRetention,
  cancelBackupOperation as defaultCancelBackupOperation,
  createBackupRepository as defaultCreateBackupRepository,
  deleteBackupRepository as defaultDeleteBackupRepository,
  deleteBackupSet as defaultDeleteBackupSet,
  getBackupObservability as defaultGetBackupObservability,
  getBackupOperation as defaultGetBackupOperation,
  getBackupPolicy as defaultGetBackupPolicy,
  listBackupOperations as defaultListBackupOperations,
  listBackupRepositories as defaultListBackupRepositories,
  listBackupSets as defaultListBackupSets,
  planRepositoryRetention as defaultPlanRepositoryRetention,
  planRestore as defaultPlanRestore,
  startBackup as defaultStartBackup,
  updateBackupPolicy as defaultUpdateBackupPolicy,
  updateBackupRepository as defaultUpdateBackupRepository,
  validateBackupRepository as defaultValidateBackupRepository,
  validateBackupSet as defaultValidateBackupSet,
} from "../../../services/adminService";
import type {
  ApplyRepositoryRetentionInput,
  BackupArchiveFormat,
  BackupCaptureProvider,
  BackupNodeArtifactInfo,
  BackupObservabilitySnapshotInfo,
  BackupOperationInfo,
  BackupPolicyInfo,
  BackupQuiesceReadProfile,
  BackupRepositoryInfo,
  BackupRepositoryInput,
  BackupRepositoryValidationSummaryInfo,
  BackupSetSummaryInfo,
  CancelBackupOperationInput,
  CancelBackupOperationResponse,
  DeleteBackupRepositoryResponse,
  DeleteBackupSetInput,
  DeleteBackupSetResponse,
  GetBackupObservabilityInput,
  GetBackupObservabilityResponse,
  GetBackupOperationInput,
  GetBackupOperationResponse,
  ListBackupOperationsInput,
  ListBackupOperationsResponse,
  ListBackupRepositoriesInput,
  ListBackupRepositoriesResponse,
  ListBackupSetsInput,
  ListBackupSetsResponse,
  PlanRepositoryRetentionInput,
  PlanRestoreInput,
  PlanRestoreResponse,
  RepositoryRetentionPlanInfo,
  RepositoryRetentionResponse,
  RestorePlanSummaryInfo,
  StartBackupInput,
  StartBackupResponse,
  ValidateBackupRepositoryInput,
  ValidateBackupRepositoryResponse,
  ValidateBackupSetInput,
  ValidateBackupSetResponse,
  ValidationOptionsInfo,
  ValidationSummaryInfo,
} from "../../../types/backups";

type RestoreConfirmationKey =
  | "offline"
  | "stopped"
  | "emptyTargets"
  | "ordinalMapping"
  | "secretsReady";

type RestoreConfirmations = Record<RestoreConfirmationKey, boolean>;

const RESTORE_CONFIRMATION_ITEMS: Array<{
  key: RestoreConfirmationKey;
  label: string;
  hint: string;
}> = [
  {
    key: "offline",
    label: "Restore is offline",
    hint: "Do not run restore against a live Mycel deployment; stop daemons before restoring data directories or PVCs.",
  },
  {
    key: "stopped",
    label: "Target deployment is stopped",
    hint: "Scale the StatefulSet to zero or otherwise ensure no myceld process is writing to target volumes.",
  },
  {
    key: "emptyTargets",
    label: "Target data dirs/PVCs are fresh and empty",
    hint: "Do not overwrite divergent target volumes. Destructive restore execution is intentionally outside Console.",
  },
  {
    key: "ordinalMapping",
    label: "Ordinal mapping has been reviewed",
    hint: "Restore each artifact only to the matching StatefulSet ordinal/PVC shown in the plan.",
  },
  {
    key: "secretsReady",
    label: "Required secrets and external storage are available",
    hint: "Recreate backend auth, TLS/mTLS, encryption material, and external object-store access outside Console. Do not paste secret values here.",
  },
];

function initialRestoreConfirmations(): RestoreConfirmations {
  return RESTORE_CONFIRMATION_ITEMS.reduce(
    (acc, item) => ({ ...acc, [item.key]: false }),
    {} as RestoreConfirmations,
  );
}

function restoreConfirmationsComplete(confirmations: RestoreConfirmations): boolean {
  return RESTORE_CONFIRMATION_ITEMS.every((item) => confirmations[item.key]);
}

const DEFAULT_VALIDATION_OPTIONS: ValidationOptionsInfo = {
  includeArtifactChecks: true,
  includeExternalDependencyChecks: true,
  includeCapacityEstimates: true,
  requireCompleteMarker: true,
};

export type BackupsPageProps = {
  getBackupPolicyService?: () => Promise<BackupPolicyInfo>;
  updateBackupPolicyService?: (
    input: BackupPolicyInfo,
  ) => Promise<BackupPolicyInfo>;
  listBackupRepositoriesService?: (
    input?: ListBackupRepositoriesInput,
  ) => Promise<ListBackupRepositoriesResponse>;
  createBackupRepositoryService?: (
    input: BackupRepositoryInput,
  ) => Promise<BackupRepositoryInfo>;
  updateBackupRepositoryService?: (
    input: BackupRepositoryInput,
  ) => Promise<BackupRepositoryInfo>;
  validateBackupRepositoryService?: (
    input: ValidateBackupRepositoryInput,
  ) => Promise<ValidateBackupRepositoryResponse>;
  deleteBackupRepositoryService?: (
    input: ValidateBackupRepositoryInput,
  ) => Promise<DeleteBackupRepositoryResponse>;
  planRepositoryRetentionService?: (
    input: PlanRepositoryRetentionInput,
  ) => Promise<RepositoryRetentionResponse>;
  applyRepositoryRetentionService?: (
    input: ApplyRepositoryRetentionInput,
  ) => Promise<RepositoryRetentionResponse>;
  getBackupObservabilityService?: (
    input?: GetBackupObservabilityInput,
  ) => Promise<GetBackupObservabilityResponse>;
  planRestoreService?: (input: PlanRestoreInput) => Promise<PlanRestoreResponse>;
  startBackupService?: (input: StartBackupInput) => Promise<StartBackupResponse>;
  getBackupOperationService?: (
    input?: GetBackupOperationInput,
  ) => Promise<GetBackupOperationResponse>;
  cancelBackupOperationService?: (
    input: CancelBackupOperationInput,
  ) => Promise<CancelBackupOperationResponse>;
  listBackupOperationsService?: (
    input?: ListBackupOperationsInput,
  ) => Promise<ListBackupOperationsResponse>;
  listBackupSetsService?: (
    input: ListBackupSetsInput,
  ) => Promise<ListBackupSetsResponse>;
  validateBackupSetService?: (
    input: ValidateBackupSetInput,
  ) => Promise<ValidateBackupSetResponse>;
  deleteBackupSetService?: (
    input: DeleteBackupSetInput,
  ) => Promise<DeleteBackupSetResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function BackupsPage({
  getBackupPolicyService = defaultGetBackupPolicy,
  updateBackupPolicyService = defaultUpdateBackupPolicy,
  listBackupRepositoriesService = defaultListBackupRepositories,
  createBackupRepositoryService = defaultCreateBackupRepository,
  updateBackupRepositoryService = defaultUpdateBackupRepository,
  validateBackupRepositoryService = defaultValidateBackupRepository,
  deleteBackupRepositoryService = defaultDeleteBackupRepository,
  planRepositoryRetentionService = defaultPlanRepositoryRetention,
  applyRepositoryRetentionService = defaultApplyRepositoryRetention,
  getBackupObservabilityService = defaultGetBackupObservability,
  planRestoreService = defaultPlanRestore,
  startBackupService = defaultStartBackup,
  getBackupOperationService = defaultGetBackupOperation,
  cancelBackupOperationService = defaultCancelBackupOperation,
  listBackupOperationsService = defaultListBackupOperations,
  listBackupSetsService = defaultListBackupSets,
  validateBackupSetService = defaultValidateBackupSet,
  deleteBackupSetService = defaultDeleteBackupSet,
  principalContext,
}: BackupsPageProps) {
  const [policy, setPolicy] = useState<BackupPolicyInfo | null>(null);
  const [operations, setOperations] = useState<BackupOperationInfo[]>([]);
  const [activeOperation, setActiveOperation] =
    useState<BackupOperationInfo | null>(null);
  const [repositories, setRepositories] = useState<BackupRepositoryInfo[]>([]);
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [repositoryBackupSets, setRepositoryBackupSets] = useState<
    BackupSetSummaryInfo[]
  >([]);
  const [retentionPlan, setRetentionPlan] =
    useState<RepositoryRetentionPlanInfo | null>(null);
  const [observability, setObservability] =
    useState<BackupObservabilitySnapshotInfo | null>(null);
  const [restorePlan, setRestorePlan] = useState<RestorePlanSummaryInfo | null>(
    null,
  );
  const [validatedRepositorySource, setValidatedRepositorySource] = useState<{
    repositoryId: string;
    backupSetId: string;
  } | null>(null);
  const [validateResult, setValidateResult] =
    useState<ValidateBackupSetResponse | null>(null);
  const [restoreConfirmations, setRestoreConfirmations] =
    useState<RestoreConfirmations>(() => initialRestoreConfirmations());
  const [nextOperationPageToken, setNextOperationPageToken] = useState("");
  const [nextRepositoryBackupSetPageToken, setNextRepositoryBackupSetPageToken] =
    useState("");
  const [backupReason, setBackupReason] = useState("Triggered from Mycel Console");
  const [archiveFormat, setArchiveFormat] =
    useState<BackupArchiveFormat>("BACKUP_ARCHIVE_FORMAT_TAR_ZST");
  const [captureProvider, setCaptureProvider] =
    useState<BackupCaptureProvider>("BACKUP_CAPTURE_PROVIDER_AUTO");
  const [quiesceReadProfile, setQuiesceReadProfile] =
    useState<BackupQuiesceReadProfile>("BACKUP_QUIESCE_READ_PROFILE_CONTROL_ONLY");
  const [convergenceTimeoutSeconds, setConvergenceTimeoutSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingOperationMore, setLoadingOperationMore] = useState(false);
  const [loadingRepositoryBackupSets, setLoadingRepositoryBackupSets] = useState(false);
  const [savingRepository, setSavingRepository] = useState(false);
  const [deletingRepositoryId, setDeletingRepositoryId] = useState("");
  const [validatingRepositoryId, setValidatingRepositoryId] = useState("");
  const [validatingBackupSetId, setValidatingBackupSetId] = useState("");
  const [deletingBackupSetId, setDeletingBackupSetId] = useState("");
  const [planningRetention, setPlanningRetention] = useState(false);
  const [applyingRetention, setApplyingRetention] = useState(false);
  const [loadingObservability, setLoadingObservability] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [startingBackup, setStartingBackup] = useState(false);
  const [cancelingBackup, setCancelingBackup] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "repositories" | "policy"
  >("overview");

  const load = useCallback(
    async ({ append = false, pageToken = "" } = {}) => {
      setError("");
      setNotice("");
      if (append) setLoadingOperationMore(true);
      else setLoading(true);

      try {
        const [policyResponse, operationsResponse, repositoriesResponse] =
          await Promise.all([
            getBackupPolicyService(),
            listBackupOperationsService({ pageSize: 50, pageToken }),
            listBackupRepositoriesService({ pageSize: 50, pageToken: "" }),
          ]);
        setPolicy(policyResponse);
        setRepositories(repositoriesResponse.repositories);
        setSelectedRepositoryId((current) =>
          current ||
          policyResponse.defaultRepositoryId ||
          repositoriesResponse.repositories[0]?.repositoryId ||
          "",
        );
        setOperations((current) =>
          append
            ? [...current, ...operationsResponse.operations]
            : operationsResponse.operations,
        );
        setNextOperationPageToken(operationsResponse.nextPageToken);
        const active = operationsResponse.operations.find(isActiveBackupOperation);
        if (active) {
          try {
            const activeResponse = await getBackupOperationService({
              backupSetId: active.backupSetId,
              backupOperationId: active.backupOperationId,
            });
            setActiveOperation(activeResponse.operation || active);
          } catch {
            setActiveOperation(active);
          }
        } else {
          setActiveOperation(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backups");
      } finally {
        if (append) setLoadingOperationMore(false);
        else setLoading(false);
      }
    },
    [
      getBackupOperationService,
      getBackupPolicyService,
      listBackupOperationsService,
      listBackupRepositoriesService,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refreshRepositoryBackupSets();
    void refreshObservability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRepositoryId]);

  useEffect(() => {
    if (!isActiveBackupOperation(activeOperation)) return;
    const backupSetId = activeOperation.backupSetId;
    const backupOperationId = activeOperation.backupOperationId;
    const timer = window.setInterval(() => {
      void getBackupOperationService({ backupSetId, backupOperationId })
        .then((response) => {
          if (response.operation) setActiveOperation(response.operation);
          if (response.operation && !isActiveBackupOperation(response.operation)) {
            void refreshBackupOperations();
            void refreshRepositoryBackupSets();
          }
        })
        .catch(() => undefined);
    }, Math.max(3000, activeOperation.retryAfterSeconds * 1000 || 5000));
    return () => window.clearInterval(timer);
  }, [activeOperation, getBackupOperationService]);

  async function refreshBackupOperations({ append = false } = {}) {
    if (append) setLoadingOperationMore(true);
    try {
      const response = await listBackupOperationsService({
        pageSize: 50,
        pageToken: append ? nextOperationPageToken : "",
      });
      setOperations((current) =>
        append ? [...current, ...response.operations] : response.operations,
      );
      setNextOperationPageToken(response.nextPageToken);
      setActiveOperation((current) =>
        response.operations.find(isActiveBackupOperation) || current,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load backup operations",
      );
    } finally {
      if (append) setLoadingOperationMore(false);
    }
  }

  async function refreshRepositoryBackupSets({ append = false } = {}) {
    if (!selectedRepositoryId) {
      setRepositoryBackupSets([]);
      setNextRepositoryBackupSetPageToken("");
      return;
    }
    if (append) setLoadingRepositoryBackupSets(true);
    try {
      const response = await listBackupSetsService({
        repositoryId: selectedRepositoryId,
        pageSize: 50,
        pageToken: append ? nextRepositoryBackupSetPageToken : "",
      });
      setRepositoryBackupSets((current) =>
        append ? [...current, ...response.backupSets] : response.backupSets,
      );
      setNextRepositoryBackupSetPageToken(response.nextPageToken);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load repository backup sets",
      );
    } finally {
      if (append) setLoadingRepositoryBackupSets(false);
    }
  }

  async function refreshObservability() {
    setLoadingObservability(true);
    try {
      const response = await getBackupObservabilityService({
        repositoryId: selectedRepositoryId,
        includeRetentionProbe: Boolean(selectedRepositoryId),
      });
      setObservability(response.snapshot || null);
    } catch {
      setObservability(null);
    } finally {
      setLoadingObservability(false);
    }
  }

  async function handleSavePolicy() {
    if (!policy) return;
    setError("");
    setNotice("");
    setSavingPolicy(true);
    try {
      const updated = await updateBackupPolicyService(policy);
      setPolicy(updated);
      setSelectedRepositoryId((current) => current || updated.defaultRepositoryId);
      setNotice("Backup policy saved.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save backup policy",
      );
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleValidateRepository(repositoryId: string) {
    setError("");
    setNotice("");
    setValidatingRepositoryId(repositoryId);
    try {
      const response = await validateBackupRepositoryService({ repositoryId });
      if (response.repository) {
        setRepositories((current) =>
          current.map((repository) =>
            repository.repositoryId === repositoryId
              ? response.repository || repository
              : repository,
          ),
        );
      }
      setNotice(`Repository validation complete: ${repositoryId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to validate backup repository",
      );
    } finally {
      setValidatingRepositoryId("");
    }
  }

  async function handleSaveRepository(input: BackupRepositoryInput) {
    setError("");
    setNotice("");
    setSavingRepository(true);
    try {
      const service = repositories.some(
        (repository) => repository.repositoryId === input.repositoryId,
      )
        ? updateBackupRepositoryService
        : createBackupRepositoryService;
      const saved = await service(input);
      setRepositories((current) => {
        const exists = current.some(
          (repository) => repository.repositoryId === saved.repositoryId,
        );
        return exists
          ? current.map((repository) =>
              repository.repositoryId === saved.repositoryId ? saved : repository,
            )
          : [...current, saved];
      });
      setSelectedRepositoryId(saved.repositoryId);
      setNotice(`Backup repository saved: ${saved.repositoryId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save backup repository",
      );
    } finally {
      setSavingRepository(false);
    }
  }

  async function handleDeleteRepository(repositoryId: string) {
    if (
      !window.confirm(
        `Delete backup repository ${repositoryId}? This removes the daemon catalog entry but does not delete external object-store contents.`,
      )
    ) {
      return;
    }
    setError("");
    setNotice("");
    setDeletingRepositoryId(repositoryId);
    try {
      await deleteBackupRepositoryService({ repositoryId });
      setRepositories((current) =>
        current.filter((repository) => repository.repositoryId !== repositoryId),
      );
      setSelectedRepositoryId((current) => (current === repositoryId ? "" : current));
      setRepositoryBackupSets([]);
      setRetentionPlan(null);
      setObservability(null);
      setNotice(`Backup repository delete requested: ${repositoryId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete backup repository",
      );
    } finally {
      setDeletingRepositoryId("");
    }
  }

  async function handlePlanRetention() {
    if (!selectedRepositoryId) return;
    setError("");
    setNotice("");
    setPlanningRetention(true);
    try {
      const response = await planRepositoryRetentionService({
        repositoryId: selectedRepositoryId,
      });
      setRetentionPlan(response.plan || null);
      setNotice(`Retention preview complete: ${selectedRepositoryId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to preview repository retention",
      );
    } finally {
      setPlanningRetention(false);
    }
  }

  async function handleApplyRetention() {
    if (!selectedRepositoryId) return;
    if (!window.confirm(`Apply retention pruning for repository ${selectedRepositoryId}?`)) return;
    setError("");
    setNotice("");
    setApplyingRetention(true);
    try {
      const response = await applyRepositoryRetentionService({
        repositoryId: selectedRepositoryId,
        reason: "Applied from Mycel Console",
      });
      setRetentionPlan(response.plan || null);
      setNotice(`Retention apply complete: ${selectedRepositoryId}`);
      await refreshRepositoryBackupSets();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply repository retention",
      );
    } finally {
      setApplyingRetention(false);
    }
  }

  async function handleValidateBackupSet(backupSetId: string) {
    if (!selectedRepositoryId) return;
    setError("");
    setNotice("");
    setValidateResult(null);
    setRestorePlan(null);
    setValidatedRepositorySource(null);
    setRestoreConfirmations(initialRestoreConfirmations());
    setValidatingBackupSetId(backupSetId);
    try {
      const response = await validateBackupSetService({
        repositoryId: selectedRepositoryId,
        backupSetId,
        validationOptions: DEFAULT_VALIDATION_OPTIONS,
      });
      setValidateResult(response);
      setValidatedRepositorySource({ repositoryId: selectedRepositoryId, backupSetId });
      try {
        const planResponse = await planRestoreService({
          repositoryId: selectedRepositoryId,
          backupSetId,
          validationOptions: DEFAULT_VALIDATION_OPTIONS,
        });
        setRestorePlan(planResponse.plan || null);
      } catch {
        setRestorePlan(null);
      }
      setNotice(
        response.valid
          ? `Repository backup set is valid: ${backupSetId}`
          : `Repository backup set validation failed: ${backupSetId}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to validate repository backup set",
      );
    } finally {
      setValidatingBackupSetId("");
    }
  }

  async function handleDeleteBackupSet(backupSetId: string) {
    if (!selectedRepositoryId) return;
    if (!window.confirm(`Delete backup set ${backupSetId} from repository ${selectedRepositoryId}?`)) return;
    setError("");
    setNotice("");
    setDeletingBackupSetId(backupSetId);
    try {
      const response = await deleteBackupSetService({
        repositoryId: selectedRepositoryId,
        backupSetId,
        reason: "Deleted from Mycel Console",
      });
      setNotice(`Repository backup set delete requested: ${response.backupSetId}`);
      await refreshRepositoryBackupSets();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete repository backup set",
      );
    } finally {
      setDeletingBackupSetId("");
    }
  }

  async function handleStartBackup() {
    if (!selectedRepositoryId) return;
    setError("");
    setNotice("");
    setStartingBackup(true);
    try {
      const response = await startBackupService({
        reason: backupReason,
        repositoryId: selectedRepositoryId,
        archiveFormat,
        captureProvider,
        quiesceReadProfile,
        convergenceTimeoutSeconds,
        validationOptions: DEFAULT_VALIDATION_OPTIONS,
      });
      if (response.operation) setActiveOperation(response.operation);
      setNotice(
        `Backup started${response.operation?.backupSetId ? `: ${response.operation.backupSetId}` : "."}`,
      );
      setActiveTab("overview");
      await refreshBackupOperations();
      await refreshRepositoryBackupSets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start backup");
    } finally {
      setStartingBackup(false);
    }
  }

  async function handleCancelBackup() {
    const backupSetId = activeOperation?.backupSetId || "";
    const backupOperationId = activeOperation?.backupOperationId || "";
    if (!backupSetId && !backupOperationId) return;
    setError("");
    setNotice("");
    setCancelingBackup(true);
    try {
      const response = await cancelBackupOperationService({
        backupSetId,
        backupOperationId,
        reason: "Canceled from Mycel Console",
      });
      if (response.operation) setActiveOperation(response.operation);
      setNotice(`Backup cancel requested: ${backupSetId || backupOperationId}`);
      await refreshBackupOperations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel backup");
    } finally {
      setCancelingBackup(false);
    }
  }

  const canManageBackups = canUseCapability(principalContext, "backup.manage");
  const busy =
    loading ||
    loadingOperationMore ||
    loadingRepositoryBackupSets ||
    savingRepository ||
    Boolean(deletingRepositoryId) ||
    planningRetention ||
    applyingRetention ||
    loadingObservability ||
    savingPolicy ||
    startingBackup ||
    cancelingBackup ||
    Boolean(validatingRepositoryId) ||
    Boolean(validatingBackupSetId) ||
    Boolean(deletingBackupSetId);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Backups"
        description="Manage repository-backed deployment backups, backup-set inventory, retention, observability, and safe restore planning."
        actions={
          <>
            <Button variant="secondary" onClick={() => void load()} disabled={busy}>
              Refresh
            </Button>
            {canManageBackups && (
              <Button
                onClick={() => void handleStartBackup()}
                disabled={busy || !selectedRepositoryId}
              >
                {startingBackup ? "Starting…" : "Start Backup"}
              </Button>
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
              { id: "repositories", label: "Repositories" },
              { id: "policy", label: "Policy" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "overview" && (
            <OverviewPanel
              activeOperation={activeOperation}
              operations={operations}
              repositories={repositories}
              selectedRepositoryId={selectedRepositoryId}
              reason={backupReason}
              archiveFormat={archiveFormat}
              captureProvider={captureProvider}
              quiesceReadProfile={quiesceReadProfile}
              convergenceTimeoutSeconds={convergenceTimeoutSeconds}
              observability={observability}
              loadingObservability={loadingObservability}
              canManage={canManageBackups}
              starting={startingBackup}
              canceling={cancelingBackup}
              loadingMore={loadingOperationMore}
              nextPageToken={nextOperationPageToken}
              onSelectedRepositoryChange={setSelectedRepositoryId}
              onReasonChange={setBackupReason}
              onArchiveFormatChange={setArchiveFormat}
              onCaptureProviderChange={setCaptureProvider}
              onQuiesceReadProfileChange={setQuiesceReadProfile}
              onConvergenceTimeoutChange={setConvergenceTimeoutSeconds}
              onStart={() => void handleStartBackup()}
              onCancel={() => void handleCancelBackup()}
              onRefreshOperations={() => void refreshBackupOperations()}
              onLoadMoreOperations={() => void refreshBackupOperations({ append: true })}
              onRefreshObservability={() => void refreshObservability()}
            />
          )}

          {activeTab === "repositories" && (
            <BackupRepositoryPanel
              repositories={repositories}
              selectedRepositoryId={selectedRepositoryId}
              backupSets={repositoryBackupSets}
              retentionPlan={retentionPlan}
              observability={observability}
              restorePlan={restorePlan}
              validateResult={validateResult}
              validatedRepositorySource={validatedRepositorySource}
              restoreConfirmations={restoreConfirmations}
              loadingBackupSets={loadingRepositoryBackupSets}
              nextBackupSetPageToken={nextRepositoryBackupSetPageToken}
              savingRepository={savingRepository}
              deletingRepositoryId={deletingRepositoryId}
              validatingRepositoryId={validatingRepositoryId}
              validatingBackupSetId={validatingBackupSetId}
              deletingBackupSetId={deletingBackupSetId}
              planningRetention={planningRetention}
              applyingRetention={applyingRetention}
              loadingObservability={loadingObservability}
              canManage={canManageBackups}
              onSelectRepository={setSelectedRepositoryId}
              onSaveRepository={handleSaveRepository}
              onDeleteRepository={handleDeleteRepository}
              onValidateRepository={handleValidateRepository}
              onRefreshBackupSets={() => void refreshRepositoryBackupSets()}
              onLoadMoreBackupSets={() =>
                void refreshRepositoryBackupSets({ append: true })
              }
              onPlanRetention={() => void handlePlanRetention()}
              onApplyRetention={() => void handleApplyRetention()}
              onRefreshObservability={() => void refreshObservability()}
              onValidateBackupSet={handleValidateBackupSet}
              onDeleteBackupSet={handleDeleteBackupSet}
              onRestoreConfirmationChange={(key, checked) =>
                setRestoreConfirmations((current) => ({
                  ...current,
                  [key]: checked,
                }))
              }
            />
          )}

          {activeTab === "policy" && policy && (
            <PolicyPanel
              policy={policy}
              repositories={repositories}
              onChange={setPolicy}
              onSave={() => void handleSavePolicy()}
              saving={savingPolicy}
              readOnly={!canManageBackups}
            />
          )}
        </>
      )}
    </section>
  );
}

function OverviewPanel({
  activeOperation,
  operations,
  repositories,
  selectedRepositoryId,
  reason,
  archiveFormat,
  captureProvider,
  quiesceReadProfile,
  convergenceTimeoutSeconds,
  observability,
  loadingObservability,
  canManage,
  starting,
  canceling,
  loadingMore,
  nextPageToken,
  onSelectedRepositoryChange,
  onReasonChange,
  onArchiveFormatChange,
  onCaptureProviderChange,
  onQuiesceReadProfileChange,
  onConvergenceTimeoutChange,
  onStart,
  onCancel,
  onRefreshOperations,
  onLoadMoreOperations,
  onRefreshObservability,
}: {
  activeOperation: BackupOperationInfo | null;
  operations: BackupOperationInfo[];
  repositories: BackupRepositoryInfo[];
  selectedRepositoryId: string;
  reason: string;
  archiveFormat: BackupArchiveFormat;
  captureProvider: BackupCaptureProvider;
  quiesceReadProfile: BackupQuiesceReadProfile;
  convergenceTimeoutSeconds: number;
  observability: BackupObservabilitySnapshotInfo | null;
  loadingObservability: boolean;
  canManage: boolean;
  starting: boolean;
  canceling: boolean;
  loadingMore: boolean;
  nextPageToken: string;
  onSelectedRepositoryChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onArchiveFormatChange: (value: BackupArchiveFormat) => void;
  onCaptureProviderChange: (value: BackupCaptureProvider) => void;
  onQuiesceReadProfileChange: (value: BackupQuiesceReadProfile) => void;
  onConvergenceTimeoutChange: (value: number) => void;
  onStart: () => void;
  onCancel: () => void;
  onRefreshOperations: () => void;
  onLoadMoreOperations: () => void;
  onRefreshObservability: () => void;
}) {
  const active = isActiveBackupOperation(activeOperation);
  return (
    <div className="space-y-4" role="tabpanel" aria-label="Backup overview">
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
              Repository-backed deployment backup
            </Text>
            <Text intent="muted" className="mt-2">
              Starts a daemon-coordinated backup into the selected repository and
              polls operation state, blockers, validation, and node artifacts.
            </Text>
          </div>
          <Button variant="secondary" onClick={onRefreshOperations} disabled={loadingMore}>
            Refresh operations
          </Button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <RepositoryField
            repositories={repositories}
            value={selectedRepositoryId}
            disabled={!canManage || starting}
            onChange={onSelectedRepositoryChange}
          />
          <Field
            label="Reason"
            value={reason}
            disabled={!canManage || starting}
            onChange={onReasonChange}
            hint="Operator reason recorded with the backup operation."
          />
          <ArchiveFormatField
            value={archiveFormat}
            disabled={!canManage || starting}
            onChange={onArchiveFormatChange}
          />
          <CaptureProviderField
            value={captureProvider}
            disabled={!canManage || starting}
            onChange={onCaptureProviderChange}
          />
          <QuiesceReadProfileField
            value={quiesceReadProfile}
            disabled={!canManage || starting}
            onChange={onQuiesceReadProfileChange}
          />
          <NumberField
            label="Convergence timeout seconds"
            value={convergenceTimeoutSeconds}
            disabled={!canManage || starting}
            onChange={onConvergenceTimeoutChange}
            hint="Optional wait limit for deployment convergence. Zero uses the daemon default."
          />
        </div>
        {canManage ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={onStart} disabled={starting || !selectedRepositoryId}>
              {starting ? "Starting…" : "Start backup"}
            </Button>
            {active && (
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={canceling || activeOperation?.cancelRequested}
              >
                {canceling ? "Canceling…" : "Cancel active backup"}
              </Button>
            )}
          </div>
        ) : (
          <Text intent="muted" className="mt-5">
            Read-only: backup.manage is required to start or cancel backups.
          </Text>
        )}
      </article>

      <BackupOperationStatusPanel current={activeOperation} />
      <BackupOperationHistoryPanel
        operations={operations}
        loadingMore={loadingMore}
        nextPageToken={nextPageToken}
        onLoadMore={onLoadMoreOperations}
      />
      <BackupObservabilityPanel
        snapshot={observability}
        loading={loadingObservability}
        onRefresh={onRefreshObservability}
      />
    </div>
  );
}

function BackupOperationStatusPanel({
  current,
}: {
  current: BackupOperationInfo | null;
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
        Current backup operation
      </Text>
      {!current ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No active backup operation.</Text>
        </div>
      ) : (
        <>
          <dl className="mt-5 grid gap-4 md:grid-cols-4">
            <Metric label="Backup set" value={current.backupSetId || "None"} />
            <Metric label="State" value={formatBackupOperationState(current.state)} />
            <Metric label="Phase" value={formatEnumLabel(current.phase, "Not available")} />
            <Metric label="Nodes" value={`${current.nodes.length}/${current.expectedNodeCount || 0}`} />
            <Metric label="Repository" value={current.repositoryId || "Unknown"} />
            <Metric label="Deployment" value={current.deploymentName || current.deploymentId || "Unknown"} />
            <Metric label="Mode" value={formatEnumLabel(current.deploymentMode, "Unknown")} />
            <Metric label="Updated" value={formatTimestamp(current.updatedAt)} />
          </dl>
          {current.error && <Alert className="mt-4">{current.error}</Alert>}
          {current.cancelRequested && (
            <Alert variant="success" className="mt-4">
              Cancellation has been requested for this backup.
            </Alert>
          )}
          <BackupValidationSummaryPanel summary={current.validation} />
          {current.blockers.length > 0 && (
            <BackupOperationBlockers blockers={current.blockers} />
          )}
          {current.nodes.length > 0 && <BackupNodes nodes={current.nodes} />}
        </>
      )}
    </article>
  );
}

function BackupOperationBlockers({
  blockers,
}: {
  blockers: BackupOperationInfo["blockers"];
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
                <td className="px-4 py-3">{blocker.reason || blocker.detail || "Blocked"}</td>
                <td className="px-4 py-3">{blocker.appliedIndex}/{blocker.commitIndex}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupNodes({ nodes }: { nodes: BackupNodeArtifactInfo[] }) {
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
              <TableHead className="px-4 py-3">Raft evidence</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            {nodes.map((node) => (
              <tr key={`${node.podName}-${node.archiveName}-${node.ordinal}`}>
                <td className="px-4 py-3">{node.podName || node.nodeId}</td>
                <td className="px-4 py-3">{node.archiveName || "Pending"}</td>
                <td className="px-4 py-3">{formatBytes(node.sizeBytes)}</td>
                <td className="px-4 py-3 font-mono text-xs">{shortChecksum(node.checksumSha256)}</td>
                <td className="px-4 py-3 font-mono text-xs">{formatAppliedIndexes(node.appliedIndexes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupOperationHistoryPanel({
  operations,
  loadingMore,
  nextPageToken,
  onLoadMore,
}: {
  operations: BackupOperationInfo[];
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
        Backup operations
      </Text>
      {operations.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No backup operations found.</Text>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              <tr>
                <TableHead className="px-4 py-3">Backup set</TableHead>
                <TableHead className="px-4 py-3">State</TableHead>
                <TableHead className="px-4 py-3">Repository</TableHead>
                <TableHead className="px-4 py-3">Deployment</TableHead>
                <TableHead className="px-4 py-3">Created</TableHead>
                <TableHead className="px-4 py-3">Nodes</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {operations.map((operation) => (
                <tr key={operation.backupOperationId || operation.backupSetId}>
                  <td className="px-4 py-3 font-medium">{operation.backupSetId || operation.backupOperationId}</td>
                  <td className="px-4 py-3">{formatBackupOperationState(operation.state)}</td>
                  <td className="px-4 py-3">{operation.repositoryId || "—"}</td>
                  <td className="px-4 py-3">{operation.deploymentName || operation.deploymentId || "—"}</td>
                  <td className="px-4 py-3">{formatTimestamp(operation.createdAt)}</td>
                  <td className="px-4 py-3">{operation.nodes.length}/{operation.expectedNodeCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nextPageToken && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Loading more…" : "Load more operations"}
          </Button>
        </div>
      )}
    </article>
  );
}

function BackupRepositoryPanel({
  repositories,
  selectedRepositoryId,
  backupSets,
  retentionPlan,
  observability,
  restorePlan,
  validateResult,
  validatedRepositorySource,
  restoreConfirmations,
  loadingBackupSets,
  nextBackupSetPageToken,
  savingRepository,
  deletingRepositoryId,
  validatingRepositoryId,
  validatingBackupSetId,
  deletingBackupSetId,
  planningRetention,
  applyingRetention,
  loadingObservability,
  canManage,
  onSelectRepository,
  onSaveRepository,
  onDeleteRepository,
  onValidateRepository,
  onRefreshBackupSets,
  onLoadMoreBackupSets,
  onPlanRetention,
  onApplyRetention,
  onRefreshObservability,
  onValidateBackupSet,
  onDeleteBackupSet,
  onRestoreConfirmationChange,
}: {
  repositories: BackupRepositoryInfo[];
  selectedRepositoryId: string;
  backupSets: BackupSetSummaryInfo[];
  retentionPlan: RepositoryRetentionPlanInfo | null;
  observability: BackupObservabilitySnapshotInfo | null;
  restorePlan: RestorePlanSummaryInfo | null;
  validateResult: ValidateBackupSetResponse | null;
  validatedRepositorySource: { repositoryId: string; backupSetId: string } | null;
  restoreConfirmations: RestoreConfirmations;
  loadingBackupSets: boolean;
  nextBackupSetPageToken: string;
  savingRepository: boolean;
  deletingRepositoryId: string;
  validatingRepositoryId: string;
  validatingBackupSetId: string;
  deletingBackupSetId: string;
  planningRetention: boolean;
  applyingRetention: boolean;
  loadingObservability: boolean;
  canManage: boolean;
  onSelectRepository: (repositoryId: string) => void;
  onSaveRepository: (input: BackupRepositoryInput) => void;
  onDeleteRepository: (repositoryId: string) => void;
  onValidateRepository: (repositoryId: string) => void;
  onRefreshBackupSets: () => void;
  onLoadMoreBackupSets: () => void;
  onPlanRetention: () => void;
  onApplyRetention: () => void;
  onRefreshObservability: () => void;
  onValidateBackupSet: (backupSetId: string) => void;
  onDeleteBackupSet: (backupSetId: string) => void;
  onRestoreConfirmationChange: (key: RestoreConfirmationKey, checked: boolean) => void;
}) {
  const selected = repositories.find(
    (repository) => repository.repositoryId === selectedRepositoryId,
  );
  return (
    <div className="space-y-4" role="tabpanel" aria-label="Backup repositories">
      <article className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text as="p" size="sm" className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
              Backup repositories
            </Text>
            <Text intent="muted" className="mt-2">
              Repository-backed backups are the only Console backup flow. Console displays credential references only; raw S3 or MinIO keys are never collected or rendered.
            </Text>
          </div>
          <Button variant="secondary" onClick={onRefreshBackupSets} disabled={!selectedRepositoryId || loadingBackupSets}>
            Refresh backup sets
          </Button>
        </div>
        {canManage && (
          <BackupRepositoryEditor selected={selected || null} saving={savingRepository} onSave={onSaveRepository} />
        )}
        {repositories.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
            <Text intent="muted">
              No backup repositories are configured. Create a repository here or through the daemon/API/CLI, then validate and use it for backups.
            </Text>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <RepositoryField repositories={repositories} value={selectedRepositoryId} disabled={loadingBackupSets} onChange={onSelectRepository} />
              {selected && (
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/30">
                  <Text as="p" className="font-medium">{selected.displayName || selected.repositoryId}</Text>
                  <Text intent="muted" size="sm" className="mt-1">{repositoryLocation(selected)}</Text>
                  <dl className="mt-3 grid gap-3 md:grid-cols-2">
                    <Metric label="Validation" value={formatRepositoryValidation(selected.validation)} />
                    <Metric label="Credential reference" value={formatSecretReference(selected.credentialRef)} />
                    <Metric label="Provider" value={formatEnumLabel(selected.provider, "Unknown")} />
                    <Metric label="Updated" value={formatTimestamp(selected.updateTime)} />
                    <Metric label="Path style" value={selected.s3?.forcePathStyle ? "Enabled" : "Disabled"} />
                    <Metric label="TLS" value={selected.s3?.disableTls ? "Disabled" : "Enabled"} />
                    <Metric label="Encryption" value={formatEncryptionPolicy(selected.encryption)} />
                    <Metric label="TLS CA reference" value={formatSecretReference(selected.tlsCaRef)} />
                  </dl>
                  {selected.validation?.sanitizedError && <Alert className="mt-3">{selected.validation.sanitizedError}</Alert>}
                  {selected.validation?.blockers?.length ? (
                    <Text intent="muted" size="sm" className="mt-3">
                      Blockers: {selected.validation.blockers.map((blocker) => blocker.detail || blocker.reason).join("; ")}
                    </Text>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => onValidateRepository(selected.repositoryId)} disabled={validatingRepositoryId === selected.repositoryId}>
                      {validatingRepositoryId === selected.repositoryId ? "Validating…" : "Validate repository"}
                    </Button>
                    {canManage && (
                      <Button variant="secondary" onClick={() => onDeleteRepository(selected.repositoryId)} disabled={deletingRepositoryId === selected.repositoryId}>
                        {deletingRepositoryId === selected.repositoryId ? "Deleting…" : "Delete repository"}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <RepositoryBackupSetsTable
              backupSets={backupSets}
              canManage={canManage}
              loading={loadingBackupSets}
              nextPageToken={nextBackupSetPageToken}
              validatingBackupSetId={validatingBackupSetId}
              deletingBackupSetId={deletingBackupSetId}
              onLoadMore={onLoadMoreBackupSets}
              onValidate={onValidateBackupSet}
              onDelete={onDeleteBackupSet}
            />
            <RepositoryRestorePlanPanel
              result={validateResult}
              restorePlan={restorePlan}
              repositorySource={validatedRepositorySource}
              confirmations={restoreConfirmations}
              onConfirmationChange={onRestoreConfirmationChange}
            />
            <RepositoryRetentionPanel plan={retentionPlan} canManage={canManage} planning={planningRetention} applying={applyingRetention} onPlan={onPlanRetention} onApply={onApplyRetention} />
            <BackupObservabilityPanel snapshot={observability} loading={loadingObservability} onRefresh={onRefreshObservability} />
          </>
        )}
      </article>
    </div>
  );
}

function BackupRepositoryEditor({
  selected,
  saving,
  onSave,
}: {
  selected: BackupRepositoryInfo | null;
  saving: boolean;
  onSave: (input: BackupRepositoryInput) => void;
}) {
  const [repositoryId, setRepositoryId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bucket, setBucket] = useState("");
  const [prefix, setPrefix] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [endpointUri, setEndpointUri] = useState("");
  const [credentialScheme, setCredentialScheme] = useState("SECRET_REFERENCE_SCHEME_ENV");
  const [credentialName, setCredentialName] = useState("");
  const [credentialNamespace, setCredentialNamespace] = useState("");
  const [accessKeyEnv, setAccessKeyEnv] = useState("AWS_ACCESS_KEY_ID");
  const [secretKeyEnv, setSecretKeyEnv] = useState("AWS_SECRET_ACCESS_KEY");
  const [forcePathStyle, setForcePathStyle] = useState(false);
  const [disableTls, setDisableTls] = useState(false);

  useEffect(() => {
    if (!selected) return;
    setRepositoryId(selected.repositoryId);
    setDisplayName(selected.displayName || "");
    setBucket(selected.s3?.bucket || "");
    setPrefix(selected.s3?.prefix || "");
    setRegion(selected.s3?.region || "us-east-1");
    setEndpointUri(selected.s3?.endpointUri || "");
    setCredentialScheme(selected.credentialRef?.scheme || "SECRET_REFERENCE_SCHEME_ENV");
    setCredentialName(selected.credentialRef?.name || "");
    setCredentialNamespace(selected.credentialRef?.namespace || "");
    setAccessKeyEnv(selected.credentialRef?.keys?.access_key_id || "AWS_ACCESS_KEY_ID");
    setSecretKeyEnv(selected.credentialRef?.keys?.secret_access_key || "AWS_SECRET_ACCESS_KEY");
    setForcePathStyle(Boolean(selected.s3?.forcePathStyle));
    setDisableTls(Boolean(selected.s3?.disableTls));
  }, [selected]);

  function buildInput(): BackupRepositoryInput {
    return {
      repositoryId,
      displayName,
      provider: "BACKUP_REPOSITORY_PROVIDER_S3_COMPATIBLE",
      s3: { bucket, prefix, region, endpointUri, forcePathStyle, disableTls },
      credentialRef:
        credentialScheme === "SECRET_REFERENCE_SCHEME_ENV"
          ? {
              scheme: credentialScheme,
              name: "",
              namespace: "",
              path: "",
              keys: {
                access_key_id: accessKeyEnv,
                secret_access_key: secretKeyEnv,
              },
              description: "Console repository credential environment references",
            }
          : credentialName
            ? {
                scheme: credentialScheme,
                name: credentialName,
                namespace: credentialNamespace,
                path: "",
                keys: {},
                description: "Console repository credential reference",
              }
            : null,
      encryption: null,
      tlsCaRef: null,
      devOnly: false,
    };
  }

  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <Text as="p" className="font-medium">
        {selected ? "Edit S3-compatible repository" : "Create S3-compatible repository"}
      </Text>
      <Text intent="muted" size="sm" className="mt-1">
        Enter bucket metadata and credential references only. Do not paste raw S3/MinIO access keys into Console.
      </Text>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Field label="Repository ID" value={repositoryId} disabled={saving} onChange={setRepositoryId} hint="Stable repository identifier used by backup and restore APIs." />
        <Field label="Display name" value={displayName} disabled={saving} onChange={setDisplayName} hint="Human-friendly name for operators." />
        <Field label="Bucket" value={bucket} disabled={saving} onChange={setBucket} hint="S3-compatible bucket name." />
        <Field label="Prefix" value={prefix} disabled={saving} onChange={setPrefix} hint="Optional repository root prefix inside the bucket." />
        <Field label="Region" value={region} disabled={saving} onChange={setRegion} hint="S3 region, or provider-compatible region string." />
        <Field label="Endpoint URI" value={endpointUri} disabled={saving} onChange={setEndpointUri} hint="Optional S3-compatible endpoint URI for MinIO or non-AWS providers." />
        <CredentialSchemeField value={credentialScheme} disabled={saving} onChange={setCredentialScheme} />
        {credentialScheme === "SECRET_REFERENCE_SCHEME_ENV" ? (
          <>
            <Field label="Access key env var" value={accessKeyEnv} disabled={saving} onChange={setAccessKeyEnv} hint="Environment variable name available to myceld; never enter the secret value." />
            <Field label="Secret key env var" value={secretKeyEnv} disabled={saving} onChange={setSecretKeyEnv} hint="Environment variable name available to myceld; never enter the secret value." />
          </>
        ) : (
          <>
            <Field label="Credential secret name" value={credentialName} disabled={saving} onChange={setCredentialName} hint="Kubernetes Secret or external secret reference name; raw keys are never accepted." />
            <Field label="Credential namespace" value={credentialNamespace} disabled={saving} onChange={setCredentialNamespace} hint="Namespace for the credential reference, if applicable." />
          </>
        )}
        <CheckboxField label="Force path-style S3" checked={forcePathStyle} disabled={saving} onChange={setForcePathStyle} hint="Use path-style addressing for S3-compatible providers that require it." />
        <CheckboxField label="Disable TLS" checked={disableTls} disabled={saving} onChange={setDisableTls} hint="Development-only option. Keep TLS enabled for production repositories." />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => onSave(buildInput())} disabled={saving || !repositoryId.trim() || !bucket.trim()}>
          {saving ? "Saving…" : selected ? "Update repository" : "Create repository"}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            setRepositoryId("");
            setDisplayName("");
            setBucket("");
            setPrefix("");
            setRegion("us-east-1");
            setEndpointUri("");
            setCredentialScheme("SECRET_REFERENCE_SCHEME_ENV");
            setCredentialName("");
            setCredentialNamespace("");
            setAccessKeyEnv("AWS_ACCESS_KEY_ID");
            setSecretKeyEnv("AWS_SECRET_ACCESS_KEY");
            setForcePathStyle(false);
            setDisableTls(false);
          }}
          disabled={saving}
        >
          Clear form
        </Button>
      </div>
    </div>
  );
}

function RepositoryBackupSetsTable({
  backupSets,
  canManage,
  loading,
  nextPageToken,
  validatingBackupSetId,
  deletingBackupSetId,
  onLoadMore,
  onValidate,
  onDelete,
}: {
  backupSets: BackupSetSummaryInfo[];
  canManage: boolean;
  loading: boolean;
  nextPageToken: string;
  validatingBackupSetId: string;
  deletingBackupSetId: string;
  onLoadMore: () => void;
  onValidate: (backupSetId: string) => void;
  onDelete: (backupSetId: string) => void;
}) {
  return (
    <div className="mt-5">
      <Text as="p" className="font-medium">Repository backup sets</Text>
      {backupSets.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted">No backup sets found in this repository.</Text>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              <tr>
                <TableHead className="px-4 py-3">Backup set</TableHead>
                <TableHead className="px-4 py-3">State</TableHead>
                <TableHead className="px-4 py-3">Deployment</TableHead>
                <TableHead className="px-4 py-3">Completed</TableHead>
                <TableHead className="px-4 py-3">Validation</TableHead>
                <TableHead className="px-4 py-3">Actions</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {backupSets.map((backup) => (
                <tr key={backup.backupSetId}>
                  <td className="px-4 py-3 font-medium">{backup.backupSetId}</td>
                  <td className="px-4 py-3">{formatBackupOperationState(backup.state)}</td>
                  <td className="px-4 py-3">{backup.deploymentName || backup.deploymentId || formatEnumLabel(backup.deploymentMode)}</td>
                  <td className="px-4 py-3">{formatTimestamp(backup.completedAt || backup.createdAt)}</td>
                  <td className="px-4 py-3">
                    {backup.validation?.state
                      ? `${formatEnumLabel(backup.validation.state)} (${backup.validation.validatedArtifactCount || 0}/${backup.validation.requiredArtifactCount || 0})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => onValidate(backup.backupSetId)} disabled={validatingBackupSetId === backup.backupSetId}>
                        {validatingBackupSetId === backup.backupSetId ? "Planning…" : "Plan restore"}
                      </Button>
                      {canManage && (
                        <Button variant="secondary" onClick={() => onDelete(backup.backupSetId)} disabled={deletingBackupSetId === backup.backupSetId}>
                          {deletingBackupSetId === backup.backupSetId ? "Deleting…" : "Delete"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {nextPageToken && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onLoadMore} disabled={loading}>
            {loading ? "Loading more…" : "Load more backup sets"}
          </Button>
        </div>
      )}
    </div>
  );
}

function RepositoryRestorePlanPanel({
  result,
  restorePlan,
  repositorySource,
  confirmations,
  onConfirmationChange,
}: {
  result: ValidateBackupSetResponse | null;
  restorePlan: RestorePlanSummaryInfo | null;
  repositorySource: { repositoryId: string; backupSetId: string } | null;
  confirmations: RestoreConfirmations;
  onConfirmationChange: (key: RestoreConfirmationKey, checked: boolean) => void;
}) {
  if (!result && !restorePlan) return null;
  const backupSet = result?.backupSet;
  const confirmationsComplete = restoreConfirmationsComplete(confirmations);
  return (
    <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-800 dark:bg-amber-950/20">
      <Text as="p" className="font-semibold text-amber-950 dark:text-amber-100">
        Safe repository restore planning
      </Text>
      <Text intent="muted" className="mt-2">
        Console validates the repository backup set and requests a read-only restore plan using NEW_DEPLOYMENT_BOOTSTRAP and PRESERVE_BACKUP_ID. It does not execute destructive restore operations.
      </Text>
      {result && (
        <Alert variant={result.valid ? "success" : undefined} className="mt-4">
          {result.valid
            ? `Valid backup set${backupSet?.backupSetId ? `: ${backupSet.backupSetId}` : "."}`
            : result.errors.join("; ") || "Backup set validation failed."}
        </Alert>
      )}
      <BackupValidationSummaryPanel summary={result?.validation || backupSet?.validation} />
      {restorePlan && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
          <Text as="p" className="font-medium">Restore plan</Text>
          <dl className="mt-3 grid gap-3 md:grid-cols-4">
            <Metric label="Mode" value={formatEnumLabel(restorePlan.targetMode)} />
            <Metric label="Identity" value={formatEnumLabel(restorePlan.identityMode)} />
            <Metric label="Auth sessions" value={formatEnumLabel(restorePlan.authSessionPolicy)} />
            <Metric label="Restorable" value={restorePlan.restorable ? "Yes" : "No"} />
            <Metric label="Required bytes" value={formatBytes(restorePlan.capacity?.requiredBytes || 0)} />
            <Metric label="Planned" value={formatTimestamp(restorePlan.plannedAt)} />
          </dl>
          {restorePlan.blockers.length > 0 && (
            <Alert className="mt-3">
              {restorePlan.blockers.map((blocker) => blocker.detail || blocker.reason).join("; ")}
            </Alert>
          )}
          {restorePlan.derivedActions.length > 0 && (
            <Text intent="muted" size="sm" className="mt-3">
              Derived actions: {restorePlan.derivedActions.map((action) => `${formatEnumLabel(action.subsystem)}:${formatEnumLabel(action.mode)}`).join(", ")}
            </Text>
          )}
        </div>
      )}
      {backupSet && (
        <>
          <dl className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Backup set" value={backupSet.backupSetId || "Unknown"} />
            <Metric label="Deployment" value={backupSet.deploymentName || backupSet.deploymentId || "Unknown"} />
            <Metric label="Mode" value={formatEnumLabel(backupSet.deploymentMode, "Unknown")} />
            <Metric label="Expected nodes" value={String(backupSet.expectedNodeCount || backupSet.nodes.length)} />
            <Metric label="Artifacts" value={String(backupSet.manifest?.artifactCount ?? backupSet.nodes.length)} />
            <Metric label="Artifact bytes" value={formatBytes(backupSet.manifest?.totalArtifactBytes ?? backupSet.validation?.totalArtifactBytes ?? 0)} />
            <Metric label="Compatibility" value={formatEnumLabel(backupSet.compatibility?.state, "Unknown")} />
            <Metric label="Identity modes" value={backupSet.compatibility?.supportedIdentityModes?.map((mode) => formatEnumLabel(mode)).join(", ") || "Not published"} />
          </dl>
          <BackupNodes nodes={backupSet.nodes} />
        </>
      )}
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {RESTORE_CONFIRMATION_ITEMS.map((item) => (
          <CheckboxField
            key={item.key}
            label={item.label}
            checked={confirmations[item.key]}
            onChange={(checked) => onConfirmationChange(item.key, checked)}
            hint={item.hint}
          />
        ))}
      </div>
      {!confirmationsComplete ? (
        <Alert className="mt-4">
          Confirm every restore prerequisite before using the generated read-only plan command.
        </Alert>
      ) : repositorySource ? (
        <div className="mt-5 space-y-4">
          <Alert variant="success">
            Confirmations complete. The command below is read-only planning guidance; destructive restore execution is intentionally not available in Console.
          </Alert>
          <CommandBlock
            label="Restore plan command"
            command={repositoryRestorePlanCommand(repositorySource.repositoryId, repositorySource.backupSetId)}
          />
        </div>
      ) : null}
    </div>
  );
}

function RepositoryRetentionPanel({
  plan,
  canManage,
  planning,
  applying,
  onPlan,
  onApply,
}: {
  plan: RepositoryRetentionPlanInfo | null;
  canManage: boolean;
  planning: boolean;
  applying: boolean;
  onPlan: () => void;
  onApply: () => void;
}) {
  const deleteActions = plan?.actions.filter((action) => action.action.includes("delete")) || [];
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="p" className="font-medium">Retention preview</Text>
          <Text intent="muted" size="sm" className="mt-1">
            Preview repository pruning before applying. Apply requires backup.manage and never runs without an explicit click.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onPlan} disabled={planning}>{planning ? "Planning…" : "Preview retention"}</Button>
          {canManage && <Button onClick={onApply} disabled={applying || !plan}>{applying ? "Applying…" : "Apply retention"}</Button>}
        </div>
      </div>
      {plan && (
        <>
          <dl className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Mode" value={plan.dryRun ? "Preview" : "Applied"} />
            <Metric label="Actions" value={String(plan.actions.length)} />
            <Metric label="Deletes" value={String(deleteActions.length)} />
            <Metric label="Deleted objects" value={String(plan.deletedObjects)} />
          </dl>
          {plan.warnings.length > 0 && <Text intent="muted" size="sm" className="mt-3">Warnings: {plan.warnings.join("; ")}</Text>}
          {plan.actions.length > 0 && (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                <thead className={`bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
                  <tr><TableHead className="px-4 py-3">Backup set</TableHead><TableHead className="px-4 py-3">Action</TableHead><TableHead className="px-4 py-3">Reason</TableHead><TableHead className="px-4 py-3">Objects</TableHead></tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                  {plan.actions.map((action) => (
                    <tr key={`${action.backupSetId}-${action.prefix}-${action.action}`}>
                      <td className="px-4 py-3 font-medium">{action.backupSetId || action.prefix}</td>
                      <td className="px-4 py-3">{action.action}</td>
                      <td className="px-4 py-3">{action.reason || action.error || "—"}</td>
                      <td className="px-4 py-3">{action.objectCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BackupObservabilityPanel({
  snapshot,
  loading,
  onRefresh,
}: {
  snapshot: BackupObservabilitySnapshotInfo | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="p" className="font-medium">Backup observability</Text>
          <Text intent="muted" size="sm" className="mt-1">
            Sanitized metrics, alert conditions, and non-secret evidence from the daemon.
          </Text>
        </div>
        <Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Refreshing…" : "Refresh observability"}</Button>
      </div>
      {snapshot ? (
        <>
          <dl className="mt-4 grid gap-3 md:grid-cols-4">
            <Metric label="Summary" value={snapshot.summaryState || "unknown"} />
            <Metric label="Observed" value={formatTimestamp(snapshot.observedAt)} />
            <Metric label="Metrics" value={String(snapshot.metrics.length)} />
            <Metric label="Firing alerts" value={String(snapshot.alerts.filter((alert) => alert.firing).length)} />
          </dl>
          {snapshot.alerts.length > 0 && (
            <Text intent="muted" size="sm" className="mt-3">
              Alerts: {snapshot.alerts.map((alert) => `${alert.name}:${alert.severity}${alert.firing ? ":firing" : ""}`).join("; ")}
            </Text>
          )}
        </>
      ) : (
        <Text intent="muted" className="mt-3">No observability snapshot loaded.</Text>
      )}
    </div>
  );
}

function BackupValidationSummaryPanel({ summary }: { summary?: ValidationSummaryInfo | null }) {
  if (!summary) return null;
  const blockers = summary.blockers || [];
  const warnings = summary.warnings || [];
  const errors = summary.errors || [];
  return (
    <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
      <Text as="p" className="font-medium">Backup-set validation evidence</Text>
      <dl className="mt-3 grid gap-3 md:grid-cols-4">
        <Metric label="State" value={formatEnumLabel(summary.state, "Unknown")} />
        <Metric label="Checked" value={formatTimestamp(summary.checkedAt)} />
        <Metric label="Validator" value={summary.validatorVersion || "Unknown"} />
        <Metric label="Checksum" value={summary.checksumAlgorithm || "Unknown"} />
        <Metric label="Nodes" value={`${summary.nodeArtifactCount || 0}/${summary.expectedNodeCount || 0}`} />
        <Metric label="Required artifacts" value={`${summary.validatedArtifactCount || 0}/${summary.requiredArtifactCount || 0}`} />
        <Metric label="Artifact bytes" value={formatBytes(summary.totalArtifactBytes || 0)} />
        <Metric label="Blockers" value={String(blockers.length + errors.length)} />
      </dl>
      {(errors.length > 0 || blockers.length > 0) && (
        <Alert className="mt-4">
          {[...errors, ...blockers.map((blocker) => `${blocker.reason || "blocked"}: ${blocker.detail || blocker.fieldPath || "validation blocker"}`)].join("; ")}
        </Alert>
      )}
      {warnings.length > 0 && <Text intent="muted" size="sm" className="mt-3">Warnings: {warnings.join("; ")}</Text>}
    </div>
  );
}

function PolicyPanel({
  policy,
  repositories,
  onChange,
  onSave,
  saving,
  readOnly,
}: {
  policy: BackupPolicyInfo;
  repositories: BackupRepositoryInfo[];
  onChange: (policy: BackupPolicyInfo) => void;
  onSave: () => void;
  saving: boolean;
  readOnly: boolean;
}) {
  function set<K extends keyof BackupPolicyInfo>(key: K, value: BackupPolicyInfo[K]) {
    onChange({ ...policy, [key]: value });
  }
  const retention = policy.retentionPolicy || {
    keepLastSuccessful: 0,
    keepForSeconds: 0,
    deleteIncompleteAfterSeconds: 0,
  };
  const validation = policy.validationOptions || DEFAULT_VALIDATION_OPTIONS;
  return (
    <article className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}>
      <div className="flex items-center justify-between gap-4">
        <Text as="p" size="sm" className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
          Backup policy
        </Text>
        {readOnly ? <Text intent="muted" size="sm">Read-only</Text> : <Button variant="secondary" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save policy"}</Button>}
      </div>
      <Text intent="muted" className="mt-2">
        Policy fields are repository-backed only. Local daemon archive scheduling fields are intentionally absent.
      </Text>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <RepositoryField repositories={repositories} value={policy.defaultRepositoryId} disabled={readOnly} onChange={(value) => set("defaultRepositoryId", value)} />
        <CaptureProviderField value={policy.captureProvider || "BACKUP_CAPTURE_PROVIDER_AUTO"} disabled={readOnly} onChange={(value) => set("captureProvider", value)} />
        <QuiesceReadProfileField value={policy.quiesceReadProfile || "BACKUP_QUIESCE_READ_PROFILE_CONTROL_ONLY"} disabled={readOnly} onChange={(value) => set("quiesceReadProfile", value)} />
        <CheckboxField label="Allow read-only during quiesce" checked={policy.allowReadOnlyDuringQuiesce} disabled={readOnly} onChange={(value) => set("allowReadOnlyDuringQuiesce", value)} hint="Allows read-only work during backup quiesce when the daemon and read profile permit it. Writes remain blocked." />
        <NumberField label="Keep last successful" value={retention.keepLastSuccessful} disabled={readOnly} onChange={(value) => set("retentionPolicy", { ...retention, keepLastSuccessful: value })} hint="Minimum number of successful repository backup sets to keep." />
        <NumberField label="Keep for seconds" value={retention.keepForSeconds} disabled={readOnly} onChange={(value) => set("retentionPolicy", { ...retention, keepForSeconds: value })} hint="Age-based retention window. Zero uses daemon defaults." />
        <NumberField label="Delete incomplete after seconds" value={retention.deleteIncompleteAfterSeconds} disabled={readOnly} onChange={(value) => set("retentionPolicy", { ...retention, deleteIncompleteAfterSeconds: value })} hint="Age after which incomplete repository prefixes are eligible for pruning." />
        <CheckboxField label="Artifact checks" checked={validation.includeArtifactChecks} disabled={readOnly} onChange={(value) => set("validationOptions", { ...validation, includeArtifactChecks: value })} hint="Validate expected repository backup artifacts." />
        <CheckboxField label="External dependency checks" checked={validation.includeExternalDependencyChecks} disabled={readOnly} onChange={(value) => set("validationOptions", { ...validation, includeExternalDependencyChecks: value })} hint="Include non-secret external dependency probes when supported." />
        <CheckboxField label="Capacity estimates" checked={validation.includeCapacityEstimates} disabled={readOnly} onChange={(value) => set("validationOptions", { ...validation, includeCapacityEstimates: value })} hint="Estimate restore capacity requirements in validation and planning." />
        <CheckboxField label="Require complete marker" checked={validation.requireCompleteMarker} disabled={readOnly} onChange={(value) => set("validationOptions", { ...validation, requireCompleteMarker: value })} hint="Require the repository backup-set complete marker." />
      </div>
    </article>
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
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label={label} hint={hint} />
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
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
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label={label} hint={hint} />
      <Input type="number" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
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
    <label className={`flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm ${themeClasses.text.parts.strongLight} dark:border-slate-800 dark:bg-slate-950/30 ${themeClasses.text.parts.darkStrong}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex items-center gap-1">{label}<FieldHint label={`${label} help`}>{hint}</FieldHint></span>
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
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label="Archive format" hint="Backup archive/container format written by the daemon, such as ZIP or TAR.ZST." />
      <select className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BackupArchiveFormat)}>
        <option value="BACKUP_ARCHIVE_FORMAT_ZIP">ZIP</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR">TAR</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_GZ">TAR.GZ</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_ZST">TAR.ZST</option>
      </select>
    </label>
  );
}

function RepositoryField({
  repositories,
  value,
  disabled = false,
  onChange,
}: {
  repositories: BackupRepositoryInfo[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const selectedExists = !value || repositories.some((repository) => repository.repositoryId === value);
  return (
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label="Backup repository" hint="Repository-backed backups target a configured external repository by ID. Raw object-store credentials are not accepted." />
      <select className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select repository</option>
        {!selectedExists && <option value={value}>{value}</option>}
        {repositories.map((repository) => (
          <option key={repository.repositoryId} value={repository.repositoryId}>{repository.displayName || repository.repositoryId}</option>
        ))}
      </select>
    </label>
  );
}

function CredentialSchemeField({
  value,
  disabled = false,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label="Credential reference scheme" hint="Choose where myceld resolves object-store credentials. Console stores references only, never raw keys." />
      <select className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        <option value="SECRET_REFERENCE_SCHEME_ENV">Environment variables</option>
        <option value="SECRET_REFERENCE_SCHEME_K8S_SECRET">Kubernetes Secret</option>
        <option value="SECRET_REFERENCE_SCHEME_EXTERNAL_SECRET">External secret reference</option>
      </select>
    </label>
  );
}

function CaptureProviderField({
  value,
  disabled = false,
  onChange,
}: {
  value: BackupCaptureProvider;
  disabled?: boolean;
  onChange: (value: BackupCaptureProvider) => void;
}) {
  return (
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label="Capture provider" hint="AUTO lets the daemon choose the safest configured snapshot/copy provider for the deployment." />
      <select className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BackupCaptureProvider)}>
        <option value="BACKUP_CAPTURE_PROVIDER_AUTO">Auto</option>
        <option value="BACKUP_CAPTURE_PROVIDER_FILESYSTEM_IMMUTABLE_COPY">Filesystem immutable copy</option>
        <option value="BACKUP_CAPTURE_PROVIDER_CSI_VOLUME_SNAPSHOT">CSI volume snapshot</option>
        <option value="BACKUP_CAPTURE_PROVIDER_AWS_EBS_SNAPSHOT">AWS EBS snapshot</option>
      </select>
    </label>
  );
}

function QuiesceReadProfileField({
  value,
  disabled = false,
  onChange,
}: {
  value: BackupQuiesceReadProfile;
  disabled?: boolean;
  onChange: (value: BackupQuiesceReadProfile) => void;
}) {
  return (
    <label className={`block text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
      <FieldLabel label="Quiesce read profile" hint="Control-only is the conservative production default while backup quiesce blocks writes." />
      <select className={`w-full rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BackupQuiesceReadProfile)}>
        <option value="BACKUP_QUIESCE_READ_PROFILE_CONTROL_ONLY">Control-only reads</option>
        <option value="BACKUP_QUIESCE_READ_PROFILE_STRICT_READ_ONLY">Strict read-only</option>
      </select>
    </label>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <span className={`mb-1 flex items-center gap-1 text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
      {label}
      <FieldHint label={`${label} help`}>{hint}</FieldHint>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>{label}</dt>
      <dd className={`mt-1 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>{value}</dd>
    </div>
  );
}

function CommandBlock({ label, command }: { label: string; command: string }) {
  return (
    <div>
      <Text as="p" size="sm" className="font-medium">{label}</Text>
      <pre className={`mt-2 overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs ${themeClasses.text.parts.inverseSoft}`}><code>{command}</code></pre>
    </div>
  );
}

function repositoryLocation(repository: BackupRepositoryInfo): string {
  if (!repository.s3) return formatEnumLabel(repository.provider, "Unknown provider");
  const prefix = repository.s3.prefix ? `/${repository.s3.prefix}` : "";
  return `s3://${repository.s3.bucket}${prefix} (${repository.s3.region || repository.s3.endpointUri || "region not set"})`;
}

function formatRepositoryValidation(validation?: BackupRepositoryValidationSummaryInfo | null): string {
  if (!validation?.state) return "Not validated";
  return formatEnumLabel(validation.state, "Unknown");
}

function formatEncryptionPolicy(policy?: BackupRepositoryInfo["encryption"]): string {
  if (!policy) return "Not configured";
  if (policy.kmsKeyId) return `KMS ${policy.kmsKeyId}`;
  if (policy.keyRef) return formatSecretReference(policy.keyRef);
  return formatEnumLabel(policy.mode, "Not configured");
}

function formatSecretReference(reference?: BackupRepositoryInfo["credentialRef"]): string {
  if (!reference) return "Not configured";
  const location = [reference.namespace, reference.name].filter(Boolean).join("/");
  const keys = Object.keys(reference.keys || {}).join(", ");
  return [formatEnumLabel(reference.scheme, "reference"), location, reference.path, keys].filter(Boolean).join(" · ");
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not available";
  return value.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

function formatBackupOperationState(state?: string): string {
  if (state && state !== "BACKUP_OPERATION_STATE_UNSPECIFIED") {
    return state.replace("BACKUP_OPERATION_STATE_", "").replace(/_/g, " ");
  }
  return formatEnumLabel(state, "Unknown");
}

function isActiveBackupOperation(operation?: BackupOperationInfo | null): operation is BackupOperationInfo {
  return Boolean(operation && isActiveBackupOperationState(operation.state));
}

function isActiveBackupOperationState(state?: string): boolean {
  const normalized = (state || "").toLowerCase();
  if (!normalized) return false;
  return ![
    "succeeded",
    "failed",
    "canceled",
    "backup_operation_state_succeeded",
    "backup_operation_state_failed",
    "backup_operation_state_canceled",
  ].includes(normalized);
}

function repositoryRestorePlanCommand(repositoryId: string, backupSetId: string): string {
  return `mycel --output json admin backup restore-plan --repository-id ${shellQuote(repositoryId)} --backup-set-id ${shellQuote(backupSetId)} --target-mode new-deployment-bootstrap --identity-mode preserve-backup-id`;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function formatAppliedIndexes(indexes: Record<string, number>): string {
  const entries = Object.entries(indexes || {});
  if (entries.length === 0) return "—";
  return entries.sort(([left], [right]) => left.localeCompare(right)).map(([group, index]) => `${group}:${index}`).join(", ");
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
