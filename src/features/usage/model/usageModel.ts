import type {
  DomainInclusionMode,
  ListUsageInput,
  UsageAccountingHealthInfo,
  UsageMetricInfo,
  UsageScopeInfo,
  UsageSnapshotInfo,
  UsageStatusInfo,
} from "../../../types/usage";

export type MetricGroups = {
  quotaSafe: UsageMetricInfo[];
  diagnostic: UsageMetricInfo[];
};

const diagnosticMetricPattern = /(^|[._-])(diagnostic|physical|pvc|index|vector)([._-]|$)/i;
const graphLogicalBytesMetricName = "graph.logical_bytes";
const diagnosticLocalGraphStoreMetricName = "diagnostic.local_graph_store_bytes";

export function metricGroups(metrics: UsageMetricInfo[]): MetricGroups {
  return metrics.reduce<MetricGroups>(
    (groups, metric) => {
      if (isDiagnosticMetric(metric)) groups.diagnostic.push(metric);
      else groups.quotaSafe.push(metric);
      return groups;
    },
    { quotaSafe: [], diagnostic: [] },
  );
}

export function isDiagnosticMetric(metric: UsageMetricInfo): boolean {
  return (
    !metric.quotaSafe ||
    metric.authority === "USAGE_AUTHORITY_OBSERVED_APPROXIMATE" ||
    diagnosticMetricPattern.test(metric.name)
  );
}

export function isGraphLogicalBytesMetric(metric: UsageMetricInfo): boolean {
  return metric.name === graphLogicalBytesMetricName;
}

export function isDiagnosticGraphStoreMetric(metric: UsageMetricInfo): boolean {
  return metric.name === diagnosticLocalGraphStoreMetricName;
}

export function usageMetricInsight(metric: UsageMetricInfo): string | null {
  if (isGraphLogicalBytesMetric(metric)) {
    return "Logical node payload content bytes. Excludes labels, properties, metadata, edge payloads, blob bytes, and physical graph store overhead.";
  }
  if (isDiagnosticGraphStoreMetric(metric)) {
    return "Diagnostic physical graph store observation. Not quota-safe and may include storage, index, WAL, or filesystem overhead.";
  }
  return null;
}

export function stateNeedsFailClosedCopy(state?: string | null): boolean {
  return [
    "USAGE_ACCOUNTING_STATE_REBUILDING",
    "USAGE_ACCOUNTING_STATE_RECONCILING",
    "USAGE_ACCOUNTING_STATE_DRIFT_DETECTED",
    "USAGE_ACCOUNTING_STATE_UNAVAILABLE",
  ].includes(String(state || ""));
}

export function healthNeedsAttention(health?: UsageAccountingHealthInfo | null): boolean {
  if (!health) return false;
  return (
    !health.quotaSafeReady ||
    health.blockers.length > 0 ||
    stateNeedsFailClosedCopy(health.state)
  );
}

export function scopeLabel(scope?: UsageScopeInfo | null): string {
  if (!scope) return "Deployment";
  if (scope.kind === "domain") {
    return `${scope.spaceId || "—"} / ${scope.domainId || "—"}`;
  }
  if (scope.kind === "space") return scope.spaceId || "—";
  return "Unknown scope";
}

export function scopeCliArgs(scope?: UsageScopeInfo | null): string[] {
  if (!scope) return [];
  if (scope.kind === "domain") {
    return ["--space", shellQuote(scope.spaceId), "--domain", shellQuote(scope.domainId)];
  }
  if (scope.kind === "space") return ["--space", shellQuote(scope.spaceId)];
  return [];
}

export function formatUsageValue(metric: UsageMetricInfo): string {
  if (metric.unit === "USAGE_UNIT_BYTES") return formatBytes(metric.value);
  if (metric.unit === "USAGE_UNIT_COUNT") return metric.value.toLocaleString();
  return metric.value.toLocaleString();
}

export function formatBytes(value: number): string {
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  let amount = Number.isFinite(value) ? value : 0;
  let unitIndex = 0;
  while (Math.abs(amount) >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  if (unitIndex === 0) return `${Math.round(amount).toLocaleString()} ${units[unitIndex]}`;
  return `${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${units[unitIndex]}`;
}

export function statusSummary(snapshot: UsageSnapshotInfo): string {
  const parts: string[] = [];
  if (snapshot.blockers.length) parts.push(`${snapshot.blockers.length} blocker${snapshot.blockers.length === 1 ? "" : "s"}`);
  if (snapshot.warnings.length) parts.push(`${snapshot.warnings.length} warning${snapshot.warnings.length === 1 ? "" : "s"}`);
  return parts.length ? parts.join(", ") : "No blockers or warnings";
}

export function statusTone(status: UsageStatusInfo): "error" | "warning" | "info" {
  if (status.severity === "USAGE_STATUS_SEVERITY_BLOCKER") return "error";
  if (status.severity === "USAGE_STATUS_SEVERITY_WARNING") return "warning";
  return "info";
}

export function parseMetricNames(value: string): string[] {
  return value
    .split(/[\n,]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function snapshotJson(snapshot: UsageSnapshotInfo): string {
  return JSON.stringify(snapshot, null, 2);
}

export function metricsCsv(snapshot: UsageSnapshotInfo): string {
  const header = [
    "scope_kind",
    "space_id",
    "domain_id",
    "metric_name",
    "metric_version",
    "value",
    "unit",
    "authority",
    "quota_safe",
    "hard_limit_eligible",
    "observed_at",
  ];
  const scope = snapshot.scope;
  return [
    header.join(","),
    ...snapshot.metrics.map((metric) =>
      [
        scope?.kind || "",
        scope?.spaceId || "",
        scope?.domainId || "",
        metric.name,
        String(metric.metricVersion),
        String(metric.value),
        metric.unit,
        metric.authority,
        String(metric.quotaSafe),
        String(metric.hardLimitEligible),
        metric.observedAt,
      ].map(csvEscape).join(","),
    ),
  ].join("\n");
}

export function buildUsageCliEquivalent(input: ListUsageInput): string {
  const parts = ["mycel", "admin", "usage", "list"];
  if (input.mode) parts.push("--mode", shellQuote(String(input.mode)));
  if (input.parent?.spaceId) parts.push("--space", shellQuote(input.parent.spaceId));
  if (input.parent?.domainId) parts.push("--domain", shellQuote(input.parent.domainId));
  if (input.domainInclusion) parts.push("--domain-inclusion", shellQuote(String(input.domainInclusion)));
  if (input.includeDiagnosticPhysical) parts.push("--include-diagnostic-physical");
  if (input.requireQuotaSafe) parts.push("--require-quota-safe");
  for (const metric of input.metricNames || []) parts.push("--metric", shellQuote(metric));
  return parts.join(" ");
}

export function buildSnapshotCliEquivalent(snapshot: UsageSnapshotInfo, domainInclusion: DomainInclusionMode | string): string {
  const parts = ["mycel", "admin", "usage", "get", ...scopeCliArgs(snapshot.scope)];
  if (domainInclusion) parts.push("--domain-inclusion", shellQuote(String(domainInclusion)));
  return parts.join(" ");
}

function formatCsvValue(value: string): string {
  return value.replace(/"/g, '""');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${formatCsvValue(value)}"`;
  return value;
}

function shellQuote(value: string): string {
  if (/^[a-zA-Z0-9._:/=-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}
