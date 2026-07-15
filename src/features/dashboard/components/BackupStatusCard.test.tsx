import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BackupStatusCard } from "./BackupStatusCard";
import type { BackupStatusResponse, ListBackupsResponse } from "../../../types/backups";

const status: BackupStatusResponse = {
  status: {
    backupId: "backup-2",
    state: "succeeded",
    startedAt: "2026-07-06T20:00:00Z",
    completedAt: "2026-07-06T20:00:10Z",
    archivePath: "/data/mycel/backups/backup-2.tar.zst",
    manifestPath: "/data/mycel/backups/backup-2.json",
    error: "",
    participants: [],
    lastSuccessAt: "2026-07-06T20:00:10Z",
    nextRunAt: "2026-07-06T21:00:00Z",
  },
  quiesce: { participants: [] },
};

const backups: ListBackupsResponse = {
  backups: [
    {
      backupId: "backup-2",
      archiveName: "backup-2.tar.zst",
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

function renderCard(
  getBackupStatusService = jest.fn().mockResolvedValue(status),
  listBackupsService = jest.fn().mockResolvedValue(backups),
) {
  render(
    <MemoryRouter>
      <BackupStatusCard
        getBackupStatusService={getBackupStatusService}
        listBackupsService={listBackupsService}
      />
    </MemoryRouter>,
  );
  return { getBackupStatusService, listBackupsService };
}

test("renders recent backup status and files", async () => {
  renderCard();

  expect(screen.getByText(/loading backup status/i)).toBeInTheDocument();
  expect(await screen.findByText("succeeded")).toBeInTheDocument();
  expect(screen.getAllByText("2026-07-06 20:00:10 UTC")).toHaveLength(2);
  expect(screen.getByText("2026-07-06 21:00:00 UTC")).toBeInTheDocument();
  expect(screen.getByText("backup-2.tar.zst")).toBeInTheDocument();
  expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  expect(screen.getByText("TAR.ZST")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage backups/i })).toHaveAttribute(
    "href",
    "/backups",
  );
});

test("requests three recent backups", async () => {
  const { listBackupsService } = renderCard();

  await screen.findByText("backup-2.tar.zst");

  expect(listBackupsService).toHaveBeenCalledWith({ pageSize: 3, pageToken: "" });
});

test("renders empty backup list", async () => {
  renderCard(jest.fn().mockResolvedValue(status), jest.fn().mockResolvedValue({ backups: [], nextPageToken: "" }));

  expect(await screen.findByText(/no backup files found/i)).toBeInTheDocument();
});

test("renders backup loading errors", async () => {
  renderCard(jest.fn().mockRejectedValue(new Error("Backup API unavailable")));

  expect(await screen.findByRole("alert")).toHaveTextContent("Backup API unavailable");
});
