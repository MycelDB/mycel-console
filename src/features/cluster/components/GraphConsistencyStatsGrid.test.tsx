import { render, screen } from "@testing-library/react";
import type { LocalGraphConsistencyStatsInfo } from "../../../types/cluster";
import { GraphConsistencyStatsGrid } from "./GraphConsistencyStatsGrid";

test("renders graph consistency stats with formatted labels", () => {
  const stats = {
    revision: 42,
    nodeCount: 10,
    edgeCount: 9,
    partitionId: 1,
    graphChecksum: "graph_checksum_1234567890abcdef",
    nodeChecksum: "node_checksum_1234567890abcdef",
    edgeChecksum: "edge_checksum_1234567890abcdef",
    checksumAlgorithm: "crc32",
    collectedAt: "2026-01-02T03:04:05Z",
    source: "local",
    spaceId: "space_1234567890abcdef",
    domainId: "domain_1234567890abcdef",
  } as LocalGraphConsistencyStatsInfo;

  render(<GraphConsistencyStatsGrid stats={stats} />);

  expect(screen.getByText("Revision")).toBeInTheDocument();
  expect(screen.getByText("42")).toBeInTheDocument();
  expect(screen.getByText("Algorithm")).toBeInTheDocument();
  expect(screen.getByText("Crc32")).toBeInTheDocument();
  expect(screen.getByTitle(stats.graphChecksum || "")).toBeInTheDocument();
  expect(screen.getByTitle(stats.spaceId || "")).toBeInTheDocument();
});
