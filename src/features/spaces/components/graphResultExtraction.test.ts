import { aggregateRowsFromQueryResponse, diagnosticsFromQueryResponse, diagnosticsMessage, graphFromQueryResponse, pathGraphsFromQueryResponse } from "./graphResultExtraction";

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

test("extracts path values from shaped rows", () => {
  const paths = pathGraphsFromQueryResponse({
    result: {
      rows: [
        {
          fields: {
            path: {
              path: {
                nodes: [{ nodeId: "a" }, { nodeId: "b" }],
                edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b" }],
              },
            },
          },
        },
      ],
    },
  });

  expect(paths).toHaveLength(1);
  expect(paths[0]?.nodes?.map((node) => node.nodeId)).toEqual(["a", "b"]);
  expect(paths[0]?.edges?.map((edge) => edge.edgeId)).toEqual(["ab"]);
});

test("extracts aggregate scalar rows", () => {
  const rows = aggregateRowsFromQueryResponse({
    result: {
      rows: [{ fields: { role: { scalar: "reader" }, total: { scalar: 2 }, avg: { scalar: 10.5 } } }],
    },
  });

  expect(rows).toEqual([{ role: "reader", total: 2, avg: 10.5 }]);
});

test("preserves shaped distinct offset row order", () => {
  const rows = aggregateRowsFromQueryResponse({
    result: {
      rows: [
        { fields: { title: { scalar: "second" } } },
        { fields: { title: { scalar: "third" } } },
      ],
      diagnostics: { plan: "OrderedNodePropertyIndexScan" },
    },
  });

  expect(rows.map((row) => row.title)).toEqual(["second", "third"]);
});

test("summarizes diagnostics and user-facing messages", () => {
  const fallback = diagnosticsFromQueryResponse({ diagnostics: { plan: "BroadGQLFallback", plan_kind: "fallback", full_scan: true, fallback_mode: "broad_gql_fallback", indexes: ["ignored", 12] } });
  expect(fallback).toMatchObject({ plan: "BroadGQLFallback", planKind: "fallback", fullScan: true, fallbackMode: "broad_gql_fallback", indexes: ["ignored"] });
  expect(diagnosticsMessage(fallback)).toBe("Query used fallback mode: broad_gql_fallback");

  const rejected = diagnosticsFromQueryResponse({ diagnostics: { rejectedReason: "missing index" } });
  expect(diagnosticsMessage(rejected)).toBe("Query rejected: missing index");

  const truncated = diagnosticsFromQueryResponse({ diagnostics: { truncated: true, truncation_reason: "max_nodes" } });
  expect(diagnosticsMessage(truncated)).toBe("Query result truncated: max_nodes");
});

test("deduplicates aggregate and statement graph elements", () => {
  const graph = graphFromQueryResponse({
    statements: [{ result: { graph: { nodes: [{ nodeId: "a" }], edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b" }] } } }],
    result: { graph: { nodes: [{ nodeId: "a" }], edges: [{ edgeId: "ab", fromNodeId: "a", toNodeId: "b" }] } },
  });

  expect(graph?.nodes).toHaveLength(1);
  expect(graph?.edges).toHaveLength(1);
});
