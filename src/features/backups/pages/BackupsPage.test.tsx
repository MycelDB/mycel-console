import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BackupsPage } from "./BackupsPage";
import type {
  BackupPolicyInfo,
  BackupStatusResponse,
  ListBackupsInput,
  ListBackupsResponse,
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
    state: "succeeded",
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

function renderPage(overrides: Partial<Parameters<typeof BackupsPage>[0]> = {}) {
  const services = {
    getBackupPolicyService: jest.fn<Promise<BackupPolicyInfo>, []>().mockResolvedValue(policy),
    updateBackupPolicyService: jest.fn<Promise<BackupPolicyInfo>, [BackupPolicyInfo]>().mockResolvedValue(policy),
    getBackupStatusService: jest.fn<Promise<BackupStatusResponse>, []>().mockResolvedValue(status),
    listBackupsService: jest.fn<Promise<ListBackupsResponse>, [ListBackupsInput | undefined]>().mockResolvedValue(backupsResponse),
    triggerBackupService: jest.fn().mockResolvedValue({ status: null, backup: null }),
    deleteBackupService: jest.fn().mockResolvedValue({ backupId: "backup-1" }),
    ...overrides,
  };
  render(<BackupsPage {...services} />);
  return services;
}

async function openPolicyTab() {
  await screen.findByText("succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
}

async function openFilesTab() {
  await screen.findByText("succeeded");
  await userEvent.click(screen.getByRole("tab", { name: "Files" }));
}

test("renders status, policy, and backup files tabs", async () => {
  renderPage();

  expect(screen.getByText(/loading backups/i)).toBeInTheDocument();
  expect(await screen.findByText("succeeded")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Status" })).toHaveAttribute("aria-selected", "true");

  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
  expect(screen.getByDisplayValue("/data/mycel/backups")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Files" }));
  expect(screen.getByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(screen.getByText("2.0 KB")).toBeInTheDocument();
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
  const [archiveFormatSelect, scheduleKindSelect] = screen.getAllByRole("combobox");
  await userEvent.selectOptions(archiveFormatSelect, "BACKUP_ARCHIVE_FORMAT_ZIP");
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

  expect(screen.getByRole("button", { name: /backup directory help/i })).toBeInTheDocument();
  expect(screen.getByText(/filesystem path on the mycel daemon/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /archive format help/i })).toBeInTheDocument();
  expect(screen.getByText(/backup archive\/container format/i)).toBeInTheDocument();
});

test("keeps backup data readable while hiding mutation actions without backup manage capability", async () => {
  renderPage({
    principalContext: {
      session: { addr: "127.0.0.1:19091", principalId: "prn_reader", username: "reader" },
      roles: [],
      capabilities: ["CAPABILITY_BACKUP_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_BACKUP_READ" }] },
      warnings: [],
    },
  });

  expect(await screen.findByText("succeeded")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /trigger backup/i })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Policy" }));
  expect(screen.queryByRole("button", { name: /save policy/i })).not.toBeInTheDocument();
  expect(screen.getByDisplayValue("/data/mycel/backups")).toBeDisabled();

  await userEvent.click(screen.getByRole("tab", { name: "Files" }));
  expect(screen.getByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
});

test("triggers a manual backup and refreshes", async () => {
  const services = renderPage();

  await screen.findByText("succeeded");
  await userEvent.click(screen.getByRole("button", { name: /trigger backup/i }));

  await waitFor(() =>
    expect(services.triggerBackupService).toHaveBeenCalledWith({
      reason: "Triggered from Mycel Console",
    }),
  );
  expect(services.listBackupsService).toHaveBeenCalledTimes(2);
});

test("opens a delete confirmation dialog", async () => {
  renderPage();

  await openFilesTab();
  await screen.findByText("backup-1.tar.zst");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));

  expect(screen.getByRole("heading", { name: /confirm delete/i })).toBeInTheDocument();
  expect(screen.getByText(/removes the backup archive and manifest/i)).toBeInTheDocument();
});

test("deletes a backup after confirmation and refreshes from the daemon", async () => {
  const listBackupsService = jest
    .fn<Promise<ListBackupsResponse>, [ListBackupsInput | undefined]>()
    .mockResolvedValueOnce(backupsResponse)
    .mockResolvedValueOnce({ backups: [], nextPageToken: "" });
  const services = renderPage({ listBackupsService });

  await openFilesTab();
  await screen.findByText("backup-1.tar.zst");
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  await userEvent.click(screen.getByRole("button", { name: /delete backup/i }));

  await waitFor(() => expect(services.deleteBackupService).toHaveBeenCalledWith("backup-1"));
  expect(await screen.findByText(/backup deleted: backup-1/i)).toBeInTheDocument();
  expect(screen.queryByText("backup-1.tar.zst")).not.toBeInTheDocument();
  expect(listBackupsService).toHaveBeenCalledTimes(2);
});

test("renders backend errors", async () => {
  renderPage({ getBackupPolicyService: jest.fn().mockRejectedValue(new Error("Backup policy unavailable")) });

  expect(await screen.findByRole("alert")).toHaveTextContent("Backup policy unavailable");
});
