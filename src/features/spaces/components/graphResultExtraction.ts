import type { QueryGraphEdge, QueryGraphNode, QueryGraphResult } from "./graphResultMapping";

export function graphFromQueryResponse(response: unknown): QueryGraphResult {
  const root = asRecord(response);
  if (!root) return null;
  const payload = asRecord(root.result) ?? root;
  const statements = Array.isArray(payload.statements) ? payload.statements : Array.isArray(root.statements) ? root.statements : [];
  if (statements.length === 0) return graphFromUnknown(payload.graph);

  const nodesById = new Map<string, QueryGraphNode>();
  const edgesById = new Map<string, QueryGraphEdge>();

  mergeGraphIntoMaps(graphFromUnknown(payload.graph), nodesById, edgesById);
  for (const statement of statements) {
    const statementRecord = asRecord(statement);
    if (!statementRecord) continue;
    const statementResult = asRecord(statementRecord.result);
    mergeGraphIntoMaps(graphFromUnknown(statementResult?.graph), nodesById, edgesById);
  }

  return { nodes: [...nodesById.values()], edges: [...edgesById.values()] };
}

function mergeGraphIntoMaps(graph: QueryGraphResult, nodesById: Map<string, QueryGraphNode>, edgesById: Map<string, QueryGraphEdge>) {
  for (const node of graph?.nodes ?? []) {
    if (typeof node.nodeId === "string" && node.nodeId.trim()) nodesById.set(node.nodeId, node);
  }
  for (const edge of graph?.edges ?? []) {
    if (typeof edge.edgeId === "string" && edge.edgeId.trim()) edgesById.set(edge.edgeId, edge);
  }
}

function graphFromUnknown(value: unknown): QueryGraphResult {
  const graph = asRecord(value);
  if (!graph) return null;
  return {
    nodes: Array.isArray(graph.nodes) ? graph.nodes.filter(isQueryGraphNode) : [],
    edges: Array.isArray(graph.edges) ? graph.edges.filter(isQueryGraphEdge) : [],
  };
}

function isQueryGraphNode(value: unknown): value is QueryGraphNode {
  return Boolean(asRecord(value));
}

function isQueryGraphEdge(value: unknown): value is QueryGraphEdge {
  return Boolean(asRecord(value));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}
