import { graphFromQueryResponse } from "./graphResultExtraction";

test("uses a non-script response graph", () => {
  const graph = graphFromQueryResponse({
    result: {
      graph: {
        nodes: [{ nodeId: "a", labels: ["Person"] }],
        edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b", labels: ["KNOWS"] }],
      },
    },
  });

  expect(graph?.nodes?.map((node) => node.nodeId)).toEqual(["a"]);
  expect(graph?.edges?.map((edge) => edge.edgeId)).toEqual(["ab"]);
});

test("merges statement graphs when aggregate script graph is missing edges", () => {
  const graph = graphFromQueryResponse({
    statements: [
      {
        result: {
          graph: {
            nodes: [{ nodeId: "family", labels: ["Family"] }, { nodeId: "martin", labels: ["Person"] }],
            edges: [{ edgeId: "member_martin", fromNodeId: "family", toNodeId: "martin", labels: ["MEMBER"] }],
          },
        },
      },
      {
        result: {
          graph: {
            nodes: [{ nodeId: "martin", labels: ["Person"] }, { nodeId: "vincent", labels: ["Person"] }],
            edges: [{ edgeId: "father_vincent", fromNodeId: "martin", toNodeId: "vincent", labels: ["FATHER_OF"] }],
          },
        },
      },
    ],
    result: {
      graph: {
        nodes: [{ nodeId: "family", labels: ["Family"] }, { nodeId: "martin", labels: ["Person"] }, { nodeId: "vincent", labels: ["Person"] }],
        edges: [],
      },
    },
  });

  expect(graph?.nodes?.map((node) => node.nodeId)).toEqual(["family", "martin", "vincent"]);
  expect(graph?.edges?.map((edge) => edge.edgeId)).toEqual(["member_martin", "father_vincent"]);
});

test("deduplicates aggregate and statement graph elements", () => {
  const graph = graphFromQueryResponse({
    statements: [{ result: { graph: { nodes: [{ nodeId: "a" }], edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b" }] } } }],
    result: { graph: { nodes: [{ nodeId: "a" }], edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b" }] } },
  });

  expect(graph?.nodes).toHaveLength(1);
  expect(graph?.edges).toHaveLength(1);
});
