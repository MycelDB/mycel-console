import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SpaceDetailPage } from "./SpaceDetailPage";
import type { ConsolePrincipalContext } from "../../console";
import type { GetSemanticReliabilityStatusInput } from "../../../types/semanticMaintenance";

function renderDetail(
  getSpaceService = jest.fn().mockResolvedValue({
    spaceId: "sp_main",
    name: "Main",
    state: "SPACE_STATE_ACTIVE",
  }),
  listDomainsService = jest
    .fn()
    .mockResolvedValue({ domains: [], nextPageToken: "" }),
  listSemanticRulesService = jest
    .fn()
    .mockResolvedValue({ rules: [], nextPageToken: "" }),
  getDomainSchemaService = jest.fn().mockResolvedValue({
    domainId: "dom_default",
    gwl: 'schema "PKM" version "v1" mode warn',
  }),
  getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({
    enabled: true,
    degraded: false,
    degradedReason: "",
    queueDepthPending: 0,
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
  listSemanticMaintenanceWorkService = jest
    .fn()
    .mockResolvedValue({ items: [] }),
  lookupSpaceRouteService = jest.fn().mockResolvedValue({
    spaceId: "sp_main",
    partitionId: 3,
    leaderNodeId: 2,
    replicaNodeIds: [1, 2, 3],
  }),
  principalContext: ConsolePrincipalContext | undefined = undefined,
  getClientQuerySessionService = jest.fn().mockResolvedValue(null),
  getSemanticReliabilityStatusService = jest.fn().mockImplementation((input: GetSemanticReliabilityStatusInput) =>
    Promise.resolve({
      supported: true,
      status: {
        ...input,
        latestObservedGraphRevision: "12",
        analyzedThroughGraphRevision: "12",
        freshThroughGraphRevision: "12",
        unresolvedGapCount: "0",
        oldestUnresolvedGraphRevision: "0",
        configuredFrontierLimit: "4096",
        retainedWorkItemCount: "0",
        semanticGeneration: "1",
        capacityState: "ok",
        degraded: false,
        degradedReason: "",
        rebuildRequired: false,
        configuredGapIntervalLimit: "128",
        configuredRevisionSpanLimit: "8192",
        configuredSerializedByteLimit: "65536",
        retainedGapIntervalCount: "0",
        retainedRevisionSpan: "0",
        retainedSerializedBytes: "0",
      },
    }),
  ),
  rebuildSemanticRuleService = jest.fn(),
) {
  render(
    <MemoryRouter initialEntries={["/spaces/sp_main"]}>
      <Routes>
        <Route
          path="/spaces/:spaceId"
          element={
            <SpaceDetailPage
              getSpaceService={getSpaceService}
              listDomainsService={listDomainsService}
              listSemanticRulesService={listSemanticRulesService}
              getDomainSchemaService={getDomainSchemaService}
              getSemanticMaintenanceStatusService={
                getSemanticMaintenanceStatusService
              }
              getSemanticReliabilityStatusService={
                getSemanticReliabilityStatusService
              }
              rebuildSemanticRuleService={rebuildSemanticRuleService}
              listSemanticMaintenanceWorkService={
                listSemanticMaintenanceWorkService
              }
              lookupSpaceRouteService={lookupSpaceRouteService}
              getClientQuerySessionService={getClientQuerySessionService}
              principalContext={principalContext}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  return {
    getSpaceService,
    listDomainsService,
    listSemanticRulesService,
    getDomainSchemaService,
    getSemanticMaintenanceStatusService,
    listSemanticMaintenanceWorkService,
    lookupSpaceRouteService,
    getSemanticReliabilityStatusService,
    rebuildSemanticRuleService,
  };
}

function semanticRule() {
  return {
    semanticRuleId: "rule_notes",
    key: "notes",
    displayName: "Notes",
    description: "",
    spaceId: "sp_main",
    domainId: "dom_default",
    enabled: true,
    state: "SEMANTIC_RULE_STATE_ACTIVE",
    bindings: [{
      key: "search",
      purpose: "search",
      intelligenceProfileId: "",
      intelligenceProfileKey: "embeddings",
      vectorStoreId: "",
      vectorStoreKey: "vectors",
      enabled: true,
    }],
  };
}

function semanticReliability() {
  return {
    spaceId: "sp_main",
    semanticRuleId: "rule_notes",
    embeddingBindingKey: "search",
    latestObservedGraphRevision: "12",
    analyzedThroughGraphRevision: "12",
    freshThroughGraphRevision: "12",
    unresolvedGapCount: "0",
    oldestUnresolvedGraphRevision: "0",
    configuredFrontierLimit: "4096",
    retainedWorkItemCount: "0",
    semanticGeneration: "1",
    capacityState: "ok",
    degraded: false,
    degradedReason: "",
    rebuildRequired: false,
    configuredGapIntervalLimit: "128",
    configuredRevisionSpanLimit: "8192",
    configuredSerializedByteLimit: "65536",
    retainedGapIntervalCount: "0",
    retainedRevisionSpan: "0",
    retainedSerializedBytes: "0",
  };
}

function semanticRebuild(state: string, rebuildEpoch: string) {
  return {
    rebuildEpoch,
    state,
    pinnedTargetGraphRevision: "12",
    deltaCatchupGraphRevision: state === "running" ? "0" : "12",
    semanticGeneration: "1",
    startedAt: "2026-01-01T00:00:00Z",
    completedAt: state === "completed" ? "2026-01-01T00:01:00Z" : "",
    errorMessageSanitized: "",
  };
}

function semanticManagerContext(): ConsolePrincipalContext {
  return {
    session: {
      addr: "127.0.0.1:19091",
      principalId: "prn_admin",
      username: "admin",
    },
    roles: [],
    capabilities: ["semantic.manage"],
    capabilityState: {
      kind: "complete",
      capabilities: [{ capability: "semantic.manage" }],
    },
    warnings: [],
  };
}

function renderSemanticRebuild(getStatus: jest.Mock, rebuild: jest.Mock) {
  renderDetail(
    undefined,
    undefined,
    jest.fn().mockResolvedValue({ rules: [semanticRule()], nextPageToken: "" }),
    undefined,
    undefined,
    undefined,
    undefined,
    semanticManagerContext(),
    undefined,
    getStatus,
    rebuild,
  );
}

test("loads and renders selected space properties", async () => {
  const getSpaceService = jest.fn().mockResolvedValue({
    spaceId: "sp_main",
    name: "Main",
    state: "SPACE_STATE_ACTIVE",
    owner: {
      principalType: "Principal Type User",
      id: "user_1",
      displayName: "Ada",
    },
    createTime: "1710000000",
    updateTime: "1710003600",
    callerAccess: {
      roles: ["SPACE_ROLE_OWNER"],
      capabilities: ["CAPABILITY_SPACE_READ", "CAPABILITY_GRAPH_WRITE"],
    },
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
    rules: [
      {
        semanticRuleId: "rule_notes",
        key: "notes",
        displayName: "Notes",
        description: "",
        spaceId: "sp_main",
        domainId: "dom_default",
        enabled: true,
        state: "SEMANTIC_RULE_STATE_ACTIVE",
        bindings: [
          {
            key: "search",
            purpose: "search",
            intelligenceProfileId: "",
            intelligenceProfileKey: "text-embedding-3-small",
            vectorStoreId: "",
            vectorStoreKey: "mycel-file",
            enabled: true,
          },
        ],
      },
    ],
    nextPageToken: "",
  });

  const getSemanticMaintenanceStatusService = jest.fn().mockResolvedValue({
    enabled: true,
    degraded: true,
    degradedReason: "worker paused",
    queueDepthPending: 2,
    queueDepthRunning: 1,
    queueDepthFailedRetryable: 1,
    queueDepthFailedPermanent: 0,
    oldestPendingAgeSeconds: 30,
    lastDirtyEventAt: "",
    lastAnalyzedAt: "",
    lastWorkerSuccessAt: "",
    lastWorkerErrorAt: "",
    throttleState: "normal",
    analyzerRuns: 3,
    workerRuns: 4,
  });
  const listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({
    items: [
      {
        workItemId: "work_1",
        spaceId: "sp_main",
        domainId: "dom_default",
        semanticRuleId: "rule_notes",
        embeddingBindingKey: "search",
        targetNodeId: "node_1",
        action: "embed",
        status: "failed_retryable",
        attemptCount: 2,
        notBefore: "",
        claimedUntil: "",
        lastErrorCategory: "provider",
        lastErrorMessageSanitized: "rate limited",
        createdAt: "",
        updatedAt: "",
      },
    ],
  });

  const getDomainSchemaService = jest.fn().mockResolvedValue({
    domainId: "dom_default",
    gwl: 'schema "PKM" version "v1" mode warn',
  });

  renderDetail(
    getSpaceService,
    listDomainsService,
    listSemanticRulesService,
    getDomainSchemaService,
    getSemanticMaintenanceStatusService,
    listSemanticMaintenanceWorkService,
  );

  expect(screen.getByRole("link", { name: /back to spaces/i })).toHaveAttribute(
    "href",
    "/spaces",
  );
  expect(screen.getByText(/loading space/i)).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "Main" }),
  ).toBeInTheDocument();
  expect(getSpaceService).toHaveBeenCalledWith("sp_main");
  expect(listDomainsService).toHaveBeenCalledWith({
    spaceId: "sp_main",
    pageSize: 100,
    pageToken: "",
    includeSystem: false,
  });
  expect(listSemanticRulesService).toHaveBeenCalledWith({
    spaceId: "sp_main",
    pageSize: 100,
    includeDisabled: false,
  });
  expect(screen.getByText("sp_main")).toBeInTheDocument();
  expect(screen.getByText("Principal Type User")).toBeInTheDocument();
  expect(screen.getByText("Ada")).toBeInTheDocument();
  expect(await screen.findByText("Raft placement")).toBeInTheDocument();
  expect(screen.getByText("Leader node")).toBeInTheDocument();
  expect(
    screen.getByText(/CAPABILITY_SPACE_READ, CAPABILITY_GRAPH_WRITE/),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "General" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));
  await waitFor(() =>
    expect(getSemanticMaintenanceStatusService).toHaveBeenCalledWith({
      spaceId: "sp_main",
    }),
  );
  expect(listSemanticMaintenanceWorkService).toHaveBeenCalledWith({
    spaceId: "sp_main",
    status: "",
    limit: 100,
  });
  expect(
    screen.getByRole("heading", { name: "Semantic maintenance" }),
  ).toBeInTheDocument();
  expect(screen.getByText("worker paused")).toBeInTheDocument();
  expect(screen.getByText("provider")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Semantic rules" }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("rule_notes").length).toBeGreaterThan(0);
  expect(screen.getByText(/text-embedding-3-small/)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Semantic reliability diagnostics" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Ready Current")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Domains" }));
  expect(screen.getByRole("heading", { name: "Domains" })).toBeInTheDocument();
  expect(screen.getAllByText("dom_default").length).toBeGreaterThan(0);

  await userEvent.click(screen.getByRole("tab", { name: "Schemas" }));
  expect(
    screen.getByRole("heading", { name: "Domain schemas" }),
  ).toBeInTheDocument();
});

test("confirms rule identity before starting one semantic rebuild", async () => {
  const reliability = semanticReliability();
  const getStatus = jest.fn().mockResolvedValue({ supported: true, status: reliability });
  const rebuild = jest.fn().mockResolvedValue({
    rebuild: semanticRebuild("completed", "epoch_1"),
    reliability: { ...reliability, rebuild: semanticRebuild("completed", "epoch_1") },
    selectedCount: 4,
    generatedCount: 4,
    skippedCount: 0,
    failedCount: 0,
  });

  renderSemanticRebuild(getStatus, rebuild);

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));
  await userEvent.click(await screen.findByRole("button", { name: "Rebuild" }));

  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("sp_main")).toBeInTheDocument();
  expect(within(dialog).getByText("rule_notes")).toBeInTheDocument();
  expect(within(dialog).getByText("search")).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole("button", { name: "Start rebuild" }));

  await waitFor(() => expect(rebuild).toHaveBeenCalledTimes(1));
  expect(rebuild).toHaveBeenCalledWith({
    spaceId: "sp_main",
    semanticRuleId: "rule_notes",
    embeddingBindingKey: "search",
  });
  expect(await screen.findByText(/Rebuild completed\. Selected 4, generated 4/i)).toBeInTheDocument();
});

