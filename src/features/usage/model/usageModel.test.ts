import type { UsageSnapshotInfo } from "../../../types/usage";
import {
  buildUsageCliEquivalent,
  formatUsageValue,
  healthNeedsAttention,
  metricGroups,
  metricsCsv,
  parseMetricNames,
  stateNeedsFailClosedCopy,
} from "./usageModel";

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
      value: 7,
      unit: "USAGE_UNIT_COUNT",
      authority: "USAGE_AUTHORITY_RAFT_COMMITTED_EXACT",
      quotaSafe: true,
      hardLimitEligible: true,
      observedAt: "1700000000",
      asOfRevision: null,
      labels: {},
    },
    {
      name: "diagnostic.physical_bytes",
      metricVersion: 1,
      value: 2048,
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
  warnings: [],
};

test("groups quota-safe and diagnostic metrics without mixing hard-limit evidence", () => {
  const groups = metricGroups(snapshot.metrics);

  expect(groups.quotaSafe.map((metric) => metric.name)).toEqual(["graph.node_count"]);
  expect(groups.diagnostic.map((metric) => metric.name)).toEqual(["diagnostic.physical_bytes"]);
});

test("formats usage values by unit", () => {
  expect(formatUsageValue(snapshot.metrics[0])).toBe("7");
  expect(formatUsageValue(snapshot.metrics[1])).toBe("2 KiB");
});

test("state helpers identify fail-closed accounting states", () => {
  expect(stateNeedsFailClosedCopy("USAGE_ACCOUNTING_STATE_REBUILDING")).toBe(true);
  expect(stateNeedsFailClosedCopy("USAGE_ACCOUNTING_STATE_READY")).toBe(false);
  expect(healthNeedsAttention({
    scope: null,
    observedAt: "",
    state: "USAGE_ACCOUNTING_STATE_DRIFT_DETECTED",
    asOfRevision: null,
    quotaSafeReady: false,
    blockers: [],
    warnings: [],
    rebuildingScopeCount: 0,
    staleScopeCount: 0,
    driftScopeCount: 1,
    diagnosticCollectorUnavailableCount: 0,
  })).toBe(true);
});

test("parses metric filters and builds evidence exports", () => {
  expect(parseMetricNames("graph.node_count, blob.active_logical_bytes\n")).toEqual([
    "graph.node_count",
    "blob.active_logical_bytes",
  ]);

  expect(metricsCsv(snapshot)).toContain("diagnostic.physical_bytes");
  expect(buildUsageCliEquivalent({
    mode: "USAGE_LIST_MODE_DOMAINS_IN_SPACE",
    parent: { kind: "space", spaceId: "sp main" },
    domainInclusion: "DOMAIN_INCLUSION_MODE_RETAINED_ALL",
    includeDiagnosticPhysical: true,
    requireQuotaSafe: true,
    metricNames: ["graph.node_count"],
  })).toBe("mycel admin usage list --mode USAGE_LIST_MODE_DOMAINS_IN_SPACE --space 'sp main' --domain-inclusion DOMAIN_INCLUSION_MODE_RETAINED_ALL --include-diagnostic-physical --require-quota-safe --metric graph.node_count");
});
