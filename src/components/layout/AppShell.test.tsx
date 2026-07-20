import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

jest.mock("../../features/dashboard/components/BackupStatusCard", () => ({
  BackupStatusCard: () => <div>Backup status summary</div>,
}));

jest.mock("../../services/adminService", () => ({
  getBackupStatus: jest.fn().mockResolvedValue({ status: null, quiesce: null }),
  getSpace: jest.fn().mockResolvedValue({ spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" }),
  getUser: jest.fn().mockResolvedValue({ userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" }),
  listDomains: jest.fn().mockResolvedValue({ domains: [], nextPageToken: "" }),
  listBackups: jest.fn().mockResolvedValue({ backups: [], nextPageToken: "" }),
  listInferencePackages: jest.fn().mockResolvedValue({
    packages: [
      {
        inferencePackageId: "pkg-1",
        name: "standard-openai-chat",
        version: "2026-06",
        source: "standard-openai-chat.json",
        checksum: "abc",
        definitionCounts: { models: 2 },
        installedAt: "2026-07-06T20:00:00Z",
        installedBy: "admin",
      },
    ],
    nextPageToken: "",
  }),
  listUserSessions: jest.fn().mockResolvedValue({ sessions: [], nextPageToken: "" }),
  cancelSemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  getSemanticMaintenanceStatus: jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 0, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 }),
  listSemanticMaintenanceWork: jest.fn().mockResolvedValue({ items: [] }),
  listSemanticIndexes: jest.fn().mockResolvedValue({ indexes: [], nextPageToken: "" }),
  retrySemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  listSpaces: jest.fn().mockResolvedValue({ spaces: [], nextPageToken: "" }),
  listUsers: jest.fn().mockResolvedValue({
    users: [{ userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" }],
    nextPageToken: "",
  }),
}));

const session = {
  addr: "127.0.0.1:9091",
  operatorId: "operator-1",
  username: "operator",
};

function renderShell(path = "/dashboard", onLogout = jest.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell
        session={session}
        loggingOut={false}
        logoutError=""
        theme="dark"
        onToggleTheme={jest.fn()}
        onLogout={onLogout}
      />
    </MemoryRouter>,
  );
  return { onLogout };
}

test("renders dashboard route", () => {
  renderShell("/dashboard");

  expect(screen.getByText(/monitor mycel cluster state/i)).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
});

test("renders users section route", async () => {
  renderShell("/users");

  expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
});

test("renders user detail route", async () => {
  renderShell("/users/usr_alice");

  expect(await screen.findByRole("heading", { name: "alice" })).toBeInTheDocument();
  expect(screen.getByText("usr_alice")).toBeInTheDocument();
});

test("renders space detail route", async () => {
  renderShell("/spaces/sp_main");

  expect(screen.getByRole("heading", { name: "sp_main" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Main" })).toBeInTheDocument();
});

test("renders inference packages route", async () => {
  renderShell("/inference");

  expect(screen.getByRole("heading", { name: /inference packages/i })).toBeInTheDocument();
  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
});

test("invokes logout from persistent header", async () => {
  const onLogout = jest.fn();
  renderShell("/maintenance", onLogout);

  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});
