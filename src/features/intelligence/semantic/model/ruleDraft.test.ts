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
  triggerEvents: "changed, created",
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
  vectorStore: "mycel-file",
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
  expect(rule.trigger?.events).toEqual(["changed", "created"]);
  expect(rule.embeddings[0]).toMatchObject({
    key: "body",
    intelligenceProfile: "embed-small",
    vectorStore: "mycel-file",
  });
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
