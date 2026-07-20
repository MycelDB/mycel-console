import { Text } from "../../../components/typography";
import type { InferenceModelInfo } from "../../../types/inference";

export function InferenceModelTable({ models }: { models: InferenceModelInfo[] }) {
  if (models.length === 0) return <Empty message="No models found." />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Operation</th><th className="px-4 py-3">Model name</th><th className="px-4 py-3">Dimensions</th><th className="px-4 py-3">Vector space</th><th className="px-4 py-3">Connector types</th><th className="px-4 py-3">Modality</th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{models.map((model) => <tr key={model.modelId}><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{model.key}</td><td className="px-4 py-3">{model.operation || "—"}</td><td className="px-4 py-3">{model.modelName || "—"}</td><td className="px-4 py-3">{model.dimensions || "—"}</td><td className="px-4 py-3 font-mono text-xs">{model.vectorSpaceKey || "—"}</td><td className="px-4 py-3">{model.connectorTypes.length ? model.connectorTypes.join(", ") : "—"}</td><td className="px-4 py-3">{model.modality || "—"}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}
