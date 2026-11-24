import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupsPage, type BackupsPageProps } from "./BackupsPage";
import type {
  BackupOperationInfo,
  BackupPolicyInfo,
  BackupRepositoryInfo,
  BackupSetSummaryInfo,
  GetBackupObservabilityResponse,
  ListBackupOperationsResponse,
  ListBackupRepositoriesResponse,
  ListBackupSetsResponse,
  PlanRestoreResponse,
  RepositoryRetentionResponse,
  ValidateBackupSetResponse,
} from "../../../types/backups";

const policy: BackupPolicyInfo = {
  defaultRepositoryId: "prod-repo",
  captureProvider: "BACKUP_CAPTURE_PROVIDER_AUTO",
  quiesceReadProfile: "BACKUP_QUIESCE_READ_PROFILE_CONTROL_ONLY",
  allowReadOnlyDuringQuiesce: true,
  derivedSubsystems: [],
  retentionPolicy: {
    keepLastSuccessful: 3,
    keepForSeconds: 604800,
    deleteIncompleteAfterSeconds: 86400,
  },
  validationOptions: {
    includeArtifactChecks: true,
    includeExternalDependencyChecks: true,
    includeCapacityEstimates: true,
    requireCompleteMarker: true,
  },
};

const repository: BackupRepositoryInfo = {
  repositoryId: "prod-repo",
  displayName: "Production repository",
  provider: "BACKUP_REPOSITORY_PROVIDER_S3_COMPATIBLE",
  s3: {
    bucket: "mycel-backups",
    prefix: "prod",
    region: "us-east-1",
    endpointUri: "",
    forcePathStyle: false,
    disableTls: false,
  },
  credentialRef: {
    scheme: "SECRET_REFERENCE_SCHEME_ENV",
    name: "",
    namespace: "",
    path: "",
    keys: {
      access_key_id: "AWS_ACCESS_KEY_ID",
      secret_access_key: "AWS_SECRET_ACCESS_KEY",
    },
    description: "env refs",
  },
  encryption: null,
  tlsCaRef: null,
  devOnly: false,
  createTime: "2026-07-06T19:00:00Z",
  updateTime: "2026-07-06T19:00:00Z",
  validation: {
    state: "BACKUP_VALIDATION_STATE_VALID",
    checkedAt: "2026-07-06T19:05:00Z",
    probes: [],
    blockers: [],
    sanitizedError: "",
  },
};

const operation: BackupOperationInfo = {
  backupOperationId: "op-1",
  backupSetId: "backup-set-1",
  repositoryId: "prod-repo",
  deploymentId: "deployment-1",
  deploymentName: "prod",
  deploymentMode: "BACKUP_DEPLOYMENT_MODE_CLUSTERED",
  state: "BACKUP_OPERATION_STATE_SUCCEEDED",
  phase: "finalizing",
  reason: "nightly",
  createdAt: "2026-07-06T20:00:00Z",
  updatedAt: "2026-07-06T20:05:00Z",
  completedAt: "2026-07-06T20:05:00Z",
  expectedNodeCount: 3,
  manifestUri: "s3://mycel-backups/prod/backup-sets/backup-set-1/backup-set.json",
  nodes: [],
  raftBarriers: {},
  blockers: [],
  validation: null,
  cancelRequested: false,
  retryAfterSeconds: 0,
  failedPhase: "",
  error: "",
};

const backupSet: BackupSetSummaryInfo = {
  backupSetId: "backup-set-1",
  repositoryId: "prod-repo",
  deploymentId: "deployment-1",
  deploymentName: "prod",
  deploymentMode: "BACKUP_DEPLOYMENT_MODE_CLUSTERED",
  state: "BACKUP_OPERATION_STATE_SUCCEEDED",
  createdAt: "2026-07-06T20:00:00Z",
  completedAt: "2026-07-06T20:05:00Z",
  expectedNodeCount: 3,
  manifestUri: "s3://mycel-backups/prod/backup-sets/backup-set-1/backup-set.json",
  nodes: [],
  validation: {
    state: "BACKUP_VALIDATION_STATE_VALID",
    checkedAt: "2026-07-06T20:06:00Z",
    blockers: [],
    warnings: [],
    validatorVersion: "v1",
    expectedNodeCount: 3,
    nodeArtifactCount: 3,
    requiredArtifactCount: 3,
    validatedArtifactCount: 3,
    totalArtifactBytes: 4096,
    checksumAlgorithm: "sha256",
    errors: [],
  },
  compatibility: {
    state: "BACKUP_VALIDATION_STATE_VALID",
    sourceVersion: "v0.25.0",
    daemonVersion: "v0.25.0",
    requiredFeatures: [],
    blockers: [],
    storageFormatVersions: {},
    minRestoreMycelVersion: "v0.25.0",
    maxRestoreMycelVersion: "",
    supportedRestoreTargetModes: ["RESTORE_TARGET_MODE_NEW_DEPLOYMENT_BOOTSTRAP"],
    supportedIdentityModes: ["RESTORE_IDENTITY_MODE_PRESERVE_BACKUP_ID"],
    requiresSameTopology: false,
    requiresSourceFencingForPreservedIdentity: true,
  },
  deletionState: "BACKUP_DELETION_STATE_UNSPECIFIED",
  retentionClass: "BACKUP_RETENTION_CLASS_KEEP",
  manifest: {
    manifestVersion: 1,
    manifestUri: "s3://mycel-backups/prod/backup-sets/backup-set-1/backup-set.json",
    manifestChecksumSha256: "abc",
    completeMarkerUri: "s3://mycel-backups/prod/backup-sets/backup-set-1/COMPLETE",
    completeMarkerChecksumSha256: "def",
    manifestSizeBytes: 1024,
    totalArtifactBytes: 4096,
    artifactCount: 3,
  },
};

