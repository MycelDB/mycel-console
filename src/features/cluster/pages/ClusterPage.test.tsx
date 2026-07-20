import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClusterPage } from "./ClusterPage";
import { getClusterHealth, getClusterRuntimeStatus, getClusterStatus, listClusterMembers, listRaftGroups, lookupSpaceRoute } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterStatus: jest.fn(),
  getClusterRuntimeStatus: jest.fn(),
  getClusterHealth: jest.fn(),
  listClusterMembers: jest.fn(),
  listRaftGroups: jest.fn(),
  lookupSpaceRoute: jest.fn(),
}));

const mockedGetClusterStatus = getClusterStatus as jest.MockedFunction<typeof getClusterStatus>;
const mockedGetClusterHealth = getClusterHealth as jest.MockedFunction<typeof getClusterHealth>;
const mockedGetClusterRuntimeStatus = getClusterRuntimeStatus as jest.MockedFunction<typeof getClusterRuntimeStatus>;
const mockedListRaftGroups = listRaftGroups as jest.MockedFunction<typeof listRaftGroups>;
const mockedLookupSpaceRoute = lookupSpaceRoute as jest.MockedFunction<typeof lookupSpaceRoute>;
const mockedListClusterMembers = listClusterMembers as jest.MockedFunction<typeof listClusterMembers>;

describe("ClusterPage", () => {
  beforeEach(() => {
    mockedGetClusterStatus.mockReset();
    mockedGetClusterHealth.mockReset();
    mockedGetClusterRuntimeStatus.mockReset();
    mockedListRaftGroups.mockReset();
    mockedLookupSpaceRoute.mockReset();
    mockedListClusterMembers.mockReset();
    mockedListClusterMembers.mockResolvedValue({ clusterId: "cluster_a", clusterName: "dev-cluster", members: [] });
    mockedGetClusterRuntimeStatus.mockResolvedValue({ engine: "static", clusterName: "dev-cluster", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 });
    mockedListRaftGroups.mockResolvedValue({ groups: [] });
    mockedLookupSpaceRoute.mockResolvedValue({ spaceId: "490851b9-0038-4afc-b1f0-d1bd9e829bc8", partitionId: 7, leaderNodeId: 2, replicaNodeIds: [1, 2, 3] });
    mockedGetClusterHealth.mockResolvedValue({ status: "healthy", warnings: [], activeMembers: 1, pendingMembers: 0, unreachablePeers: 0 });
  });

  it("renders clustered overview and tabbed cluster sections", async () => {
    const user = userEvent.setup();
    mockedGetClusterStatus.mockResolvedValue({
      node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true },
      cluster: { clusterId: "cluster_a", clusterName: "dev-cluster", mode: "clustered" },
      peers: [
        { nodeId: "node_a", nodeName: "node-a", clusterId: "cluster_a", clusterName: "dev-cluster", backendAdvertiseAddr: "127.0.0.1:9093", state: "self", source: "self", lastSeenAt: "2026-07-15T16:12:01Z" },
        { nodeId: "node_b", nodeName: "node-b", clusterId: "cluster_a", clusterName: "dev-cluster", backendAdvertiseAddr: "127.0.0.1:9094", state: "active", source: "discovered", lastSeenAt: "2026-07-15T16:12:59Z" },
      ],
    });
    mockedListClusterMembers.mockResolvedValue({
      clusterId: "cluster_a",
      clusterName: "dev-cluster",
      members: [
        { nodeName: "node-a", nodeId: "node_a", state: "active", clusterBootstrap: true, joinedAt: "2026-07-15T16:12:01Z" },
        { nodeName: "node-c", state: "pending", tokenId: "join_tok_1", tokenExpiresAt: "2026-07-15T16:42:00Z" },
      ],
    });

    render(<MemoryRouter><ClusterPage /></MemoryRouter>);

    await waitFor(() => expect(mockedGetClusterStatus).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText("dev-cluster")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("clustered").length).toBeGreaterThan(0);
    expect(screen.queryByText("primary")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Topology" }));
    expect(screen.getByText("node-b")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:9094")).toBeInTheDocument();
    expect(screen.getByText("local node")).toBeInTheDocument();
    expect(screen.getByText("raft peer")).toBeInTheDocument();

    expect(screen.queryByRole("tab", { name: "Membership" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Events" }));
    expect(screen.getByText("Cluster Events")).toBeInTheDocument();
    expect(screen.getByText("Join token issued for node-c")).toBeInTheDocument();
  });

  it("renders raft overview, groups, and route lookup", async () => {
    const user = userEvent.setup();
    mockedGetClusterRuntimeStatus.mockResolvedValue({ engine: "raft", clusterName: "raft-dev", raftNodeCount: 3, raftPartitionCount: 16, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["a:9091", "b:9091", "c:9091"], raftGroupCount: 17, raftGroupsWithLeader: 17 });
    mockedListRaftGroups.mockResolvedValue({ groups: [
      { groupId: "system", kind: "system", localNodeId: 1, leaderNodeId: 1, preferredLeaderNodeId: 1, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0 },
      { groupId: "space-partition-7", kind: "partition", partitionId: 7, localNodeId: 1, leaderNodeId: 2, preferredLeaderNodeId: 2, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0 },
    ] });
    mockedGetClusterStatus.mockResolvedValue({ node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true }, cluster: { clusterId: "cluster_a", clusterName: "raft-dev", mode: "clustered" }, peers: [] });
    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    expect(await screen.findByText("Cluster engine")).toBeInTheDocument();
    expect(screen.queryByText("Add Node")).not.toBeInTheDocument();
    expect(screen.getByText("Raft diagnostics")).toBeInTheDocument();
    expect(screen.getByText("System group has leader")).toBeInTheDocument();
    expect(screen.getByText("All partitions have leaders")).toBeInTheDocument();
    expect(screen.getByText("Space route lookup")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/space id route lookup/i), "490851b9-0038-4afc-b1f0-d1bd9e829bc8");
    await user.click(screen.getByRole("button", { name: /lookup route/i }));
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(mockedLookupSpaceRoute).toHaveBeenCalledWith({ spaceId: "490851b9-0038-4afc-b1f0-d1bd9e829bc8" });
    await user.click(screen.getByRole("tab", { name: "Raft groups" }));
    expect(screen.getByText("space-partition-7")).toBeInTheDocument();
  });

  it("renders load errors", async () => {
    mockedGetClusterStatus.mockRejectedValue(new Error("boom"));
    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
