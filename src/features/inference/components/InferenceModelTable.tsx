import {
  Button,
  formatEnumLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type {
  InferenceModelInfo,
  JsonObject,
  ModelEndpointCapabilityInfo,
} from "../../../types/inference";
import {
  modelCatalogKind,
  type ModelCatalogKind,
} from "../model/pageTypes";

type InferenceModelDetail = InferenceModelInfo & {
  modelEndpointCapabilities?: ModelEndpointCapabilityInfo[];
};

type ModelTableProps = {
  models: InferenceModelInfo[];
  capabilities?: ModelEndpointCapabilityInfo[];
  kind?: ModelCatalogKind;
  onViewDetails?: (model: InferenceModelDetail) => void;
};

type ReportedNumber = number | "varies" | null;

const tableClassName =
  "min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800";
const headerClassName = `bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`;
const bodyClassName = "divide-y divide-slate-200 dark:divide-slate-800";
const cellClassName = "px-4 py-3 align-top";

export function InferenceModelTable({
  models,
  capabilities = [],
  kind,
  onViewDetails,
}: ModelTableProps) {
  const visibleModels = kind
    ? models.filter((model) => modelCatalogKind(model.kind) === kind)
    : models;
  if (visibleModels.length === 0) {
    return <Empty message={emptyModelMessage(kind)} />;
  }

  const orderedModels = [...visibleModels].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
  const generativeModels = orderedModels.filter(
    (model) => modelCatalogKind(model.kind) === "generative",
  );
  const embeddingModels = orderedModels.filter(
    (model) => modelCatalogKind(model.kind) === "embedding",
  );
  const otherModels = orderedModels.filter(
    (model) => modelCatalogKind(model.kind) === "other",
  );

  return (
    <div className="space-y-8">
      {generativeModels.length > 0 && (
        <GenerativeModelsSection
          models={generativeModels}
          capabilities={capabilities}
          onViewDetails={onViewDetails}
        />
      )}
      {embeddingModels.length > 0 && (
        <EmbeddingModelsSection
          models={embeddingModels}
          capabilities={capabilities}
          onViewDetails={onViewDetails}
        />
      )}
      {otherModels.length > 0 && (
        <OtherModelsSection
          models={otherModels}
          capabilities={capabilities}
          onViewDetails={onViewDetails}
        />
      )}
    </div>
  );
}

function GenerativeModelsSection({
  models,
  capabilities,
  onViewDetails,
}: Required<Pick<ModelTableProps, "models" | "capabilities">> &
  Pick<ModelTableProps, "onViewDetails">) {
  return (
    <ModelSection
      id="generative-models"
      title="Generative models"
      description="Models that produce text or structured output. Limits are reported by the installed catalog."
      count={models.length}
    >
      <table aria-label="Generative models" className={tableClassName}>
        <thead className={headerClassName}>
          <tr>
            <TableHead className="px-4 py-3">Model</TableHead>
            <TableHead className="px-4 py-3">Supported operations</TableHead>
            <TableHead className="px-4 py-3">Inputs and outputs</TableHead>
            <TableHead className="px-4 py-3">Context window</TableHead>
            <TableHead className="px-4 py-3">Max output tokens</TableHead>
            {onViewDetails && (
              <TableHead className="px-4 py-3">Details</TableHead>
            )}
          </tr>
        </thead>
        <TypedModelRows
          models={models}
          capabilities={capabilities}
          onViewDetails={onViewDetails}
          renderTypeCells={(model, modelCapabilities) => (
            <>
              <td className={cellClassName}>
                <ModelCapabilities capabilities={modelCapabilities} />
              </td>
              <td className={cellClassName}>{formatModalities(model)}</td>
              <td className={cellClassName}>
                {formatReportedNumber(
                  resolveLimit(
                    model,
                    modelCapabilities,
                    ["context_tokens", "contextTokens"],
                    ["max_input_tokens", "maxInputTokens"],
                  ),
                )}
              </td>
              <td className={cellClassName}>
                {formatReportedNumber(
                  resolveLimit(
                    model,
                    modelCapabilities,
                    ["max_output_tokens", "maxOutputTokens"],
                  ),
                )}
              </td>
            </>
          )}
        />
      </table>
    </ModelSection>
  );
}

function EmbeddingModelsSection({
  models,
  capabilities,
  onViewDetails,
}: Required<Pick<ModelTableProps, "models" | "capabilities">> &
  Pick<ModelTableProps, "onViewDetails">) {
  return (
    <ModelSection
      id="embedding-models"
      title="Embedding models"
      description="Models that produce fixed-size vectors for semantic indexing and search."
      count={models.length}
    >
      <table aria-label="Embedding models" className={tableClassName}>
        <thead className={headerClassName}>
          <tr>
            <TableHead className="px-4 py-3">Model</TableHead>
            <TableHead className="px-4 py-3">Dimensions</TableHead>
            <TableHead className="px-4 py-3">Max input tokens</TableHead>
            <TableHead className="px-4 py-3">Vector compatibility</TableHead>
            <TableHead className="px-4 py-3">Availability</TableHead>
            {onViewDetails && (
              <TableHead className="px-4 py-3">Details</TableHead>
            )}
          </tr>
        </thead>
        <TypedModelRows
          models={models}
          capabilities={capabilities}
          onViewDetails={onViewDetails}
          renderTypeCells={(model, modelCapabilities) => (
            <>
              <td className={cellClassName}>
                <div>
                  {formatReportedNumber(
                    resolveDimensions(model, modelCapabilities),
                  )}
                </div>
                <div
                  className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                >
                  <DimensionBehavior metadata={model.metadata} />
                </div>
              </td>
              <td className={cellClassName}>
                {formatReportedNumber(
                  resolveLimit(
                    model,
                    modelCapabilities,
                    ["max_input_tokens", "maxInputTokens"],
                  ),
                )}
              </td>
              <td className={`${cellClassName} font-mono text-xs`}>
                {model.vectorSpaceKey || "Not reported"}
              </td>
              <td className={cellClassName}>
                <ModelCapabilities capabilities={modelCapabilities} />
              </td>
            </>
          )}
        />
      </table>
    </ModelSection>
  );
}

function OtherModelsSection({
  models,
  capabilities,
  onViewDetails,
}: Required<Pick<ModelTableProps, "models" | "capabilities">> &
  Pick<ModelTableProps, "onViewDetails">) {
  return (
    <ModelSection
      id="other-models"
      title="Other models"
      description="Models whose kind is not recognized by this Console version. Full catalog details remain available."
      count={models.length}
    >
      <table aria-label="Other models" className={tableClassName}>
        <thead className={headerClassName}>
          <tr>
            <TableHead className="px-4 py-3">Model</TableHead>
            <TableHead className="px-4 py-3">Kind</TableHead>
            <TableHead className="px-4 py-3">Capabilities</TableHead>
            <TableHead className="px-4 py-3">Modalities</TableHead>
            <TableHead className="px-4 py-3">Connectors</TableHead>
            {onViewDetails && (
              <TableHead className="px-4 py-3">Details</TableHead>
            )}
          </tr>
        </thead>
        <tbody className={bodyClassName}>
          {models.map((model) => {
            const modelCapabilities = capabilitiesForModel(model, capabilities);
            return (
              <tr key={model.modelId}>
                <ModelIdentityCell model={model} />
                <td className={cellClassName}>
                  {formatEnumLabel(model.kind, "Not reported")}
                </td>
                <td className={cellClassName}>
                  <ModelCapabilities capabilities={modelCapabilities} />
                </td>
                <td className={cellClassName}>{formatModalities(model)}</td>
                <td className={cellClassName}>
                  <ConnectorTypes model={model} />
                </td>
                {onViewDetails && (
                  <ActionCell
                    model={model}
                    capabilities={modelCapabilities}
                    onViewDetails={onViewDetails}
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </ModelSection>
  );
}

function ModelSection({
  id,
  title,
  description,
  count,
  children,
}: {
  id: string;
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id={`${id}-heading`}
            className={`text-base font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            {title}
          </h2>
          <Text intent="muted">{description}</Text>
        </div>
        <Text intent="muted">
          {count} {count === 1 ? "model" : "models"}
        </Text>
      </div>
      <div
        className={`overflow-x-auto rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
      >
        {children}
      </div>
    </section>
  );
}

function ModelIdentityCell({ model }: { model: InferenceModelInfo }) {
  return (
    <td className={cellClassName}>
      <div
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {model.key}
      </div>
      <div
        className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        {model.modelName || "Not reported"}
      </div>
    </td>
  );
}

function TypedModelRows({
  models,
  capabilities,
  onViewDetails,
  renderTypeCells,
}: Required<Pick<ModelTableProps, "models" | "capabilities">> &
  Pick<ModelTableProps, "onViewDetails"> & {
    renderTypeCells: (
      model: InferenceModelInfo,
      capabilities: ModelEndpointCapabilityInfo[],
    ) => React.ReactNode;
  }) {
  return (
    <tbody className={bodyClassName}>
      {models.map((model) => {
        const modelCapabilities = capabilitiesForModel(model, capabilities);
        return (
          <tr key={model.modelId}>
            <ModelIdentityCell model={model} />
            {renderTypeCells(model, modelCapabilities)}
            {onViewDetails && (
              <ActionCell
                model={model}
                capabilities={modelCapabilities}
                onViewDetails={onViewDetails}
              />
            )}
          </tr>
        );
      })}
    </tbody>
  );
}

function ActionCell({
  model,
  capabilities,
  onViewDetails,
}: {
  model: InferenceModelInfo;
  capabilities: ModelEndpointCapabilityInfo[];
  onViewDetails: (model: InferenceModelDetail) => void;
}) {
  return (
    <td className={cellClassName}>
      <Button
        variant="secondary"
        onClick={() =>
          onViewDetails({
            ...model,
            modelEndpointCapabilities: capabilities,
          })
        }
      >
        View
      </Button>
    </td>
  );
}

function ModelCapabilities({
  capabilities,
}: {
  capabilities: ModelEndpointCapabilityInfo[];
}) {
  if (capabilities.length === 0) return <MissingValue />;

  const unique = Array.from(
    new Map(
      capabilities.map((capability) => [
        [
          capability.operation,
          capability.modelEndpointKey || capability.modelEndpointId,
          capability.enabled,
        ].join("|"),
        capability,
      ]),
    ).values(),
  ).sort((left, right) =>
    `${left.operation}${left.modelEndpointKey}${left.enabled}`.localeCompare(
      `${right.operation}${right.modelEndpointKey}${right.enabled}`,
    ),
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((capability) => (
        <span
          key={
            capability.modelEndpointCapabilityId ||
            `${capability.operation}-${capability.modelEndpointId}-${capability.enabled}`
          }
          title={capability.modelEndpointCapabilityId}
          className={`rounded-full px-2 py-0.5 text-xs ${capability.enabled ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" : `bg-slate-100 ${themeClasses.text.parts.mutedLight} line-through dark:bg-slate-800 ${themeClasses.text.parts.darkMuted}`}`}
        >
          {[
            formatEnumLabel(capability.operation, "Operation not reported"),
            capability.modelEndpointKey || capability.modelEndpointId,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      ))}
    </div>
  );
}

function ConnectorTypes({ model }: { model: InferenceModelInfo }) {
  if (!model.connectorTypes?.length) return <MissingValue />;
  return (
    <span>
      {model.connectorTypes
        .map((type) => formatEnumLabel(type, "Not reported"))
        .join(", ")}
    </span>
  );
}

function DimensionBehavior({ metadata }: { metadata?: JsonObject | null }) {
  const connectorUsesFixed = metadataBoolean(metadata, [
    "connector_uses_fixed_dimensions",
    "connectorUsesFixedDimensions",
  ]);
  const providerAdjustable = metadataBoolean(metadata, [
    "provider_supports_adjustable_dimensions",
    "providerSupportsAdjustableDimensions",
  ]);

  if (connectorUsesFixed === true) {
    return (
      <div>
        <div>Fixed in Mycel</div>
        {providerAdjustable === true && (
          <div
            className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
          >
            Provider supports adjustment
          </div>
        )}
      </div>
    );
  }
  if (providerAdjustable === true) return <span>Provider adjustable</span>;
  if (providerAdjustable === false) return <span>Fixed dimensions</span>;
  return <MissingValue />;
}

function MissingValue() {
  return (
    <span
      className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
    >
      Not reported
    </span>
  );
}

function capabilitiesForModel(
  model: InferenceModelInfo,
  capabilities: ModelEndpointCapabilityInfo[],
) {
  return capabilities.filter(
    (capability) => capability.modelId === model.modelId,
  );
}

function formatModalities(model: InferenceModelInfo) {
  const input = model.inputModalities
    ?.map((value) => formatEnumLabel(value))
    .filter(Boolean)
    .join("+");
  const output = model.outputModalities
    ?.map((value) => formatEnumLabel(value))
    .filter(Boolean)
    .join("+");
  return [input, output].filter(Boolean).join(" → ") || "Not reported";
}

function resolveDimensions(
  model: InferenceModelInfo,
  capabilities: ModelEndpointCapabilityInfo[],
): ReportedNumber {
  if (isPositiveInteger(model.dimensions)) return model.dimensions;
  return resolveLimit(
    model,
    capabilities,
    ["default_dimensions", "defaultDimensions"],
    ["dimensions"],
  );
}

function resolveLimit(
  model: InferenceModelInfo,
  capabilities: ModelEndpointCapabilityInfo[],
  modelKeys: string[],
  capabilityKeys = modelKeys,
): ReportedNumber {
  const modelValue = metadataPositiveInteger(model.metadata, modelKeys);
  if (modelValue !== null) return modelValue;

  const capabilityValues = capabilities
    .map((capability) =>
      metadataPositiveInteger(capability.metadata, capabilityKeys),
    )
    .filter((value): value is number => value !== null);
  const uniqueValues = [...new Set(capabilityValues)];
  if (uniqueValues.length === 1) return uniqueValues[0];
  if (uniqueValues.length > 1) return "varies";
  return null;
}

function metadataPositiveInteger(
  metadata: JsonObject | null | undefined,
  keys: string[],
) {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (isPositiveInteger(value)) return value;
  }
  return null;
}

function metadataBoolean(
  metadata: JsonObject | null | undefined,
  keys: string[],
) {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "boolean") return value;
  }
  return null;
}

function isPositiveInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function formatReportedNumber(value: ReportedNumber) {
  if (value === "varies") return "Varies by capability";
  if (value === null) return "Not reported";
  return new Intl.NumberFormat("en-US").format(value);
}

function emptyModelMessage(kind?: ModelCatalogKind) {
  if (kind === "generative") return "No generative models found.";
  if (kind === "embedding") return "No embedding models found.";
  if (kind === "other") return "No unrecognized model kinds found.";
  return "No models found.";
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