const repositoriesResponse: ListBackupRepositoriesResponse = {
  repositories: [repository],
  nextPageToken: "",
};

const operationsResponse: ListBackupOperationsResponse = {
  operations: [operation],
  nextPageToken: "",
};

const backupSetsResponse: ListBackupSetsResponse = {
  backupSets: [backupSet],
  nextPageToken: "",
};

const observabilityResponse: GetBackupObservabilityResponse = {
  snapshot: {
    observedAt: "2026-07-06T20:10:00Z",
    repositoryId: "prod-repo",
    metrics: [],
    alerts: [],
    summaryState: "healthy",
  },
};

const validationResponse: ValidateBackupSetResponse = {
  valid: true,
  errors: [],
  backupSet,
  validation: backupSet.validation,
};

const restorePlanResponse: PlanRestoreResponse = {
  plan: {
    restorePlanId: "restore-plan-1",
    repositoryId: "prod-repo",
    backupSetId: "backup-set-1",
    targetMode: "RESTORE_TARGET_MODE_NEW_DEPLOYMENT_BOOTSTRAP",
    identityMode: "RESTORE_IDENTITY_MODE_PRESERVE_BACKUP_ID",
    authSessionPolicy: "RESTORE_AUTH_SESSION_POLICY_PRESERVE_RESTORED_SESSIONS",
    restorable: true,
    validation: backupSet.validation,
    compatibility: backupSet.compatibility,
    capacity: {
      requiredBytes: 4096,
      availableBytes: 8192,
      blockers: [],
      warnings: [],
    },
    derivedActions: [],
    blockers: [],
    plannedAt: "2026-07-06T20:11:00Z",
  },
};

const retentionResponse: RepositoryRetentionResponse = {
  plan: {
    repositoryId: "prod-repo",
    plannedAt: "2026-07-06T20:12:00Z",
    retentionPolicy: policy.retentionPolicy,
    dryRun: true,
    actions: [],
    warnings: [],
    deletedObjects: 0,
  },
};

const principalContext = {
  session: {
    addr: "127.0.0.1:9091",
    principalId: "prn_operator",
    username: "operator",
  },
  roles: [],
  capabilities: ["backup.manage"],
  capabilityState: {
    kind: "complete" as const,
    capabilities: [{ capability: "backup.manage" }],
  },
  warnings: [],
};

function renderPage(overrides: Partial<BackupsPageProps> = {}) {
  const services = {
    getBackupPolicyService: jest.fn<Promise<BackupPolicyInfo>, []>().mockResolvedValue(policy),
    updateBackupPolicyService: jest.fn<Promise<BackupPolicyInfo>, [BackupPolicyInfo]>().mockResolvedValue(policy),
    listBackupRepositoriesService: jest
      .fn<Promise<ListBackupRepositoriesResponse>, [unknown]>()
      .mockResolvedValue(repositoriesResponse),
    createBackupRepositoryService: jest.fn().mockResolvedValue(repository),
    updateBackupRepositoryService: jest.fn().mockResolvedValue(repository),
    validateBackupRepositoryService: jest.fn().mockResolvedValue({ repository, validation: repository.validation }),
    deleteBackupRepositoryService: jest.fn().mockResolvedValue({ repositoryId: "prod-repo", state: "BACKUP_DELETION_STATE_DELETED" }),
    planRepositoryRetentionService: jest.fn().mockResolvedValue(retentionResponse),
    applyRepositoryRetentionService: jest.fn().mockResolvedValue({ plan: { ...retentionResponse.plan!, dryRun: false } }),
    getBackupObservabilityService: jest.fn().mockResolvedValue(observabilityResponse),
    planRestoreService: jest.fn().mockResolvedValue(restorePlanResponse),
    startBackupService: jest.fn().mockResolvedValue({ operation: { ...operation, state: "BACKUP_OPERATION_STATE_PENDING" }, backupSet: null }),
    getBackupOperationService: jest.fn().mockResolvedValue({ operation }),
    cancelBackupOperationService: jest.fn().mockResolvedValue({ operation: { ...operation, state: "BACKUP_OPERATION_STATE_CANCELING" } }),
    listBackupOperationsService: jest.fn().mockResolvedValue(operationsResponse),
    listBackupSetsService: jest.fn().mockResolvedValue(backupSetsResponse),
    validateBackupSetService: jest.fn().mockResolvedValue(validationResponse),
    deleteBackupSetService: jest.fn().mockResolvedValue({ repositoryId: "prod-repo", backupSetId: "backup-set-1", state: "BACKUP_DELETION_STATE_DELETED" }),
    principalContext,
    ...overrides,
  } satisfies BackupsPageProps;
  render(<BackupsPage {...services} />);
  return services;
}

