import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClusterSummaryCard } from "./ClusterSummaryCard";
import type {
  ClusterHealthInfo,
  ClusterRuntimeStatusInfo,
  ClusterStatusInfo,
} from "../../../types/cluster";
import { themeClasses } from "../../../components/typography";

const runtime: ClusterRuntimeStatusInfo = {
  engine: "static",
  clusterName: "dev",
  raftNodeCount: 0,
  raftPartitionCount: 0,
  raftReplicaFactor: 0,
  localRaftNodeId: 0,
  raftNodeAddrs: [],
  raftGroupCount: 0,
  raftGroupsWithLeader: 0,
};

const status: ClusterStatusInfo = {
  node: {
    nodeId: "node_1",
    nodeName: "node-a",
    state: "standalone",
    admitted: true,
  },
  cluster: {
    clusterId: "cluster_a",
    clusterName: "dev",
    mode: "standalone",
  },
  peers: [],
  readiness: {
    clientReady: true,
    metadataApplied: true,
    metadataValidated: true,
    partitionGroupsStarted: false,
    authoritativeClusterId: "cluster_a",
    localClusterId: "cluster_a",
    expectedMemberCount: 1,
    readinessBlockers: [],
  },
};

function health(overrides: Partial<ClusterHealthInfo> = {}): ClusterHealthInfo {
  return {
    status: "healthy",
    warnings: [],
    activeMembers: 1,
    pendingMembers: 0,
    unreachablePeers: 0,
    readiness: status.readiness,
    ...overrides,
  };
}

function renderCard(
  overrides: Partial<Parameters<typeof ClusterSummaryCard>[0]> = {},
) {
  const services = {
    getClusterRuntimeStatusService: jest.fn().mockResolvedValue(runtime),
    getClusterStatusService: jest.fn().mockResolvedValue(status),
    getClusterHealthService: jest.fn().mockResolvedValue(health()),
    listRaftGroupsService: jest
      .fn()
      .mockResolvedValue({ groups: [], nextPageToken: "" }),
    getClusterSpaceDistributionService: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
  render(<ClusterSummaryCard addr="127.0.0.1:9091" {...services} />);
  return services;
}

function metricValue(label: string) {
  const metric = screen.getByText(label).closest("div");
  if (!metric) throw new Error(`Metric ${label} not found`);
  const value = within(metric).getByText(
    (_, element) => element?.tagName.toLowerCase() === "dd",
  );
  return value;
}

test("attributes health request failure and marks only Health as danger", async () => {
  const getClusterHealthService = jest
    .fn()
    .mockRejectedValue(new Error("health transport failed"));
  renderCard({ getClusterHealthService });

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Cluster health: health transport failed");
  expect(metricValue("Health")).toHaveClass(`text-${"rose"}-700`);
  expect(metricValue("Mode")).toHaveClass(`${themeClasses.text.parts.primaryLight}`);
  expect(metricValue("Readiness")).toHaveClass("text-emerald-700");
  expect(metricValue("Nodes")).toHaveClass(`${themeClasses.text.parts.primaryLight}`);

  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(getClusterHealthService).toHaveBeenCalledTimes(2);
});

test("renders degraded and unhealthy health with different tones", async () => {
  const { rerender } = render(
    <ClusterSummaryCard
      addr="127.0.0.1:9091"
      getClusterRuntimeStatusService={jest.fn().mockResolvedValue(runtime)}
      getClusterStatusService={jest.fn().mockResolvedValue(status)}
      getClusterHealthService={jest
        .fn()
        .mockResolvedValue(health({ status: "degraded" }))}
      listRaftGroupsService={jest
        .fn()
        .mockResolvedValue({ groups: [], nextPageToken: "" })}
      getClusterSpaceDistributionService={jest.fn().mockResolvedValue(null)}
    />,
  );

  expect(await screen.findByText("Degraded")).toHaveClass(
    `text-${"amber"}-700`,
  );

  rerender(
    <ClusterSummaryCard
      addr="127.0.0.1:9091"
      getClusterRuntimeStatusService={jest.fn().mockResolvedValue(runtime)}
      getClusterStatusService={jest.fn().mockResolvedValue(status)}
      getClusterHealthService={jest
        .fn()
        .mockResolvedValue(health({ status: "unhealthy" }))}
      listRaftGroupsService={jest
        .fn()
        .mockResolvedValue({ groups: [], nextPageToken: "" })}
      getClusterSpaceDistributionService={jest.fn().mockResolvedValue(null)}
    />,
  );

  expect(await screen.findByText("Unhealthy")).toHaveClass(
    `text-${"rose"}-700`,
  );
});
