import { Text } from "../../../components/typography";
import type { ModelEndpointCapabilityInfo } from "../../../types/inference";

type CapabilityGroup = {
  key: string;
  endpointLabel: string;
  modelLabel: string;
  status: string;
  capabilities: ModelEndpointCapabilityInfo[];
};

export function ModelEndpointCapabilityTable({ capabilities, onViewDetails }: { capabilities: ModelEndpointCapabilityInfo[]; onViewDetails?: (capability: ModelEndpointCapabilityInfo) => void }) {
  if (capabilities.length === 0) return <Empty message="No endpoint capabilities found." />;
  const groups = groupCapabilities(capabilities);
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Endpoint</th>
            <th className="px-4 py-3">Model</th>
            <th className="px-4 py-3">Operations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {groups.map((group) => (
            <tr key={group.key}>
              <td className="px-4 py-3">{group.status}</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{group.endpointLabel}</td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{group.modelLabel}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
                  {group.capabilities.map((capability, index) => <span key={capability.modelEndpointCapabilityId} className="inline-flex items-center gap-1"><OperationChip capability={capability} onViewDetails={onViewDetails} />{index < group.capabilities.length - 1 && <span className="text-slate-400">,</span>}</span>)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OperationChip({ capability, onViewDetails }: { capability: ModelEndpointCapabilityInfo; onViewDetails?: (capability: ModelEndpointCapabilityInfo) => void }) {
  return (
    <button
      type="button"
      title={capabilityTooltip(capability)}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-sky-500 ${
        capability.enabled
          ? "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100"
          : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
      }`}
      onClick={() => onViewDetails?.(capability)}
    >
      {capability.operation || "unspecified"}
    </button>
  );
}

function capabilityTooltip(capability: ModelEndpointCapabilityInfo): string {
  return [
    `Capability ID: ${capability.modelEndpointCapabilityId}`,
    `Endpoint: ${capability.modelEndpointKey || capability.modelEndpointId || "—"}`,
    `Endpoint ID: ${capability.modelEndpointId || "—"}`,
    `Model: ${capability.modelKey || capability.modelId || "—"}`,
    `Model ID: ${capability.modelId || "—"}`,
    `Operation: ${capability.operation || "—"}`,
    `Status: ${capability.enabled ? "Enabled" : "Disabled"}`,
    capability.metadata ? `Metadata: ${JSON.stringify(capability.metadata)}` : "",
  ].filter(Boolean).join("\n");
}

function groupCapabilities(capabilities: ModelEndpointCapabilityInfo[]): CapabilityGroup[] {
  const groups = new Map<string, CapabilityGroup>();
  for (const capability of capabilities) {
    const key = `${capability.modelEndpointId || capability.modelEndpointKey}:${capability.modelId || capability.modelKey}`;
    const current = groups.get(key) || {
      key,
      endpointLabel: capability.modelEndpointKey || capability.modelEndpointId || "—",
      modelLabel: capability.modelKey || capability.modelId || "—",
      status: "",
      capabilities: [],
    };
    current.capabilities.push(capability);
    current.capabilities.sort((a, b) => (a.operation || "").localeCompare(b.operation || ""));
    current.status = groupStatus(current.capabilities);
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => `${a.endpointLabel}:${a.modelLabel}`.localeCompare(`${b.endpointLabel}:${b.modelLabel}`));
}

function groupStatus(capabilities: ModelEndpointCapabilityInfo[]): string {
  const enabled = capabilities.filter((capability) => capability.enabled).length;
  if (enabled === capabilities.length) return "Enabled";
  if (enabled === 0) return "Disabled";
  return "Mixed";
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}
