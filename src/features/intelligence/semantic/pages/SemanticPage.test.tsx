import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SemanticPage } from "./SemanticPage";

function renderPage() {
  render(
    <MemoryRouter>
      <SemanticPage
        listSpacesService={jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" })}
        listDomainsService={jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false }], nextPageToken: "" })}
        listSemanticIndexesService={jest.fn().mockResolvedValue({ indexes: [{ semanticIndexId: "sem1", key: "page-summary", displayName: "Page summary", description: "Summaries for pages", spaceId: "sp1", domainId: "dom1", modelLabel: "text-embedding-3-small", vectorStoreLabel: "local", state: "SEMANTIC_INDEX_STATE_ACTIVE" }], nextPageToken: "" })}
        getSemanticMaintenanceStatusService={jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 1, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 })}
        listSemanticMaintenanceWorkService={jest.fn().mockResolvedValue({ items: [] })}
        summarizeInferenceUsageService={jest.fn().mockResolvedValue({ summaries: [{ group: { semantic_index_id: "sem1", domain_id: "dom1" }, requestCount: 3, succeededCount: 3, failedCount: 0, deniedCount: 0, inputTokens: 15, outputTokens: 30, totalTokens: 45, totalLatencyMillis: 100 }] })}
      />
    </MemoryRouter>,
  );
}

test("renders global semantic index inventory, maintenance, and usage", async () => {
  renderPage();

  expect(screen.getByRole("heading", { name: /semantic generation/i })).toBeInTheDocument();
  expect(await screen.findByText("Page summary")).toBeInTheDocument();
  expect(screen.getByText(/45 tokens/i)).toBeInTheDocument();
  expect(screen.getByText(/Pending 1/i)).toBeInTheDocument();
});
