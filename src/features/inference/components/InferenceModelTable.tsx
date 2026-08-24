import { Button, Text } from "../../../components/typography";
import type { InferenceModelInfo, ModelEndpointCapabilityInfo } from "../../../types/inference";

type InferenceModelDetail = InferenceModelInfo & { modelEndpointCapabilities?: ModelEndpointCapabilityInfo[] };

export function InferenceModelTable({ models, capabilities = [], onViewDetails }: { models: InferenceModelInfo[]; capabilities?: ModelEndpointCapabilityInfo[]; onViewDetails?: (model: InferenceModelDetail) => void }) {
  if (models.length === 0) return <Empty message="No models found." />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Capabilities</th><th className="px-4 py-3">Model name</th><th className="px-4 py-3">Dimensions</th><th className="px-4 py-3">Vector space</th><th className="px-4 py-3">Connector types</th><th className="px-4 py-3">Modalities</th>{onViewDetails && <th className="px-4 py-3">Actions</th>}</tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{models.map((model) => <tr key={model.modelId}><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{model.key}</td><td className="px-4 py-3">{model.kind || "—"}</td><td className="px-4 py-3"><ModelCapabilities capabilities={capabilities.filter((capability) => capability.modelId === model.modelId)} /></td><td className="px-4 py-3">{model.modelName || "—"}</td><td className="px-4 py-3">{model.dimensions || "—"}</td><td className="px-4 py-3 font-mono text-xs">{model.vectorSpaceKey || "—"}</td><td className="px-4 py-3">{model.connectorTypes.length ? model.connectorTypes.join(", ") : "—"}</td><td className="px-4 py-3">{[model.inputModalities?.join("+"), model.outputModalities?.join("+")].filter(Boolean).join(" → ") || "—"}</td>{onViewDetails && <td className="px-4 py-3"><Button variant="secondary" onClick={() => onViewDetails({ ...model, modelEndpointCapabilities: capabilities.filter((capability) => capability.modelId === model.modelId) })}>View</Button></td>}</tr>)}</tbody>
      </table>
    </div>
  );
}

function ModelCapabilities({ capabilities }: { capabilities: ModelEndpointCapabilityInfo[] }) {
  if (capabilities.length === 0) return <span className="text-slate-500 dark:text-slate-400">—</span>;
  const unique = Array.from(new Map(capabilities.map((capability) => [`${capability.operation}|${capability.modelEndpointKey || capability.modelEndpointId}`, capability])).values())
    .sort((left, right) => `${left.operation}${left.modelEndpointKey}`.localeCompare(`${right.operation}${right.modelEndpointKey}`));
  return <div className="flex flex-wrap gap-1.5">{unique.map((capability) => <span key={capability.modelEndpointCapabilityId || `${capability.operation}-${capability.modelEndpointId}`} title={capability.modelEndpointCapabilityId} className={`rounded-full px-2 py-0.5 text-xs ${capability.enabled ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : "bg-slate-100 text-slate-500 line-through dark:bg-slate-800 dark:text-slate-400"}`}>{[capability.operation || "operation", capability.modelEndpointKey || capability.modelEndpointId].filter(Boolean).join(" · ")}</span>)}</div>;
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}
