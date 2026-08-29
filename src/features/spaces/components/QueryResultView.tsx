import { Alert, TableHead, themeClasses } from "../../../components/typography";
import { GraphResultCanvas } from "./GraphResultCanvas";
import {
  aggregateRowsFromQueryResponse,
  diagnosticsFromQueryResponse,
  diagnosticsMessage,
  graphFromQueryResponse,
  pathGraphsFromQueryResponse,
} from "./graphResultExtraction";

export type QueryResultDisplayMode = "rows" | "graph" | "raw";

export function QueryResultView({
  result,
  view,
}: {
  result: any;
  view: QueryResultDisplayMode;
}) {
  if (!result)
    return (
      <div
        className={`mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm ${themeClasses.text.parts.subtleLight} dark:border-slate-700 ${themeClasses.text.parts.darkMuted}`}
      >
        No query run yet.
      </div>
    );
  const payload = result.result ?? result;
  const statements = payload?.statements ?? result?.statements;
  const diagnostics = diagnosticsFromQueryResponse(result);
  const message = diagnosticsMessage(diagnostics);
  const diagnosticsBanner = message ? (
    <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      {message}
    </div>
  ) : null;
  if (view === "graph")
    return (
      <>
        <GraphResultCanvas graph={graphFromQueryResponse(result)} />
        {diagnosticsBanner}
      </>
    );
  if (Array.isArray(statements)) {
    return (
      <div className="mt-3 space-y-3">
        {diagnosticsBanner}
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead
              className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}
            >
              <tr>
                <TableHead className="px-4 py-3">#</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Statement</TableHead>
                <TableHead className="px-4 py-3">Error</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {statements.map((statement: any) => (
                <tr key={statement.index}>
                  <td className="px-4 py-3">{statement.index}</td>
                  <td className="px-4 py-3">{statement.success ? "✓" : "✗"}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {statement.statement}
                  </td>
                  <td className="px-4 py-3">
                    {statement.error ? (
                      <Alert icon={false} className="py-2">
                        {statement.error}
                      </Alert>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view === "raw" ? (
          <pre
            className={`max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs ${themeClasses.text.parts.bodyLight} dark:border-slate-700 ${themeClasses.text.parts.darkSecondary}`}
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}
      </div>
    );
  }
  if (view === "rows") {
    const rows = payload?.rows ?? [];
    const aggregateRows = aggregateRowsFromQueryResponse(result);
    const pathCount = pathGraphsFromQueryResponse(result).length;
    const renderedRows = aggregateRows.length ? aggregateRows : rows;
    return (
      <div className="mt-3 space-y-3">
        {diagnosticsBanner}
        {pathCount > 0 ? (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">
            {pathCount} path value{pathCount === 1 ? "" : "s"} available in
            returned rows.
          </div>
        ) : null}
        <pre
          className={`max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs ${themeClasses.text.parts.bodyLight} dark:border-slate-700 ${themeClasses.text.parts.darkSecondary}`}
        >
          {renderedRows.length
            ? JSON.stringify(renderedRows, null, 2)
            : "No rows returned."}
        </pre>
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {diagnosticsBanner}
      <pre
        className={`max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs ${themeClasses.text.parts.bodyLight} dark:border-slate-700 ${themeClasses.text.parts.darkSecondary}`}
      >
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
