import { render, screen } from "@testing-library/react";
import { ClusterEventLog } from "./ClusterEventLog";
import type { ActivityEventInfo } from "../../../types/activity";

const clusterEvent: ActivityEventInfo = {
  eventId: "evt_cluster_1",
  occurredAt: "1780000000",
  ingestedAt: "1780000001",
  severity: "info",
  category: "cluster",
  eventType: "cluster.node.joined",
  message: "node-b joined the cluster",
  source: "node-b",
  actor: "",
  resource: "node-b",
  correlationId: "",
};

describe("ClusterEventLog", () => {
  it("renders cluster activity event rows", () => {
    render(<ClusterEventLog events={[clusterEvent]} />);

    expect(screen.getByText("Cluster activity")).toBeInTheDocument();
    expect(screen.getByText("cluster.node.joined")).toBeInTheDocument();
    expect(screen.getByText("node-b joined the cluster")).toBeInTheDocument();
    expect(screen.getByText("node-b")).toBeInTheDocument();
  });

  it("renders unavailable and empty states", () => {
    render(<ClusterEventLog events={[]} error="audit read denied" />);

    expect(screen.getByText("audit read denied")).toBeInTheDocument();
    expect(screen.getByText("No cluster activity events found.")).toBeInTheDocument();
  });
});
