# Cytoscape Graph Result View Design

## Objective

Replace the current textual/card-based Graph result preview in the space Graph query console with an interactive Cytoscape.js graph canvas.

The result view should make mycel graph query responses directly explorable by showing returned nodes and edges as a real graph while keeping the existing Rows and Raw JSON views available.

## Context

The Graph query console in `SpaceDetailPage.tsx` can execute GQL and display results in three views:

- Rows
- Graph
- Raw JSON

The current Graph view renders returned graph elements as simple lists/cards. That is useful for debugging but does not communicate graph structure well. For queries such as:

```gql
MATCH (family:Family {name: 'Family'})-[member:MEMBER]->(person:Person)
RETURN family, member, person
FETCH FIRST 10 ROWS ONLY
```

users should see an interactive graph containing the `Family` node, the `Person` nodes, and the `MEMBER` edges.

## Goals

- Render `result.graph.nodes` and `result.graph.edges` with Cytoscape.js.
- Preserve the existing Rows and Raw JSON views.
- Keep graph visualization read-only for the first version.
- Support pan, zoom, fit, relayout, and element selection.
- Show selected node/edge details in an inspector.
- Gracefully handle empty graph results and scalar-only query results.
- Keep daemon/API authorization authoritative; this is a visualization-only frontend feature.
- Keep implementation scoped to `mycel-admin`; do not rename to `mycel-console` as part of this work.

## Non-Goals

- Do not add graph editing, drag-to-create nodes, or edge creation from the canvas.
- Do not add schema-aware graph styling in the first version.
- Do not add persistent graph layouts.
- Do not change GQL execution semantics.
- Do not alter backend result shapes unless a bug is discovered.
- Do not add product pricing, billing, credits, or non-mycel product concepts.

## Dependency Choice

Use Cytoscape.js directly:

```sh
npm install cytoscape
npm install --save-dev @types/cytoscape
```

Rationale:

- Cytoscape.js is purpose-built for graph visualization.
- It supports directed edges, labels, layouts, pan/zoom, selection, and styling.
- Direct use gives better lifecycle control than a thin React wrapper.
- The integration can stay isolated in one React component.

A React wrapper can be revisited later if direct lifecycle management becomes noisy.

## Result Data Contract

The existing GQL response is expected to expose graph elements under:

```ts
result.result.graph.nodes
result.result.graph.edges
```

A node currently has fields such as:

```ts
type QueryGraphNode = {
  nodeId: string;
  domainId?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};
```

An edge currently has fields such as:

```ts
type QueryGraphEdge = {
  edgeId: string;
  domainId?: string;
  fromNodeId: string;
  toNodeId: string;
  labels?: string[];
  properties?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};
```

The frontend should tolerate missing arrays and malformed partial elements by skipping invalid records and surfacing a small warning where practical.

## Proposed Source Structure

Add graph-result-specific components under the spaces feature:

```text
src/features/spaces/components/GraphResultCanvas.tsx
src/features/spaces/components/graphResultMapping.ts
src/features/spaces/components/graphResultMapping.test.ts
```

Keep `SpaceDetailPage.tsx` responsible only for selecting the result view and passing graph data into the canvas:

```tsx
<GraphResultCanvas graph={payload.graph} />
```

## Mapping to Cytoscape Elements

Create a pure mapping helper that converts mycel graph result data into Cytoscape elements.

Suggested exported function:

```ts
export function graphResultToCytoscapeElements(graph: QueryGraphResult): cytoscape.ElementDefinition[]
```

Node mapping:

```ts
{
  group: "nodes",
  data: {
    id: node.nodeId,
    label: displayNodeLabel(node),
    labels: node.labels ?? [],
    raw: node,
  },
}
```

Edge mapping:

```ts
{
  group: "edges",
  data: {
    id: edge.edgeId,
    source: edge.fromNodeId,
    target: edge.toNodeId,
    label: displayEdgeLabel(edge),
    labels: edge.labels ?? [],
    raw: edge,
  },
}
```

Recommended node label precedence:

1. `properties.name`
2. `properties.title`
3. `properties.key`
4. first label
5. shortened node ID

Recommended edge label precedence:

1. first edge label
2. shortened edge ID

Deduplication rules:

- Deduplicate nodes by `nodeId`.
- Deduplicate edges by `edgeId`.
- Skip edges where `fromNodeId` or `toNodeId` is missing.
- If an edge references a node that is not returned, keep the edge out of the first version rather than inventing placeholder nodes. Add a warning such as: `2 edges omitted because endpoints were not returned`.

## Component Design

`GraphResultCanvas` responsibilities:

- Own the Cytoscape instance lifecycle.
- Rebuild elements when graph result changes.
- Run an initial layout.
- Provide toolbar actions:
  - Fit
  - Relayout
  - Clear selection
- Track selected element state.
- Render a details inspector for selected node/edge raw JSON.
- Render empty and warning states.

Suggested props:

```ts
type GraphResultCanvasProps = {
  graph?: {
    nodes?: QueryGraphNode[];
    edges?: QueryGraphEdge[];
  } | null;
  className?: string;
};
```

