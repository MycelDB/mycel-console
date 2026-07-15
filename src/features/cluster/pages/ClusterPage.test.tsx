import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { ClusterPage } from "./ClusterPage";
import { addClusterNode, getClusterStatus, listClusterMembers } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  addClusterNode: jest.fn(),
  getClusterStatus: jest.fn(),
  listClusterMembers: jest.fn(),
}));

const mockedGetClusterStatus = getClusterStatus as jest.MockedFunction<typeof getClusterStatus>;
const mockedAddClusterNode = addClusterNode as jest.MockedFunction<typeof addClusterNode>;
const mockedListClusterMembers = listClusterMembers as jest.MockedFunction<typeof listClusterMembers>;

describe("ClusterPage", () => {
  beforeEach(() => {
    mockedGetClusterStatus.mockReset();
    mockedAddClusterNode.mockReset();
    mockedListClusterMembers.mockReset();
    mockedListClusterMembers.mockResolvedValue({ clusterId: "cluster_a", clusterName: "dev-cluster", members: [] });
  });

  it("renders clustered overview and peer table", async () => {
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
        { nodeName: "node-a", nodeId: "node_a", state: "active", role: "member", clusterBootstrap: true, joinedAt: "2026-07-15T16:12:01Z" },
        { nodeName: "node-c", state: "pending", role: "member", tokenId: "join_tok_1", tokenExpiresAt: "2026-07-15T16:42:00Z" },
      ],
    });

    render(<MemoryRouter><ClusterPage /></MemoryRouter>);

    await waitFor(() => expect(mockedGetClusterStatus).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("dev-cluster")).toBeInTheDocument();
    expect(screen.getAllByText("clustered").length).toBeGreaterThan(0);
    expect(screen.getByText("node-b")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1:9094")).toBeInTheDocument();
    expect(screen.getByText("Membership")).toBeInTheDocument();
    expect(screen.getByText("node-c")).toBeInTheDocument();
    expect(screen.getByText("Cluster Events")).toBeInTheDocument();
    expect(screen.getByText("Join token issued for node-c")).toBeInTheDocument();
  });

  it("renders load errors", async () => {
    mockedGetClusterStatus.mockRejectedValue(new Error("boom"));
    render(<MemoryRouter><ClusterPage /></MemoryRouter>);
    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
