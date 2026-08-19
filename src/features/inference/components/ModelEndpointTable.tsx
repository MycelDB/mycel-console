import { Button, Text } from "../../../components/typography";
import type { ModelEndpointInfo } from "../../../types/inference";

export function ModelEndpointTable({ endpoints, onViewDetails }: { endpoints: ModelEndpointInfo[]; onViewDetails?: (endpoint: ModelEndpointInfo) => void }) {
  if (endpoints.length === 0) return <Empty message="No model endpoints found." />;
  return (
    <CatalogTable headers={["Status", "Key", "Name", "Connector", "Operations", "Privacy", "Endpoint URL", ...(onViewDetails ? ["Actions"] : [])]}>
      {endpoints.map((endpoint) => (
        <tr key={endpoint.modelEndpointId} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
          <Cell>{endpoint.enabled ? "Enabled" : "Disabled"}</Cell>
          <Cell strong>{endpoint.key}</Cell>
          <Cell>{endpoint.name || "—"}</Cell>
          <Cell>{endpoint.connectorType || "—"}</Cell>
          <Cell>{endpoint.operations.length ? endpoint.operations.join(", ") : "—"}</Cell>
          <Cell>{endpoint.privacyClass || "—"}</Cell>
          <Cell mono>{endpoint.endpointUrl || "—"}</Cell>
          {onViewDetails && <Cell><Button variant="secondary" onClick={() => onViewDetails(endpoint)}>View</Button></Cell>}
        </tr>
      ))}
    </CatalogTable>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}

function CatalogTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-4 py-3">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{children}</tbody></table></div>;
}

function Cell({ children, strong = false, mono = false }: { children: React.ReactNode; strong?: boolean; mono?: boolean }) {
  return <td className={`px-4 py-3 text-slate-700 dark:text-slate-300 ${strong ? "font-medium text-slate-900 dark:text-slate-100" : ""} ${mono ? "font-mono text-xs" : ""}`}>{children}</td>;
}
