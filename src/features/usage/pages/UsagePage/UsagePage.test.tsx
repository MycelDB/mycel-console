import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { completeCapabilities, capability, type ConsolePrincipalContext } from "../../../console";
import type { UsageAccountingHealthInfo, UsageSnapshotInfo } from "../../../../types/usage";
import { UsagePage } from "./UsagePage";

const context: ConsolePrincipalContext = {
  session: { addr: "127.0.0.1:19091", principalId: "prn_admin", username: "admin" },
  roles: [],
  capabilities: ["usage.read", "usage.diagnostic.read", "usage.reconcile"],
  capabilityState: completeCapabilities([
    capability("usage.read"),
    capability("usage.diagnostic.read"),
    capability("usage.reconcile"),
  ]),
  warnings: [],
};

const snapshot: UsageSnapshotInfo = {
  scope: { kind: "domain", spaceId: "sp_main", domainId: "dom_default" },
  domainInclusion: "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM",
  observedAt: "1700000000",
  asOfRevision: { revisionToken: "rev-1", sourceRevisions: [] },
  accountingState: "USAGE_ACCOUNTING_STATE_READY",
  quotaSafeComplete: true,
  metrics: [
    {
      name: "graph.node_count",
      metricVersion: 1,
      value: 12,
      unit: "USAGE_UNIT_COUNT",
      authority: "USAGE_AUTHORITY_RAFT_COMMITTED_EXACT",
      quotaSafe: true,
      hardLimitEligible: true,
      observedAt: "1700000000",
      asOfRevision: null,
      labels: {},
    },
    {
      name: "graph.logical_bytes",
      metricVersion: 1,
      value: 42,
      unit: "USAGE_UNIT_BYTES",
      authority: "USAGE_AUTHORITY_RAFT_COMMITTED_EXACT",
      quotaSafe: true,
      hardLimitEligible: false,
      observedAt: "1700000000",
      asOfRevision: null,
      labels: {},
    },
    {
      name: "diagnostic.local_graph_store_bytes",
      metricVersion: 1,
      value: 4096,
      unit: "USAGE_UNIT_BYTES",
      authority: "USAGE_AUTHORITY_OBSERVED_APPROXIMATE",
      quotaSafe: false,
      hardLimitEligible: false,
      observedAt: "1700000000",
      asOfRevision: null,
      labels: { source: "pvc" },
    },
  ],
  blockers: [],
  warnings: [
    {
      reason: "USAGE_STATUS_REASON_METRIC_NOT_QUOTA_SAFE",
      severity: "USAGE_STATUS_SEVERITY_WARNING",
      message: "physical bytes are diagnostic only",
      scope: null,
      metricName: "diagnostic.local_graph_store_bytes",
      evidence: {},
    },
  ],
};

const health: UsageAccountingHealthInfo = {
  scope: null,
  observedAt: "1700000000",
  state: "USAGE_ACCOUNTING_STATE_READY",
  asOfRevision: null,
  quotaSafeReady: true,
  blockers: [],
  warnings: [],
  rebuildingScopeCount: 0,
  staleScopeCount: 0,
  driftScopeCount: 0,
  diagnosticCollectorUnavailableCount: 0,
};

test("renders usage snapshots with state badges and diagnostic labels", async () => {
  const listUsageService = jest.fn().mockResolvedValue({ snapshots: [snapshot], nextPageToken: "" });
  const getUsageAccountingHealthService = jest.fn().mockResolvedValue(health);

  render(
    <UsagePage
      principalContext={context}
      listUsageService={listUsageService}
      getUsageAccountingHealthService={getUsageAccountingHealthService}
    />,
  );

  expect((await screen.findAllByText("graph.node_count")).length).toBeGreaterThan(0);
  expect(screen.getAllByText("graph.logical_bytes").length).toBeGreaterThan(0);
  expect(screen.getAllByText("42 B").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Logical graph payload bytes").length).toBeGreaterThan(0);
  expect(screen.getByText(/Graph byte metrics are split by safety and authority/i)).toBeInTheDocument();
  expect(screen.getAllByText(/Diagnostic physical graph store observation/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText("Ready").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Diagnostic only / non-quota-safe").length).toBeGreaterThan(0);
  expect(screen.getByText("Hard-limit eligible")).toBeInTheDocument();
  expect(screen.getByText("Not hard-limit eligible")).toBeInTheDocument();
  expect(listUsageService).toHaveBeenCalledWith(expect.objectContaining({
    mode: "USAGE_LIST_MODE_SPACES",
    includeDiagnosticPhysical: false,
  }));
});

test("surfaces fail-closed health states", async () => {
  const driftedHealth: UsageAccountingHealthInfo = {
    ...health,
    state: "USAGE_ACCOUNTING_STATE_DRIFT_DETECTED",
    quotaSafeReady: false,
    driftScopeCount: 1,
    blockers: [
      {
        reason: "USAGE_STATUS_REASON_RECONCILIATION_DRIFT",
        severity: "USAGE_STATUS_SEVERITY_BLOCKER",
        message: "reconciliation drift detected",
        scope: null,
        metricName: "graph.node_count",
        evidence: { expected: "10", actual: "12" },
      },
    ],
  };

  render(
    <UsagePage
      principalContext={context}
      listUsageService={jest.fn().mockResolvedValue({ snapshots: [snapshot], nextPageToken: "" })}
      getUsageAccountingHealthService={jest.fn().mockResolvedValue(driftedHealth)}
    />,
  );

  expect((await screen.findAllByText("Drift detected")).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/may fail closed/i).length).toBeGreaterThan(0);
  expect(screen.getByText("reconciliation drift detected")).toBeInTheDocument();
});

test("requires an explicit reconciliation action", async () => {
  const getUsageAccountingHealthService = jest.fn().mockResolvedValue(health);

  render(
    <UsagePage
      principalContext={context}
      listUsageService={jest.fn().mockResolvedValue({ snapshots: [snapshot], nextPageToken: "" })}
      getUsageAccountingHealthService={getUsageAccountingHealthService}
    />,
  );

  await screen.findAllByText("graph.node_count");
  await userEvent.click(screen.getByRole("button", { name: /run reconciliation health check/i }));

  await waitFor(() => expect(getUsageAccountingHealthService).toHaveBeenLastCalledWith(expect.objectContaining({ includeReconciliation: true })));
  expect(screen.getByText(/may persist readiness transitions/i)).toBeInTheDocument();
});

test("disables diagnostic inclusion without usage diagnostic capability", async () => {
  const limitedContext = {
    ...context,
    capabilities: ["usage.read"],
    capabilityState: completeCapabilities([capability("usage.read")]),
  };

  render(
    <UsagePage
      principalContext={limitedContext}
      listUsageService={jest.fn().mockResolvedValue({ snapshots: [], nextPageToken: "" })}
      getUsageAccountingHealthService={jest.fn().mockResolvedValue(health)}
    />,
  );

  const checkbox = await screen.findByRole("checkbox", { name: /include diagnostic physical observations/i });
  expect(checkbox).toBeDisabled();
  expect(screen.getByText(/Diagnostic collector evidence requires usage.diagnostic.read/i)).toBeInTheDocument();
});

test("renders service errors", async () => {
  render(
    <UsagePage
      principalContext={context}
      listUsageService={jest.fn().mockRejectedValue({ kind: "unavailable", severity: "error", message: "usage service unavailable" })}
      getUsageAccountingHealthService={jest.fn().mockResolvedValue(health)}
    />,
  );

  expect(await screen.findByRole("alert")).toHaveTextContent("usage service unavailable");
});
