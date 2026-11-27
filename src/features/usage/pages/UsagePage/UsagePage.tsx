import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  Alert,
  Button,
  EnumBadge,
  formatEnumLabel,
  Input,
  ResourceIdText,
  TableHead,
  Text,
  themeClasses,
} from "../../../../components/typography";
import {
  getUsage,
  getUsageAccountingHealth,
  listUsage,
  normalizeAppError,
} from "../../../../services/adminService";
import {
  hasCapability,
  navigationCapabilityState,
  requirement,
  type ConsolePrincipalContext,
} from "../../../console";
import type {
  DomainInclusionMode,
  GetUsageAccountingHealthInput,
  GetUsageInput,
  ListUsageInput,
  ListUsageResponseInfo,
  UsageAccountingHealthInfo,
  UsageListMode,
  UsageMetricInfo,
  UsageScopeInfo,
  UsageSnapshotInfo,
  UsageStatusInfo,
} from "../../../../types/usage";
import {
  buildSnapshotCliEquivalent,
  buildUsageCliEquivalent,
  formatUsageValue,
  healthNeedsAttention,
  isDiagnosticGraphStoreMetric,
  isGraphLogicalBytesMetric,
  metricGroups,
  metricsCsv,
  parseMetricNames,
  scopeLabel,
  snapshotJson,
  stateNeedsFailClosedCopy,
  usageMetricInsight,
  statusSummary,
  statusTone,
} from "../../model/usageModel";

const listModeOptions: { value: UsageListMode; label: string; hint: string }[] = [
  {
    value: "USAGE_LIST_MODE_SPACES",
    label: "Spaces",
    hint: "One aggregate row per space",
  },
  {
    value: "USAGE_LIST_MODE_DOMAINS_IN_SPACE",
    label: "Domains in a space",
    hint: "One row per domain for the parent space",
  },
  {
    value: "USAGE_LIST_MODE_SPACE_WITH_DOMAIN_BREAKDOWN",
    label: "Space with domain breakdown",
    hint: "Space aggregate plus domain rows when returned by the daemon",
  },
];

const domainInclusionOptions: { value: DomainInclusionMode; label: string }[] = [
  {
    value: "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM",
    label: "Retained non-system domains",
  },
  {
    value: "DOMAIN_INCLUSION_MODE_RETAINED_ALL",
    label: "Retained domains including system",
  },
  {
    value: "DOMAIN_INCLUSION_MODE_SYSTEM_ONLY",
    label: "System domains only",
  },
];

export type UsagePageProps = {
  principalContext?: ConsolePrincipalContext | null;
  listUsageService?: (input?: ListUsageInput) => Promise<ListUsageResponseInfo>;
  getUsageService?: (input: GetUsageInput) => Promise<UsageSnapshotInfo>;
  getUsageAccountingHealthService?: (
    input?: GetUsageAccountingHealthInput,
  ) => Promise<UsageAccountingHealthInfo>;
};

