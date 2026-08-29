import {
  Button,
  formatEnumLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type {
  InferenceModelInfo,
  ModelEndpointCapabilityInfo,
} from "../../../types/inference";

type InferenceModelDetail = InferenceModelInfo & {
  modelEndpointCapabilities?: ModelEndpointCapabilityInfo[];
};

export function InferenceModelTable({
  models,
  capabilities = [],
  onViewDetails,
}: {
  models: InferenceModelInfo[];
  capabilities?: ModelEndpointCapabilityInfo[];
  onViewDetails?: (model: InferenceModelDetail) => void;
}) {
  if (models.length === 0) return <Empty message="No models found." />;
  return (
    <div
      className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}>
          <tr>
            <TableHead className="px-4 py-3">Key</TableHead>
            <TableHead className="px-4 py-3">Kind</TableHead>
            <TableHead className="px-4 py-3">Capabilities</TableHead>
            <TableHead className="px-4 py-3">Model name</TableHead>
            <TableHead className="px-4 py-3">Dimensions</TableHead>
            <TableHead className="px-4 py-3">Vector space</TableHead>
            <TableHead className="px-4 py-3">Connector types</TableHead>
            <TableHead className="px-4 py-3">Modalities</TableHead>
            {onViewDetails && <TableHead className="px-4 py-3">Actions</TableHead>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {models.map((model) => (
            <tr key={model.modelId}>
              <td className={`px-4 py-3 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
                {model.key}
              </td>
              <td className="px-4 py-3">{formatEnumLabel(model.kind)}</td>
              <td className="px-4 py-3">
                <ModelCapabilities
                  capabilities={capabilities.filter(
                    (capability) => capability.modelId === model.modelId,
                  )}
                />
              </td>
              <td className="px-4 py-3">{model.modelName || "—"}</td>
              <td className="px-4 py-3">{model.dimensions || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {model.vectorSpaceKey || "—"}
              </td>
              <td className="px-4 py-3">
                {model.connectorTypes.length
                  ? model.connectorTypes
                      .map((type) => formatEnumLabel(type))
                      .join(", ")
                  : "—"}
              </td>
              <td className="px-4 py-3">
                {[
                  model.inputModalities
                    ?.map((value) => formatEnumLabel(value))
                    .join("+"),
                  model.outputModalities
                    ?.map((value) => formatEnumLabel(value))
                    .join("+"),
                ]
                  .filter(Boolean)
                  .join(" → ") || "—"}
              </td>
              {onViewDetails && (
                <td className="px-4 py-3">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      onViewDetails({
                        ...model,
                        modelEndpointCapabilities: capabilities.filter(
                          (capability) => capability.modelId === model.modelId,
                        ),
                      })
                    }
                  >
                    View
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelCapabilities({
  capabilities,
}: {
  capabilities: ModelEndpointCapabilityInfo[];
}) {
  if (capabilities.length === 0)
    return <span className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>—</span>;
  const unique = Array.from(
    new Map(
      capabilities.map((capability) => [
        `${capability.operation}|${capability.modelEndpointKey || capability.modelEndpointId}`,
        capability,
      ]),
    ).values(),
  ).sort((left, right) =>
    `${left.operation}${left.modelEndpointKey}`.localeCompare(
      `${right.operation}${right.modelEndpointKey}`,
    ),
  );
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((capability) => (
        <span
          key={
            capability.modelEndpointCapabilityId ||
            `${capability.operation}-${capability.modelEndpointId}`
          }
          title={capability.modelEndpointCapabilityId}
          className={`rounded-full px-2 py-0.5 text-xs ${capability.enabled ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : `bg-slate-100 ${themeClasses.text.parts.mutedLight} line-through dark:bg-slate-800 ${themeClasses.text.parts.darkMuted}`}`}
        >
          {[
            formatEnumLabel(capability.operation, "Operation"),
            capability.modelEndpointKey || capability.modelEndpointId,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ))}
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-300 ${themeClasses.surface.panel} p-6 text-center dark:border-slate-700`}
    >
      <Text intent="muted">{message}</Text>
    </div>
  );
}
