import {
  semanticTriggerEvents,
  type SemanticGenerationRule,
  type SemanticGenerationRuleSummary,
  type SemanticTriggerEvent,
} from "../../../../types/semantic";
import type { RuleDraft } from "./pageTypes";

export function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
const triggerEventSet = new Set<string>(semanticTriggerEvents);

function canonicalTriggerEvents(values: string[]): SemanticTriggerEvent[] {
  const unique = new Set(values);
  return semanticTriggerEvents.filter((event) => unique.has(event));
}

export function resolveTriggerEvents(
  trigger: SemanticGenerationRule["trigger"],
): { events: string[]; problem: string } {
  const events = trigger?.events || [];
  const unsupported = events.filter((event) => !triggerEventSet.has(event));
  const selected = events.length > 0 ? [...events] : ["changed"];
  if (unsupported.length > 0) {
    return {
      events: selected,
      problem: `Unsupported trigger event values: ${unsupported.join(", ")}`,
    };
  }
  return { events: canonicalTriggerEvents(selected), problem: "" };
}

export function draftToRule(draft: RuleDraft): SemanticGenerationRule {
  const unsupported = draft.triggerEvents.filter(
    (event) => !triggerEventSet.has(event),
  );
  if (draft.triggerEventProblem || unsupported.length > 0) {
    throw new Error(
      draft.triggerEventProblem ||
        `Unsupported trigger event values: ${unsupported.join(", ")}`,
    );
  }
  const labels = csv(draft.labels);
  const triggerEvents: SemanticTriggerEvent[] = draft.triggerEvents.length
    ? canonicalTriggerEvents(draft.triggerEvents)
    : ["changed"];
  const selectorMode = draft.selectorMode || "node_type";
  const maxResults = Number(draft.maxResults) || 0;
  const selector =
    selectorMode === "gql"
      ? {
          mode: "gql",
          labels: [],
          gql: draft.selectorGql,
          targetAlias: draft.targetAlias.trim() || "n",
          maxResults,
          nodeIds: [],
        }
      : selectorMode === "explicit_nodes"
        ? {
            mode: "explicit_nodes",
            labels: [],
            gql: "",
            targetAlias: "",
            maxResults,
            nodeIds: [],
          }
        : {
            mode: "node_type",
            labels,
            gql: "",
            targetAlias: "",
            maxResults,
            nodeIds: [],
          };
  return {
    semanticRuleId: draft.semanticRuleId || undefined,
    spaceId: draft.spaceId,
    domainId: draft.domainId,
    key: draft.key,
    displayName: draft.displayName || draft.key,
    description: draft.description,
    enabled: draft.enabled,
    trigger: {
      events: triggerEvents,
      labels,
      debounce: draft.dirtyCooldown,
    },
    selector,
    source: {
      mode: draft.sourceMode,
      includeProperties: csv(draft.includeProperties),
      excludeProperties: csv(draft.excludeProperties),
      maxDepth: null,
      minimumTextLength: 0,
      contextGql: draft.contextGql,
    },
    embeddings: [
      {
        key: draft.bindingKey,
        purpose: draft.purpose,
        intelligenceProfile: draft.intelligenceProfile,
        intelligenceProfileId: "",
        vectorStore: draft.vectorStoreId ? "" : draft.vectorStoreLegacyRef,
        vectorStoreId: draft.vectorStoreId,
        enabled: true,
      },
    ],
    maintenance: {
      dirtyCooldown: draft.dirtyCooldown,
      maxBatchSize: 0,
      workerConcurrency: 0,
    },
    storage: {
      searchable: draft.searchable,
      physicalIndex: draft.physicalIndex || "exact",
    },
  };
}
export function ruleToDraft(rule: SemanticGenerationRule): RuleDraft {
  const binding = rule.embeddings[0];
  const trigger = resolveTriggerEvents(rule.trigger);
  return {
    semanticRuleId: rule.semanticRuleId || "",
    spaceId: rule.spaceId,
    domainId: rule.domainId,
    key: rule.key,
    displayName: rule.displayName,
    description: rule.description,
    enabled: rule.enabled,
    labels: (rule.selector?.labels || rule.trigger?.labels || []).join(","),
    triggerEvents: trigger.events,
    triggerEventProblem: trigger.problem,
    dirtyCooldown:
      rule.maintenance?.dirtyCooldown || rule.trigger?.debounce || "30s",
    selectorMode: rule.selector?.mode || "node_type",
    selectorGql: rule.selector?.mode === "gql" ? rule.selector?.gql || "" : "",
    targetAlias:
      rule.selector?.mode === "gql" ? rule.selector?.targetAlias || "n" : "",
    maxResults: String(rule.selector?.maxResults || 100),
    sourceMode: rule.source?.mode || "self",
    includeProperties: (rule.source?.includeProperties || []).join(","),
    excludeProperties: (rule.source?.excludeProperties || []).join(","),
    contextGql: rule.source?.contextGql || "",
    bindingKey: binding?.key || "search",
    purpose: binding?.purpose || "search",
    intelligenceProfile:
      binding?.intelligenceProfile || binding?.intelligenceProfileId || "",
    vectorStoreId: binding?.vectorStoreId || "",
    vectorStoreLegacyRef: binding?.vectorStore || "",
    searchable: rule.storage?.searchable ?? true,
    physicalIndex: rule.storage?.physicalIndex || "exact",
  };
}
export function summaryToRule(
  summary: SemanticGenerationRuleSummary,
): SemanticGenerationRule {
  return {
    semanticRuleId: summary.semanticRuleId,
    spaceId: summary.spaceId,
    domainId: summary.domainId,
    key: summary.key,
    displayName: summary.displayName,
    description: summary.description,
    enabled: summary.enabled,
    embeddings: summary.bindings.map((binding) => ({
      key: binding.key,
      purpose: binding.purpose,
      intelligenceProfile: binding.intelligenceProfileKey,
      intelligenceProfileId: binding.intelligenceProfileId,
      vectorStore: binding.vectorStoreKey,
      vectorStoreId: binding.vectorStoreId,
      enabled: binding.enabled,
    })),
    storage: { searchable: true, physicalIndex: "exact" },
  };
}
