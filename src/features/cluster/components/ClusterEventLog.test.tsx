import { render, screen } from "@testing-library/react";
import { ClusterEventLog, clusterEventsFromState } from "./ClusterEventLog";

describe("ClusterEventLog", () => {
  it("derives events from membership and topology snapshots", () => {
    const events = clusterEventsFromState(
      [
        { nodeName: "node-b", state: "active", joinedAt: "2026-07-15T16:12:00Z" },
        { nodeName: "node-c", state: "pending", tokenId: "join_tok_1", createdAt: "2026-07-15T16:13:00Z" },
      ],
      [{ backendAdvertiseAddr: "127.0.0.1:9095", nodeName: "node-d", state: "unreachable", source: "discovered", lastSeenAt: "2026-07-15T16:14:00Z" }],
    );

    expect(events.map((event) => event.type)).toEqual(["node_unreachable", "token_issued", "node_joined"]);
  });

  it("renders event rows", () => {
    render(<ClusterEventLog events={[{ id: "1", type: "node_joined", message: "node-b joined the cluster", time: "2026-07-15T16:12:00Z" }]} />);

    expect(screen.getByText("Cluster Events")).toBeInTheDocument();
    expect(screen.getByText("node_joined")).toBeInTheDocument();
    expect(screen.getByText("node-b joined the cluster")).toBeInTheDocument();
  });
});
