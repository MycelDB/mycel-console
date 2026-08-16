import type cytoscape from "cytoscape";

export type QueryGraphNode = {
  nodeId?: string;
  domainId?: string;
  labels?: string[];
  properties?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export type QueryGraphEdge = {
  edgeId?: string;
  domainId?: string;
  fromNodeId?: string;
  toNodeId?: string;
  labels?: string[];
  properties?: Record<string, unknown> | null;
  payload?: Record<string, unknown> | null;
  meta?: Record<string, unknown> | null;
};

export type QueryGraphResult = {
  nodes?: QueryGraphNode[] | null;
  edges?: QueryGraphEdge[] | null;
} | null | undefined;

export type GraphResultMapping = {
  elements: cytoscape.ElementDefinition[];
  nodeCount: number;
  edgeCount: number;
  omittedEdgeCount: number;
  duplicateNodeCount: number;
  duplicateEdgeCount: number;
};

export function graphResultToCytoscapeElements(graph: QueryGraphResult): GraphResultMapping {
  const elements: cytoscape.ElementDefinition[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();
  let omittedEdgeCount = 0;
  let duplicateNodeCount = 0;
  let duplicateEdgeCount = 0;

  for (const node of graph?.nodes ?? []) {
    const nodeId = normalizeId(node.nodeId);
    if (!nodeId) continue;
    if (seenNodes.has(nodeId)) {
      duplicateNodeCount += 1;
      continue;
    }
    seenNodes.add(nodeId);
    elements.push({
      group: "nodes",
      data: {
        id: nodeId,
        label: displayNodeLabel(node),
        labels: node.labels ?? [],
        raw: node,
      },
    });
  }

  for (const edge of graph?.edges ?? []) {
    const edgeId = normalizeId(edge.edgeId);
    const source = normalizeId(edge.fromNodeId);
    const target = normalizeId(edge.toNodeId);
    if (!edgeId || !source || !target || !seenNodes.has(source) || !seenNodes.has(target)) {
      omittedEdgeCount += 1;
      continue;
    }
    if (seenEdges.has(edgeId)) {
      duplicateEdgeCount += 1;
      continue;
    }
    seenEdges.add(edgeId);
    elements.push({
      group: "edges",
      data: {
        id: edgeId,
        source,
        target,
        label: displayEdgeLabel(edge),
        labels: edge.labels ?? [],
        raw: edge,
      },
    });
  }

  return {
    elements,
    nodeCount: seenNodes.size,
    edgeCount: seenEdges.size,
    omittedEdgeCount,
    duplicateNodeCount,
    duplicateEdgeCount,
  };
}

export function displayNodeLabel(node: QueryGraphNode): string {
  const properties = node.properties ?? {};
  return stringProperty(properties.name)
    ?? stringProperty(properties.title)
    ?? stringProperty(properties.key)
    ?? firstNonEmpty(node.labels)
    ?? shortenId(node.nodeId)
    ?? "Node";
}

export function displayEdgeLabel(edge: QueryGraphEdge): string {
  return firstNonEmpty(edge.labels) ?? shortenId(edge.edgeId) ?? "Edge";
}

export function shortenId(value: unknown): string | undefined {
  const id = normalizeId(value);
  if (!id) return undefined;
  if (id.length <= 18) return id;
  return `${id.slice(0, 8)}…${id.slice(-6)}`;
}

function normalizeId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function stringProperty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function firstNonEmpty(values: unknown): string | undefined {
  if (!Array.isArray(values)) return undefined;
  for (const value of values) {
    const text = stringProperty(value);
    if (text) return text;
  }
  return undefined;
}
