import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";

jest.mock("../../../services/adminService", () => ({
  getBackupStatus: jest.fn().mockResolvedValue({
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
  }),
  listBackups: jest.fn().mockResolvedValue({
    backups: [
      {
        backupId: "backup-1",
        archiveName: "backup-1.tar.zst",
        createdAt: "2026-07-06T20:00:00Z",
        completedAt: "2026-07-06T20:00:10Z",
        sizeBytes: 1024,
        checksumSha256: "abc",
        archiveFormat: "BACKUP_ARCHIVE_FORMAT_TAR_ZST",
        includeLogs: true,
      },
    ],
    nextPageToken: "",
  }),
}));

const session = {
  addr: "127.0.0.1:9091",
  operatorId: "operator-1",
  username: "operator",
};

test("renders dashboard cards and shortcuts", async () => {
  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.getByText("operator")).toBeInTheDocument();
  expect(screen.getByText("Connected")).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
  expect(await screen.findByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage backups/i })).toHaveAttribute("href", "/backups");
  expect(screen.getByRole("link", { name: /manage users/i })).toHaveAttribute("href", "/users");
});