export function UsagePage({
  principalContext,
  listUsageService = listUsage,
  getUsageService = getUsage,
  getUsageAccountingHealthService = getUsageAccountingHealth,
}: UsagePageProps) {
  const capabilityState = navigationCapabilityState(principalContext);
  const canReadDiagnostics = hasCapability(
    capabilityState,
    requirement("usage.diagnostic.read"),
  );
  const canReconcile = hasCapability(
    capabilityState,
    requirement("usage.reconcile"),
  );

  const [mode, setMode] = useState<UsageListMode>("USAGE_LIST_MODE_SPACES");
  const [spaceId, setSpaceId] = useState("");
  const [domainIdFilter, setDomainIdFilter] = useState("");
  const [metricFilter, setMetricFilter] = useState("");
  const [accountingStateFilter, setAccountingStateFilter] = useState("");
  const [quotaSafetyFilter, setQuotaSafetyFilter] = useState("");
  const [domainInclusion, setDomainInclusion] = useState<DomainInclusionMode>(
    "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM",
  );
  const [includeDiagnosticPhysical, setIncludeDiagnosticPhysical] = useState(false);
  const [requireQuotaSafe, setRequireQuotaSafe] = useState(false);
  const [snapshots, setSnapshots] = useState<UsageSnapshotInfo[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<UsageSnapshotInfo | null>(null);
  const [health, setHealth] = useState<UsageAccountingHealthInfo | null>(null);
  const [nextPageToken, setNextPageToken] = useState("");
  const [appliedInput, setAppliedInput] = useState<ListUsageInput>({
    mode: "USAGE_LIST_MODE_SPACES",
    domainInclusion: "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM",
    pageSize: 50,
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  useEffect(() => {
    void loadUsage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!canReadDiagnostics && includeDiagnosticPhysical) {
      setIncludeDiagnosticPhysical(false);
    }
  }, [canReadDiagnostics, includeDiagnosticPhysical]);

  const filteredSnapshots = useMemo(
    () => filterSnapshots(snapshots, domainIdFilter, accountingStateFilter, quotaSafetyFilter),
    [snapshots, domainIdFilter, accountingStateFilter, quotaSafetyFilter],
  );
  const totals = useMemo(() => summarizeSnapshots(filteredSnapshots), [filteredSnapshots]);
  const healthAttention = healthNeedsAttention(health);
  const healthScope = currentHealthScope();

  async function loadUsage() {
    const input = buildListInput();
    if (!input) return;
    setLoading(true);
    setError("");
    setCopyMessage("");
    try {
      const result = await listUsageService(input);
      setSnapshots(result.snapshots);
      setNextPageToken(result.nextPageToken || "");
      setAppliedInput(input);
      const nextSelected =
        filterSnapshots(result.snapshots, domainIdFilter, accountingStateFilter, quotaSafetyFilter)[0] ??
        result.snapshots[0] ??
        null;
      setSelectedSnapshot(nextSelected);
      if (nextSelected?.scope && nextSelected.scope.kind !== "unknown") {
        void loadHealth(false, nextSelected.scope);
      } else {
        setHealth(null);
      }
    } catch (err) {
      setSnapshots([]);
      setSelectedSnapshot(null);
      setNextPageToken("");
      setError(normalizeAppError(err, "Unable to load usage snapshots").message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextPageToken || loading || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const result = await listUsageService({
        ...appliedInput,
        pageToken: nextPageToken,
      });
      setSnapshots((current) => [...current, ...result.snapshots]);
      setNextPageToken(result.nextPageToken || "");
    } catch (err) {
      setError(normalizeAppError(err, "Unable to load more usage snapshots").message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function loadHealth(
    includeReconciliation: boolean,
    explicitScope?: UsageScopeInfo | null,
  ) {
    const scope = explicitScope ? scopeInput(explicitScope) : currentHealthScope();
    if (!scope) {
      setHealth(null);
      return;
    }
    setHealthLoading(true);
    setError("");
    setCopyMessage("");
    try {
      const result = await getUsageAccountingHealthService({
        scope,
        includeReconciliation,
        includeDiagnosticCollectors: canReadDiagnostics,
      });
      setHealth(result);
    } catch (err) {
      setError(normalizeAppError(err, "Unable to load usage accounting health").message);
    } finally {
      setHealthLoading(false);
    }
  }

  async function inspectSnapshot(snapshot: UsageSnapshotInfo) {
    setSelectedSnapshot(snapshot);
    setCopyMessage("");
    const scope = snapshot.scope;
    if (!scope || scope.kind === "unknown") return;
    setDrilldownLoading(true);
    setError("");
    try {
      const refreshed = await getUsageService({
        scope: scopeInput(scope),
        domainInclusion,
        includeDiagnosticPhysical: includeDiagnosticPhysical && canReadDiagnostics,
        requireQuotaSafe,
        metricNames: parseMetricNames(metricFilter),
      });
      setSelectedSnapshot(refreshed);
      if (refreshed.scope && refreshed.scope.kind !== "unknown") {
        void loadHealth(false, refreshed.scope);
      }
    } catch (err) {
      setError(normalizeAppError(err, "Unable to inspect usage scope").message);
    } finally {
      setDrilldownLoading(false);
    }
  }

  function buildListInput(pageToken = ""): ListUsageInput | null {
    const parentSpace = spaceId.trim();
    if (
      mode !== "USAGE_LIST_MODE_SPACES" &&
      parentSpace.length === 0
    ) {
      setError("Space ID is required for domain usage modes.");
      return null;
    }
    const input: ListUsageInput = {
      mode,
      domainInclusion,
      includeDiagnosticPhysical: includeDiagnosticPhysical && canReadDiagnostics,
      requireQuotaSafe,
      pageSize: 50,
      pageToken,
      metricNames: parseMetricNames(metricFilter),
    };
    if (parentSpace) input.parent = { kind: "space", spaceId: parentSpace };
    return input;
  }

  function currentHealthScope() {
    if (selectedSnapshot?.scope && selectedSnapshot.scope.kind !== "unknown") {
      return scopeInput(selectedSnapshot.scope);
    }
    const parentSpace = spaceId.trim();
    if (parentSpace) return { kind: "space" as const, spaceId: parentSpace };
    return null;
  }

  function clearFilters() {
    setMode("USAGE_LIST_MODE_SPACES");
    setSpaceId("");
    setDomainIdFilter("");
    setMetricFilter("");
    setAccountingStateFilter("");
    setQuotaSafetyFilter("");
    setDomainInclusion("DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM");
    setIncludeDiagnosticPhysical(false);
    setRequireQuotaSafe(false);
    setError("");
    setCopyMessage("");
  }

  async function copyEvidence(label: string, value: string) {
    setCopyMessage("");
    try {
      await writeClipboard(value);
      setCopyMessage(`${label} copied.`);
    } catch {
      setCopyMessage(`Unable to copy ${label.toLowerCase()}; select and copy manually.`);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Usage"
        description="Read-only Mycel-native usage accounting for space_id and domain_id scopes. Quota-safe logical measurements are kept separate from diagnostic observations."
        actions={
          <Button type="button" onClick={() => void loadUsage()} disabled={loading}>
            {loading ? "Loading…" : "Refresh usage"}
          </Button>
        }
      />

      <Alert variant="info">
        <Text size="sm" className="font-medium">Operator scope guardrails</Text>
        <Text size="sm" className="mt-1">
          This page does not infer external ownership or product policy. Hard-limit eligible metrics are shown only when the daemon marks them quota-safe.
        </Text>
      </Alert>

      {error ? <Alert variant="error">{error}</Alert> : null}
      {copyMessage ? <Alert variant="success">{copyMessage}</Alert> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Scopes" value={String(totals.scopeCount)} />
        <SummaryCard label="Quota-safe metrics" value={String(totals.quotaSafeMetricCount)} />
        <SummaryCard label="Diagnostic metrics" value={String(totals.diagnosticMetricCount)} />
        <SummaryCard label="Usage health" value={health ? formatEnumLabel(health.state) : "Unknown"} tone={healthAttention ? "warning" : "normal"} />
      </section>

      <HealthPanel
        health={health}
        healthScopeAvailable={Boolean(healthScope)}
        canReconcile={canReconcile}
        canReadDiagnostics={canReadDiagnostics}
        loading={healthLoading}
        onRefresh={() => void loadHealth(false)}
        onReconcile={() => void loadHealth(true)}
      />

      <section className={`rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text as="h2" className="text-lg font-semibold">Usage query</Text>
            <Text intent="muted" size="sm" className="mt-1">
              Filter by Mycel scope, domain_id, metric name, accounting state readiness, quota-safety, and diagnostic inclusion.
            </Text>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={clearFilters} disabled={loading}>
              Clear
            </Button>
            <Button type="button" onClick={() => void loadUsage()} disabled={loading}>
              {loading ? "Applying…" : "Apply filters"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            List mode
            <span className="relative mt-1 block">
              <select
                aria-label="List mode"
                className={selectClasses}
                value={mode}
                onChange={(event) => setMode(event.target.value as UsageListMode)}
                disabled={loading}
              >
                {listModeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label} — {option.hint}</option>
                ))}
              </select>
            </span>
          </label>
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            Parent space_id
            <Input
              className="mt-1"
              value={spaceId}
              placeholder={mode === "USAGE_LIST_MODE_SPACES" ? "Optional" : "Required"}
              onChange={(event) => setSpaceId(event.target.value)}
              disabled={loading}
            />
          </label>
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            Domain inclusion
            <span className="relative mt-1 block">
              <select
                aria-label="Domain inclusion"
                className={selectClasses}
                value={domainInclusion}
                onChange={(event) => setDomainInclusion(event.target.value as DomainInclusionMode)}
                disabled={loading}
              >
                {domainInclusionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </span>
          </label>
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            Metric names
            <Input
              className="mt-1"
              value={metricFilter}
              placeholder="graph.node_count, blob.active_logical_bytes"
              onChange={(event) => setMetricFilter(event.target.value)}
              disabled={loading}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            domain_id filter
            <Input
              className="mt-1"
              value={domainIdFilter}
              placeholder="Optional client-side domain filter"
              onChange={(event) => setDomainIdFilter(event.target.value)}
              disabled={loading}
            />
          </label>
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            Accounting state
            <span className="relative mt-1 block">
              <select
                aria-label="Accounting state"
                className={selectClasses}
                value={accountingStateFilter}
                onChange={(event) => setAccountingStateFilter(event.target.value)}
                disabled={loading}
              >
                <option value="">All states</option>
                <option value="USAGE_ACCOUNTING_STATE_READY">Ready</option>
                <option value="USAGE_ACCOUNTING_STATE_REBUILDING">Rebuilding</option>
                <option value="USAGE_ACCOUNTING_STATE_RECONCILING">Reconciling</option>
                <option value="USAGE_ACCOUNTING_STATE_STALE">Stale</option>
                <option value="USAGE_ACCOUNTING_STATE_DRIFT_DETECTED">Drift detected</option>
                <option value="USAGE_ACCOUNTING_STATE_UNAVAILABLE">Unavailable</option>
              </select>
            </span>
          </label>
          <label className={`block text-sm font-medium ${themeClasses.text.body}`}>
            Quota-safety
            <span className="relative mt-1 block">
              <select
                aria-label="Quota-safety"
                className={selectClasses}
                value={quotaSafetyFilter}
                onChange={(event) => setQuotaSafetyFilter(event.target.value)}
                disabled={loading}
              >
                <option value="">All snapshots</option>
                <option value="complete">Quota-safe complete</option>
                <option value="incomplete">Quota-safe incomplete</option>
              </select>
            </span>
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className={`flex items-start gap-3 rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.sunken} p-3 text-sm ${themeClasses.text.body}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
              checked={includeDiagnosticPhysical && canReadDiagnostics}
              onChange={(event) => setIncludeDiagnosticPhysical(event.target.checked)}
              disabled={loading || !canReadDiagnostics}
            />
            <span>
              <span className="block font-medium">Include diagnostic physical observations</span>
              <span className={`block ${themeClasses.text.muted}`}>
                Requires usage.diagnostic.read. Diagnostic metrics are labeled non-quota-safe and are never shown as hard-limit eligible.
              </span>
            </span>
          </label>
          <label className={`flex items-start gap-3 rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.sunken} p-3 text-sm ${themeClasses.text.body}`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
              checked={requireQuotaSafe}
              onChange={(event) => setRequireQuotaSafe(event.target.checked)}
              disabled={loading}
            />
            <span>
              <span className="block font-medium">Require quota-safe response</span>
              <span className={`block ${themeClasses.text.muted}`}>
                The daemon may fail closed when counters are rebuilding, reconciling, stale, or drifted.
              </span>
            </span>
          </label>
        </div>
      </section>

      <section className={`overflow-hidden rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated}`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <Text as="h2" className="text-lg font-semibold">Usage snapshots</Text>
            <Text intent="muted" size="sm" className="mt-1">
              Logical quota-safe metrics and diagnostic observations are separated for every returned scope.
            </Text>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copyEvidence("CLI equivalent", buildUsageCliEquivalent(appliedInput))}
          >
            Copy CLI equivalent
          </Button>
        </div>
        {loading ? (
          <Text intent="muted" className="p-5">Loading usage snapshots…</Text>
        ) : filteredSnapshots.length === 0 ? (
          <Text intent="muted" className="p-5">No usage snapshots matched this query.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead>
                <tr>
                  <TableHead>Scope</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Quota-safe logical metrics</TableHead>
                  <TableHead>Diagnostic observations</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSnapshots.map((snapshot, index) => (
                  <UsageSnapshotRow
                    key={`${snapshot.scope?.kind || "scope"}:${snapshot.scope?.spaceId || ""}:${snapshot.scope?.domainId || ""}:${index}`}
                    snapshot={snapshot}
                    selected={selectedSnapshot === snapshot}
                    onInspect={() => void inspectSnapshot(snapshot)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {nextPageToken ? (
          <div className="border-t border-slate-200 p-4 dark:border-slate-800">
            <Button type="button" variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
              {loadingMore ? "Loading more…" : "Load more"}
            </Button>
          </div>
        ) : null}
      </section>

      {selectedSnapshot ? (
        <SnapshotDrilldown
          snapshot={selectedSnapshot}
          loading={drilldownLoading}
          domainInclusion={domainInclusion}
          onCopyJson={() => void copyEvidence("Snapshot JSON", snapshotJson(selectedSnapshot))}
          onCopyCsv={() => void copyEvidence("Metric CSV", metricsCsv(selectedSnapshot))}
          onCopyCli={() => void copyEvidence("CLI equivalent", buildSnapshotCliEquivalent(selectedSnapshot, domainInclusion))}
        />
      ) : null}
    </div>
  );
}

function HealthPanel({
  health,
  healthScopeAvailable,
  canReconcile,
  canReadDiagnostics,
  loading,
  onRefresh,
  onReconcile,
}: {
  health: UsageAccountingHealthInfo | null;
  healthScopeAvailable: boolean;
  canReconcile: boolean;
  canReadDiagnostics: boolean;
  loading: boolean;
  onRefresh: () => void;
  onReconcile: () => void;
}) {
  return (
    <section className={`rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h2" className="text-lg font-semibold">Usage accounting health</Text>
          <Text intent="muted" size="sm" className="mt-1 max-w-3xl">
            Readiness controls whether quota-safe reads and hard-limit admission can trust materialized counters.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onRefresh} disabled={loading || !healthScopeAvailable}>
            {loading ? "Checking…" : "Refresh health"}
          </Button>
          <Button type="button" variant="secondary" onClick={onReconcile} disabled={loading || !canReconcile || !healthScopeAvailable}>
            Run reconciliation health check
          </Button>
        </div>
      </div>

      {!healthScopeAvailable ? (
        <Text intent="muted" size="sm" className="mt-3">
          Usage accounting health is scope-specific. Select a usage snapshot or enter a parent space_id before refreshing health.
        </Text>
      ) : null}
      {!canReconcile ? (
        <Text intent="muted" size="sm" className="mt-3">
          Reconciliation evidence requires usage.reconcile. The action is explicit because include_reconciliation=true may persist readiness transitions.
        </Text>
      ) : (
        <Text intent="muted" size="sm" className="mt-3">
          Reconciliation checks are not passive reads: include_reconciliation=true may persist readiness transitions.
        </Text>
      )}
      {!canReadDiagnostics ? (
        <Text intent="muted" size="sm" className="mt-1">
          Diagnostic collector evidence requires usage.diagnostic.read.
        </Text>
      ) : null}

      {health ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.sunken} p-4`}>
            <div className="flex items-center justify-between gap-3">
              <Text className="font-medium">Overall state</Text>
              <EnumBadge value={health.state} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm">
              <InfoRow label="Quota-safe ready" value={health.quotaSafeReady ? "Yes" : "No"} />
              <InfoRow label="Rebuilding scopes" value={health.rebuildingScopeCount.toLocaleString()} />
              <InfoRow label="Stale scopes" value={health.staleScopeCount.toLocaleString()} />
              <InfoRow label="Drifted scopes" value={health.driftScopeCount.toLocaleString()} />
              <InfoRow label="Diagnostic collectors unavailable" value={health.diagnosticCollectorUnavailableCount.toLocaleString()} />
              <InfoRow label="Observed" value={formatTimestamp(health.observedAt)} />
            </dl>
            {stateNeedsFailClosedCopy(health.state) || !health.quotaSafeReady ? (
              <Alert variant="warning" className="mt-4">
                Quota-safe reads and hard-limit admission may fail closed while accounting is rebuilding, reconciling, drifted, or unavailable.
              </Alert>
            ) : null}
          </div>
          <div className="space-y-3">
            <StatusList title="Blockers" statuses={health.blockers} empty="No usage accounting blockers." />
            <StatusList title="Warnings" statuses={health.warnings} empty="No usage accounting warnings." />
          </div>
        </div>
      ) : (
        <Text intent="muted" className="mt-5">Usage accounting health has not been loaded yet.</Text>
      )}
    </section>
  );
}

function UsageSnapshotRow({
  snapshot,
  selected,
  onInspect,
}: {
  snapshot: UsageSnapshotInfo;
  selected: boolean;
  onInspect: () => void;
}) {
  const groups = metricGroups(snapshot.metrics);
  return (
    <tr className={selected ? "bg-emerald-50/60 dark:bg-emerald-950/20" : undefined}>
      <td className="px-4 py-4 align-top">
        <ScopeCell scope={snapshot.scope} />
      </td>
      <td className="px-4 py-4 align-top">
        <div className="space-y-2">
          <EnumBadge value={snapshot.accountingState} />
          <Text size="xs" intent={snapshot.quotaSafeComplete ? "muted" : "danger"}>
            {snapshot.quotaSafeComplete ? "Quota-safe complete" : "Quota-safe incomplete"}
          </Text>
          <Text size="xs" intent="muted">Observed {formatTimestamp(snapshot.observedAt)}</Text>
        </div>
      </td>
      <td className="max-w-xs px-4 py-4 align-top">
        <MetricList metrics={groups.quotaSafe} empty="No quota-safe logical metrics" />
      </td>
      <td className="max-w-xs px-4 py-4 align-top">
        <MetricList metrics={groups.diagnostic} empty="No diagnostic observations" diagnostic />
      </td>
      <td className="px-4 py-4 align-top">
        <Text size="sm" className="font-medium">{statusSummary(snapshot)}</Text>
        <InlineStatuses statuses={[...snapshot.blockers, ...snapshot.warnings]} />
      </td>
      <td className="px-4 py-4 align-top">
        <Button type="button" variant="secondary" onClick={onInspect}>Inspect</Button>
      </td>
    </tr>
  );
}

function SnapshotDrilldown({
  snapshot,
  loading,
  domainInclusion,
  onCopyJson,
  onCopyCsv,
  onCopyCli,
}: {
  snapshot: UsageSnapshotInfo;
  loading: boolean;
  domainInclusion: DomainInclusionMode | string;
  onCopyJson: () => void;
  onCopyCsv: () => void;
  onCopyCli: () => void;
}) {
  const groups = metricGroups(snapshot.metrics);
  return (
    <section className={`rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
        <div>
          <Text as="h2" className="text-lg font-semibold">Scope drilldown</Text>
          <Text intent="muted" size="sm" className="mt-1">
            All metrics for {scopeLabel(snapshot.scope)} with authority, freshness, and quota-safety evidence.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={onCopyJson}>Copy snapshot JSON</Button>
          <Button type="button" variant="secondary" onClick={onCopyCsv}>Copy rows CSV</Button>
          <Button type="button" variant="secondary" onClick={onCopyCli}>Copy CLI equivalent</Button>
        </div>
      </div>
      {loading ? <Text intent="muted" className="p-5">Refreshing scope snapshot…</Text> : null}
      <div className="grid gap-4 p-5 md:grid-cols-3">
        <SummaryCard label="Quota-safe metrics" value={String(groups.quotaSafe.length)} />
        <SummaryCard label="Diagnostic metrics" value={String(groups.diagnostic.length)} tone={groups.diagnostic.length ? "warning" : "normal"} />
        <SummaryCard label="Domain inclusion" value={formatEnumLabel(String(domainInclusion))} />
      </div>
      <GraphLogicalBytesExplanation metrics={snapshot.metrics} />
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead>
            <tr>
              <TableHead>Metric</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Authority</TableHead>
              <TableHead>Safety</TableHead>
              <TableHead>Freshness</TableHead>
              <TableHead>Labels</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {snapshot.metrics.map((metric) => {
              const insight = usageMetricInsight(metric);
              const logicalGraphBytes = isGraphLogicalBytesMetric(metric);
              return (
                <tr key={`${metric.name}:${metric.metricVersion}`}>
                  <td className="px-4 py-3 align-top">
                    <Text className="font-mono text-sm">{metric.name}</Text>
                    {logicalGraphBytes ? (
                      <span className="mt-1 inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200">Logical graph payload bytes</span>
                    ) : null}
                    {insight ? <Text size="xs" intent="muted" className="mt-1 max-w-md">{insight}</Text> : null}
                    <Text size="xs" intent="muted">version {metric.metricVersion}</Text>
                  </td>
                  <td className="px-4 py-3 align-top font-medium">{formatUsageValue(metric)}</td>
                  <td className="px-4 py-3 align-top"><EnumBadge value={metric.authority} /></td>
                  <td className="px-4 py-3 align-top"><MetricSafety metric={metric} /></td>
                  <td className="px-4 py-3 align-top">
                    <Text size="sm">{formatTimestamp(metric.observedAt)}</Text>
                    <RevisionLabel revisionToken={metric.asOfRevision?.revisionToken} />
                  </td>
                  <td className="px-4 py-3 align-top"><Labels labels={metric.labels} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GraphLogicalBytesExplanation({ metrics }: { metrics: UsageMetricInfo[] }) {
  const hasLogicalGraphBytes = metrics.some(isGraphLogicalBytesMetric);
  const hasPhysicalGraphBytes = metrics.some(isDiagnosticGraphStoreMetric);
  if (!hasLogicalGraphBytes && !hasPhysicalGraphBytes) return null;
  return (
    <div className="px-5 pb-5">
      <Alert variant="info">
        <Text size="sm" className="font-medium">Graph byte metrics are split by safety and authority.</Text>
        <Text size="sm" className="mt-1">
          <span className="font-mono">graph.logical_bytes</span> is quota-safe logical payload content from committed node payload values. <span className="font-mono">diagnostic.local_graph_store_bytes</span> is a non-quota-safe physical observation that may include storage, index, WAL, or filesystem overhead.
        </Text>
      </Alert>
    </div>
  );
}

function SummaryCard({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "warning" }) {
  return (
    <div className={`rounded-2xl border ${tone === "warning" ? "border-amber-300/70 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/30" : `${themeClasses.border.default} ${themeClasses.surface.elevated}`} p-4`}>
      <Text intent="muted" size="sm">{label}</Text>
      <Text className="mt-2 text-2xl font-semibold">{value}</Text>
    </div>
  );
}

function ScopeCell({ scope }: { scope?: UsageScopeInfo | null }) {
  return (
    <div>
      <Text className="font-medium">{formatEnumLabel(scope?.kind || "deployment")}</Text>
      {scope?.spaceId ? <div className="mt-1"><span className={`mr-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>space_id</span><ResourceIdText value={scope.spaceId} /></div> : null}
      {scope?.domainId ? <div className="mt-1"><span className={`mr-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>domain_id</span><ResourceIdText value={scope.domainId} /></div> : null}
    </div>
  );
}

function MetricList({ metrics, empty, diagnostic = false }: { metrics: UsageMetricInfo[]; empty: string; diagnostic?: boolean }) {
  if (metrics.length === 0) return <Text intent="muted" size="sm">{empty}</Text>;
  return (
    <div className="space-y-2">
      {diagnostic ? (
        <Text size="xs" className="font-semibold text-amber-700 dark:text-amber-300">Diagnostic only / non-quota-safe</Text>
      ) : null}
      {metrics.slice(0, 4).map((metric) => {
        const insight = usageMetricInsight(metric);
        const logicalGraphBytes = isGraphLogicalBytesMetric(metric);
        const cardClasses = diagnostic
          ? "border-amber-300/70 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-950/30"
          : logicalGraphBytes
            ? "border-emerald-300/70 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/30"
            : `${themeClasses.border.default} ${themeClasses.surface.sunken}`;
        return (
          <div key={`${metric.name}:${metric.metricVersion}`} className={`rounded-lg border p-2 ${cardClasses}`}>
            <Text className="font-mono text-xs">{metric.name}</Text>
            {logicalGraphBytes ? <Text size="xs" className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">Logical graph payload bytes</Text> : null}
            <Text size="sm" className="mt-1 font-medium">{formatUsageValue(metric)}</Text>
            {insight ? <Text size="xs" intent="muted" className="mt-1">{insight}</Text> : null}
          </div>
        );
      })}
      {metrics.length > 4 ? <Text intent="muted" size="xs">+ {metrics.length - 4} more metrics</Text> : null}
    </div>
  );
}

function MetricSafety({ metric }: { metric: UsageMetricInfo }) {
  if (!metric.quotaSafe) {
    return (
      <div className="space-y-1">
        <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200">Diagnostic only / non-quota-safe</span>
        <Text size="xs" intent="muted">Not hard-limit eligible</Text>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200">Quota-safe</span>
      <Text size="xs" intent="muted">{metric.hardLimitEligible ? "Hard-limit eligible" : "Informational"}</Text>
    </div>
  );
}

function StatusList({ title, statuses, empty }: { title: string; statuses: UsageStatusInfo[]; empty: string }) {
  return (
    <div className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.sunken} p-4`}>
      <Text className="font-medium">{title}</Text>
      {statuses.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-2">{empty}</Text>
      ) : (
        <div className="mt-3 space-y-2">
          {statuses.map((status, index) => (
            <Alert key={`${status.reason}:${status.metricName}:${index}`} variant={statusTone(status)}>
              <Text size="sm" className="font-medium">{status.message || formatEnumLabel(status.reason)}</Text>
              <Text size="xs" className="mt-1">{formatEnumLabel(status.reason)}{status.metricName ? ` · ${status.metricName}` : ""}</Text>
              <Evidence evidence={status.evidence} />
            </Alert>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineStatuses({ statuses }: { statuses: UsageStatusInfo[] }) {
  if (statuses.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      {statuses.slice(0, 2).map((status, index) => (
        <Text key={`${status.reason}:${index}`} size="xs" intent={status.severity === "USAGE_STATUS_SEVERITY_BLOCKER" ? "danger" : "muted"}>
          {formatEnumLabel(status.reason)}{status.metricName ? ` · ${status.metricName}` : ""}
        </Text>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={themeClasses.text.muted}>{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Evidence({ evidence }: { evidence: Record<string, string> }) {
  const entries = Object.entries(evidence || {});
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid gap-1 text-xs">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-2">
          <dt className="font-medium">{key}</dt>
          <dd className="break-all">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Labels({ labels }: { labels: Record<string, string> }) {
  const entries = Object.entries(labels || {});
  if (entries.length === 0) return <Text intent="muted" size="sm">—</Text>;
  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([key, value]) => (
        <span key={key} className={`rounded-md border ${themeClasses.border.default} px-2 py-1 text-xs`}>
          {key}={value}
        </span>
      ))}
    </div>
  );
}

function RevisionLabel({ revisionToken }: { revisionToken?: string }) {
  if (!revisionToken) return null;
  return <Text size="xs" intent="muted">revision {revisionToken}</Text>;
}

function filterSnapshots(
  snapshots: UsageSnapshotInfo[],
  domainIdFilter: string,
  accountingStateFilter: string,
  quotaSafetyFilter: string,
) {
  const domain = domainIdFilter.trim().toLowerCase();
  return snapshots.filter((snapshot) => {
    if (domain && !snapshot.scope?.domainId.toLowerCase().includes(domain)) return false;
    if (accountingStateFilter && snapshot.accountingState !== accountingStateFilter) return false;
    if (quotaSafetyFilter === "complete" && !snapshot.quotaSafeComplete) return false;
    if (quotaSafetyFilter === "incomplete" && snapshot.quotaSafeComplete) return false;
    return true;
  });
}

function summarizeSnapshots(snapshots: UsageSnapshotInfo[]) {
  return snapshots.reduce(
    (summary, snapshot) => {
      const groups = metricGroups(snapshot.metrics);
      summary.scopeCount += 1;
      summary.quotaSafeMetricCount += groups.quotaSafe.length;
      summary.diagnosticMetricCount += groups.diagnostic.length;
      return summary;
    },
    { scopeCount: 0, quotaSafeMetricCount: 0, diagnosticMetricCount: 0 },
  );
}

function scopeInput(scope: UsageScopeInfo) {
  if (scope.kind === "domain") {
    return { kind: "domain" as const, spaceId: scope.spaceId, domainId: scope.domainId };
  }
  return { kind: "space" as const, spaceId: scope.spaceId };
}

function formatTimestamp(value?: string | null): string {
  const raw = String(value || "").trim();
  if (!raw) return "—";
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const millis = Number(raw) * 1000;
    if (Number.isFinite(millis)) return new Date(millis).toISOString();
  }
  return raw;
}

async function writeClipboard(value: string) {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
  await navigator.clipboard.writeText(value);
}

const selectClasses = `block w-full appearance-none rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 pr-10 text-sm ${themeClasses.text.parts.primaryLight} transition focus-visible:border-sky-500 ${themeClasses.focus.ring} disabled:opacity-60 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`;
