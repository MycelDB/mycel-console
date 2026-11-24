import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { getBackupObservability, getClusterHealth, getClusterRuntimeStatus, getClusterSpaceDistribution, getClusterStatus, listBackupSets, listRaftGroups } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterRuntimeStatus: jest.fn().mockResolvedValue({ engine: "static", clusterName: "dev", raftNodeCount: 0, raftPartitionCount: 0, raftReplicaFactor: 0, localRaftNodeId: 0, raftNodeAddrs: [], raftGroupCount: 0, raftGroupsWithLeader: 0 }),
  getClusterStatus: jest.fn().mockResolvedValue({ node: { nodeId: "node_1", nodeName: "node-a", state: "standalone", admitted: true }, cluster: { clusterId: "cluster_a", clusterName: "dev", mode: "standalone" }, peers: [], readiness: { clientReady: true, metadataApplied: true, metadataValidated: true, partitionGroupsStarted: false, authoritativeClusterId: "cluster_a", localClusterId: "cluster_a", expectedMemberCount: 1, readinessBlockers: [] } }),
  getClusterHealth: jest.fn().mockResolvedValue({ status: "healthy", warnings: [], activeMembers: 1, pendingMembers: 0, unreachablePeers: 0, readiness: { clientReady: true, metadataApplied: true, metadataValidated: true, partitionGroupsStarted: false, authoritativeClusterId: "cluster_a", localClusterId: "cluster_a", expectedMemberCount: 1, readinessBlockers: [] } }),
  listRaftGroups: jest.fn().mockResolvedValue({ groups: [] }),
  getClusterSpaceDistribution: jest.fn().mockResolvedValue({ totalSpaces: 6, routedSpaces: 6, unavailableRoutes: 0, partitionsUsed: 4, partitionCount: 32, maxPartitionSpaces: 2, minPartitionSpaces: 0, skewRatio: 2, partitions: Array.from({ length: 32 }, (_, partitionId) => ({ partitionId, spaceCount: partitionId < 4 ? 1 : 0 })), nodes: [{ nodeId: 1, label: "1 (a)", leaderSpaceCount: 2, replicaSpaceCount: 6 }] }),
  getBackupObservability: jest.fn().mockResolvedValue({
    snapshot: {
      observedAt: "2026-07-06T20:00:10Z",
      repositoryId: "repo-1",
      metrics: [],
      alerts: [],
      summaryState: "healthy",
    },
  }),
  listActivityEvents: jest.fn().mockResolvedValue({
    events: [
      {
        eventId: "evt_1",
        occurredAt: "1780000000",
        ingestedAt: "1780000001",
        severity: "info",
        category: "lifecycle",
        eventType: "daemon.started",
        message: "Daemon started",
        source: "daemon",
        actor: "",
        resource: "",
        correlationId: "",
      },
    ],
    nextPageToken: "",
  }),
  listBackupSets: jest.fn().mockResolvedValue({
    backupSets: [
      {
        backupSetId: "backup-set-1",
        repositoryId: "repo-1",
        deploymentId: "deployment-1",
        deploymentName: "dev",
        deploymentMode: "BACKUP_DEPLOYMENT_MODE_STANDALONE",
        state: "BACKUP_OPERATION_STATE_SUCCEEDED",
        createdAt: "2026-07-06T20:00:00Z",
        completedAt: "2026-07-06T20:00:10Z",
        expectedNodeCount: 1,
        manifestUri: "s3://repo/backup-set-1/backup-set.json",
        nodes: [],
      },
    ],
    nextPageToken: "",
  }),
}));

const mockedGetBackupObservability = getBackupObservability as jest.Mock;
const mockedListBackupSets = listBackupSets as jest.Mock;
const mockedGetClusterRuntimeStatus = getClusterRuntimeStatus as jest.Mock;
const mockedGetClusterStatus = getClusterStatus as jest.Mock;
const mockedGetClusterHealth = getClusterHealth as jest.Mock;
const mockedListRaftGroups = listRaftGroups as jest.Mock;
const mockedGetClusterSpaceDistribution = getClusterSpaceDistribution as jest.Mock;

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_operator",
  username: "operator",
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("renders dashboard cards", async () => {
  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.queryByText("operator")).not.toBeInTheDocument();
  expect(screen.queryByText("Principal")).not.toBeInTheDocument();
  expect(await screen.findByText("Deployment topology")).toBeInTheDocument();
  expect(screen.getByText("Standalone")).toBeInTheDocument();
  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.getByText("Healthy")).toBeInTheDocument();
  expect(screen.queryByText("Connected")).not.toBeInTheDocument();
  expect(screen.getByText(/latest activity/i)).toBeInTheDocument();
  expect(await screen.findByText("Daemon started")).toBeInTheDocument();
  expect(await screen.findByText("backup-set-1")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage backups/i })).toHaveAttribute("href", "/backups");
});

test("shows cluster topology counts for raft runtime", async () => {
  mockedGetClusterRuntimeStatus.mockResolvedValueOnce({ engine: "raft", clusterName: "prod", raftNodeCount: 4, raftPartitionCount: 32, raftReplicaFactor: 3, localRaftNodeId: 1, raftNodeAddrs: ["a", "b", "c", "d"], raftGroupCount: 33, raftGroupsWithLeader: 33 });
  mockedGetClusterStatus.mockResolvedValueOnce({ node: { nodeId: "node_1", nodeName: "node-a", state: "clustered", admitted: true }, cluster: { clusterId: "cluster_a", clusterName: "prod", mode: "clustered" }, peers: [], readiness: { clientReady: true, metadataApplied: true, metadataValidated: true, partitionGroupsStarted: true, authoritativeClusterId: "cluster_a", localClusterId: "cluster_a", expectedMemberCount: 4, readinessBlockers: [] } });
  mockedGetClusterHealth.mockResolvedValueOnce({ status: "healthy", warnings: [], activeMembers: 4, pendingMembers: 0, unreachablePeers: 0 });
  mockedListRaftGroups.mockResolvedValueOnce({ groups: Array.from({ length: 33 }, (_, index) => ({ groupId: index === 0 ? "system" : `space-partition-${index - 1}`, kind: index === 0 ? "system" : "partition", localNodeId: 1, leaderNodeId: 1, replicaNodeIds: [1, 2, 3], health: "healthy", term: 1, commitIndex: 1, appliedIndex: 1, applyLag: 0, lastIndex: 1, snapshotIndex: 0 })) });

  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Clustered Raft")).toBeInTheDocument();
  expect(screen.getByText("Nodes")).toBeInTheDocument();
  expect(screen.getByText("Partitions")).toBeInTheDocument();
  expect(screen.getByText("Replica factor")).toBeInTheDocument();
  expect(screen.getByText("Raft leaders")).toBeInTheDocument();
  expect(screen.getByText("4/4")).toBeInTheDocument();
  expect(screen.getByText("32")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
  expect(screen.getByText("33/33")).toBeInTheDocument();
  expect(await screen.findByText("Space distribution")).toBeInTheDocument();
  expect(screen.getByText("Spaces per pod/node")).toBeInTheDocument();
  expect(mockedListRaftGroups).toHaveBeenCalled();
  expect(mockedGetClusterSpaceDistribution).toHaveBeenCalled();
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
  expect(mockedGetBackupObservability).not.toHaveBeenCalled();
  expect(mockedListBackupSets).not.toHaveBeenCalled();
});
