import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddClusterNodeModal } from "./AddClusterNodeModal";

describe("AddClusterNodeModal", () => {
  it("creates a node and displays the one-time token", async () => {
    const user = userEvent.setup();
    const onAdd = jest.fn().mockResolvedValue({
      nodeName: "node-c",
      state: "pending",
      token: "mycel_join_v1_secret",
      tokenId: "token_1",
      expiresAt: "2026-07-15T16:42:00Z",
    });

    render(
      <AddClusterNodeModal
        open
        cluster={{
          node: { nodeId: "node-a", nodeName: "node-a", state: "clustered" },
          cluster: { clusterId: "cluster-a", clusterName: "dev", mode: "clustered" },
          peers: [{ backendAdvertiseAddr: "127.0.0.1:9093", state: "self", source: "self" }],
        }}
        onClose={jest.fn()}
        onAdd={onAdd}
        onAdded={jest.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Node name"), "node-c");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onAdd).toHaveBeenCalledWith({ nodeName: "node-c", tokenTtlSeconds: 1800 });
    expect(await screen.findByText("mycel_join_v1_secret")).toBeInTheDocument();
    expect(screen.getByText(/startClusterNode.sh node-c/)).toBeInTheDocument();
  });

  it("validates node name", async () => {
    const user = userEvent.setup();
    render(
      <AddClusterNodeModal open onClose={jest.fn()} onAdd={jest.fn()} onAdded={jest.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(await screen.findByText("Node name is required")).toBeInTheDocument();
  });
});
