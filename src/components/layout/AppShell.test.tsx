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
  getClusterRuntimeStatus: jest.fn().mockResolvedValue({
    engine: "standalone",
    localNodeId: 1,
    raftNodeCount: 1,
    raftPartitionCount: 0,
    raftNodeAddrs: ["127.0.0.1:9091"],
  }),
  getClusterStatus: jest.fn().mockResolvedValue({
    cluster: { mode: "static" },
    readiness: { clientReady: true },
  }),
  getClusterHealth: jest
    .fn()
    .mockResolvedValue({ status: "healthy", readiness: { clientReady: true } }),
  listRaftGroups: jest
    .fn()
    .mockResolvedValue({ groups: [], nextPageToken: "" }),
  getClusterSpaceDistribution: jest.fn().mockResolvedValue({
    totalSpaces: 0,
    routedSpaces: 0,
    unavailableRoutes: 0,
    partitionsUsed: 0,
    partitionCount: 0,
    maxPartitionSpaces: 0,
    minPartitionSpaces: 0,
    skewRatio: 0,
    partitions: [],
    nodes: [],
  }),
  getMyAccess: jest.fn().mockResolvedValue({
    principal: {
      addr: "127.0.0.1:9091",
      principalId: "prn_operator",
      username: "operator",
    },
    effectiveRoles: ["system_admin"],
    effectiveCapabilities: ["*"],
    roles: [],
    capabilities: [{ capability: "*", source: "role", role: "system_admin" }],
    warnings: [],
    complete: true,
  }),
  getPrincipal: jest.fn().mockResolvedValue({
    principalId: "prn_alice",
    username: "alice",
    state: "PRINCIPAL_STATE_ACTIVE",
    loginEnabled: true,
  }),
  getSpace: jest.fn().mockResolvedValue({
    spaceId: "sp_main",
    name: "Main",
    state: "SPACE_STATE_ACTIVE",
  }),
  listDomains: jest.fn().mockResolvedValue({ domains: [], nextPageToken: "" }),
  listBackups: jest.fn().mockResolvedValue({ backups: [], nextPageToken: "" }),
  listActivityEvents: jest
    .fn()
    .mockResolvedValue({ events: [], nextPageToken: "" }),
  listModelEndpoints: jest.fn().mockResolvedValue({
    modelEndpoints: [
      {
        modelEndpointId: "ep1",
        key: "openai",
        name: "OpenAI",
        connectorType: "openai-compatible",
        endpointUrl: "https://api.openai.com/v1",
        networkClass: "external_https",
        privacyClass: "third_party",
        authModes: ["api_key"],
        operations: ["chat"],
        enabled: true,
      },
    ],
    nextPageToken: "",
  }),
  listModels: jest.fn().mockResolvedValue({ models: [], nextPageToken: "" }),
  listVectorStores: jest
    .fn()
    .mockResolvedValue({ vectorStores: [], nextPageToken: "" }),
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
  listModelEndpointCapabilities: jest.fn().mockResolvedValue({
    modelEndpointCapabilities: [
      {
        modelEndpointCapabilityId: "cap1",
        modelEndpointId: "ep1",
        modelId: "m1",
        operation: "chat",
        enabled: true,
      },
    ],
    nextPageToken: "",
  }),
  listPrincipalCapabilities: jest.fn().mockResolvedValue({
    grants: [],
    effectiveCapabilities: ["CAPABILITY_IDENTITY_GRANT_MANAGE"],
  }),
  listPrincipalRoles: jest.fn().mockResolvedValue({
    grants: [
      {
        roleGrantId: "role_1",
        principalId: "usr_alice",
        role: "system_admin",
        scope: { type: "ACCESS_SCOPE_TYPE_SYSTEM" },
      },
    ],
    effectiveRoles: ["system_admin"],
  }),
  grantPrincipalRole: jest
    .fn()
    .mockResolvedValue({ grant: {}, effectiveCapabilities: [] }),
  revokePrincipalRole: jest
    .fn()
    .mockResolvedValue({ effectiveCapabilities: [] }),
  grantPrincipalCapability: jest
    .fn()
    .mockResolvedValue({ grant: {}, effectiveCapabilities: [] }),
  revokePrincipalCapability: jest
    .fn()
    .mockResolvedValue({ effectiveCapabilities: [] }),
  listPrincipalSessions: jest
    .fn()
    .mockResolvedValue({ sessions: [], nextPageToken: "" }),
  cancelSemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  getSemanticMaintenanceStatus: jest.fn().mockResolvedValue({
    enabled: true,
    degraded: false,
    degradedReason: "",
    queueDepthPending: 0,
    queueDepthRunning: 0,
    queueDepthFailedRetryable: 0,
    queueDepthFailedPermanent: 0,
    oldestPendingAgeSeconds: 0,
    lastDirtyEventAt: "",
    lastAnalyzedAt: "",
    lastWorkerSuccessAt: "",
    lastWorkerErrorAt: "",
    throttleState: "",
    analyzerRuns: 0,
    workerRuns: 0,
  }),
  listSemanticMaintenanceWork: jest.fn().mockResolvedValue({ items: [] }),
  listSemanticRules: jest
    .fn()
    .mockResolvedValue({ rules: [], nextPageToken: "" }),
  retrySemanticMaintenanceWork: jest.fn().mockResolvedValue({}),
  listSpaces: jest.fn().mockResolvedValue({ spaces: [], nextPageToken: "" }),
  listPrincipals: jest.fn().mockResolvedValue({
    principals: [
      {
        principalId: "prn_alice",
        username: "alice",
        state: "PRINCIPAL_STATE_ACTIVE",
        loginEnabled: true,
      },
    ],
    nextPageToken: "",
  }),
}));

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_operator",
  username: "operator",
};

