import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { NodeDetailPage } from "./NodeDetailPage";
import { getClusterStatus, listClusterMembers } from "../../../services/adminService";

jest.mock("../../../services/adminService", () => ({
  getClusterStatus: jest.fn(),
  listClusterMembers: jest.fn(),
}));

const mockedGetClusterStatus = getClusterStatus as jest.MockedFunction<typeof getClusterStatus>;
const mockedListClusterMembers = listClusterMembers as jest.MockedFunction<typeof listClusterMembers>;

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
      members: [{ nodeName: "node-b", nodeId: "node_b", state: "active", backendAdvertiseAddr: "127.0.0.1:9094", role: "member", joinedAt: "2026-07-15T16:12:59Z" }],
    });
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
