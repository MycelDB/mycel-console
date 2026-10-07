import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupsPage } from "./BackupsPage";
import type {
  BackupPolicyInfo,
  BackupStatusResponse,
  ListBackupsInput,
  ListBackupsResponse,
  ListClusterBackupsInput,
  ListClusterBackupsResponse,
  ValidateClusterBackupSetResponse,
} from "../../../types/backups";

const policy: BackupPolicyInfo = {
  enabled: true,
  backupDir: "/data/mycel/backups",
  intervalSeconds: 3600,
  retentionCount: 10,
  includeLogs: true,
  quiesceDrainTimeoutSeconds: 30,
  backupTimeoutSeconds: 600,
  retryAfterSeconds: 300,
  statusHistoryLimit: 25,
  allowReadsDuringBackup: true,
  scheduleKind: "interval",
  timeOfDay: "02:00",
  timezone: "UTC",
  weekdays: [],
  runMissed: true,
  archiveFormat: "BACKUP_ARCHIVE_FORMAT_TAR_ZST",
};

const status: BackupStatusResponse = {
  status: {
    backupId: "backup-1",
    state: "Succeeded",
    startedAt: "2026-07-06T20:00:00Z",
    completedAt: "2026-07-06T20:00:10Z",
    archivePath: "/data/mycel/backups/backup-1.tar.zst",
    manifestPath: "/data/mycel/backups/backup-1.json",
    error: "",
    participants: [],
    lastSuccessAt: "2026-07-06T20:00:10Z",
    nextRunAt: "2026-07-06T21:00:00Z",
  },
  quiesce: { participants: [] },
};

const backupsResponse: ListBackupsResponse = {
  backups: [
    {
      backupId: "backup-1",
      archiveName: "backup-1.tar.zst",
      createdAt: "2026-07-06T20:00:00Z",
      completedAt: "2026-07-06T20:00:10Z",
      sizeBytes: 2048,
      checksumSha256: "abc",
      archiveFormat: "BACKUP_ARCHIVE_FORMAT_TAR_ZST",
      includeLogs: true,
    },
  ],
  nextPageToken: "",
};

const clusterBackupsResponse: ListClusterBackupsResponse = {
  backupSets: [
    {
      backupSetId: "backup-set-1",
      state: "succeeded",
      clusterId: "cluster-1",
      createdAt: "2026-07-06T20:00:00Z",
      completedAt: "2026-07-06T20:00:10Z",
      expectedNodes: 3,
      manifestUri: "file:///backups/backup-set-1/backup-set.json",
      nodes: [],
    },
  ],
  nextPageToken: "",
};

const validateResponse: ValidateClusterBackupSetResponse = {
  valid: true,
  errors: [],
  backupSet: clusterBackupsResponse.backupSets[0],
};

const restorePlanValidateResponse: ValidateClusterBackupSetResponse = {
  valid: true,
  errors: [],
  backupSet: {
    ...clusterBackupsResponse.backupSets[0],
    nodes: [
      {
        podName: "myceld-0",
        nodeId: "node_1",
        ordinal: 0,
        raftNodeId: 1,
        archiveName: "mycel-system-20261007T100000Z-myceld-0-backup-set-1.tar.zst",
        archiveUri: "file:///backups/backup-set-1/myceld-0.tar.zst",
        manifestName: "myceld-0.manifest.json",
        manifestUri: "file:///backups/backup-set-1/myceld-0.manifest.json",
        sizeBytes: 4096,
        checksumSha256: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        appliedIndexes: { system: 42 },
      },
    ],
  },
};

const invalidValidateResponse: ValidateClusterBackupSetResponse = {
  valid: false,
  errors: ["checksum mismatch", "missing myceld-1 archive"],
  backupSet: null,
};

function renderPage(
  overrides: Partial<Parameters<typeof BackupsPage>[0]> = {},
) {
  const services = {
    getBackupPolicyService: jest
      .fn<Promise<BackupPolicyInfo>, []>()
      .mockResolvedValue(policy),
    updateBackupPolicyService: jest
      .fn<Promise<BackupPolicyInfo>, [BackupPolicyInfo]>()
      .mockResolvedValue(policy),
    getBackupStatusService: jest
      .fn<Promise<BackupStatusResponse>, []>()
      .mockResolvedValue(status),
    listBackupsService: jest
      .fn<Promise<ListBackupsResponse>, [ListBackupsInput | undefined]>()
      .mockResolvedValue(backupsResponse),
    triggerBackupService: jest
      .fn()
      .mockResolvedValue({ status: null, backup: null }),
    deleteBackupService: jest.fn().mockResolvedValue({ backupId: "backup-1" }),
    startClusterBackupService: jest.fn().mockResolvedValue({
      status: {
        backupSetId: "backup-set-2",
        state: "pending",
        stateCode: "CLUSTER_BACKUP_STATE_PENDING",
        clusterId: "cluster-1",
        reason: "Triggered from Mycel Console",
        createdAt: "2026-07-06T21:00:00Z",
        updatedAt: "2026-07-06T21:00:00Z",
        completedAt: "",
        expectedNodes: 3,
        manifestUri: "",
        nodes: [],
        failedPhase: "",
        error: "",
        raftBarriers: {},
        blockers: [],
        cancelRequested: false,
        currentPhase: "pending",
        retryAfterSeconds: 1,
      },
      backupSet: null,
    }),
    getClusterBackupStatusService: jest
      .fn()
      .mockResolvedValue({ status: null }),
    cancelClusterBackupService: jest.fn().mockResolvedValue({ status: null }),
    listClusterBackupsService: jest
      .fn<Promise<ListClusterBackupsResponse>, [ListClusterBackupsInput | undefined]>()
      .mockResolvedValue(clusterBackupsResponse),
    validateClusterBackupSetService: jest
      .fn()
      .mockResolvedValue(validateResponse),
    ...overrides,
  };
  render(<BackupsPage {...services} />);
  return services;
}

