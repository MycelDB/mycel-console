import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { NodeDetailPage } from "./NodeDetailPage";
import { getClusterRuntimeStatus, getClusterStatus, listClusterMembers, listRaftGroups } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterStatus: jest.fn(),
  getClusterRuntimeStatus: jest.fn(),
  listClusterMembers: jest.fn(),
  listRaftGroups: jest.fn(),
}));

const mockedGetClusterStatus = getClusterStatus as jest.MockedFunction<typeof getClusterStatus>;
const mockedGetClusterRuntimeStatus = getClusterRuntimeStatus as jest.MockedFunction<typeof getClusterRuntimeStatus>;
const mockedListClusterMembers = listClusterMembers as jest.MockedFunction<typeof listClusterMembers>;
const mockedListRaftGroups = listRaftGroups as jest.MockedFunction<typeof listRaftGroups>;

describe("NodeDetailPage", () => {
  beforeEach(() => {
    mockedGetClusterStatus.mockResolvedValue({
      node: { nodeId: "node_a", nodeName: "node-a", state: "clustered" },
      cluster: { clusterId: "cluster_a", clusterName: "dev", mode: "clustered" },
      peers: [{ nodeId: "node_b", nodeName: "node-b", clusterId: "cluster_a", clusterName: "dev", backendAdvertiseAddr: "127.0.0.1:9094", state: "active", source: "discovered", lastSeenAt: "2026-07-15T16:12:59Z" }],
    });
    mockedListClusterMembers.mockResolvedValue({
      clusterId: "cluster_a",
      clusterName: "dev",
      members: [{ nodeName: "node-b", nodeId: "node_b", state: "active", backendAdvertiseAddr: "127.0.0.1:9094", joinedAt: "2026-07-15T16:12:59Z" }],
    });
    mockedGetClusterRuntimeStatus.mockResolvedValue({ engine: "static", clusterName: "dev", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 });
    mockedListRaftGroups.mockResolvedValue({ groups: [] });
  });

  it("renders raft responsibilities", async () => {
    mockedGetClusterRuntimeStatus.mockResolvedValue({ engine: "raft", clusterName: "dev", raftNodeCount: 3, raftPartitionCount: 16, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["node-a:9091", "node-b:9091", "node-c:9091"], raftGroupCount: 17, raftGroupsWithLeader: 17 });
    mockedListRaftGroups.mockResolvedValue({ groups: [
      { groupId: "system", kind: "system", localNodeId: 1, leaderNodeId: 2, preferredLeaderNodeId: 1, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0, lastIndex: 2, snapshotIndex: 0 },
      { groupId: "space-partition-7", kind: "partition", partitionId: 7, localNodeId: 1, leaderNodeId: 2, preferredLeaderNodeId: 2, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0, lastIndex: 2, snapshotIndex: 0 },
    ] });
    render(
      <MemoryRouter initialEntries={["/cluster/nodes/node-b"]}>
        <Routes><Route path="/cluster/nodes/:nodeKey" element={<NodeDetailPage />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Raft responsibilities")).toBeInTheDocument();
    expect(screen.getByText("leader")).toBeInTheDocument();
    expect(screen.getByText(/space-partition-7/)).toBeInTheDocument();
  });

  it("renders node details", async () => {
    render(
      <MemoryRouter initialEntries={["/cluster/nodes/node_b"]}>
        <Routes><Route path="/cluster/nodes/:nodeKey" element={<NodeDetailPage />} /></Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "node-b" })).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:9094")).toBeInTheDocument();
    expect(screen.getByText("not enforced yet")).toBeInTheDocument();
  });
});
