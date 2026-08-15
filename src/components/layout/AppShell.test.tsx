import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

jest.mock("../../features/dashboard/components/BackupStatusCard", () => ({
  BackupStatusCard: () => <div>Backup status summary</div>,
}));

jest.mock("../../services/adminService", () => ({
  getBackupStatus: jest.fn().mockResolvedValue({ status: null, quiesce: null }),
  getPrincipal: jest.fn().mockResolvedValue({ principalId: "prn_alice", username: "alice", state: "PRINCIPAL_STATE_ACTIVE", loginEnabled: true }),
  getSpace: jest.fn().mockResolvedValue({ spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" }),
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
  listPrincipalCapabilities: jest.fn().mockResolvedValue({ grants: [], effectiveCapabilities: ["CAPABILITY_IDENTITY_GRANT_MANAGE"] }),
  listPrincipalRoles: jest.fn().mockResolvedValue({ grants: [{ roleGrantId: "role_1", principalId: "usr_alice", role: "system_admin", scope: { type: "ACCESS_SCOPE_TYPE_SYSTEM" } }], effectiveRoles: ["system_admin"] }),
  listPrincipalSessions: jest.fn().mockResolvedValue({ sessions: [], nextPageToken: "" }),
  cancelSemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  getSemanticMaintenanceStatus: jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 0, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 }),
  listSemanticMaintenanceWork: jest.fn().mockResolvedValue({ items: [] }),
  listSemanticIndexes: jest.fn().mockResolvedValue({ indexes: [], nextPageToken: "" }),
  retrySemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  listSpaces: jest.fn().mockResolvedValue({ spaces: [], nextPageToken: "" }),
  listPrincipals: jest.fn().mockResolvedValue({
    principals: [{ principalId: "prn_alice", username: "alice", state: "PRINCIPAL_STATE_ACTIVE", loginEnabled: true }],
    nextPageToken: "",
  }),
}));

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_operator",
  username: "operator",
};

function renderShell(path = "/dashboard", onLogout = jest.fn(), props: Partial<ComponentProps<typeof AppShell>> = {}) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell
        session={session}
        loggingOut={false}
        logoutError=""
        theme="dark"
        onToggleTheme={jest.fn()}
        onLogout={onLogout}
        {...props}
      />
    </MemoryRouter>,
  );
  return { onLogout };
}

test("renders dashboard route", () => {
  renderShell("/dashboard");

  expect(screen.getByText(/capability-oriented console for a mycel cluster/i)).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
});

test("renders account route", () => {
  renderShell("/me");

  expect(screen.getByRole("heading", { name: /my principal/i })).toBeInTheDocument();
  expect(screen.getByText("prn_operator")).toBeInTheDocument();
});

test("redirects principals route when principal read capability is missing", async () => {
  renderShell("/principals", jest.fn(), {
    principalContext: {
      session,
      roles: [],
      capabilities: [],
      capabilityState: { kind: "complete", capabilities: [] },
      warnings: [],
    },
  });

  expect(screen.queryByRole("heading", { name: "Principal Management" })).not.toBeInTheDocument();
  expect(screen.getByText(/capability-oriented console for a mycel cluster/i)).toBeInTheDocument();
});

test("renders principals section route", async () => {
  renderShell("/principals");

  expect(screen.getByRole("heading", { name: "Principal Management" })).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
});

test("renders principal detail route", async () => {
  renderShell("/principals/prn_alice");

  expect(await screen.findByRole("heading", { name: "alice" })).toBeInTheDocument();
  expect(screen.getByText("prn_alice")).toBeInTheDocument();
});

test("renders access route", async () => {
  renderShell("/access");

  expect(screen.getByRole("heading", { name: /roles & capabilities/i })).toBeInTheDocument();
  expect(await screen.findAllByText("system_admin")).toHaveLength(2);
});

test("renders principal access route", async () => {
  renderShell("/principals/prn_alice/access");

  expect(screen.getByRole("heading", { name: /roles & capabilities/i })).toBeInTheDocument();
  expect(await screen.findByText("CAPABILITY_IDENTITY_GRANT_MANAGE")).toBeInTheDocument();
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
