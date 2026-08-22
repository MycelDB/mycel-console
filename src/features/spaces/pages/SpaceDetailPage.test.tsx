import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SpaceDetailPage } from "./SpaceDetailPage";
import type { ConsolePrincipalContext } from "../../console";

function renderDetail(
  getSpaceService = jest.fn().mockResolvedValue({ spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" }),
  listDomainsService = jest.fn().mockResolvedValue({ domains: [], nextPageToken: "" }),
  listSemanticRulesService = jest.fn().mockResolvedValue({ rules: [], nextPageToken: "" }),
  getDomainSchemaService = jest.fn().mockResolvedValue({ domainId: "dom_default", gwl: "schema \"PKM\" version \"v1\" mode warn" }),
  getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({ enabled: true, degraded: false, degradedReason: "", queueDepthPending: 0, queueDepthRunning: 0, queueDepthFailedRetryable: 0, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 0, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "", analyzerRuns: 0, workerRuns: 0 }),
  listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({ items: [] }),
  lookupSpaceRouteService = jest.fn().mockResolvedValue({ spaceId: "sp_main", partitionId: 3, leaderNodeId: 2, replicaNodeIds: [1, 2, 3] }),
  principalContext: ConsolePrincipalContext | undefined = undefined,
) {
  render(
    <MemoryRouter initialEntries={["/spaces/sp_main"]}>
      <Routes>
        <Route path="/spaces/:spaceId" element={<SpaceDetailPage getSpaceService={getSpaceService} listDomainsService={listDomainsService} listSemanticRulesService={listSemanticRulesService} getDomainSchemaService={getDomainSchemaService} getSemanticMaintenanceStatusService={getSemanticMaintenanceStatusService} listSemanticMaintenanceWorkService={listSemanticMaintenanceWorkService} lookupSpaceRouteService={lookupSpaceRouteService} principalContext={principalContext} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { getSpaceService, listDomainsService, listSemanticRulesService, getDomainSchemaService, getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService, lookupSpaceRouteService };
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

  const listSemanticRulesService = jest.fn().mockResolvedValue({
    rules: [{ semanticRuleId: "rule_notes", key: "notes", displayName: "Notes", description: "", spaceId: "sp_main", domainId: "dom_default", enabled: true, state: "SEMANTIC_RULE_STATE_ACTIVE", bindings: [{ key: "search", purpose: "search", intelligenceProfileId: "", intelligenceProfileKey: "text-embedding-3-small", vectorStoreId: "", vectorStoreKey: "mycel-file", enabled: true }] }],
    nextPageToken: "",
  });

  const getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({ enabled: true, degraded: true, degradedReason: "worker paused", queueDepthPending: 2, queueDepthRunning: 1, queueDepthFailedRetryable: 1, queueDepthFailedPermanent: 0, oldestPendingAgeSeconds: 30, lastDirtyEventAt: "", lastAnalyzedAt: "", lastWorkerSuccessAt: "", lastWorkerErrorAt: "", throttleState: "normal", analyzerRuns: 3, workerRuns: 4 });
  const listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({ items: [{ workItemId: "work_1", spaceId: "sp_main", domainId: "dom_default", semanticRuleId: "rule_notes", embeddingBindingKey: "search", targetNodeId: "node_1", action: "embed", status: "failed_retryable", attemptCount: 2, notBefore: "", claimedUntil: "", lastErrorCategory: "provider", lastErrorMessageSanitized: "rate limited", createdAt: "", updatedAt: "" }] });

  const getDomainSchemaService = jest.fn().mockResolvedValue({ domainId: "dom_default", gwl: "schema \"PKM\" version \"v1\" mode warn" });

  renderDetail(getSpaceService, listDomainsService, listSemanticRulesService, getDomainSchemaService, getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService);

  expect(screen.getByRole("link", { name: /back to spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.getByText(/loading space/i)).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Main" })).toBeInTheDocument();
  expect(getSpaceService).toHaveBeenCalledWith("sp_main");
  expect(listDomainsService).toHaveBeenCalledWith({ spaceId: "sp_main", pageSize: 100, pageToken: "", includeSystem: false });
  expect(listSemanticRulesService).toHaveBeenCalledWith({ spaceId: "sp_main", pageSize: 100, includeDisabled: false });
  expect(screen.getByText("sp_main")).toBeInTheDocument();
  expect(screen.getByText("PRINCIPAL_TYPE_USER")).toBeInTheDocument();
  expect(screen.getByText("Ada")).toBeInTheDocument();
  expect(await screen.findByText("Raft placement")).toBeInTheDocument();
  expect(screen.getByText("Leader node")).toBeInTheDocument();
  expect(screen.getByText(/CAPABILITY_SPACE_READ, CAPABILITY_GRAPH_WRITE/)).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute("aria-selected", "true");

  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));
  await waitFor(() => expect(getSemanticMaintenanceStatusService).toHaveBeenCalledWith({ spaceId: "sp_main" }));
  expect(listSemanticMaintenanceWorkService).toHaveBeenCalledWith({ spaceId: "sp_main", status: "", limit: 100 });
  expect(screen.getByRole("heading", { name: "Semantic maintenance" })).toBeInTheDocument();
  expect(screen.getByText("worker paused")).toBeInTheDocument();
  expect(screen.getByText("provider")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Semantic rules" })).toBeInTheDocument();
  expect(screen.getAllByText("rule_notes").length).toBeGreaterThan(0);
  expect(screen.getByText(/text-embedding-3-small/)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Domains" }));
  expect(screen.getByRole("heading", { name: "Domains" })).toBeInTheDocument();
  expect(screen.getAllByText("dom_default").length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole("tab", { name: "Schemas" }));
  expect(screen.getByRole("heading", { name: "Domain schemas" })).toBeInTheDocument();});

test("keeps semantic panels readable while hiding maintenance mutations without semantic manage capability", async () => {
  const listSemanticRulesService = jest.fn().mockResolvedValue({
    rules: [{ semanticRuleId: "rule_notes", key: "notes", displayName: "Notes", description: "", spaceId: "sp_main", domainId: "dom_default", enabled: true, state: "SEMANTIC_RULE_STATE_ACTIVE", bindings: [{ key: "search", purpose: "search", intelligenceProfileId: "", intelligenceProfileKey: "text-embedding-3-small", vectorStoreId: "", vectorStoreKey: "mycel-file", enabled: true }] }],
    nextPageToken: "",
  });
  const listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({ items: [{ workItemId: "work_1", spaceId: "sp_main", domainId: "dom_default", semanticRuleId: "rule_notes", embeddingBindingKey: "search", targetNodeId: "node_1", action: "embed", status: "failed_retryable", attemptCount: 2, notBefore: "", claimedUntil: "", lastErrorCategory: "provider", lastErrorMessageSanitized: "rate limited", createdAt: "", updatedAt: "" }] });

  renderDetail(undefined, undefined, listSemanticRulesService, undefined, undefined, listSemanticMaintenanceWorkService, undefined, {
    session: { addr: "127.0.0.1:19091", principalId: "prn_reader", username: "reader" },
    roles: [],
    capabilities: ["CAPABILITY_SEMANTIC_SEARCH"],
    capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SEMANTIC_SEARCH" }] },
    warnings: [],
  });

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));

  expect(await screen.findByText("provider")).toBeInTheDocument();
  expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /analyze dirty work/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^retry$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /backfill/i })).not.toBeInTheDocument();
});

test("uses current console principal for graph query without a separate client login", async () => {
  renderDetail(undefined, jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp_main", domainId: "dom_default", key: "default", name: "default", description: "", state: "DOMAIN_STATE_ACTIVE", isDefault: true, system: false }], nextPageToken: "" }), undefined, undefined, undefined, undefined, undefined, {
    session: { addr: "127.0.0.1:19091", principalId: "prn_martin", username: "martin" },
    roles: [],
    capabilities: ["CAPABILITY_SPACE_READ"],
    capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SPACE_READ" }] },
    warnings: [],
  });

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Graph query" }));

  expect(screen.getByText(/martin @ 127.0.0.1:19091/i)).toBeInTheDocument();
  expect(screen.getByText(/read-write, subject to daemon authorization/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /connect client session/i })).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/mode/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^run query$/i })).toBeEnabled();
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

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Domains" }));
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