test("reconciles a failed rebuild request without retrying the mutation", async () => {
  const reliability = semanticReliability();
  const getStatus = jest
    .fn()
    .mockResolvedValueOnce({ supported: true, status: reliability })
    .mockResolvedValueOnce({
      supported: true,
      status: { ...reliability, rebuild: semanticRebuild("running", "epoch_ambiguous") },
    });
  const rebuild = jest.fn().mockRejectedValue({
    kind: "unavailable",
    severity: "error",
    message: "semantic maintenance request failed",
  });

  renderSemanticRebuild(getStatus, rebuild);

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));
  await userEvent.click(await screen.findByRole("button", { name: "Rebuild" }));
  await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Start rebuild" }));

  expect(await screen.findByText(/No automatic mutation retry was attempted/i)).toBeInTheDocument();
  expect(screen.getByText(/Rebuild request failed \(unavailable\)/i)).toBeInTheDocument();
  expect(screen.getByText(/Reconciled daemon state: running, epoch epoch_ambiguous/i)).toBeInTheDocument();
  expect(rebuild).toHaveBeenCalledTimes(1);
  expect(getStatus).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: "Rebuild" })).toBeDisabled();
});

test("keeps semantic panels readable while hiding maintenance mutations without semantic manage capability", async () => {
  const listSemanticRulesService = jest.fn().mockResolvedValue({
    rules: [
      {
        semanticRuleId: "rule_notes",
        key: "notes",
        displayName: "Notes",
        description: "",
        spaceId: "sp_main",
        domainId: "dom_default",
        enabled: true,
        state: "SEMANTIC_RULE_STATE_ACTIVE",
        bindings: [
          {
            key: "search",
            purpose: "search",
            intelligenceProfileId: "",
            intelligenceProfileKey: "text-embedding-3-small",
            vectorStoreId: "",
            vectorStoreKey: "mycel-file",
            enabled: true,
          },
        ],
      },
    ],
    nextPageToken: "",
  });
  const listSemanticMaintenanceWorkService = jest.fn().mockResolvedValue({
    items: [
      {
        workItemId: "work_1",
        spaceId: "sp_main",
        domainId: "dom_default",
        semanticRuleId: "rule_notes",
        embeddingBindingKey: "search",
        targetNodeId: "node_1",
        action: "embed",
        status: "failed_retryable",
        attemptCount: 2,
        notBefore: "",
        claimedUntil: "",
        lastErrorCategory: "provider",
        lastErrorMessageSanitized: "rate limited",
        createdAt: "",
        updatedAt: "",
      },
    ],
  });
  const getSemanticReliabilityStatusService = jest.fn();

  renderDetail(
    undefined,
    undefined,
    listSemanticRulesService,
    undefined,
    undefined,
    listSemanticMaintenanceWorkService,
    undefined,
    {
      session: {
        addr: "127.0.0.1:19091",
        principalId: "prn_reader",
        username: "reader",
      },
      roles: [],
      capabilities: ["CAPABILITY_SEMANTIC_SEARCH"],
      capabilityState: {
        kind: "complete",
        capabilities: [{ capability: "CAPABILITY_SEMANTIC_SEARCH" }],
      },
      warnings: [],
    },
    undefined,
    getSemanticReliabilityStatusService,
  );

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Semantic" }));

  expect(await screen.findByText("provider")).toBeInTheDocument();
  expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0);
  expect(
    screen.queryByRole("button", { name: /analyze dirty work/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /^retry$/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /backfill/i }),
  ).not.toBeInTheDocument();
  expect(getSemanticReliabilityStatusService).not.toHaveBeenCalled();
  expect(screen.getByText(/semantic.manage capability is required/i)).toBeInTheDocument();
});