async function openPolicyTab() {
  await screen.findByText("Succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
}

async function openOverviewTab() {
  await userEvent.click(screen.getByRole("tab", { name: "Overview" }));
  await screen.findByText("Succeeded");
}

test("renders overview and policy tabs", async () => {
  renderPage();

  expect(screen.getByText(/loading backups/i)).toBeInTheDocument();
  expect(await screen.findByText("Succeeded")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "Cluster backups" })).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Files" })).not.toBeInTheDocument();
  expect(screen.getByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(screen.getByText("2.0 KB")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
  expect(screen.getByDisplayValue("/data/mycel/backups")).toBeInTheDocument();
});

test("saves edited backup policy", async () => {
  const services = renderPage();

  await openPolicyTab();
  const dirInput = screen.getByDisplayValue("/data/mycel/backups");
  await userEvent.clear(dirInput);
  await userEvent.type(dirInput, "/new/backups");
  await userEvent.click(screen.getByRole("button", { name: /save policy/i }));

  await waitFor(() =>
    expect(services.updateBackupPolicyService).toHaveBeenCalledWith({
      ...policy,
      backupDir: "/new/backups",
    }),
  );
  expect(await screen.findByText(/backup policy saved/i)).toBeInTheDocument();
});

test("updates archive format and weekly schedule fields", async () => {
  const services = renderPage();

  await openPolicyTab();
  const [archiveFormatSelect, scheduleKindSelect] =
    screen.getAllByRole("combobox");
  await userEvent.selectOptions(
    archiveFormatSelect,
    "BACKUP_ARCHIVE_FORMAT_ZIP",
  );
  await userEvent.selectOptions(scheduleKindSelect, "weekly");
  await userEvent.click(screen.getByLabelText("Mon"));
  await userEvent.click(screen.getByLabelText("Wed"));
  await userEvent.click(screen.getByRole("button", { name: /save policy/i }));

  await waitFor(() =>
    expect(services.updateBackupPolicyService).toHaveBeenCalledWith({
      ...policy,
      archiveFormat: "BACKUP_ARCHIVE_FORMAT_ZIP",
      scheduleKind: "weekly",
      weekdays: [1, 3],
    }),
  );
});

test("renders field hints for obscure backup settings", async () => {
  renderPage();

  await openPolicyTab();

  expect(
    screen.getByRole("button", { name: /backup directory help/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/filesystem path on the mycel daemon/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: /archive format help/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/backup archive\/container format/i),
  ).toBeInTheDocument();
});

test("keeps backup data readable while hiding mutation actions without backup manage capability", async () => {
  renderPage({
    principalContext: {
      session: {
        addr: "127.0.0.1:19091",
        principalId: "prn_reader",
        username: "reader",
      },
      roles: [],
      capabilities: ["CAPABILITY_BACKUP_READ"],
      capabilityState: {
        kind: "complete",
        capabilities: [{ capability: "CAPABILITY_BACKUP_READ" }],
      },
      warnings: [],
    },
  });

  expect(await screen.findByText("Succeeded")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /trigger backup/i }),
  ).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
  expect(
    screen.queryByRole("button", { name: /save policy/i }),
  ).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("/data/mycel/backups")).toBeDisabled();

  await openOverviewTab();
  expect(screen.getByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

test("triggers a manual backup and refreshes", async () => {
  const services = renderPage();

  await screen.findByText("Succeeded");
  await userEvent.click(
    screen.getByRole("button", { name: /trigger local backup/i }),
  );

  await waitFor(() =>
    expect(services.triggerBackupService).toHaveBeenCalledWith({
      reason: "Triggered from Mycel Console",
    }),
  );
  expect(services.listBackupsService).toHaveBeenCalledTimes(2);
});

test("starts and validates cluster backups", async () => {
  const services = renderPage();

  await screen.findByText("Succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Cluster backups" }));
  expect(screen.getByText("backup-set-1")).toBeInTheDocument();

  const startButtons = screen.getAllByRole("button", {
    name: /start cluster backup/i,
  });
  await userEvent.click(startButtons[startButtons.length - 1]);
  await waitFor(() =>
    expect(services.startClusterBackupService).toHaveBeenCalledWith(
      expect.objectContaining({
        outputDir: "/data/mycel/backups",
        reason: "Triggered from Mycel Console",
      }),
    ),
  );
  expect(await screen.findByText(/cluster backup started/i)).toBeInTheDocument();

  const textboxes = screen.getAllByRole("textbox");
  await userEvent.type(textboxes[textboxes.length - 1], "/mnt/backups/backup-set-1");
  await userEvent.click(screen.getByRole("button", { name: /^validate$/i }));
  await waitFor(() =>
    expect(services.validateClusterBackupSetService).toHaveBeenCalledWith({
      backupSetPath: "/mnt/backups/backup-set-1",
    }),
  );
  expect(await screen.findByText(/cluster backup set is valid/i)).toBeInTheDocument();
});