function renderShell(
  path = "/dashboard",
  onLogout = jest.fn(),
  props: Partial<ComponentProps<typeof AppShell>> = {},
) {
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

test("renders dashboard route", async () => {
  renderShell("/dashboard");

  expect(
    screen.getByText(/capability-oriented console for a mycel cluster/i),
  ).toBeInTheDocument();
  expect(await screen.findByText("Standalone")).toBeInTheDocument();
  expect(screen.getByText(/latest activity/i)).toBeInTheDocument();
});

test("renders account route", () => {
  renderShell("/me");

  expect(
    screen.getByRole("heading", { name: /my principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("prn_operator")).toBeInTheDocument();
});

test("redirects cluster routes for static runtimes", async () => {
  renderShell("/cluster", jest.fn(), {
    principalContext: {
      session,
      roles: ["system.admin"],
      capabilities: ["*"],
      capabilityState: {
        kind: "complete",
        capabilities: [{ capability: "*" }],
      },
      warnings: [],
      clusterRuntime: {
        engine: "static",
        clusterName: "dev",
        raftNodeCount: 0,
        raftPartitionCount: 0,
        raftReplicaFactor: 0,
        localRaftNodeId: 0,
        raftNodeAddrs: [],
        raftGroupCount: 0,
        raftGroupsWithLeader: 0,
      },
    },
  });

  expect(
    screen.queryByRole("heading", { name: "Cluster" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/capability-oriented console for a mycel cluster/i),
  ).toBeInTheDocument();
  expect(await screen.findByText("Standalone")).toBeInTheDocument();
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

  expect(
    screen.queryByRole("heading", { name: "Principals" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText(/capability-oriented console for a mycel cluster/i),
  ).toBeInTheDocument();
  expect(await screen.findByText("Standalone")).toBeInTheDocument();
});

test("renders principals section route", async () => {
  renderShell("/principals");

  expect(
    screen.getByRole("heading", { name: "Principals" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
});

test("renders principal detail route", async () => {
  renderShell("/principals/prn_alice");

  expect(
    await screen.findByRole("heading", { name: "alice" }),
  ).toBeInTheDocument();
  expect(screen.getByText("prn_alice")).toBeInTheDocument();
});

test("redirects access route to principals", async () => {
  renderShell("/access");

  expect(
    screen.getByRole("heading", { name: "Principals" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
});

test("renders principal detail roles and capabilities tab", async () => {
  renderShell("/principals/prn_alice?tab=access");

  expect(
    await screen.findByRole("heading", { name: "alice" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("tab", { name: /roles & capabilities/i }),
  ).toHaveAttribute("aria-selected", "true");
  await screen.findByText("Edit selected scope");
  expect(
    screen.getAllByText("CAPABILITY_IDENTITY_GRANT_MANAGE").length,
  ).toBeGreaterThan(0);
});

test("renders space detail route", async () => {
  renderShell("/spaces/sp_main");

  expect(screen.getByRole("heading", { name: "sp_main" })).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Main" }),
  ).toBeInTheDocument();
});

test("redirects inference route to Models", async () => {
  renderShell("/inference");

  expect(
    screen.getByRole("heading", { name: /^models$/i }),
  ).toBeInTheDocument();
  expect(await screen.findByRole("tab", { name: "Endpoints" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

test("renders vector stores route", async () => {
  renderShell("/intelligence/vector-stores");

  expect(
    screen.getByRole("heading", { name: "Vector stores" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByText("No vector stores found."),
  ).toBeInTheDocument();
});

test("invokes logout from persistent sidebar", async () => {
  const onLogout = jest.fn();
  renderShell("/dashboard", onLogout);

  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});