test("uses current console principal for graph query without a separate client login", async () => {
  renderDetail(
    undefined,
    jest.fn().mockResolvedValue({
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
    }),
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      session: {
        addr: "127.0.0.1:19091",
        principalId: "prn_martin",
        username: "martin",
      },
      roles: [],
      capabilities: ["CAPABILITY_SPACE_READ"],
      capabilityState: {
        kind: "complete",
        capabilities: [{ capability: "CAPABILITY_SPACE_READ" }],
      },
      warnings: [],
    },
  );

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Graph query" }));

  expect(screen.getByText(/martin @ 127.0.0.1:19091/i)).toBeInTheDocument();
  expect(
    screen.getByText(/read-write, subject to daemon authorization/i),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /connect client session/i }),
  ).not.toBeInTheDocument();
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
  await userEvent.click(
    screen.getByRole("button", { name: /load more domains/i }),
  );

  expect(await screen.findByText("dom_system")).toBeInTheDocument();
  expect(listDomainsService).toHaveBeenLastCalledWith({
    spaceId: "sp_main",
    pageSize: 100,
    pageToken: "next",
    includeSystem: false,
  });

  await userEvent.click(screen.getByLabelText(/include system domains/i));

  expect(listDomainsService).toHaveBeenLastCalledWith({
    spaceId: "sp_main",
    pageSize: 100,
    pageToken: "",
    includeSystem: true,
  });
});