test("renders guided restore plan and gates generated commands behind confirmations", async () => {
  const services = renderPage({
    validateClusterBackupSetService: jest
      .fn()
      .mockResolvedValue(restorePlanValidateResponse),
  });

  await screen.findByText("Succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Cluster backups" }));
  const textboxes = screen.getAllByRole("textbox");
  await userEvent.type(textboxes[textboxes.length - 1], "/backups/backup-set-1");
  await userEvent.click(screen.getByRole("button", { name: /^validate$/i }));

  await waitFor(() =>
    expect(services.validateClusterBackupSetService).toHaveBeenCalledWith({
      backupSetPath: "/backups/backup-set-1",
    }),
  );
  expect(await screen.findByText(/guided offline restore plan/i)).toBeInTheDocument();
  expect(screen.getByText("myceld-0")).toBeInTheDocument();
  expect(screen.getByText("system:42")).toBeInTheDocument();
  expect(screen.getByText(/confirm every restore prerequisite/i)).toBeInTheDocument();
  expect(screen.queryByText(/restore-local --backup-set/i)).not.toBeInTheDocument();

  for (const label of [
    /restore is offline/i,
    /target cluster is stopped/i,
    /target data dirs\/pvcs are fresh and empty/i,
    /ordinal mapping has been reviewed/i,
    /required secrets and external storage are available/i,
  ]) {
    await userEvent.click(screen.getByRole("checkbox", { name: label }));
  }

  expect(
    await screen.findByText(/mycel --output json admin backup cluster restore-plan/),
  ).toBeInTheDocument();
  expect(screen.getByText(/restore-local --backup-set '\/backups\/backup-set-1' --ordinal 0 --data-dir \/data\/mycel/)).toBeInTheDocument();
});

test("renders invalid cluster backup set errors without restore actions", async () => {
  renderPage({
    validateClusterBackupSetService: jest
      .fn()
      .mockResolvedValue(invalidValidateResponse),
  });

  await screen.findByText("Succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Cluster backups" }));
  const textboxes = screen.getAllByRole("textbox");
  await userEvent.type(textboxes[textboxes.length - 1], "/backups/bad-set");
  await userEvent.click(screen.getByRole("button", { name: /^validate$/i }));

  expect(await screen.findByText(/checksum mismatch/i)).toBeInTheDocument();
  expect(screen.queryByText(/guided offline restore plan/i)).not.toBeInTheDocument();
});

test("opens a delete confirmation dialog", async () => {
  renderPage();

  await screen.findByText("backup-1.tar.zst");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(
    screen.getByRole("heading", { name: /confirm delete/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/removes the backup archive and manifest/i),
  ).toBeInTheDocument();
});

test("deletes a backup after confirmation and refreshes from the daemon", async () => {
  const listBackupsService = jest
    .fn<Promise<ListBackupsResponse>, [ListBackupsInput | undefined]>()
    .mockResolvedValueOnce(backupsResponse)
    .mockResolvedValueOnce({ backups: [], nextPageToken: "" });
  const services = renderPage({ listBackupsService });

  await screen.findByText("backup-1.tar.zst");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: /delete backup/i }));

  await waitFor(() =>
    expect(services.deleteBackupService).toHaveBeenCalledWith("backup-1"),
  );
  expect(
    await screen.findByText(/backup deleted: backup-1/i),
  ).toBeInTheDocument();
  expect(screen.queryByText("backup-1.tar.zst")).not.toBeInTheDocument();
  expect(listBackupsService).toHaveBeenCalledTimes(2);
});

test("renders backend errors", async () => {
  renderPage({
    getBackupPolicyService: jest
      .fn()
      .mockRejectedValue(new Error("Backup policy unavailable")),
  });

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Backup policy unavailable",
  );
});
