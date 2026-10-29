import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SemanticRulesPage } from "./SemanticRulesPage";

const space = { spaceId: "sp1", name: "Research" };
const domain = {
  spaceId: "sp1",
  domainId: "dom1",
  key: "main",
  name: "Main",
  description: "",
  state: "active",
  isDefault: true,
  system: false,
};
const rule = {
  semanticRuleId: "rule1",
  key: "page-summary",
  displayName: "Page summary",
  description: "Summaries for pages",
  spaceId: "sp1",
  domainId: "dom1",
  enabled: true,
  state: "SEMANTIC_RULE_STATE_ACTIVE",
  bindings: [{
    key: "search",
    purpose: "search",
    intelligenceProfileId: "prof1",
    intelligenceProfileKey: "embedding-default",
    vectorStoreId: "store1",
    vectorStoreKey: "local",
    enabled: true,
    searchIndex: {
      state: "SEARCH_INDEX_STATE_READY",
      liveRecordCount: 3,
      lastRebuildAt: "",
      lastError: "",
    },
  }],
  status: {
    queueDepthPending: 1,
    queueDepthRunning: 0,
    queueDepthFailedRetryable: 0,
    queueDepthFailedPermanent: 0,
    lastRefreshAt: "",
    lastBackfillAt: "",
    lastError: "",
  },
};

function LocationView() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}{location.search}</div>;
}

function renderPage() {
  const services = {
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [space], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [domain], nextPageToken: "" }),
    listSemanticRulesService: jest.fn().mockResolvedValue({ rules: [rule], nextPageToken: "" }),
    getSemanticMaintenanceStatusService: jest.fn().mockResolvedValue({
      enabled: true,
      degraded: false,
      degradedReason: "",
      queueDepthPending: 1,
      queueDepthRunning: 0,
      queueDepthFailedRetryable: 0,
      queueDepthFailedPermanent: 0,
      oldestPendingAgeSeconds: 0,
      lastDirtyEventAt: "",
      lastAnalyzedAt: "",
      lastWorkerSuccessAt: "",
      lastWorkerErrorAt: "",
      throttleState: "",
      analyzerRuns: 0,
      workerRuns: 0,
    }),
    listSemanticMaintenanceWorkService: jest.fn().mockResolvedValue({ items: [] }),
    summarizeInferenceUsageService: jest.fn().mockResolvedValue({
      summaries: [{
        group: { semantic_rule_id: "rule1", domain_id: "dom1" },
        requestCount: 3,
        succeededCount: 3,
        failedCount: 0,
        deniedCount: 0,
        inputTokens: 15,
        outputTokens: 30,
        totalTokens: 45,
        totalLatencyMillis: 100,
      }],
    }),
  };
  render(
    <MemoryRouter initialEntries={["/intelligence/semantic-rules?spaceId=sp1"]}>
      <Routes>
        <Route
          path="/intelligence/semantic-rules"
          element={
            <SemanticRulesPage
              {...services}
              principalContext={{
                session: { addr: "", principalId: "alice", username: "alice" },
                roles: [],
                capabilities: ["semantic.manage"],
                capabilityState: {
                  kind: "complete",
                  capabilities: [{ capability: "semantic.manage" }],
                },
                warnings: [],
              }}
            />
          }
        />
        <Route path="*" element={<LocationView />} />
      </Routes>
    </MemoryRouter>,
  );
  return services;
}

test("renders the list-first Semantic Rules landing page without search or editor catalogs", async () => {
  const services = renderPage();

  expect(screen.getByRole("heading", { name: "Semantic Rules" })).toBeInTheDocument();
  expect(await screen.findByText("Page summary")).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Space Research; ID sp1" }),
  ).toHaveAttribute("href", "/spaces/sp1");
  expect(screen.getByLabelText("Domain Main; ID dom1")).toBeInTheDocument();
  expect(screen.getByText(/45 tokens/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/search text/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/vector store/i)).not.toBeInTheDocument();
  expect(Object.keys(services)).not.toContain("listVectorStoresService");
});

test("navigates Add Rule and Edit to dedicated routes", async () => {
  renderPage();
  await screen.findByText("Page summary");

  await userEvent.click(screen.getByRole("button", { name: "Add Rule" }));
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/intelligence/semantic-rules/new?spaceId=sp1",
  );
});

test("opens a rule by authoritative identity and space scope", async () => {
  renderPage();
  await screen.findByText("Page summary");

  await userEvent.click(screen.getByRole("button", { name: "Edit" }));
  expect(screen.getByTestId("location")).toHaveTextContent(
    "/intelligence/semantic-rules/rule1?spaceId=sp1",
  );
});
