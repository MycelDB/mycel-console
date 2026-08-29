import {
  Alert,
  Button,
  ErrorGroup,
  formatEnumLabel,
  TableHead,
  Text,
  themeClasses,
} from "../../../components/typography";
import type { DomainInfo } from "../../../types/domains";
import type {
  CredentialGrantInfo,
  InferenceCredentialInfo,
  InferenceModelInfo,
  InferencePolicyInfo,
  InferenceProfileInfo,
  ModelEndpointCapabilityInfo,
  ModelEndpointInfo,
} from "../../../types/inference";
import type { SpaceInfo } from "../../../types/spaces";
import type {
  CredentialDraft,
  GrantDraft,
  InferenceTab,
  PolicyDraft,
  ProfileDraft,
} from "../model/pageTypes";
import { inferenceOperationOptions } from "../model/pageTypes";
import {
  CredentialCreatePanel,
  GrantCreatePanel,
  PolicyCreatePanel,
} from "./InferenceAccessCreatePanels";
import {
  Field,
  MultiSelectChecklist,
  SelectField,
  uniqueOptions,
} from "./InferenceFormControls";

export function InferenceSetupSection({
  activeTab,
  loading,
  error,
  message,
  spaceId,
  profileForm,
  setProfileForm,
  credentialForm,
  setCredentialForm,
  grantDraft,
  setGrantDraft,
  grantSpaces,
  grantDomains,
  grantLoadError,
  grantCreateOpen,
  endpoints,
  models,
  capabilities,
  policyDraft,
  setPolicyDraft,
  policySpaces,
  policyDomains,
  policyLoadError,
  policyCreateOpen,
  profiles,
  credentials,
  grants,
  policies,
  canManageProfiles,
  canManageCredentials,
  canManageGrants,
  canManagePolicies,
  onCreateProfile,
  onCreateCredential,
  onRevokeCredential,
  onStartCreateGrant,
  onCancelCreateGrant,
  onCreateGrant,
  onStartCreatePolicy,
  onCancelCreatePolicy,
  onCreatePolicy,
  onExpireGrant,
  onExpirePolicy,
  onViewDetails,
}: {
  activeTab: InferenceTab;
  loading: boolean;
  error: string;
  message: string;
  spaceId: string;
  profileForm: ProfileDraft;
  setProfileForm: (
    value: ProfileDraft | ((current: ProfileDraft) => ProfileDraft),
  ) => void;
  credentialForm: CredentialDraft;
  setCredentialForm: (
    value: CredentialDraft | ((current: CredentialDraft) => CredentialDraft),
  ) => void;
  grantDraft: GrantDraft;
  setGrantDraft: (
    value: GrantDraft | ((current: GrantDraft) => GrantDraft),
  ) => void;
  grantSpaces: SpaceInfo[];
  grantDomains: DomainInfo[];
  grantLoadError: string;
  grantCreateOpen: boolean;
  endpoints: ModelEndpointInfo[];
  models: InferenceModelInfo[];
  capabilities: ModelEndpointCapabilityInfo[];
  policyDraft: PolicyDraft;
  setPolicyDraft: (
    value: PolicyDraft | ((current: PolicyDraft) => PolicyDraft),
  ) => void;
  policySpaces: SpaceInfo[];
  policyDomains: DomainInfo[];
  policyLoadError: string;
  policyCreateOpen: boolean;
  profiles: InferenceProfileInfo[];
  credentials: InferenceCredentialInfo[];
  grants: CredentialGrantInfo[];
  policies: InferencePolicyInfo[];
  canManageProfiles: boolean;
  canManageCredentials: boolean;
  canManageGrants: boolean;
  canManagePolicies: boolean;
  onCreateProfile: () => void;
  onCreateCredential: () => void;
  onRevokeCredential: (credential: InferenceCredentialInfo) => void;
  onStartCreateGrant: () => void;
  onCancelCreateGrant: () => void;
  onCreateGrant: () => void;
  onStartCreatePolicy: () => void;
  onCancelCreatePolicy: () => void;
  onCreatePolicy: () => void;
  onExpireGrant: (grantId: string) => void;
  onExpirePolicy: (policyId: string) => void;
  onViewDetails: (title: string, data: unknown) => void;
}) {
  const profileOperation = profileForm.operation.trim().toLowerCase();
  const capableModelIds = new Set(
    capabilities
      .filter(
        (capability) =>
          capability.enabled &&
          (!profileOperation ||
            capability.operation.toLowerCase() === profileOperation),
      )
      .map((capability) => capability.modelId),
  );
  const profileModelOptionsFromModels = models
    .filter(
      (model) =>
        capableModelIds.size === 0 || capableModelIds.has(model.modelId),
    )
    .map((model) => ({
      value: model.key || model.modelId,
      label: model.key || model.modelName || model.modelId,
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
    }));
  const profileModelOptions =
    profileModelOptionsFromModels.length > 0
      ? profileModelOptionsFromModels
      : uniqueOptions(
          capabilities
            .filter(
              (capability) =>
                capability.enabled &&
                (!profileOperation ||
                  capability.operation.toLowerCase() === profileOperation) &&
                (capability.modelKey || capability.modelId),
            )
            .map((capability) => ({
              value: capability.modelKey || capability.modelId,
              label: capability.modelKey || capability.modelId,
              hint: formatEnumLabel(capability.operation),
            })),
        );
  const selectedProfileModelIds = new Set(
    models
      .filter((model) =>
        profileForm.modelRefs.includes(model.key || model.modelId),
      )
      .map((model) => model.modelId),
  );
  const capableEndpointIds = new Set(
    capabilities
      .filter(
        (capability) =>
          capability.enabled &&
          (!profileOperation ||
            capability.operation.toLowerCase() === profileOperation) &&
          (selectedProfileModelIds.size === 0 ||
            selectedProfileModelIds.has(capability.modelId)),
      )
      .map((capability) => capability.modelEndpointId),
  );
  const profileEndpointOptions = endpoints
    .filter(
      (endpoint) =>
        endpoint.enabled &&
        (!profileOperation ||
          endpoint.operations.some(
            (operation) => operation.toLowerCase() === profileOperation,
          )) &&
        (capabilities.length === 0 ||
          capableEndpointIds.has(endpoint.modelEndpointId)),
    )
    .map((endpoint) => ({
      value: endpoint.key || endpoint.modelEndpointId,
      label: endpoint.key || endpoint.name || endpoint.modelEndpointId,
      hint: [endpoint.name, endpoint.privacyClass].filter(Boolean).join(" · "),
    }));
  const toggleProfileRef = (
    field: "endpointRefs" | "modelRefs",
    value: string,
    checked: boolean,
  ) =>
    setProfileForm((current) => ({
      ...current,
      [field]: checked
        ? Array.from(new Set([...current[field], value]))
        : current[field].filter((item) => item !== value),
    }));
  return (
    <div className="space-y-4">
      <ErrorGroup
        errors={
          error
            ? [
                {
                  id: "inference.access.form",
                  source: "Access changes",
                  message: error,
                },
              ]
            : []
        }
      />
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {message}
        </div>
      )}
      {activeTab === "profiles" && canManageProfiles && (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
        >
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create profile
          </Text>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field
              label="Key"
              value={profileForm.key}
              onChange={(key) =>
                setProfileForm((current) => ({ ...current, key }))
              }
            />
            <Field
              label="Display name"
              value={profileForm.displayName}
              onChange={(displayName) =>
                setProfileForm((current) => ({ ...current, displayName }))
              }
            />
            <SelectField
              label="Operation"
              value={profileForm.operation}
              onChange={(operation) =>
                setProfileForm((current) => ({
                  ...current,
                  operation,
                  endpointRefs: [],
                  modelRefs: [],
                }))
              }
              options={inferenceOperationOptions}
              placeholder="Choose an operation"
            />
            <Field
              label="Purpose"
              value={profileForm.purpose}
              onChange={(purpose) =>
                setProfileForm((current) => ({ ...current, purpose }))
              }
            />
            <MultiSelectChecklist
              label="Endpoint refs"
              values={profileForm.endpointRefs}
              options={profileEndpointOptions}
              emptyText="No matching enabled endpoints."
              onToggle={(value, checked) =>
                toggleProfileRef("endpointRefs", value, checked)
              }
            />
            <MultiSelectChecklist
              label="Model refs"
              values={profileForm.modelRefs}
              options={profileModelOptions}
              emptyText="No matching models for the selected operation."
              onToggle={(value, checked) =>
                toggleProfileRef("modelRefs", value, checked)
              }
            />
            <Field
              label="Max output tokens"
              value={profileForm.maxOutputTokens}
              onChange={(maxOutputTokens) =>
                setProfileForm((current) => ({ ...current, maxOutputTokens }))
              }
            />
          </div>
          <Button
            className="mt-3"
            onClick={onCreateProfile}
            disabled={loading || !spaceId}
          >
            Create profile
          </Button>
        </div>
      )}
      {activeTab === "credentials" && canManageCredentials && (
        <CredentialCreatePanel
          draft={credentialForm}
          setDraft={setCredentialForm}
          endpoints={endpoints}
          loading={loading}
          onCreateCredential={onCreateCredential}
        />
      )}
      {activeTab === "grants" && canManageGrants && grantCreateOpen && (
        <GrantCreatePanel
          draft={grantDraft}
          setDraft={setGrantDraft}
          spaces={grantSpaces}
          domains={grantDomains}
          domainError={grantLoadError}
          models={models}
          endpoints={endpoints}
          capabilities={capabilities}
          credentials={credentials}
          loading={loading}
          onCreateGrant={onCreateGrant}
          onCancel={onCancelCreateGrant}
        />
      )}
      {activeTab === "policies" && canManagePolicies && policyCreateOpen && (
        <PolicyCreatePanel
          draft={policyDraft}
          setDraft={setPolicyDraft}
          spaces={policySpaces}
          domains={policyDomains}
          domainError={policyLoadError}
          loading={loading}
          onCreatePolicy={onCreatePolicy}
          onCancel={onCancelCreatePolicy}
        />
      )}
      {!(
        (activeTab === "grants" && grantCreateOpen) ||
        (activeTab === "policies" && policyCreateOpen)
      ) && (
        <div
          className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
        >
          {activeTab === "grants" && canManageGrants && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <Text
                  as="h3"
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  Credential grants
                </Text>
                <Text intent="muted" size="sm" className="mt-1">
                  Filter existing grants, or create a new credential grant on a
                  dedicated form.
                </Text>
              </div>
              <Button onClick={onStartCreateGrant}>Create grant</Button>
            </div>
          )}
          {activeTab === "policies" && canManagePolicies && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <Text
                  as="h3"
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  Inference policies
                </Text>
                <Text intent="muted" size="sm" className="mt-1">
                  Filter existing policies, or create a new inference policy on
                  a dedicated form.
                </Text>
              </div>
              <Button onClick={onStartCreatePolicy}>Create policy</Button>
            </div>
          )}
          {loading ? (
            <Text intent="muted" className="p-6">
              Loading inference setup resources…
            </Text>
          ) : activeTab === "profiles" ? (
            <SimpleTable
              rows={profiles}
              columns={["key", "operation", "purpose", "enabled"]}
              idKey="inferenceProfileId"
              onView={onViewDetails}
            />
          ) : activeTab === "credentials" ? (
            <SimpleTable
              rows={credentials}
              columns={[
                "key",
                "modelEndpointKey",
                "ownerType",
                "authType",
                "status",
                "secretSuffix",
              ]}
              idKey="credentialId"
              onView={onViewDetails}
              onRevokeCredential={
                canManageCredentials ? onRevokeCredential : undefined
              }
            />
          ) : activeTab === "grants" ? (
            <SimpleTable
              rows={grants}
              columns={[
                "credentialId",
                "operations",
                "modelEndpointKey",
                "modelKey",
                "state",
              ]}
              idKey="credentialGrantId"
              onView={onViewDetails}
              onExpire={canManageGrants ? onExpireGrant : undefined}
            />
          ) : activeTab === "policies" ? (
            <SimpleTable
              rows={policies}
              columns={["effect", "operations", "action", "state", "reason"]}
              idKey="inferencePolicyId"
              onView={onViewDetails}
              onExpire={canManagePolicies ? onExpirePolicy : undefined}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function SimpleTable({
  rows,
  columns,
  idKey,
  onView,
  onExpire,
  onRevokeCredential,
}: {
  rows: any[];
  columns: string[];
  idKey: string;
  onView: (title: string, data: unknown) => void;
  onExpire?: (id: string) => void;
  onRevokeCredential?: (credential: InferenceCredentialInfo) => void;
}) {
  if (rows.length === 0)
    return (
      <Text intent="muted" className="p-6">
        No resources found.
      </Text>
    );
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
      <thead className="bg-slate-50 dark:bg-slate-950">
        <tr>
          {columns.map((column) => (
            <TableHead
              key={column}
              className={`px-4 py-3 text-left font-medium ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
            >
              {displayColumn(column)}
            </TableHead>
          ))}
          <TableHead
            className={`px-4 py-3 text-left font-medium ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
          >
            Actions
          </TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, index) => {
          const id = String(row[idKey] ?? index);
          const status = String(row.status ?? "").toLowerCase();
          return (
            <tr key={`${id}-${index}`}>
              {columns.map((column) => (
                <td
                  key={column}
                  className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                >
                  {formatCell(row, column)}
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => onView(id, row)}>
                    View
                  </Button>
                  {onExpire && (
                    <Button variant="secondary" onClick={() => onExpire(id)}>
                      Expire
                    </Button>
                  )}
                  {onRevokeCredential && status !== "revoked" && (
                    <Button
                      variant="secondary"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={() =>
                        onRevokeCredential(row as InferenceCredentialInfo)
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatCell(row: Record<string, unknown>, column: string): string {
  const value =
    row[column] ||
    (column === "modelEndpointKey"
      ? row.modelEndpointId
      : column === "modelKey"
        ? row.modelId
        : undefined);
  if (column === "secretSuffix") return value ? `••••${value}` : "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "—");
}

function displayColumn(column: string): string {
  const labels: Record<string, string> = {
    modelEndpointKey: "Endpoint",
    modelKey: "Model",
    credentialId: "Credential ID",
    secretSuffix: "Key suffix",
  };
  return labels[column] || column;
}
