import type { QueryGraphEdge, QueryGraphNode, QueryGraphResult } from "./graphResultMapping";

export type QueryDiagnosticsSummary = {
  plan?: string;
  planKind?: string;
  planner?: string;
  fullScan?: boolean;
  indexes: string[];
  rejectedReason?: string;
  fallbackMode?: string;
  truncated?: boolean;
  truncationReason?: string;
};

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

export function pathGraphsFromQueryResponse(response: unknown): QueryGraphResult[] {
  const rows = queryRowsFromResponse(response);
  const paths: QueryGraphResult[] = [];
  for (const row of rows) {
    const fields = asRecord(row.fields);
    if (!fields) continue;
    for (const value of Object.values(fields)) {
      const path = asRecord(asRecord(value)?.path);
      if (!path) continue;
      paths.push({
        nodes: Array.isArray(path.nodes) ? path.nodes.filter(isQueryGraphNode) : [],
        edges: Array.isArray(path.edges) ? path.edges.filter(isQueryGraphEdge) : [],
      });
    }
  }
  return paths;
}

export function aggregateRowsFromQueryResponse(response: unknown): Array<Record<string, unknown>> {
  return queryRowsFromResponse(response).map((row) => {
    const out: Record<string, unknown> = {};
    const fields = asRecord(row.fields);
    if (!fields) return out;
    for (const [name, value] of Object.entries(fields)) {
      const record = asRecord(value);
      out[name] = record && "scalar" in record ? record.scalar : value;
    }
    return out;
  });
}

export function diagnosticsFromQueryResponse(response: unknown): QueryDiagnosticsSummary | null {
  const root = asRecord(response);
  if (!root) return null;
  const diagnostics = asRecord(root.diagnostics) ?? asRecord(asRecord(root.result)?.diagnostics);
  if (!diagnostics) return null;
  return {
    plan: stringValue(diagnostics.plan),
    planKind: stringValue(diagnostics.planKind ?? diagnostics.plan_kind),
    planner: stringValue(diagnostics.planner),
    fullScan: booleanValue(diagnostics.fullScan ?? diagnostics.full_scan),
    indexes: arrayOfStrings(diagnostics.indexes),
    rejectedReason: stringValue(diagnostics.rejectedReason ?? diagnostics.rejected_reason),
    fallbackMode: stringValue(diagnostics.fallbackMode ?? diagnostics.fallback_mode),
    truncated: booleanValue(diagnostics.truncated),
    truncationReason: stringValue(diagnostics.truncationReason ?? diagnostics.truncation_reason),
  };
}

export function diagnosticsMessage(summary: QueryDiagnosticsSummary | null): string | null {
  if (!summary) return null;
  if (summary.rejectedReason) return `Query rejected: ${summary.rejectedReason}`;
  if (summary.truncated) return `Query result truncated${summary.truncationReason ? `: ${summary.truncationReason}` : ""}`;
  if (summary.fallbackMode) return `Query used fallback mode: ${summary.fallbackMode}`;
  if (summary.plan) return `Query plan: ${summary.plan}`;
  return null;
}

function queryRowsFromResponse(response: unknown): Array<Record<string, unknown>> {
  const root = asRecord(response);
  if (!root) return [];
  const payload = asRecord(root.result) ?? root;
  return Array.isArray(payload.rows) ? payload.rows.filter((row): row is Record<string, unknown> => Boolean(asRecord(row))) : [];
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
