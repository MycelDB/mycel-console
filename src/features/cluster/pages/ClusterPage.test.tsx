import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClusterPage } from "./ClusterPage";
import { getClusterHealth, getClusterRuntimeStatus, getClusterStatus, getGraphConsistencyReport, getLocalGraphConsistency, getLocalGraphForensicExport, listClusterMembers, listRaftGroups, lookupSpaceRoute } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterStatus: jest.fn(),
  getClusterRuntimeStatus: jest.fn(),
  getClusterHealth: jest.fn(),
  getLocalGraphConsistency: jest.fn(),
  getGraphConsistencyReport: jest.fn(),
  getLocalGraphForensicExport: jest.fn(),
  listClusterMembers: jest.fn(),
  listRaftGroups: jest.fn(),
  lookupSpaceRoute: jest.fn(),
}));

const mockedGetClusterStatus = getClusterStatus as jest.MockedFunction<typeof getClusterStatus>;
const mockedGetClusterHealth = getClusterHealth as jest.MockedFunction<typeof getClusterHealth>;
const mockedGetClusterRuntimeStatus = getClusterRuntimeStatus as jest.MockedFunction<typeof getClusterRuntimeStatus>;
const mockedGetLocalGraphConsistency = getLocalGraphConsistency as jest.MockedFunction<typeof getLocalGraphConsistency>;
const mockedGetGraphConsistencyReport = getGraphConsistencyReport as jest.MockedFunction<typeof getGraphConsistencyReport>;
const mockedGetLocalGraphForensicExport = getLocalGraphForensicExport as jest.MockedFunction<typeof getLocalGraphForensicExport>;
const mockedListRaftGroups = listRaftGroups as jest.MockedFunction<typeof listRaftGroups>;
const mockedLookupSpaceRoute = lookupSpaceRoute as jest.MockedFunction<typeof lookupSpaceRoute>;
const mockedListClusterMembers = listClusterMembers as jest.MockedFunction<typeof listClusterMembers>;

