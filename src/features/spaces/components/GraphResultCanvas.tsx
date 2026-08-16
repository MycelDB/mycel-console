import { useEffect, useMemo, useRef, useState } from "react";
import type cytoscape from "cytoscape";
import type { Core, ElementDefinition, EventObject } from "cytoscape";
import { Button, Text } from "../../../components/typography";
import { graphResultToCytoscapeElements, type QueryGraphResult } from "./graphResultMapping";

const LARGE_GRAPH_THRESHOLD = 500;

export type GraphResultCanvasProps = {
  graph?: QueryGraphResult;
  className?: string;
};

type SelectedGraphElement = {
  kind: "node" | "edge";
  id: string;
  label: string;
  labels: string[];
  raw: unknown;
};

export function GraphResultCanvas({ graph, className = "" }: GraphResultCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);
  const [selected, setSelected] = useState<SelectedGraphElement | null>(null);
  const mapping = useMemo(() => graphResultToCytoscapeElements(graph), [graph]);
  const elementCount = mapping.nodeCount + mapping.edgeCount;

  useEffect(() => {
    if (!containerRef.current || mapping.elements.length === 0) {
      cyRef.current?.destroy();
      cyRef.current = null;
      setSelected(null);
      return;
    }

    let disposed = false;

    void import("cytoscape").then(({ default: cytoscape }) => {
      if (disposed || !containerRef.current) return;
      const cy = cytoscape({
        container: containerRef.current,
        elements: mapping.elements,
        style: graphStyles,
        layout: currentGraphLayout(),
        minZoom: 0.1,
        maxZoom: 3,
        headless: isTestEnvironment(),
      });

      if (disposed) {
        cy.destroy();
        return;
      }

      cyRef.current = cy;
      requestAnimationFrame(() => {
        if (!disposed && cyRef.current === cy) {
          cy.resize();
          cy.fit(undefined, 40);
        }
      });

      const selectHandler = (event: EventObject) => {
        const element = event.target;
        setSelected({
          kind: element.isNode() ? "node" : "edge",
          id: String(element.id()),
          label: String(element.data("label") ?? element.id()),
          labels: Array.isArray(element.data("labels")) ? element.data("labels") : [],
          raw: element.data("raw"),
        });
      };
      const unselectHandler = () => {
        if (cy.$(":selected").length === 0) setSelected(null);
      };

      cy.on("select", "node, edge", selectHandler);
      cy.on("unselect", "node, edge", unselectHandler);
    });

    return () => {
      disposed = true;
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [mapping.elements]);

  function fitGraph() {
    cyRef.current?.fit(undefined, 40);
  }

  function relayoutGraph() {
    cyRef.current?.layout(currentGraphLayout()).run();
  }

  function clearSelection() {
    cyRef.current?.$(":selected").unselect();
    setSelected(null);
  }

  if (mapping.elements.length === 0) {
    return (
      <div className={`mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400 ${className}`}>
        No graph elements returned. Return node or relationship values to populate the graph view.
      </div>
    );
  }

  return (
    <div className={`mt-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">Graph visualization</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">
            {mapping.nodeCount} nodes · {mapping.edgeCount} edges
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={fitGraph}>Fit</Button>
          <Button variant="secondary" onClick={relayoutGraph}>Relayout</Button>
          <Button variant="secondary" onClick={clearSelection} disabled={!selected}>Clear selection</Button>
        </div>
      </div>

      <GraphWarnings mapping={mapping} elementCount={elementCount} />

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          ref={containerRef}
          role="img"
          aria-label="Graph result visualization"
          className="h-[60vh] min-h-[32rem] w-full rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
        />
        <GraphSelectionInspector selected={selected} />
      </div>
    </div>
  );
}

function GraphWarnings({ mapping, elementCount }: { mapping: ReturnType<typeof graphResultToCytoscapeElements>; elementCount: number }) {
  const warnings: string[] = [];
  if (elementCount > LARGE_GRAPH_THRESHOLD) warnings.push(`Rendering ${elementCount} graph elements. Large result sets may be slower to pan, zoom, or lay out.`);
  if (mapping.omittedEdgeCount > 0) warnings.push(`${mapping.omittedEdgeCount} ${mapping.omittedEdgeCount === 1 ? "edge was" : "edges were"} omitted because endpoints were not returned.`);
  if (mapping.duplicateNodeCount > 0 || mapping.duplicateEdgeCount > 0) warnings.push("Duplicate graph elements were collapsed in the visualization.");
  if (warnings.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {warnings.map((warning) => (
        <div key={warning} className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {warning}
        </div>
      ))}
    </div>
  );
}

function GraphSelectionInspector({ selected }: { selected: SelectedGraphElement | null }) {
  return (
    <aside className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">Inspector</Text>
      {!selected ? (
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">Select a node or edge to inspect its details.</Text>
      ) : (
        <div className="mt-3 space-y-3 text-sm">
          <div><span className="font-medium">Type:</span> {selected.kind === "node" ? "Node" : "Edge"}</div>
          <div><span className="font-medium">Label:</span> {selected.label}</div>
          <div><span className="font-medium">ID:</span> <span className="font-mono text-xs">{selected.id}</span></div>
          <div><span className="font-medium">Labels:</span> {selected.labels.length ? selected.labels.join(", ") : "—"}</div>
          <pre className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{JSON.stringify(selected.raw, null, 2)}</pre>
        </div>
      )}
    </aside>
  );
}

function isTestEnvironment(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV === "test";
}

function currentGraphLayout(): cytoscape.LayoutOptions {
  if (isTestEnvironment()) return { name: "preset" };
  return graphLayout;
}

const graphLayout: cytoscape.LayoutOptions = {
  name: "cose",
  animate: true,
  fit: true,
  padding: 40,
};

const graphStyles = [
  {
    selector: "node",
    style: {
      "background-color": "#0ea5e9",
      label: "data(label)",
      color: "#e2e8f0",
      "font-size": 12,
      "text-outline-color": "#0f172a",
      "text-outline-width": 2,
      "text-valign": "center",
      "text-halign": "center",
      width: 46,
      height: 46,
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
      color: "#cbd5e1",
      "font-size": 10,
      "text-outline-color": "#0f172a",
      "text-outline-width": 2,
    },
  },
  {
    selector: "node:selected",
    style: {
      "border-width": 3,
      "border-color": "#f59e0b",
    },
  },
  {
    selector: "edge:selected",
    style: {
      "line-color": "#f59e0b",
      "target-arrow-color": "#f59e0b",
      width: 4,
    },
  },
] as cytoscape.StylesheetJson;
