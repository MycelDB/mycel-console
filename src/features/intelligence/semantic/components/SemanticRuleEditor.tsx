import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  Input,
  Select,
  Text,
  themeClasses,
} from "../../../../components/typography";
import type { DomainInfo } from "../../../../types/domains";
import type { VectorStoreInfo } from "../../../../types/inference";
import {
  semanticTriggerEvents,
  type SemanticRuleValidationDiagnostic,
  type ValidateSemanticRuleResponse,
} from "../../../../types/semantic";
import type { SpaceInfo } from "../../../../types/spaces";
import type {
  DraftMode,
  ProfileOption,
  RuleDraft,
  VectorStoreCatalogState,
} from "../model/pageTypes";

const triggerEventLabels: Record<string, string> = {
  changed: "Any event",
  "node.created": "Node created",
  "node.updated": "Node updated",
  "node.deleted": "Node deleted",
  "edge.changed": "Edge changed",
  "edge.created": "Edge created",
  "edge.updated": "Edge updated",
  "edge.deleted": "Edge deleted",
};

export function RuleEditor({
  mode,
  draft,
  setDraft,
  spaces,
  domains,
  profiles,
  vectorStores,
  vectorStoreCatalog,
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
  vectorStores: VectorStoreInfo[];
  vectorStoreCatalog: VectorStoreCatalogState;
  validation: ValidateSemanticRuleResponse | null;
  loading: boolean;
  onValidate: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: keyof RuleDraft, value: string | boolean) =>
    setDraft({ ...draft, [key]: value });
  const toggleTriggerEvent = (eventName: string, checked: boolean) => {
    const next = checked
      ? eventName === "changed"
        ? ["changed"]
        : [
            ...new Set([
              ...draft.triggerEvents.filter((event) => event !== "changed"),
              eventName,
            ]),
          ]
      : draft.triggerEvents.filter((event) => event !== eventName);
    setDraft({
      ...draft,
      triggerEvents: next.length > 0 ? next : ["changed"],
      triggerEventProblem: "",
    });
  };
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
        <fieldset
          className={`rounded-md border border-slate-300 p-3 text-sm dark:border-slate-700 ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          <legend className="px-1 font-medium">Trigger events</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {semanticTriggerEvents.map((eventName) => (
              <label key={eventName} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.triggerEvents.includes(eventName)}
                  onChange={(event) =>
                    toggleTriggerEvent(eventName, event.target.checked)
                  }
                />
                {triggerEventLabels[eventName]}
              </label>
            ))}
            {draft.triggerEvents
              .filter(
                (eventName) =>
                  !(semanticTriggerEvents as readonly string[]).includes(
                    eventName,
                  ),
              )
              .map((eventName) => (
                <label
                  key={eventName}
                  className="flex items-center gap-2 text-amber-700 dark:text-amber-300"
                >
                  <input
                    type="checkbox"
                    checked
                    onChange={() => toggleTriggerEvent(eventName, false)}
                  />
                  Unsupported: {eventName}
                </label>
              ))}
          </div>
          <Text intent="muted" size="xs" className="mt-2">
            Labels narrow matching changes. Dirty cooldown coalesces rapid
            changes before semantic maintenance runs.
          </Text>
          {draft.triggerEventProblem && (
            <div
              role="alert"
              className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300"
            >
              {draft.triggerEventProblem}
              {draft.triggerEventProblem.startsWith("Typed and legacy") && (
                <button
                  type="button"
                  className="ml-2 underline underline-offset-2"
                  onClick={() =>
                    setDraft({ ...draft, triggerEventProblem: "" })
                  }
                >
                  Use typed values
                </button>
              )}
            </div>
          )}
        </fieldset>
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
        <VectorStoreSelector
          mode={mode}
          draft={draft}
          setDraft={setDraft}
          stores={vectorStores}
          catalog={vectorStoreCatalog}
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
        <Button
          variant="secondary"
          disabled={
            loading ||
            Boolean(draft.triggerEventProblem) ||
            (mode === "create" && !draft.vectorStoreId)
          }
          onClick={onValidate}
        >
          Validate
        </Button>
        <Button
          disabled={
            loading ||
            Boolean(draft.triggerEventProblem) ||
            (mode === "create" && !draft.vectorStoreId)
          }
          onClick={onSave}
        >
          {mode === "create" ? "Create rule" : "Save rule"}
        </Button>
      </div>
    </div>
  );
}

function VectorStoreSelector({
  mode,
  draft,
  setDraft,
  stores,
  catalog,
}: {
  mode: DraftMode;
  draft: RuleDraft;
  setDraft: (draft: RuleDraft) => void;
  stores: VectorStoreInfo[];
  catalog: VectorStoreCatalogState;
}) {
  const [filter, setFilter] = useState("");
  const selected = stores.find(
    (store) => store.vectorStoreId === draft.vectorStoreId,
  );
  const normalizedNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const store of stores) {
      const name = store.name.trim().toLocaleLowerCase();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return counts;
  }, [stores]);
  const hasLegacyNameCollision = [...normalizedNameCounts.values()].some(
    (count) => count > 1,
  );
  const query = filter.trim().toLocaleLowerCase();
  const visibleStores = stores.filter(
    (store) =>
      !query ||
      store.name.toLocaleLowerCase().includes(query) ||
      store.key.toLocaleLowerCase().includes(query) ||
      store.vectorStoreId.toLocaleLowerCase().includes(query),
  );
  if (selected && !visibleStores.includes(selected)) visibleStores.unshift(selected);
  const options = visibleStores.map((store) => {
    const duplicateName =
      (normalizedNameCounts.get(store.name.trim().toLocaleLowerCase()) ?? 0) > 1;
    const baseLabel = store.name.trim() || "Unnamed vector store";
    return {
      value: store.vectorStoreId,
      label: duplicateName
        ? `${baseLabel} — ${store.key || "blank key"} · ${store.vectorStoreId}`
        : baseLabel,
      hint: store.enabled ? undefined : "Disabled",
      disabled: !store.enabled && store.vectorStoreId !== draft.vectorStoreId,
    };
  });
  if (draft.vectorStoreId && !selected) {
    options.unshift({
      value: draft.vectorStoreId,
      label: `Unavailable vector store — ${draft.vectorStoreId}`,
      hint: "Preserved existing reference",
      disabled: false,
    });
  }

  const statusMessage =
    catalog.kind === "loading"
      ? "Loading vector-store catalog…"
      : catalog.message;
  const warning = draft.vectorStoreLegacyRef
    ? `This rule uses the legacy vector-store reference “${draft.vectorStoreLegacyRef}”. It will be preserved until you explicitly select a UUID-backed store.`
    : draft.vectorStoreId && !selected && catalog.kind !== "loading"
      ? "The referenced vector store is unavailable, unauthorized, deleted, or not returned by this daemon. The UUID will be preserved."
      : selected && !selected.enabled
        ? "The selected vector store is disabled. It remains preserved for this rule but cannot be selected for a new binding."
        : hasLegacyNameCollision
          ? "Legacy duplicate display names were detected. Options are disambiguated with key and UUID; UUID remains authoritative."
          : "";

  return (
    <div className="space-y-2">
      {stores.length > 8 && (
        <Field label="Search vector stores" value={filter} onChange={setFilter} />
      )}
      <Select
        label="Vector store"
        value={draft.vectorStoreId}
        onChange={(value) =>
          setDraft({
            ...draft,
            vectorStoreId: value,
            vectorStoreLegacyRef: value ? "" : draft.vectorStoreLegacyRef,
          })
        }
        options={options}
        placeholder={
          catalog.kind === "loading"
            ? "Loading vector stores…"
            : catalog.kind === "ready"
              ? "Select vector store"
              : catalog.kind === "empty"
                ? "No vector stores available"
                : "Vector-store catalog unavailable"
        }
        disabled={catalog.kind !== "ready" || options.length === 0}
      />
      {statusMessage && catalog.kind !== "ready" && (
        <Text intent="muted" size="xs">
          {statusMessage}
        </Text>
      )}
      {warning && (
        <div
          role="alert"
          className="text-xs font-medium text-amber-700 dark:text-amber-300"
        >
          {warning}
        </div>
      )}
      {(catalog.kind === "empty" || catalog.kind === "ready") && (
        <Link
          to="/intelligence/vector-stores"
          className="text-xs font-medium text-sky-700 underline underline-offset-2 dark:text-sky-300"
        >
          Manage vector stores
        </Link>
      )}
      {mode === "create" && !draft.vectorStoreId && (
        <Text intent="muted" size="xs">
          Select an enabled UUID-backed vector store before validating or creating this rule.
        </Text>
      )}
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
