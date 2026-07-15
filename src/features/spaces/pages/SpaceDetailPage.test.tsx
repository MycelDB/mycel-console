import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SpaceDetailPage } from "./SpaceDetailPage";

function renderDetail(
  getSpaceService = jest.fn().mockResolvedValue({ spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" }),
  listDomainsService = jest.fn().mockResolvedValue({ domains: [], nextPageToken: "" }),
  listSemanticIndexesService = jest.fn().mockResolvedValue({ indexes: [], nextPageToken: "" }),
  getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 0, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 }),
  listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({ items: [] }),
) {
  render(
    <MemoryRouter initialEntries={["/spaces/sp_main"]}>
      <Routes>
        <Route path="/spaces/:spaceId" element={<SpaceDetailPage getSpaceService={getSpaceService} listDomainsService={listDomainsService} listSemanticIndexesService={listSemanticIndexesService} getSemanticMaintenanceStatusService={getSemanticMaintenanceStatusService} listSemanticMaintenanceWorkService={listSemanticMaintenanceWorkService} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { getSpaceService, listDomainsService, listSemanticIndexesService, getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService };
}

test("loads and renders selected space properties", async () => {
  const getSpaceService = jest.fn().mockResolvedValue({
    spaceId: "sp_main",
    name: "Main",
    state: "SPACE_STATE_ACTIVE",
    owner: { principalType: "PRINCIPAL_TYPE_USER", id: "user_1", displayName: "Ada" },
    createTime: "1710000000",
    updateTime: "1710003600",
    callerAccess: { roles: ["SPACE_ROLE_OWNER"], capabilities: ["CAPABILITY_SPACE_READ", "CAPABILITY_GRAPH_WRITE"] },
    templateUsage: "SPACE_TEMPLATE_USAGE_OPTIONAL",
  });

  const listDomainsService = jest.fn().mockResolvedValue({
    domains: [
      {
        spaceId: "sp_main",
        domainId: "dom_default",
        key: "default",
        name: "default",
        description: "",
        state: "DOMAIN_STATE_ACTIVE",
        isDefault: true,
        system: false,
      },
    ],
    nextPageToken: "",
  });

  const listSemanticIndexesService = jest.fn().mockResolvedValue({
    indexes: [{ semanticIndexId: "idx_notes", key: "notes", displayName: "Notes", description: "", spaceId: "sp_main", domainId: "dom_default", modelLabel: "text-embedding-3-small", vectorStoreLabel: "mycel-file", state: "SEMANTIC_INDEX_STATE_ACTIVE" }],
    nextPageToken: "",
  });

  const getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({ enabled: true, degraded: true, degradedReason: "worker paused", queueDepthPending: 2, queueDepthRunning: 1, queueDepthFailedRetryable: 1, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 30, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "normal", analyzerRuns: 3, workerRuns: 4 });
  const listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({ items: [{ workItemId: "work_1", spaceId: "sp_main", domainId: "dom_default", semanticIndexId: "idx_notes", targetNodeId: "node_1", action: "embed", status: "failed_retryable", attemptCount: 2, notBefore: "", claimedUntil: "", lastErrorCategory: "provider", lastErrorMessageSanitized: "rate limited", createdAt: "", updatedAt: "" }] });

  renderDetail(getSpaceService, listDomainsService, listSemanticIndexesService, getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService);

  expect(screen.getByRole("link", { name: /back to spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.getByText(/loading space/i)).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Main" })).toBeInTheDocument();
  expect(getSpaceService).toHaveBeenCalledWith("sp_main");
  expect(listDomainsService).toHaveBeenCalledWith({ spaceId: "sp_main", pageSize: 100, pageToken: "", includeSystem: false });
  expect(listSemanticIndexesService).toHaveBeenCalledWith({ spaceId: "sp_main", pageSize: 100, includeDisabled: false });
  expect(getSemanticMaintenanceStatusService).toHaveBeenCalledWith({ spaceId: "sp_main" });
  expect(listSemanticMaintenanceWorkService).toHaveBeenCalledWith({ spaceId: "sp_main", status: "", limit: 100 });
  expect(screen.getByText("sp_main")).toBeInTheDocument();
  expect(screen.getByText("PRINCIPAL_TYPE_USER")).toBeInTheDocument();
  expect(screen.getByText("Ada")).toBeInTheDocument();
  expect(screen.getByText("SPACE_TEMPLATE_USAGE_OPTIONAL")).toBeInTheDocument();
  expect(screen.getByText(/CAPABILITY_SPACE_READ, CAPABILITY_GRAPH_WRITE/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Semantic maintenance" })).toBeInTheDocument();
  expect(screen.getByText("worker paused")).toBeInTheDocument();
  expect(screen.getByText("provider")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Semantic indexes" })).toBeInTheDocument();
  expect(screen.getAllByText("idx_notes").length).toBeGreaterThan(0);
  expect(screen.getByText("text-embedding-3-small")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Domains" })).toBeInTheDocument();
  expect(screen.getAllByText("dom_default").length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "Templates" })).toBeInTheDocument();
  expect(screen.getByText(/operator-facing Admin API does not currently expose/i)).toBeInTheDocument();
});

test("supports system domain toggle and domain pagination", async () => {
  const listDomainsService = jest
    .fn()
    .mockResolvedValueOnce({
      domains: [
        {
          spaceId: "sp_main",
          domainId: "dom_default",
          key: "default",
          name: "default",
          description: "",
          state: "DOMAIN_STATE_ACTIVE",
          isDefault: true,
          system: false,
        },
      ],
      nextPageToken: "next",
    })
    .mockResolvedValueOnce({
      domains: [
        {
          spaceId: "sp_main",
          domainId: "dom_system",
          key: "system",
          name: "system",
          description: "",
          state: "DOMAIN_STATE_ACTIVE",
          isDefault: false,
          system: true,
        },
      ],
      nextPageToken: "",
    })
    .mockResolvedValue({ domains: [], nextPageToken: "" });

  renderDetail(undefined, listDomainsService);

  expect(await screen.findByText("dom_default")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more domains/i }));

  expect(await screen.findByText("dom_system")).toBeInTheDocument();
  expect(listDomainsService).toHaveBeenLastCalledWith({ spaceId: "sp_main", pageSize: 100, pageToken: "next", includeSystem: false });

  await userEvent.click(screen.getByLabelText(/include system domains/i));

  expect(listDomainsService).toHaveBeenLastCalledWith({ spaceId: "sp_main", pageSize: 100, pageToken: "", includeSystem: true });
});

test("renders load errors", async () => {
  renderDetail(jest.fn().mockRejectedValue(new Error("space unavailable")));

  expect(await screen.findByText("space unavailable")).toBeInTheDocument();
});
