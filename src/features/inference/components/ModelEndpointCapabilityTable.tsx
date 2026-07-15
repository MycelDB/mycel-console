import { Text } from "../../../components/typography";
import type { ModelEndpointCapabilityInfo } from "../../../types/inference";

export function ModelEndpointCapabilityTable({ capabilities }: { capabilities: ModelEndpointCapabilityInfo[] }) {
  if (capabilities.length === 0) return <Empty message="No endpoint capabilities found." />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Status</th><th className="px-4 py-3">Endpoint ID</th><th className="px-4 py-3">Model ID</th><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Override</th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{capabilities.map((capability) => <tr key={capability.modelEndpointCapabilityId}><td className="px-4 py-3">{capability.enabled ? "Enabled" : "Disabled"}</td><td className="px-4 py-3 font-mono text-xs">{capability.modelEndpointId}</td><td className="px-4 py-3 font-mono text-xs">{capability.modelId}</td><td className="px-4 py-3">{capability.operation || "—"}</td><td className="px-4 py-3">{capability.modelNameOverride || "—"}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}
