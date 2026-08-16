import { displayEdgeLabel, displayNodeLabel, graphResultToCytoscapeElements, shortenId } from "./graphResultMapping";

test("maps graph nodes and edges to Cytoscape elements", () => {
  const mapped = graphResultToCytoscapeElements({
    nodes: [
      { nodeId: "family_1", labels: ["Family"], properties: { name: "Family" } },
      { nodeId: "person_martin", labels: ["Person"], properties: { name: "Martin" } },
    ],
    edges: [
      { edgeId: "edge_1", fromNodeId: "family_1", toNodeId: "person_martin", labels: ["MEMBER"] },
    ],
  });

  expect(mapped.nodeCount).toBe(2);
  expect(mapped.edgeCount).toBe(1);
  expect(mapped.omittedEdgeCount).toBe(0);
  expect(mapped.elements).toEqual([
    expect.objectContaining({ group: "nodes", data: expect.objectContaining({ id: "family_1", label: "Family" }) }),
    expect.objectContaining({ group: "nodes", data: expect.objectContaining({ id: "person_martin", label: "Martin" }) }),
    expect.objectContaining({ group: "edges", data: expect.objectContaining({ id: "edge_1", source: "family_1", target: "person_martin", label: "MEMBER" }) }),
  ]);
});

test("uses expected node label precedence", () => {
  expect(displayNodeLabel({ nodeId: "node_1", labels: ["Person"], properties: { name: "Martin", title: "Dad", key: "martin" } })).toBe("Martin");
  expect(displayNodeLabel({ nodeId: "node_1", labels: ["Person"], properties: { title: "Dad", key: "martin" } })).toBe("Dad");
  expect(displayNodeLabel({ nodeId: "node_1", labels: ["Person"], properties: { key: "martin" } })).toBe("martin");
  expect(displayNodeLabel({ nodeId: "node_1", labels: ["Person"], properties: {} })).toBe("Person");
  expect(displayNodeLabel({ nodeId: "node_1_with_a_long_identifier", properties: {} })).toBe("node_1_w…tifier");
});

test("uses relationship labels before edge IDs", () => {
  expect(displayEdgeLabel({ edgeId: "edge_1", labels: ["MEMBER"] })).toBe("MEMBER");
  expect(displayEdgeLabel({ edgeId: "edge_1_with_a_long_identifier", labels: [] })).toBe("edge_1_w…tifier");
});

test("deduplicates nodes and edges and skips edges with missing endpoints", () => {
  const mapped = graphResultToCytoscapeElements({
    nodes: [
      { nodeId: "a", labels: ["Node"] },
      { nodeId: "a", labels: ["Duplicate"] },
      { nodeId: "b", labels: ["Node"] },
    ],
    edges: [
      { edgeId: "ab", fromNodeId: "a", toNodeId: "b", labels: ["LINK"] },
      { edgeId: "ab", fromNodeId: "a", toNodeId: "b", labels: ["LINK"] },
      { edgeId: "missing", fromNodeId: "a", toNodeId: "c", labels: ["MISSING"] },
      { edgeId: "empty", fromNodeId: "", toNodeId: "b", labels: ["MALFORMED"] },
    ],
  });

  expect(mapped.nodeCount).toBe(2);
  expect(mapped.edgeCount).toBe(1);
  expect(mapped.duplicateNodeCount).toBe(1);
  expect(mapped.duplicateEdgeCount).toBe(1);
  expect(mapped.omittedEdgeCount).toBe(2);
  expect(mapped.elements.map((element) => element.data?.id)).toEqual(["a", "b", "ab"]);
});

test("shortens long IDs", () => {
  expect(shortenId("short_id")).toBe("short_id");
  expect(shortenId("node_1_with_a_long_identifier")).toBe("node_1_w…tifier");
});
