import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { getBackupStatus, getClusterRuntimeStatus } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterRuntimeStatus: jest.fn().mockResolvedValue({ engine: "static", clusterName: "dev", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 }),
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

const mockedGetBackupStatus = getBackupStatus as jest.Mock;
const mockedGetClusterRuntimeStatus = getClusterRuntimeStatus as jest.Mock;

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_operator",
  username: "operator",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders dashboard cards and shortcuts", async () => {
  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.queryByText("operator")).not.toBeInTheDocument();
  expect(screen.queryByText("Principal")).not.toBeInTheDocument();
  expect(await screen.findByText("Standalone")).toBeInTheDocument();
  expect(screen.getByText("Connected")).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
  expect(await screen.findByText("backup-1.tar.zst")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage backups/i })).toHaveAttribute("href", "/backups");
  expect(screen.getByRole("link", { name: /manage principals/i })).toHaveAttribute("href", "/principals");
});

test("shows cluster topology counts for raft runtime", async () => {
  mockedGetClusterRuntimeStatus.mockResolvedValueOnce({ engine: "raft", clusterName: "prod", raftNodeCount: 4, raftPartitionCount: 32, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["a", "b", "c", "d"], raftGroupCount: 33, raftGroupsWithLeader: 33 });

  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Cluster")).toBeInTheDocument();
  expect(screen.getByText("Pods / nodes")).toBeInTheDocument();
  expect(screen.getByText("Partitions")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();
  expect(screen.getByText("32")).toBeInTheDocument();
});

test("hides backup panel for principals without backup read capability", async () => {
  render(
    <MemoryRouter>
      <DashboardPage
        session={session}
        principalContext={{
          session,
          roles: [],
          capabilities: [],
          capabilityState: { kind: "complete", capabilities: [] },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Standalone")).toBeInTheDocument();
  expect(screen.queryByText(/backup status/i)).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /manage backups/i })).not.toBeInTheDocument();
  expect(mockedGetBackupStatus).not.toHaveBeenCalled();
});