test("renders load errors", async () => {
  renderDetail(jest.fn().mockRejectedValue(new Error("space unavailable")));

  expect(await screen.findByText("space unavailable")).toBeInTheDocument();
});

test("identifies dedicated query console principal when active", async () => {
  const listDomainsService = jest.fn().mockResolvedValue({
    domains: [
      {
        spaceId: "sp_main",
        domainId: "dom_default",
        key: "default",
        name: "default",
      },
    ],
    nextPageToken: "",
  });
  const getClientQuerySessionService = jest.fn().mockResolvedValue({
    addr: "127.0.0.1:19092",
    username: "query-user",
  });

  renderDetail(
    undefined,
    listDomainsService,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      session: {
        addr: "127.0.0.1:19091",
        principalId: "admin_1",
        username: "admin",
      },
      roles: [],
      capabilities: ["*"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "*" }] },
      warnings: [],
    },
    getClientQuerySessionService,
  );

  await screen.findByRole("heading", { name: "Main" });
  await userEvent.click(screen.getByRole("tab", { name: "Graph query" }));

  expect(await screen.findByText(/query-user @ 127\.0\.0\.1:19092/)).toBeInTheDocument();
  expect(screen.getByText("Dedicated Query Console session")).toBeInTheDocument();
});

test("links the space owner name instead of an id when principal details are available", async () => {
  const listPrincipalsService = jest.fn().mockResolvedValue({
    principals: [
      {
        principalId: "user_1",
        username: "ada",
        displayName: "Ada Lovelace",
        state: "PRINCIPAL_STATE_ACTIVE",
      },
    ],
    nextPageToken: "",
  });

  render(
    <MemoryRouter initialEntries={["/spaces/sp_main"]}>
      <Routes>
        <Route
          path="/spaces/:spaceId"
          element={
            <SpaceDetailPage
              principalContext={{
                session: {
                  addr: "127.0.0.1:19091",
                  principalId: "admin_1",
                  username: "admin",
                },
                roles: [],
                capabilities: ["*"],
                capabilityState: {
                  kind: "complete",
                  capabilities: [{ capability: "*" }],
                },
                warnings: [],
              }}
              getSpaceService={jest.fn().mockResolvedValue({
                spaceId: "sp_main",
                name: "Main",
                state: "SPACE_STATE_ACTIVE",
                owner: {
                  principalType: "PRINCIPAL_TYPE_HUMAN",
                  id: "user_1",
                  displayName: "user_1",
                },
              })}
              listDomainsService={jest.fn().mockResolvedValue({
                domains: [],
                nextPageToken: "",
              })}
              listSemanticRulesService={jest.fn().mockResolvedValue({
                rules: [],
                nextPageToken: "",
              })}
              getDomainSchemaService={jest.fn().mockResolvedValue({
                domainId: "dom_default",
                gwl: "",
              })}
              getSemanticMaintenanceStatusService={jest.fn().mockResolvedValue({
                enabled: true,
                degraded: false,
                degradedReason: "",
                queueDepthPending: 0,
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
              })}
              listSemanticMaintenanceWorkService={jest.fn().mockResolvedValue({
                items: [],
              })}
              lookupSpaceRouteService={jest.fn().mockResolvedValue({
                spaceId: "sp_main",
                partitionId: 3,
                leaderNodeId: 2,
                replicaNodeIds: [1, 2, 3],
              })}
              listPrincipalsService={listPrincipalsService}
            />
          }
        />
      </Routes>
    </MemoryRouter>,
  );

  const ownerLink = await screen.findByRole("link", { name: "Ada Lovelace" });
  expect(ownerLink).toHaveAttribute("href", "/principals/user_1");
  expect(screen.getByTitle("user_1")).toBeInTheDocument();
  expect(listPrincipalsService).toHaveBeenCalledWith({
    pageSize: 100,
    includeDisabled: true,
    includeDeleted: true,
  });
});
