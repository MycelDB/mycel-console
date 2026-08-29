import {
  Alert,
  Button,
  formatEnumLabel,
  Text,
  themeClasses,
} from "../../../components/typography";
import type { DomainInfo } from "../../../types/domains";
import type {
  InferenceCredentialInfo,
  InferenceModelInfo,
  ModelEndpointCapabilityInfo,
  ModelEndpointInfo,
} from "../../../types/inference";
import type { SpaceInfo } from "../../../types/spaces";
import type {
  CredentialDraft,
  GrantDraft,
  PolicyDraft,
} from "../model/pageTypes";
import { Field, SelectField } from "./InferenceFormControls";

export function CredentialCreatePanel({
  draft,
  setDraft,
  endpoints,
  loading,
  onCreateCredential,
}: {
  draft: CredentialDraft;
  setDraft: (
    value: CredentialDraft | ((current: CredentialDraft) => CredentialDraft),
  ) => void;
  endpoints: ModelEndpointInfo[];
  loading: boolean;
  onCreateCredential: () => void;
}) {
  const enabledEndpoints = endpoints.filter((endpoint) => endpoint.enabled);
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <Text
        as="h3"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        Create credential
      </Text>
      <Text intent="muted" size="sm" className="mt-1">
        Paste the API key once. The key is sent to the daemon and will not be
        displayed again.
      </Text>
      {enabledEndpoints.length === 0 && (
        <div className="mt-3">
          <Alert>
            No enabled endpoints are available. Import an inference package
            before creating a credential.
          </Alert>
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field
          label="Credential key"
          value={draft.key}
          onChange={(key) => setDraft((current) => ({ ...current, key }))}
        />
        <SelectField
          label="Endpoint"
          value={draft.modelEndpointId}
          onChange={(modelEndpointId) =>
            setDraft((current) => ({ ...current, modelEndpointId }))
          }
          options={enabledEndpoints.map((endpoint) => ({
            value: endpoint.modelEndpointId,
            label: endpoint.key || endpoint.modelEndpointId,
          }))}
          placeholder="Choose an endpoint"
          disabled={enabledEndpoints.length === 0}
        />
        <Field
          label="API key"
          type="password"
          value={draft.secretValue}
          onChange={(secretValue) =>
            setDraft((current) => ({ ...current, secretValue }))
          }
        />
      </div>
      <label
        className={`mt-3 flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
      >
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              isDefault: event.target.checked,
            }))
          }
        />
        Make default
      </label>
      <Button
        className="mt-3"
        onClick={onCreateCredential}
        disabled={
          loading ||
          !draft.key.trim() ||
          !draft.modelEndpointId ||
          !draft.secretValue.trim()
        }
      >
        Create credential
      </Button>
    </div>
  );
}

export function PolicyCreatePanel({
  draft,
  setDraft,
  spaces,
  domains,
  domainError,
  loading,
  onCreatePolicy,
  onCancel,
}: {
  draft: PolicyDraft;
  setDraft: (
    value: PolicyDraft | ((current: PolicyDraft) => PolicyDraft),
  ) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  domainError: string;
  loading: boolean;
  onCreatePolicy: () => void;
  onCancel: () => void;
}) {
  const operationOptions = ["chat", "summarize", "classify", "embeddings"];
  function update(patch: Partial<PolicyDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function toggleOperation(operation: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      operations: checked
        ? Array.from(new Set([...current.operations, operation]))
        : current.operations.filter((item) => item !== operation),
    }));
  }
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create policy
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Choose the scope where inference is allowed, denied, or restricted.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      {domainError && (
        <div className="mt-3">
          <Alert>{domainError}</Alert>
        </div>
      )}
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Scope
          </Text>
          <SelectField
            label="Space"
            value={draft.spaceId}
            onChange={(spaceId) => update({ spaceId, domainId: "" })}
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
              hint: space.spaceId,
            }))}
            placeholder="Choose a space"
          />
          <SelectField
            label="Domain"
            value={draft.domainId}
            onChange={(domainId) => update({ domainId })}
            options={domains.map((domain) => ({
              value: domain.domainId,
              label: domain.name || domain.key || domain.domainId,
              hint: domain.domainId,
            }))}
            placeholder={
              draft.spaceId ? "Choose a domain" : "Select a space first"
            }
            disabled={!draft.spaceId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeDescendants}
              onChange={(event) =>
                update({ includeDescendants: event.target.checked })
              }
            />
            Include descendants
          </label>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Policy
          </Text>
          <SelectField
            label="Effect"
            value={draft.effect}
            onChange={(effect) => update({ effect })}
            options={["allow", "deny", "restrict"].map((effect) => ({
              value: effect,
              label: effect,
            }))}
            placeholder="Choose an effect"
          />
          <div>
            <Text
              size="sm"
              className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              Operations
            </Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {operationOptions.map((operation) => (
                <label
                  key={operation}
                  className={`flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm ${themeClasses.text.parts.bodyLight} dark:border-slate-800 dark:bg-slate-950 ${themeClasses.text.parts.darkSecondary}`}
                >
                  <input
                    type="checkbox"
                    checked={draft.operations.includes(operation)}
                    onChange={(event) =>
                      toggleOperation(operation, event.target.checked)
                    }
                  />
                  {operation}
                </label>
              ))}
            </div>
          </div>
          <Field
            label="Reason"
            value={draft.reason}
            onChange={(reason) => update({ reason })}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onCreatePolicy}
          disabled={
            loading ||
            !draft.spaceId ||
            !draft.effect ||
            draft.operations.length === 0
          }
        >
          Create policy
        </Button>
      </div>
    </div>
  );
}

export function GrantCreatePanel({
  draft,
  setDraft,
  spaces,
  domains,
  domainError,
  models,
  endpoints,
  capabilities,
  credentials,
  loading,
  onCreateGrant,
  onCancel,
}: {
  draft: GrantDraft;
  setDraft: (value: GrantDraft | ((current: GrantDraft) => GrantDraft)) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  domainError: string;
  models: InferenceModelInfo[];
  endpoints: ModelEndpointInfo[];
  capabilities: ModelEndpointCapabilityInfo[];
  credentials: InferenceCredentialInfo[];
  loading: boolean;
  onCreateGrant: () => void;
  onCancel: () => void;
}) {
  const selectedModel = models.find((model) => model.modelId === draft.modelId);
  const endpointIdsForModel = new Set(
    capabilities
      .filter((capability) => capability.modelId === draft.modelId)
      .map((capability) => capability.modelEndpointId),
  );
  const filteredEndpoints = draft.modelId
    ? endpoints.filter((endpoint) =>
        endpointIdsForModel.has(endpoint.modelEndpointId),
      )
    : endpoints;
  const operationCapabilities = capabilities.filter(
    (capability) =>
      capability.modelId === draft.modelId &&
      capability.modelEndpointId === draft.endpointId,
  );
  const operationOptions = Array.from(
    new Map(
      operationCapabilities.map((capability) => [
        capability.operation,
        capability,
      ]),
    ).values(),
  );
  const filteredCredentials = credentials.filter(
    (credential) =>
      (!draft.endpointId || credential.modelEndpointId === draft.endpointId) &&
      (draft.includeInactive ||
        credential.status === "active" ||
        credential.status === "ACTIVE"),
  );
  const selectedSpace = spaces.find((space) => space.spaceId === draft.spaceId);
  const selectedDomain = domains.find(
    (domain) => domain.domainId === draft.domainId,
  );
  const selectedEndpoint = endpoints.find(
    (endpoint) => endpoint.modelEndpointId === draft.endpointId,
  );
  const selectedCredential = credentials.find(
    (credential) => credential.credentialId === draft.credentialId,
  );

  function update(patch: Partial<GrantDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function toggleOperation(operation: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      operations: checked
        ? Array.from(new Set([...current.operations, operation]))
        : current.operations.filter((item) => item !== operation),
    }));
  }

  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create grant
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Select readable resources; Console sends stable IDs/refs to mycel.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      {domainError && (
        <div className="mt-3">
          <Alert>{domainError}</Alert>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Scope
          </Text>
          <SelectField
            label="Space"
            value={draft.spaceId}
            onChange={(spaceId) => update({ spaceId, domainId: "" })}
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
              hint: space.spaceId,
            }))}
            placeholder="Choose a space"
          />
          <SelectField
            label="Domain"
            value={draft.domainId}
            onChange={(domainId) => update({ domainId })}
            options={domains.map((domain) => ({
              value: domain.domainId,
              label: domain.name || domain.key || domain.domainId,
              hint: domain.domainId,
            }))}
            placeholder={
              draft.spaceId ? "Choose a domain" : "Select a space first"
            }
            disabled={!draft.spaceId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeDescendants}
              onChange={(event) =>
                update({ includeDescendants: event.target.checked })
              }
            />
            Include descendants
          </label>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Model binding
          </Text>
          <SelectField
            label="Model"
            value={draft.modelId}
            onChange={(modelId) =>
              update({
                modelId,
                endpointId: "",
                credentialId: "",
                operations: [],
              })
            }
            options={models.map((model) => ({
              value: model.modelId,
              label: model.key || model.modelId,
              hint: [
                model.kind,
                model.inputModalities?.length
                  ? `in:${model.inputModalities.map((value) => formatEnumLabel(value)).join("+")}`
                  : "",
                model.outputModalities?.length
                  ? `out:${model.outputModalities.map((value) => formatEnumLabel(value)).join("+")}`
                  : "",
                model.dimensions ? `${model.dimensions} dims` : "",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder="Choose a model"
          />
          <SelectField
            label="Endpoint"
            value={draft.endpointId}
            onChange={(endpointId) => {
              const ops = capabilities
                .filter(
                  (capability) =>
                    capability.modelId === draft.modelId &&
                    capability.modelEndpointId === endpointId &&
                    capability.enabled,
                )
                .map((capability) => capability.operation)
                .filter(Boolean);
              update({
                endpointId,
                credentialId: "",
                operations: Array.from(new Set(ops)),
              });
            }}
            options={filteredEndpoints.map((endpoint) => ({
              value: endpoint.modelEndpointId,
              label: endpoint.key || endpoint.modelEndpointId,
              hint: [
                endpoint.name,
                endpoint.enabled ? "enabled" : "disabled",
                endpoint.privacyClass,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder={
              draft.modelId ? "Choose an endpoint" : "Select a model first"
            }
            disabled={!draft.modelId}
          />
          <OperationCheckboxGroup
            capabilities={operationOptions}
            selected={draft.operations}
            onToggle={toggleOperation}
          />
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Credential
          </Text>
          <SelectField
            label="Credential"
            value={draft.credentialId}
            onChange={(credentialId) => update({ credentialId })}
            options={filteredCredentials.map((credential) => ({
              value: credential.credentialId,
              label:
                credential.key ||
                credential.displayName ||
                credential.credentialId,
              hint: [
                credential.displayName,
                credential.ownerType,
                credential.status,
                credential.isDefault ? "default" : "",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder={
              draft.endpointId
                ? "Choose a credential"
                : "Select an endpoint first"
            }
            disabled={!draft.endpointId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeInactive}
              onChange={(event) =>
                update({ includeInactive: event.target.checked })
              }
            />
            Include inactive credentials
          </label>
          {draft.endpointId && filteredCredentials.length === 0 && (
            <Text intent="muted" size="sm">
              No credential is available for this endpoint. Create a credential
              first, then return to Grants.
            </Text>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Grant options
          </Text>
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.allowBackgroundUse}
              onChange={(event) =>
                update({ allowBackgroundUse: event.target.checked })
              }
            />
            Allow automation/background use
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(event) => update({ isDefault: event.target.checked })}
            />
            Default grant
          </label>
          <Field
            label="Priority"
            value={draft.priority}
            type="number"
            onChange={(priority) => update({ priority })}
          />
        </div>
      </div>
      <details
        className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700"
        open={draft.advancedOpen}
        onToggle={(event) => update({ advancedOpen: event.currentTarget.open })}
      >
        <summary
          className={`cursor-pointer text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
        >
          Advanced IDs/refs
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field
            label="Credential ref"
            value={draft.credentialRef}
            onChange={(credentialRef) => update({ credentialRef })}
          />
          <Field
            label="Endpoint ref"
            value={draft.endpointRef}
            onChange={(endpointRef) => update({ endpointRef })}
          />
          <Field
            label="Model ref"
            value={draft.modelRef}
            onChange={(modelRef) => update({ modelRef })}
          />
          <Field
            label="Semantic rule ID"
            value={draft.semanticRuleId}
            onChange={(semanticRuleId) => update({ semanticRuleId })}
          />
          <Field
            label="Node ID"
            value={draft.nodeId}
            onChange={(nodeId) => update({ nodeId })}
          />
        </div>
      </details>
      <GrantReviewSummary
        space={selectedSpace}
        domain={selectedDomain}
        model={selectedModel}
        endpoint={selectedEndpoint}
        credential={selectedCredential}
        operations={draft.operations}
        allowBackgroundUse={draft.allowBackgroundUse}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onCreateGrant}
          disabled={
            loading ||
            !draft.spaceId ||
            (!draft.credentialId && !draft.credentialRef) ||
            (!draft.endpointId && !draft.endpointRef) ||
            (!draft.modelId && !draft.modelRef) ||
            draft.operations.length === 0
          }
        >
          Create grant
        </Button>
      </div>
    </div>
  );
}

function OperationCheckboxGroup({
  capabilities,
  selected,
  onToggle,
}: {
  capabilities: ModelEndpointCapabilityInfo[];
  selected: string[];
  onToggle: (operation: string, checked: boolean) => void;
}) {
  if (capabilities.length === 0)
    return (
      <Text intent="muted" size="sm">
        Select a model and endpoint to choose operations.
      </Text>
    );
  return (
    <div>
      <Text
        size="sm"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        Operations
      </Text>
      <div className="mt-2 flex flex-wrap gap-2">
        {capabilities.map((capability) => (
          <label
            key={capability.modelEndpointCapabilityId}
            title={capability.modelEndpointCapabilityId}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${capability.enabled ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" : `border-slate-200 bg-slate-100 ${themeClasses.text.parts.mutedLight} dark:border-slate-800 dark:bg-slate-900 ${themeClasses.text.parts.darkMuted}`}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(capability.operation)}
              disabled={!capability.enabled}
              onChange={(event) =>
                onToggle(capability.operation, event.target.checked)
              }
            />
            {formatEnumLabel(capability.operation, "Unspecified")}
          </label>
        ))}
      </div>
    </div>
  );
}

function GrantReviewSummary({
  space,
  domain,
  model,
  endpoint,
  credential,
  operations,
  allowBackgroundUse,
}: {
  space?: SpaceInfo;
  domain?: DomainInfo;
  model?: InferenceModelInfo;
  endpoint?: ModelEndpointInfo;
  credential?: InferenceCredentialInfo;
  operations: string[];
  allowBackgroundUse: boolean;
}) {
  return (
    <div
      className={`mt-4 rounded-lg bg-slate-50 p-3 text-sm ${themeClasses.text.parts.bodyLight} dark:bg-slate-950 ${themeClasses.text.parts.darkSecondary}`}
    >
      <strong>Review:</strong> Grant credential{" "}
      <span className="font-medium">{credential?.key || "—"}</span> for space{" "}
      <span className="font-medium">
        {space?.name || space?.spaceId || "—"}
      </span>
      {domain ? (
        <>
          {" "}
          / domain{" "}
          <span className="font-medium">{domain.name || domain.key}</span>
        </>
      ) : null}
      . Endpoint <span className="font-medium">{endpoint?.key || "—"}</span>,
      model <span className="font-medium">{model?.key || "—"}</span>, operations{" "}
      <span className="font-medium">{operations.join(", ") || "—"}</span>.{" "}
      {allowBackgroundUse
        ? "Background/automation use allowed."
        : "Background/automation use not allowed."}
    </div>
  );
}