describe("ClusterPage", () => {
  beforeEach(() => {
    mockedGetClusterStatus.mockReset();
    mockedGetClusterHealth.mockReset();
    mockedGetClusterRuntimeStatus.mockReset();
    mockedGetLocalGraphConsistency.mockReset();
    mockedGetGraphConsistencyReport.mockReset();
    mockedGetLocalGraphForensicExport.mockReset();
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
    mockedGetClusterRuntimeStatus.mockResolvedValue({
      engine: "raft",
      clusterName: "raft-dev",
      raftNodeCount: 3,
      raftPartitionCount: 16,
      raftReplicaFactor: 3,
      localRaftNodeId: 1,
      raftNodeAddrs: ["a:9091", "b:9091", "c:9091"],
      raftGroupCount: 17,
      raftGroupsWithLeader: 17,
      raftTransport: {
        sendAttempts: 12,
        sendFailures: 1,
        authFailures: 0,
        missingSenderFailures: 1,
        lastFailureReason: "missing_sender",
        lastGroupId: "system",
        lastSourceNodeId: 1,
        lastTargetNodeId: 2,
        lastMessageType: "MsgApp",
        targets: [{ groupId: "system", targetNodeId: 2, sendAttempts: 4, sendFailures: 1, authFailures: 0, missingSenderFailures: 1, lastFailureReason: "missing_sender" }],
      },
    });
    mockedListRaftGroups.mockResolvedValue({ groups: [
      { groupId: "system", kind: "system", localNodeId: 1, leaderNodeId: 1, preferredLeaderNodeId: 1, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0, lastIndex: 4, snapshotIndex: 2, healthReason: "ok", readDiagnostics: { readIndexAttempts: 2, readIndexSuccesses: 1, readIndexFailures: 1, readIndexTimeouts: 0, readIndexNoLeader: 0, readIndexNotLeader: 0, applyWaitFailures: 0, lastFailureReason: "timeout", lastAppliedWaitMillis: 3 } },
      { groupId: "space-partition-7", kind: "partition", partitionId: 7, localNodeId: 1, leaderNodeId: 2, preferredLeaderNodeId: 2, replicaNodeIds: [1,2,3], health: "healthy", term: 1, commitIndex: 2, appliedIndex: 2, applyLag: 0, lastIndex: 2, snapshotIndex: 0, healthReason: "ok", readDiagnostics: { readIndexAttempts: 2, readIndexSuccesses: 2, readIndexFailures: 0, readIndexTimeouts: 0, readIndexNoLeader: 0, readIndexNotLeader: 0, applyWaitFailures: 0, lastAppliedWaitMillis: 1 } },
    ] });
    mockedGetClusterStatus.mockResolvedValue({ node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true }, cluster: { clusterId: "cluster_a", clusterName: "raft-dev", mode: "clustered" }, peers: [] });
    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    expect(await screen.findByText("Cluster engine")).toBeInTheDocument();
    expect(screen.queryByText("Add Node")).not.toBeInTheDocument();
    expect(screen.getByText("Raft diagnostics")).toBeInTheDocument();
    expect(screen.getByText("System group has leader")).toBeInTheDocument();
    expect(screen.getByText("All partitions have leaders")).toBeInTheDocument();
    expect(screen.getByText("Raft transport diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Auth failures")).toBeInTheDocument();
    expect(screen.getAllByText("missing_sender").length).toBeGreaterThan(0);
    expect(screen.getByText("Snapshot and compaction guidance")).toBeInTheDocument();
    expect(screen.getByText(/system@2/)).toBeInTheDocument();
    expect(screen.getByText(/Automatic production raft compaction remains off\/conservative/i)).toBeInTheDocument();
    expect(screen.getByText(/make test-cluster-soak/i)).toBeInTheDocument();
    expect(screen.getByText("Space route lookup")).toBeInTheDocument();
    await user.type(screen.getByLabelText(/space id route lookup/i), "490851b9-0038-4afc-b1f0-d1bd9e829bc8");
    await user.click(screen.getByRole("button", { name: /lookup route/i }));
    expect(await screen.findByText("7")).toBeInTheDocument();
    expect(mockedLookupSpaceRoute).toHaveBeenCalledWith({ spaceId: "490851b9-0038-4afc-b1f0-d1bd9e829bc8" });
    await user.click(screen.getByRole("tab", { name: "Raft groups" }));
    expect(screen.getByText("space-partition-7")).toBeInTheDocument();
    expect(screen.getByText("Snapshot")).toBeInTheDocument();
    expect(screen.getAllByText("Read failures").length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText(/raft group status filter/i), "read_failures");
    expect(screen.getAllByText("system").length).toBeGreaterThan(0);
    expect(screen.queryByText("space-partition-7")).not.toBeInTheDocument();
  });

  it("renders healthy client readiness checks", async () => {
    mockedGetClusterRuntimeStatus.mockResolvedValue({ engine: "raft", clusterName: "raft-dev", raftNodeCount: 3, raftPartitionCount: 16, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["a:9091", "b:9091", "c:9091"], raftGroupCount: 17, raftGroupsWithLeader: 17 });
    mockedGetClusterStatus.mockResolvedValue({
      node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true },
      cluster: { clusterId: "cluster_a", clusterName: "raft-dev", mode: "clustered" },
      peers: [],
      readiness: {
        clientReady: true,
        metadataApplied: true,
        metadataValidated: true,
        partitionGroupsStarted: true,
        authoritativeClusterId: "cluster_a",
        localClusterId: "cluster_a",
        expectedMemberCount: 3,
        readinessBlockers: [],
      },
    });

    render(<MemoryRouter><ClusterPage /></MemoryRouter>);

    expect(await screen.findByText("Client ready")).toBeInTheDocument();
    expect(screen.getAllByText("Metadata applied").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Metadata validated").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Partition groups started").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cluster ID match").length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/Metadata applied: Whether committed system Raft metadata/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Client readiness: Overall safe-to-serve signal/i)).toBeInTheDocument();
    expect(screen.getByText(/admin port is open/i)).toBeInTheDocument();
    expect(screen.getByText("1 (a:9091)")).toBeInTheDocument();
  });

  it("renders blocked readiness from cluster health", async () => {
    mockedGetClusterStatus.mockResolvedValue({
      node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true },
      cluster: { clusterId: "cluster_local", clusterName: "raft-dev", mode: "clustered" },
      peers: [],
    });
    mockedGetClusterHealth.mockResolvedValue({
      status: "degraded",
      warnings: [],
      activeMembers: 2,
      pendingMembers: 1,
      unreachablePeers: 0,
      readiness: {
        clientReady: false,
        metadataApplied: true,
        metadataValidated: false,
        partitionGroupsStarted: false,
        authoritativeClusterId: "cluster_authoritative",
        localClusterId: "cluster_local",
        expectedMemberCount: 3,
        readinessBlockers: ["system raft metadata has not been validated"],
      },
    });

    render(<MemoryRouter><ClusterPage /></MemoryRouter>);

    expect(await screen.findByText("Not client ready")).toBeInTheDocument();
    expect(screen.getByText("Readiness blockers")).toBeInTheDocument();
    expect(screen.getByText("system raft metadata has not been validated")).toBeInTheDocument();
    expect(screen.getByText(/local cluster_local/i)).toBeInTheDocument();
    expect(screen.getByText(/auth cluster_authoritative/i)).toBeInTheDocument();
  });

  it("runs read-only graph consistency diagnostics", async () => {
    const user = userEvent.setup();
    const stats = {
      spaceId: "sp_main",
      domainId: "dom_default",
      partitionId: 7,
      revision: 42,
      nodeCount: 10,
      edgeCount: 9,
      nodeChecksum: "nodes",
      edgeChecksum: "edges",
      graphChecksum: "graph",
      checksumAlgorithm: "sha256",
      collectedAt: "2026-07-20T10:00:00Z",
      source: "local",
    };
    mockedGetClusterStatus.mockResolvedValue({ node: { nodeId: "node_a", nodeName: "node-a", state: "clustered", admitted: true, bootstrap: true }, cluster: { clusterId: "cluster_a", clusterName: "raft-dev", mode: "clustered" }, peers: [] });
    mockedGetLocalGraphConsistency.mockResolvedValue({ stats, warnings: ["local warning"] });
    mockedGetGraphConsistencyReport.mockResolvedValue({
      status: "divergent",
      spaceId: "sp_main",
      domainId: "dom_default",
      partitionId: 7,
      localNodeId: 1,
      leaderNodeId: 2,
      expectedReplicaNodeIds: [1, 2, 3],
      replicas: [
        { raftNodeId: 1, nodeName: "node-a", local: true, reachable: true, stats },
        { raftNodeId: 2, nodeName: "node-b", local: false, reachable: false, error: "unreachable" },
      ],
      warnings: [{ code: "CHECKSUM_MISMATCH", severity: "critical", raftNodeId: 2, message: "replica checksum differs" }],
      comparisonBasis: "latest-state-checksum",
    });
    mockedGetLocalGraphForensicExport.mockResolvedValue({
      manifest: { reportId: "report-1", sourceNodeName: "node-a", collectedAt: "2026-07-20T10:00:00Z" },
      stats,
      nodes: [{ id: "node-1", checksum: "n1", canonicalJson: "{}" }],
      edges: [{ id: "edge-1", checksum: "e1", canonicalJson: "{}" }],
      nextPageToken: "page-2",
      truncated: true,
      warnings: ["forensic warning"],
    });

    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    await user.click(await screen.findByRole("tab", { name: "Consistency" }));
    expect(screen.getByText(/read-only latest-state evidence/i)).toBeInTheDocument();
    await user.type(screen.getByLabelText(/consistency space id/i), "sp_main");
    await user.type(screen.getByLabelText(/consistency domain id/i), "dom_default");
    await user.click(screen.getByRole("button", { name: /run local check/i }));
    expect(await screen.findByText("Local latest-state check")).toBeInTheDocument();
    expect(screen.getByText("graph")).toBeInTheDocument();
    expect(mockedGetLocalGraphConsistency).toHaveBeenCalledWith({ spaceId: "sp_main", domainId: "dom_default" });

    await user.click(screen.getByRole("button", { name: /run cluster report/i }));
    expect(await screen.findByText("Cluster consistency report")).toBeInTheDocument();
    expect(screen.getByText("divergent")).toBeInTheDocument();
    expect(screen.getByText(/CHECKSUM_MISMATCH/)).toBeInTheDocument();
    expect(screen.getByText("unreachable")).toBeInTheDocument();
    expect(mockedGetGraphConsistencyReport).toHaveBeenCalledWith({ spaceId: "sp_main", domainId: "dom_default" });

    await user.click(screen.getByRole("button", { name: /run forensic export/i }));
    expect(await screen.findByText("Local forensic export")).toBeInTheDocument();
    expect(screen.getByText(/Export response is truncated/i)).toBeInTheDocument();
    expect(screen.getByText("report-1")).toBeInTheDocument();
    expect(screen.getByText("page-2")).toBeInTheDocument();
    expect(screen.getByText("forensic warning")).toBeInTheDocument();
    expect(mockedGetLocalGraphForensicExport).toHaveBeenCalledWith({ spaceId: "sp_main", domainId: "dom_default", pageSize: 100, pageToken: "", sourceLabel: "admin-ui" });
  });

  it("renders load errors", async () => {
    mockedGetClusterStatus.mockRejectedValue(new Error("boom"));
    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
