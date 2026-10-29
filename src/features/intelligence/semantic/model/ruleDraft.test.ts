import type { SemanticGenerationRule } from "../../../../types/semantic";
import type { RuleDraft } from "./pageTypes";
import { csv, draftToRule, ruleToDraft, summaryToRule } from "./ruleDraft";

const draft: RuleDraft = {
  semanticRuleId: "rule_1",
  spaceId: "space_1",
  domainId: "domain_1",
  key: "notes-search",
  displayName: "Notes search",
  description: "Index notes",
  enabled: true,
  labels: "note, page",
  triggerEvents: ["changed", "node.created"],
  triggerEventProblem: "",
  dirtyCooldown: "30s",
  selectorMode: "node_type",
  selectorGql: "",
  targetAlias: "",
  maxResults: "50",
  sourceMode: "self",
  includeProperties: "title, body",
  excludeProperties: "secret",
  contextGql: "",
  bindingKey: "body",
  purpose: "search",
  intelligenceProfile: "embed-small",
  vectorStoreId: "store_1",
  vectorStoreLegacyRef: "",
  searchable: true,
  physicalIndex: "exact",
};

test("csv trims and removes empty values", () => {
  expect(csv(" a, ,b ")).toEqual(["a", "b"]);
});

test("draftToRule maps draft fields without backend interaction", () => {
  const rule = draftToRule(draft);

  expect(rule.semanticRuleId).toBe("rule_1");
  expect(rule.selector?.labels).toEqual(["note", "page"]);
  expect(rule.trigger?.events).toEqual(["changed", "node.created"]);
  expect(rule.embeddings[0]).toMatchObject({
    key: "body",
    intelligenceProfile: "embed-small",
    vectorStore: "",
    vectorStoreId: "store_1",
  });
});

test("draftToRule preserves a legacy vector-store reference when no UUID is available", () => {
  const rule = draftToRule({
    ...draft,
    vectorStoreId: "",
    vectorStoreLegacyRef: "mycel-file",
  });
  expect(rule.embeddings[0]).toMatchObject({
    vectorStore: "mycel-file",
    vectorStoreId: "",
  });
  expect(ruleToDraft(rule)).toMatchObject({
    vectorStoreId: "",
    vectorStoreLegacyRef: "mycel-file",
  });
});

test("ruleToDraft reads typed events", () => {
  const rule = draftToRule(draft);
  expect(ruleToDraft(rule)).toMatchObject({
    triggerEvents: ["changed", "node.created"],
    triggerEventProblem: "",
  });
});

test("ruleToDraft exposes unknown typed trigger events", () => {
  const invalid = draftToRule(draft);
  invalid.trigger = {
    events: ["unsupported:99"],
    labels: [],
    debounce: "30s",
  };
  expect(ruleToDraft(invalid)).toMatchObject({
    triggerEvents: ["unsupported:99"],
  });
  expect(ruleToDraft(invalid).triggerEventProblem).toMatch(/unsupported/i);
});

test("draftToRule fails closed for unresolved trigger events", () => {
  expect(() =>
    draftToRule({
      ...draft,
      triggerEvents: ["unsupported:99"],
      triggerEventProblem: "Unsupported trigger event values: unsupported:99",
    }),
  ).toThrow(/unsupported/i);
});

test("unrelated edits preserve opaque binding metadata and provider budgets", () => {
  const original = draftToRule({
    ...draft,
    bindingMetadata: { route: "embedding-primary", nested: { owner: "ops" } },
    providerBudget: {
      correlationId: "semantic-search-budget",
      maxRequests: "128",
      maxRetryAttempts: "4",
      maxRetriesPerRequest: "1",
      maxConcurrentProviderCalls: "2",
      batchingMode: 1,
      maxBatchItems: "1",
      maxInputTokensPerRequest: "2048",
      maxInputTokens: "20000",
      requestTimeout: { seconds: "30", nanos: 0 },
      totalTimeout: { seconds: "300", nanos: 0 },
      cost: {
        currency: "USD",
        priceDefinitionVersion: "2026-10-01",
        inputMicrosPerMillionTokens: "20",
        maxEstimatedCostMicros: "1000000",
      },
    },
  });

  const changedDraft = { ...ruleToDraft(original), description: "Updated description" };
  const updated = draftToRule(changedDraft);

  expect(updated.description).toBe("Updated description");
  expect(updated.embeddings[0].metadata).toEqual(original.embeddings[0].metadata);
  expect(updated.embeddings[0].providerBudget).toEqual(
    original.embeddings[0].providerBudget,
  );
});

test("ruleToDraft and summaryToRule preserve editable fields", () => {
  const rule = draftToRule(draft) as SemanticGenerationRule;
  expect(ruleToDraft(rule)).toMatchObject({
    semanticRuleId: "rule_1",
    key: "notes-search",
    bindingKey: "body",
  });

  const summary = summaryToRule({
    semanticRuleId: "summary_rule",
    spaceId: "space_1",
    domainId: "domain_1",
    key: "summary",
    displayName: "Summary",
    description: "Summary rule",
    enabled: true,
    bindings: [
      {
        key: "body",
        purpose: "search",
        intelligenceProfileKey: "embed-small",
        intelligenceProfileId: "profile_1",
        vectorStoreKey: "mycel-file",
        vectorStoreId: "store_1",
        enabled: true,
      },
    ],
  } as any);
  expect(summary.embeddings[0].key).toBe("body");
});
