import {
  Button,
  Input,
  Select,
  Text,
  themeClasses,
} from "../../../../components/typography";
import type { DomainInfo } from "../../../../types/domains";
import type {
  SemanticRuleValidationDiagnostic,
  ValidateSemanticRuleResponse,
} from "../../../../types/semantic";
import type { SpaceInfo } from "../../../../types/spaces";
import type { DraftMode, ProfileOption, RuleDraft } from "../model/pageTypes";

export function RuleEditor({
  mode,
  draft,
  setDraft,
  spaces,
  domains,
  profiles,
  validation,
  loading,
  onValidate,
  onSave,
  onCancel,
}: {
  mode: DraftMode;
  draft: RuleDraft;
  setDraft: (draft: RuleDraft) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  profiles: ProfileOption[];
  validation: ValidateSemanticRuleResponse | null;
  loading: boolean;
  onValidate: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: keyof RuleDraft, value: string | boolean) =>
    setDraft({ ...draft, [key]: value });
  const updateSelectorMode = (value: string) =>
    setDraft({
      ...draft,
      selectorMode: value,
      selectorGql: value === "gql" ? draft.selectorGql : "",
      targetAlias: value === "gql" ? draft.targetAlias.trim() || "n" : "",
    });
  const domainsForSpace = domains.filter(
    (domain) => !draft.spaceId || domain.spaceId === draft.spaceId,
  );
  const profileOptions = profiles.filter(
    (profile) =>
      (!draft.spaceId || profile.spaceId === draft.spaceId) &&
      (!draft.domainId ||
        profile.domainIds.length === 0 ||
        profile.domainIds.includes(draft.domainId)),
  );
  const profileOptionsWithCurrent =
    draft.intelligenceProfile &&
    !profileOptions.some(
      (profile) => profile.value === draft.intelligenceProfile,
    )
      ? [
          {
            value: draft.intelligenceProfile,
            label: `${draft.intelligenceProfile} (current)`,
            spaceId: draft.spaceId,
            domainIds: [],
          },
          ...profileOptions,
        ]
      : profileOptions;
  const selectorMode = draft.selectorMode || "node_type";
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-900 dark:bg-cyan-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            {mode === "create" ? "Create semantic rule" : "Edit semantic rule"}
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Validate the rule before saving. GQL selectors should be bounded
            with max results.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Select
          label="Space"
          value={draft.spaceId}
          onChange={(value) => update("spaceId", value)}
          options={spaces.map((space) => ({
            value: space.spaceId,
            label: space.name || space.spaceId,
          }))}
        />
        <Select
          label="Domain"
          value={draft.domainId}
          onChange={(value) => update("domainId", value)}
          options={domainsForSpace.map((domain) => ({
            value: domain.domainId,
            label: domain.name || domain.key,
          }))}
        />
        <Field
          label="Key"
          value={draft.key}
          onChange={(value) => update("key", value)}
        />
        <Field
          label="Display name"
          value={draft.displayName}
          onChange={(value) => update("displayName", value)}
        />
        <Field
          label="Description"
          value={draft.description}
          onChange={(value) => update("description", value)}
        />
        <Field
          label="Labels"
          value={draft.labels}
          onChange={(value) => update("labels", value)}
        />
        <Field
          label="Trigger events"
          value={draft.triggerEvents}
          onChange={(value) => update("triggerEvents", value)}
        />
        <Field
          label="Dirty cooldown"
          value={draft.dirtyCooldown}
          onChange={(value) => update("dirtyCooldown", value)}
        />
        <Select
          label="Selector"
          value={selectorMode}
          onChange={updateSelectorMode}
          options={["node_type", "gql", "explicit_nodes"].map((value) => ({
            value,
            label: value,
          }))}
        />
        {selectorMode === "gql" && (
          <>
            <Field
              label="GQL selector"
              value={draft.selectorGql}
              onChange={(value) => update("selectorGql", value)}
            />
            <Field
              label="Target alias"
              value={draft.targetAlias}
              onChange={(value) => update("targetAlias", value)}
            />
          </>
        )}
        <Field
          label="Max results"
          value={draft.maxResults}
          onChange={(value) => update("maxResults", value)}
        />
        <Select
          label="Source"
          value={draft.sourceMode}
          onChange={(value) => update("sourceMode", value)}
          options={["self", "subtree", "context_query"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Field
          label="Include properties"
          value={draft.includeProperties}
          onChange={(value) => update("includeProperties", value)}
        />
        <Field
          label="Exclude properties"
          value={draft.excludeProperties}
          onChange={(value) => update("excludeProperties", value)}
        />
        <Field
          label="Context GQL"
          value={draft.contextGql}
          onChange={(value) => update("contextGql", value)}
        />
        <Field
          label="Binding key"
          value={draft.bindingKey}
          onChange={(value) => update("bindingKey", value)}
        />
        <Field
          label="Purpose"
          value={draft.purpose}
          onChange={(value) => update("purpose", value)}
        />
        <Select
          label="Intelligence profile"
          value={draft.intelligenceProfile}
          onChange={(value) => update("intelligenceProfile", value)}
          options={profileOptionsWithCurrent.map(({ value, label }) => ({
            value,
            label,
          }))}
          placeholder={
            profileOptions.length === 0
              ? "No embedding profiles available"
              : "Select profile"
          }
        />
        <Field
          label="Vector store"
          value={draft.vectorStore}
          onChange={(value) => update("vectorStore", value)}
        />
        <Field
          label="Physical index"
          value={draft.physicalIndex}
          onChange={(value) => update("physicalIndex", value)}
        />
        <label
          className={`flex items-end gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />{" "}
          Enabled
        </label>
        <label
          className={`flex items-end gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          <input
            type="checkbox"
            checked={draft.searchable}
            onChange={(event) => update("searchable", event.target.checked)}
          />{" "}
          Searchable
        </label>
      </div>
      {validation && <ValidationPanel validation={validation} />}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={loading} onClick={onValidate}>
          Validate
        </Button>
        <Button disabled={loading} onClick={onSave}>
          {mode === "create" ? "Create rule" : "Save rule"}
        </Button>
      </div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
    >
      {label}
      <Input
        className="mt-1 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function ValidationPanel({
  validation,
}: {
  validation: ValidateSemanticRuleResponse;
}) {
  return (
    <div
      className={`mt-4 rounded-md border p-3 text-sm ${validation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"}`}
    >
      <div className="font-medium">
        {validation.valid ? "Rule is valid" : "Rule has validation errors"}
      </div>
      {validation.diagnostics.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {validation.diagnostics.map(
            (diag: SemanticRuleValidationDiagnostic, index) => (
              <li key={`${diag.path}-${index}`}>
                {diag.severity} {diag.path}: {diag.message}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