test("renders repository-only backup controls", async () => {
  renderPage();

  expect(await screen.findByText("Repository-backed deployment backup")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /start backup/i }).length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /trigger local backup/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/^Backup Files$/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/local output/i)).not.toBeInTheDocument();
});

test("starts repository-backed backups without local output directory", async () => {
  const services = renderPage();

  await screen.findByText("Repository-backed deployment backup");
  await userEvent.click(screen.getAllByRole("button", { name: /start backup/i })[0]);

  await waitFor(() => {
    expect(services.startBackupService).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: "prod-repo",
        reason: "Triggered from Mycel Console",
        archiveFormat: "BACKUP_ARCHIVE_FORMAT_TAR_ZST",
      }),
    );
  });
  expect(services.startBackupService).not.toHaveBeenCalledWith(
    expect.objectContaining({ outputDir: expect.anything() }),
  );
});

test("validates repository backup sets and shows safe restore planning", async () => {
  const services = renderPage();

  await userEvent.click(await screen.findByRole("tab", { name: /repositories/i }));
  await screen.findByText("backup-set-1");
  await userEvent.click(screen.getByRole("button", { name: /plan restore/i }));

  await waitFor(() => {
    expect(services.validateBackupSetService).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: "prod-repo", backupSetId: "backup-set-1" }),
    );
    expect(services.planRestoreService).toHaveBeenCalledWith(
      expect.objectContaining({ repositoryId: "prod-repo", backupSetId: "backup-set-1" }),
    );
  });
  expect(await screen.findByText(/safe repository restore planning/i)).toBeInTheDocument();
  expect(screen.getByText(/does not execute destructive restore operations/i)).toBeInTheDocument();
  expect(screen.queryByText(/restore-local/i)).not.toBeInTheDocument();
});

test("preserves development MinIO repository flags when saving", async () => {
  const minioRepository: BackupRepositoryInfo = {
    ...repository,
    s3: {
      ...repository.s3!,
      endpointUri: "http://minio:9000",
      forcePathStyle: true,
      disableTls: true,
    },
    devOnly: true,
  };
  const services = renderPage({
    listBackupRepositoriesService: jest.fn().mockResolvedValue({
      repositories: [minioRepository],
      nextPageToken: "",
    }),
    updateBackupRepositoryService: jest.fn().mockResolvedValue(minioRepository),
  });

  await userEvent.click(await screen.findByRole("tab", { name: /repositories/i }));
  expect(await screen.findByRole("checkbox", { name: /development-only repository/i })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /force path-style s3/i })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /disable tls/i })).toBeChecked();

  await userEvent.click(screen.getByRole("button", { name: /update repository/i }));

  await waitFor(() => {
    expect(services.updateBackupRepositoryService).toHaveBeenCalledWith(
      expect.objectContaining({
        repositoryId: "prod-repo",
        devOnly: true,
        s3: expect.objectContaining({
          endpointUri: "http://minio:9000",
          forcePathStyle: true,
          disableTls: true,
        }),
      }),
    );
  });
});

test("shows string backend errors when repository save fails", async () => {
  renderPage({
    updateBackupRepositoryService: jest.fn().mockRejectedValue("dev_only is required for HTTP repository endpoints"),
  });

  await userEvent.click(await screen.findByRole("tab", { name: /repositories/i }));
  await userEvent.click(await screen.findByRole("button", { name: /update repository/i }));

  expect(await screen.findByText("dev_only is required for HTTP repository endpoints")).toBeInTheDocument();
  expect(screen.queryByText("Failed to save backup repository")).not.toBeInTheDocument();
});

test("shows repository policy fields instead of local backup schedule fields", async () => {
  renderPage();

  await userEvent.click(await screen.findByRole("tab", { name: /policy/i }));

  expect(screen.getByText(/policy fields are repository-backed only/i)).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /allow read-only during quiesce/i })).toBeInTheDocument();
  expect(screen.getByText(/keep last successful/i)).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /backup directory/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: /schedule kind/i })).not.toBeInTheDocument();
});