## Layout

Use Cytoscape's built-in `cose` layout initially:

```ts
{
  name: "cose",
  animate: true,
  fit: true,
  padding: 40,
}
```

For very small graphs, `circle` can be considered later, but a single default keeps the first version simple.

Future enhancement: add layout selection:

- Force
- Circle
- Grid
- Breadth-first

## Styling

Initial style should work in light and dark themes and align with the existing slate/sky UI palette.

Suggested defaults:

- Nodes: sky fill, label with outline.
- Edges: slate line, triangle target arrow, relationship label.
- Selected node/edge: amber highlight.
- Family/group-like nodes may use the same default style in the first version; schema-aware styles can come later.

Example Cytoscape style direction:

```ts
[
  {
    selector: "node",
    style: {
      "background-color": "#0ea5e9",
      label: "data(label)",
      color: "#e2e8f0",
      "text-outline-color": "#0f172a",
      "text-outline-width": 2,
      width: 42,
      height: 42,
    },
  },
  {
    selector: "edge",
    style: {
      width: 2,
      "line-color": "#64748b",
      "target-arrow-color": "#64748b",
      "target-arrow-shape": "triangle",
      "curve-style": "bezier",
      label: "data(label)",
      "font-size": 10,
    },
  },
  {
    selector: ":selected",
    style: {
      "border-width": 3,
      "border-color": "#f59e0b",
      "line-color": "#f59e0b",
      "target-arrow-color": "#f59e0b",
    },
  },
]
```

## UX Details

### Empty Result

If no graph nodes and no graph edges are returned:

```text
No graph elements returned. Return node or relationship values to populate the graph view.
```

### Toolbar

Toolbar placement: top-right of the Graph view panel.

Actions:

- **Fit**: `cy.fit(undefined, 40)`
- **Relayout**: rerun `cose`
- **Clear selection**: unselect current element

### Inspector

A right-side or below-canvas inspector should show:

- selected type: Node or Edge
- ID
- labels
- properties
- raw JSON

If nothing is selected:

```text
Select a node or edge to inspect its details.
```

### Size

Use a fixed minimum height so the graph is visible immediately:

```text
min-height: 28rem
```

## Performance Guardrails

First version guardrails:

- Render normally for modest graphs.
- Show a warning above the canvas when element count exceeds a threshold, e.g. 500.
- Avoid expensive React re-render loops by letting Cytoscape own the canvas after initialization.

Potential warning:

```text
Rendering 728 graph elements. Large result sets may be slower to pan, zoom, or lay out.
```

Future improvements:

- layout choice optimized for larger graphs;
- WebGL renderer or Sigma.js for large network views if needed;
- query-side pagination reminders.

## Accessibility

Cytoscape canvas accessibility is limited, so keep non-canvas alternatives:

- Rows view remains available.
- Raw JSON remains available.
- Inspector uses regular HTML text and JSON.
- Toolbar buttons are standard buttons.
- Canvas region should have an accessible label such as `Graph result visualization`.

## Testing Plan

### Unit Tests

Add tests for `graphResultMapping.ts`:

- maps nodes and edges to Cytoscape elements;
- labels nodes using `name`, `title`, `key`, label, then ID fallback;
- labels edges using relationship label;
- deduplicates duplicate nodes and edges;
- skips malformed edges;
- reports omitted edge count when endpoints are missing.

### Component Tests

Add lightweight tests for `GraphResultCanvas.tsx`:

- renders empty state;
- renders toolbar when graph has elements;
- renders omitted-edge warning;
- renders selected inspector placeholder.

Avoid asserting Cytoscape internals in Jest/jsdom beyond component lifecycle smoke tests.

### Existing Page Tests

Update `SpaceDetailPage.test.tsx` to assert the Graph tab delegates to the graph canvas or displays the new empty state.

## Implementation Phases

### Phase 1: Canvas MVP

- Add Cytoscape dependency.
- Add mapping helper and tests.
- Add `GraphResultCanvas` component.
- Replace existing graph-card rendering in `QueryResultView` with `GraphResultCanvas`.
- Keep Rows and Raw JSON unchanged.

### Phase 2: Inspector Polish

- Add selection inspector.
- Improve node/edge labels.
- Add Fit, Relayout, Clear selection controls.

### Phase 3: Larger Result UX

- Add element-count warnings.
- Consider layout selection.
- Add copy selected element JSON.

## Acceptance Criteria

- A query returning nodes and edges renders an interactive Cytoscape graph.
- Users can pan, zoom, fit, relayout, and select elements.
- Selected element details are inspectable without leaving the page.
- Scalar-only query results show a helpful empty Graph view message.
- Rows and Raw JSON views continue working.
- Existing graph query execution behavior remains unchanged.
- Tests and build pass:

```sh
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
cd .. && git diff --check
```

## Open Questions

- Should read-only scalar rows remain visible beside the graph, or only in the Rows tab?
- Should the first version include a layout selector or defer it?
- Should endpoint-missing edges create placeholder nodes later, or should the query be expected to return endpoints explicitly?
- Should graph element colors eventually be label/schema-driven?
