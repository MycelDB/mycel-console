import { render, screen } from "@testing-library/react";
import { GraphResultCanvas } from "./GraphResultCanvas";

test("renders an empty graph message", () => {
  render(<GraphResultCanvas graph={{ nodes: [], edges: [] }} />);

  expect(screen.getByText(/no graph elements returned/i)).toBeInTheDocument();
});

test("renders Cytoscape graph toolbar and canvas for graph elements", () => {
  render(
    <GraphResultCanvas
      graph={{
        nodes: [
          { nodeId: "family_1", labels: ["Family"], properties: { name: "Family" } },
          { nodeId: "person_martin", labels: ["Person"], properties: { name: "Martin" } },
        ],
        edges: [{ edgeId: "edge_1", fromNodeId: "family_1", toNodeId: "person_martin", labels: ["MEMBER"] }],
      }}
    />,
  );

  expect(screen.getByText(/2 nodes · 1 edges/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /fit/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /relayout/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /clear selection/i })).toBeDisabled();
  expect(screen.getByRole("img", { name: /graph result visualization/i })).toBeInTheDocument();
  expect(screen.getByText(/select a node or edge/i)).toBeInTheDocument();
});

test("shows warnings for omitted edges", () => {
  render(
    <GraphResultCanvas
      graph={{
        nodes: [{ nodeId: "family_1", labels: ["Family"], properties: { name: "Family" } }],
        edges: [{ edgeId: "edge_1", fromNodeId: "family_1", toNodeId: "missing_person", labels: ["MEMBER"] }],
      }}
    />,
  );

  expect(screen.getByText(/1 edge was omitted because endpoints were not returned/i)).toBeInTheDocument();
});
