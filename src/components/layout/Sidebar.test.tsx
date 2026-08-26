import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";

const session = { addr: "127.0.0.1:9091", principalId: "prn_operator", username: "operator" };

function renderSidebar(props: Partial<Parameters<typeof Sidebar>[0]> = {}) {
  const onToggleTheme = jest.fn();
  const onLogout = jest.fn();
  render(
    <MemoryRouter>
      <Sidebar session={session} theme="dark" loggingOut={false} onToggleTheme={onToggleTheme} onLogout={onLogout} {...props} />
    </MemoryRouter>,
  );
  return { onToggleTheme, onLogout };
}

test("renders main navigation links", () => {
  renderSidebar();

  for (const label of [
    "Dashboard",
    "Activity",
    "Principals",
    "Spaces",
    "Access",
    "Automations",
    "Semantic",
    "Backups",
  ]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
  expect(screen.getByText("Overview")).toBeInTheDocument();
  expect(screen.getByText("Data")).toBeInTheDocument();
  expect(screen.getByText("Intelligence")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Domains" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Access management" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Inference" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Maintenance" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
});

test("marks the active route", () => {
  render(
    <MemoryRouter initialEntries={["/principals"]}>
      <Sidebar session={session} theme="dark" loggingOut={false} onToggleTheme={jest.fn()} onLogout={jest.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Principals" })).toHaveAttribute("aria-current", "page");
});

test("filters navigation when complete capabilities are available", () => {
  renderSidebar({
    principalContext: {
      session: { addr: "127.0.0.1:19091", principalId: "prn_viewer", username: "viewer" },
      roles: [],
      capabilities: ["CAPABILITY_SPACE_READ", "CAPABILITY_AUDIT_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SPACE_READ" }, { capability: "CAPABILITY_AUDIT_READ" }] },
      warnings: [],
    },
  });

  expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Activity" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Account" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Spaces" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Principals" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Backups" })).not.toBeInTheDocument();
});

test("shows cluster navigation only for raft runtimes", () => {
  renderSidebar({
    principalContext: {
      session,
      roles: [],
      capabilities: ["CAPABILITY_CLUSTER_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_CLUSTER_READ" }] },
      warnings: [],
      clusterRuntime: { engine: "static", clusterName: "dev", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 },
    },
  });
  expect(screen.queryByRole("link", { name: "Cluster" })).not.toBeInTheDocument();
});

test("shows cluster navigation for raft runtimes", () => {
  renderSidebar({
    principalContext: {
      session,
      roles: [],
      capabilities: ["CAPABILITY_CLUSTER_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_CLUSTER_READ" }] },
      warnings: [],
      clusterRuntime: { engine: "raft", clusterName: "dev", raftNodeCount: 3, raftPartitionCount: 16, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["a", "b", "c"], raftGroupCount: 17, raftGroupsWithLeader: 17 },
    },
  });
  expect(screen.getByRole("link", { name: "Cluster" })).toBeInTheDocument();
});

test("renders session controls at the bottom", async () => {
  const { onToggleTheme, onLogout } = renderSidebar();

  expect(screen.getByRole("link", { name: /signed in as operator/i })).toHaveAttribute("href", "/me");
  expect(screen.getByText("operator")).toBeInTheDocument();
  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));
  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onToggleTheme).toHaveBeenCalledTimes(1);
  expect(onLogout).toHaveBeenCalledTimes(1);
});
