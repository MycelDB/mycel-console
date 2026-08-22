import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SemanticPage } from "./SemanticPage";

function renderPage(overrides: Partial<Parameters<typeof SemanticPage>[0]> = {}) {
  const services = {
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false }], nextPageToken: "" }),
    listInferenceProfilesService: jest.fn().mockResolvedValue({ inferenceProfiles: [{ inferenceProfileId: "prof1", spaceId: "sp1", key: "embedding-default", displayName: "Embedding Default", description: "", operation: "embeddings", purpose: "semantic", domainIds: [], capabilityRefs: [], endpointRefs: [], modelRefs: [], requiredFeatures: [], enabled: true, createdBy: "", createTime: "", updateTime: "" }], nextPageToken: "" }),
    listSemanticRulesService: jest.fn().mockResolvedValue({ rules: [{ semanticRuleId: "rule1", key: "page-summary", displayName: "Page summary", description: "Summaries for pages", spaceId: "sp1", domainId: "dom1", enabled: true, state: "SEMANTIC_RULE_STATE_ACTIVE", bindings: [{ key: "search", purpose: "search", intelligenceProfileId: "", intelligenceProfileKey: "text-embedding-3-small", vectorStoreId: "", vectorStoreKey: "local", enabled: true, searchIndex: { state: "SEARCH_INDEX_STATE_READY", liveRecordCount: 3, lastRebuildAt: "", lastError: "" } }], status: { queueDepthPending: 1, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, lastRefreshAt: "", lastBackfillAt: "", lastError: "" } }], nextPageToken: "" }),
    getSemanticRuleService: jest.fn().mockResolvedValue({ rule: null, summary: null }),
    validateSemanticRuleService: jest.fn().mockResolvedValue({ valid: true, diagnostics: [] }),
    getSemanticMaintenanceStatusService: jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 1, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 }),
    listSemanticMaintenanceWorkService: jest.fn().mockResolvedValue({ items: [] }),
    summarizeInferenceUsageService: jest.fn().mockResolvedValue({ summaries: [{ group: { semantic_rule_id: "rule1", domain_id: "dom1" }, requestCount: 3, succeededCount: 3, failedCount: 0, deniedCount: 0, inputTokens: 15, outputTokens: 30, totalTokens: 45, totalLatencyMillis: 100 }] }),
    semanticSearchService: jest.fn().mockResolvedValue({ results: [{ semanticRuleId: "rule1", embeddingBindingKey: "search", recordId: "rec1", nodeId: "node1", score: 0.91, node: { nodeId: "node1", properties: { title: "Semantic troubleshooting" } }, matchedChunkIds: [], snippet: "stale search indexes" }], warnings: [] }),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <SemanticPage
        {...services}
        principalContext={{ session: { addr: "", principalId: "alice", username: "alice" }, roles: ["semantic.admin"], capabilities: ["semantic.manage"], capabilityState: { kind: "complete", capabilities: [{ capability: "semantic.manage" }] }, warnings: [] }}
      />
    </MemoryRouter>,
  );
  return services;
}

test("renders global semantic rule inventory, maintenance, and usage", async () => {
  const { listInferenceProfilesService } = renderPage();

  expect(screen.getByRole("heading", { name: /semantic generation/i })).toBeInTheDocument();
  expect(await screen.findByText("Page summary")).toBeInTheDocument();
  expect(screen.getByText(/45 tokens/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Pending 1/i).length).toBeGreaterThan(0);
  expect(listInferenceProfilesService).toHaveBeenCalledWith({ spaceId: "sp1", domainId: undefined, operation: "embeddings", includeDisabled: false, pageSize: 100 });
});

test("uses an Intelligence profile dropdown in the rule editor", async () => {
  renderPage();

  await screen.findByText("Page summary");
  await userEvent.click(screen.getByRole("button", { name: /new rule/i }));

  expect(screen.getByLabelText(/intelligence profile/i)).toHaveDisplayValue("Select profile");
  await userEvent.selectOptions(screen.getByLabelText(/intelligence profile/i), "embedding-default");
  expect(screen.getByLabelText(/intelligence profile/i)).toHaveValue("embedding-default");
});

test("omits GQL-only selector fields for node type semantic rules", async () => {
  const validateSemanticRuleService = jest.fn().mockResolvedValue({ valid: true, diagnostics: [] });
  renderPage({ validateSemanticRuleService });

  await screen.findByText("Page summary");
  await userEvent.click(screen.getByRole("button", { name: /new rule/i }));

  expect(screen.queryByLabelText(/gql selector/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/target alias/i)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /validate/i }));

  expect(validateSemanticRuleService).toHaveBeenCalledWith(expect.objectContaining({
    rule: expect.objectContaining({
      selector: expect.objectContaining({ mode: "node_type", gql: "", targetAlias: "" }),
    }),
  }));
});

test("defaults target alias only for GQL selectors", async () => {
  renderPage();

  await screen.findByText("Page summary");
  await userEvent.click(screen.getByRole("button", { name: /new rule/i }));
  await userEvent.selectOptions(screen.getByLabelText(/^selector$/i), "gql");

  expect(screen.getByLabelText(/target alias/i)).toHaveValue("n");
  await userEvent.selectOptions(screen.getByLabelText(/^selector$/i), "node_type");
  expect(screen.queryByLabelText(/target alias/i)).not.toBeInTheDocument();
});

test("runs semantic search from the search panel", async () => {
  const { semanticSearchService } = renderPage();

  await screen.findByText("Page summary");
  await userEvent.selectOptions(screen.getByLabelText(/search space/i), "sp1");
  await userEvent.selectOptions(screen.getByLabelText(/search domain/i), "dom1");
  await userEvent.type(screen.getByLabelText(/search text/i), "stale indexes");
  await userEvent.click(screen.getByRole("button", { name: /^search$/i }));

  expect(await screen.findByText("Semantic troubleshooting")).toBeInTheDocument();
  expect(semanticSearchService).toHaveBeenCalledWith(expect.objectContaining({ spaceId: "sp1", domainId: "dom1", query: "stale indexes", limit: 10 }));
});
