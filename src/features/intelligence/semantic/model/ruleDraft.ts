import type {
  SemanticGenerationRule,
  SemanticGenerationRuleSummary,
} from "../../../../types/semantic";
import type { RuleDraft } from "./pageTypes";

export function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
export function draftToRule(draft: RuleDraft): SemanticGenerationRule {
  const labels = csv(draft.labels);
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
      events: csv(draft.triggerEvents).length
        ? csv(draft.triggerEvents)
        : ["changed"],
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
        vectorStore: draft.vectorStore,
        vectorStoreId: "",
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
  return {
    semanticRuleId: rule.semanticRuleId || "",
    spaceId: rule.spaceId,
    domainId: rule.domainId,
    key: rule.key,
    displayName: rule.displayName,
    description: rule.description,
    enabled: rule.enabled,
    labels: (rule.selector?.labels || rule.trigger?.labels || []).join(","),
    triggerEvents: (rule.trigger?.events || ["changed"]).join(","),
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
    vectorStore: binding?.vectorStore || binding?.vectorStoreId || "mycel-file",
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
