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
  expect(rule.trigger?.eventTypes).toEqual(["changed", "node.created"]);
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

test("ruleToDraft prefers typed events and accepts equivalent legacy events", () => {
  const rule = draftToRule(draft);
  expect(ruleToDraft(rule)).toMatchObject({
    triggerEvents: ["changed", "node.created"],
    triggerEventProblem: "",
  });
});

test("ruleToDraft exposes conflicting and unknown trigger projections", () => {
  const conflicting = draftToRule(draft);
  conflicting.trigger = {
    events: ["node.created"],
    eventTypes: ["node.updated"],
    labels: [],
    debounce: "30s",
  };
  expect(ruleToDraft(conflicting).triggerEventProblem).toMatch(/conflict/i);

  conflicting.trigger.eventTypes = ["unsupported:99"];
  expect(ruleToDraft(conflicting)).toMatchObject({
    triggerEvents: ["unsupported:99"],
  });
  expect(ruleToDraft(conflicting).triggerEventProblem).toMatch(/unsupported/i);
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
