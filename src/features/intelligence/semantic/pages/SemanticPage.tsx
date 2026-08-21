import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, ErrorBox, H2, Select, Text } from "../../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../../console";
import {
  analyzeSemanticDirtyWork as defaultAnalyzeSemanticDirtyWork,
  backfillSemanticIndex as defaultBackfillSemanticIndex,
  cancelSemanticMaintenanceWork as defaultCancelSemanticMaintenanceWork,
  getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus,
  listDomains as defaultListDomains,
  listSemanticIndexes as defaultListSemanticIndexes,
  listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork,
  listSpaces as defaultListSpaces,
  processSemanticDirtyWork as defaultProcessSemanticDirtyWork,
  retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork,
  summarizeInferenceUsage as defaultSummarizeInferenceUsage,
} from "../../../../services/adminService";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../../types/domains";
import type { SummarizeUsageInput, SummarizeUsageResponse } from "../../../../types/inference";
import type { ListSemanticIndexesInput, ListSemanticIndexesResponse, SemanticIndexInfo } from "../../../../types/semantic";
import type {
  AnalyzeSemanticDirtyWorkInput,
  AnalyzeSemanticDirtyWorkResponse,
  BackfillSemanticIndexInput,
  BackfillSemanticIndexResponse,
  GetSemanticMaintenanceStatusInput,
  ListSemanticMaintenanceWorkInput,
  ListSemanticMaintenanceWorkResponse,
  ProcessSemanticDirtyWorkInput,
  ProcessSemanticDirtyWorkResponse,
  SemanticMaintenanceStatusInfo,
  SemanticMaintenanceWorkActionInput,
  SemanticMaintenanceWorkItemInfo,
} from "../../../../types/semanticMaintenance";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../../types/spaces";

type SemanticRow = {
  space: SpaceInfo;
  domain?: DomainInfo;
  index: SemanticIndexInfo;
};

type SpaceMaintenance = {
  status: SemanticMaintenanceStatusInfo | null;
  work: SemanticMaintenanceWorkItemInfo[];
  error: string;
};

type UsageBySemanticIndex = Record<string, { requestCount: number; failedCount: number; deniedCount: number; inputTokens: number; outputTokens: number; totalTokens: number }>;

export type SemanticPageProps = {
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listSemanticIndexesService?: (input: ListSemanticIndexesInput) => Promise<ListSemanticIndexesResponse>;
  getSemanticMaintenanceStatusService?: (input: GetSemanticMaintenanceStatusInput) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (input: ListSemanticMaintenanceWorkInput) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (input: AnalyzeSemanticDirtyWorkInput) => Promise<AnalyzeSemanticDirtyWorkResponse>;
  processSemanticDirtyWorkService?: (input: ProcessSemanticDirtyWorkInput) => Promise<ProcessSemanticDirtyWorkResponse>;
  backfillSemanticIndexService?: (input: BackfillSemanticIndexInput) => Promise<BackfillSemanticIndexResponse>;
  summarizeInferenceUsageService?: (input: SummarizeUsageInput) => Promise<SummarizeUsageResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function SemanticPage({
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  listSemanticIndexesService = defaultListSemanticIndexes,
  getSemanticMaintenanceStatusService = defaultGetSemanticMaintenanceStatus,
  listSemanticMaintenanceWorkService = defaultListSemanticMaintenanceWork,
  retrySemanticMaintenanceWorkService = defaultRetrySemanticMaintenanceWork,
  cancelSemanticMaintenanceWorkService = defaultCancelSemanticMaintenanceWork,
  analyzeSemanticDirtyWorkService = defaultAnalyzeSemanticDirtyWork,
  processSemanticDirtyWorkService = defaultProcessSemanticDirtyWork,
  backfillSemanticIndexService = defaultBackfillSemanticIndex,
  summarizeInferenceUsageService = defaultSummarizeInferenceUsage,
  principalContext,
}: SemanticPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [rows, setRows] = useState<SemanticRow[]>([]);
  const [maintenanceBySpace, setMaintenanceBySpace] = useState<Record<string, SpaceMaintenance>>({});
  const [usageByIndex, setUsageByIndex] = useState<UsageBySemanticIndex>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [detail, setDetail] = useState<{ title: string; data: unknown } | null>(null);

  const selectedSpaceId = searchParams.get("spaceId") || "";
  const selectedDomainId = searchParams.get("domainId") || "";
  const stateFilter = searchParams.get("state") || "";
  const includeDisabled = searchParams.get("includeDisabled") === "true";
  const canManage = canUseCapability(principalContext, "semantic.manage");

  const setFilter = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "spaceId") next.delete("domainId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setUsageError("");
    try {
      const spaceResponse = await listSpacesService({ pageSize: 100, includeArchived: false });
      setSpaces(spaceResponse.spaces);
      const visibleSpaces = selectedSpaceId ? spaceResponse.spaces.filter((space) => space.spaceId === selectedSpaceId) : spaceResponse.spaces;

      const domainResults = await Promise.all(spaceResponse.spaces.map(async (space) => {
        const response = await listDomainsService({ spaceId: space.spaceId, pageSize: 100, includeSystem: false });
        return response.domains;
      }));
      const allDomains = domainResults.flat();
      setDomains(allDomains);
      const domainById = new Map(allDomains.map((domain) => [domain.domainId, domain]));

      const rowResults = await Promise.all(visibleSpaces.map(async (space) => {
        const response = await listSemanticIndexesService({ spaceId: space.spaceId, domainId: selectedDomainId || undefined, pageSize: 100, includeDisabled });
        return response.indexes.map((index) => ({ space, domain: domainById.get(index.domainId), index }));
      }));
      setRows(rowResults.flat().sort(compareSemanticRows));

      const maintenancePairs = await Promise.all(visibleSpaces.map(async (space) => {
        try {
          const [status, work] = await Promise.all([
            getSemanticMaintenanceStatusService({ spaceId: space.spaceId }),
            listSemanticMaintenanceWorkService({ spaceId: space.spaceId, limit: 100 }),
          ]);
          return [space.spaceId, { status, work: work.items, error: "" }] as const;
        } catch (err) {
          return [space.spaceId, { status: null, work: [], error: errorMessage(err, "Failed to load semantic maintenance") }] as const;
        }
      }));
      setMaintenanceBySpace(Object.fromEntries(maintenancePairs));

      const usage: UsageBySemanticIndex = {};
      await Promise.all(visibleSpaces.map(async (space) => {
        try {
          const summary = await summarizeInferenceUsageService({ spaceId: space.spaceId, groupBy: ["semantic_index_id", "domain_id"] });
          for (const item of summary.summaries) {
            const semanticIndexId = groupValue(item.group, "semantic_index_id", "semanticIndexId", "semanticIndex");
            const domainId = groupValue(item.group, "domain_id", "domainId", "domain");
            if (!semanticIndexId || (selectedDomainId && domainId !== selectedDomainId)) continue;
            const current = usage[semanticIndexId] ?? { requestCount: 0, failedCount: 0, deniedCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
            usage[semanticIndexId] = {
              requestCount: current.requestCount + item.requestCount,
              failedCount: current.failedCount + item.failedCount,
              deniedCount: current.deniedCount + item.deniedCount,
              inputTokens: current.inputTokens + item.inputTokens,
              outputTokens: current.outputTokens + item.outputTokens,
              totalTokens: current.totalTokens + item.totalTokens,
            };
          }
        } catch (err) {
          setUsageError(errorMessage(err, "Failed to load semantic usage summaries"));
        }
      }));
      setUsageByIndex(usage);
    } catch (err) {
      setError(errorMessage(err, "Failed to load semantic intelligence"));
    } finally {
      setLoading(false);
    }
  }, [getSemanticMaintenanceStatusService, includeDisabled, listDomainsService, listSemanticIndexesService, listSemanticMaintenanceWorkService, listSpacesService, selectedDomainId, selectedSpaceId, summarizeInferenceUsageService]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDomains = useMemo(() => domains.filter((domain) => !selectedSpaceId || domain.spaceId === selectedSpaceId), [domains, selectedSpaceId]);
  const filteredRows = useMemo(() => rows.filter((row) => !stateFilter || row.index.state === stateFilter), [rows, stateFilter]);
  const maintenanceTotals = useMemo(() => Object.values(maintenanceBySpace).reduce((total, item) => ({
    pending: total.pending + (item.status?.queueDepthPending ?? 0),
    running: total.running + (item.status?.queueDepthRunning ?? 0),
    failed: total.failed + (item.status?.queueDepthFailedRetryable ?? 0) + (item.status?.queueDepthFailedPermanent ?? 0),
  }), { pending: 0, running: 0, failed: 0 }), [maintenanceBySpace]);
  const totalUsage = useMemo(() => filteredRows.reduce((sum, row) => sum + (usageByIndex[row.index.semanticIndexId]?.totalTokens ?? 0), 0), [filteredRows, usageByIndex]);

  async function runSpaceAction(kind: "analyze" | "process", spaceId: string) {
    setActionLoading(true);
    setActionResult("");
    setError("");
    try {
      if (kind === "analyze") {
        const result = await analyzeSemanticDirtyWorkService({ spaceId, limit: 100 });
        setActionResult(`Analyzed dirty semantic work: ${result.processedEvents} events, ${result.enqueuedItems} items enqueued.`);
      } else {
        const result = await processSemanticDirtyWorkService({ spaceId, limit: 100 });
        setActionResult(`Processed semantic work: ${result.completedItems} completed, ${result.failedItems} failed.`);
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, `Failed to ${kind} semantic work`));
    } finally {
      setActionLoading(false);
    }
  }

  async function backfill(row: SemanticRow) {
    if (!window.confirm(`Backfill semantic index ${row.index.key || row.index.semanticIndexId}?`)) return;
    setActionLoading(true);
    setActionResult("");
    setError("");
    try {
      const result = await backfillSemanticIndexService({ spaceId: row.space.spaceId, semanticIndexId: row.index.semanticIndexId, limit: 100, continueOnError: true });
      setActionResult(`Backfill selected ${result.selectedCount} nodes, generated ${result.generatedCount}, skipped ${result.skippedCount}, failed ${result.failedCount}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to backfill semantic index"));
    } finally {
      setActionLoading(false);
    }
  }

  async function updateWork(kind: "retry" | "cancel", item: SemanticMaintenanceWorkItemInfo) {
    setActionLoading(true);
    setActionResult("");
    setError("");
    try {
      if (kind === "retry") await retrySemanticMaintenanceWorkService({ spaceId: item.spaceId, workItemId: item.workItemId });
      else await cancelSemanticMaintenanceWorkService({ spaceId: item.spaceId, workItemId: item.workItemId });
      setActionResult(`${kind === "retry" ? "Retried" : "Canceled"} work item ${item.workItemId}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err, `Failed to ${kind} semantic work item`));
    } finally {
      setActionLoading(false);
    }
  }

  const selectedMaintenanceSpaces = selectedSpaceId ? spaces.filter((space) => space.spaceId === selectedSpaceId) : spaces;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">Intelligence</Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Semantic generation</H2>
          <Text intent="muted" className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Review semantic generation rules and indexes, watch maintenance backlogs, run explicit maintenance actions, and track token usage.
          </Text>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {usageError && <ErrorBox>{usageError}</ErrorBox>}
      {actionResult && <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">{actionResult}</div>}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Semantic indexes" value={filteredRows.length} />
        <SummaryCard label="Pending work" value={maintenanceTotals.pending} />
        <SummaryCard label="Failed work" value={maintenanceTotals.failed} />
        <SummaryCard label="Usage tokens" value={totalUsage} />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:grid-cols-4">
        <Select label="Space" value={selectedSpaceId} onChange={(value) => setFilter("spaceId", value)} options={spaces.map((space) => ({ value: space.spaceId, label: space.name || space.spaceId }))} placeholder="All spaces" disabled={loading} />
        <Select label="Domain" value={selectedDomainId} onChange={(value) => setFilter("domainId", value)} options={filteredDomains.map((domain) => ({ value: domain.domainId, label: `${domain.name || domain.key} (${domain.spaceId})` }))} placeholder="All domains" disabled={loading || filteredDomains.length === 0} />
        <Select label="State" value={stateFilter} onChange={(value) => setFilter("state", value)} options={["SEMANTIC_INDEX_STATE_ACTIVE", "SEMANTIC_INDEX_STATE_BUILDING", "SEMANTIC_INDEX_STATE_STALE", "SEMANTIC_INDEX_STATE_DISABLED", "SEMANTIC_INDEX_STATE_ERROR"].map((state) => ({ value: state, label: state.replace("SEMANTIC_INDEX_STATE_", "") }))} placeholder="All states" disabled={loading} />
        <label className="flex items-end gap-2 text-sm font-medium text-slate-900 dark:text-slate-100"><input type="checkbox" checked={includeDisabled} onChange={(event) => setFilter("includeDisabled", event.target.checked ? "true" : "")} disabled={loading} /> Include disabled</label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Semantic rule/index</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Model/vector store</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>Loading semantic indexes…</td></tr> : filteredRows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>No semantic indexes found.</td></tr> : filteredRows.map((row) => {
              const usage = usageByIndex[row.index.semanticIndexId];
              return <tr key={row.index.semanticIndexId} className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40"><td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="mt-1 text-slate-600 dark:text-slate-400">{row.domain?.name || row.domain?.key || row.index.domainId}</div><div className="mt-1 font-mono text-xs text-slate-500">{row.index.domainId}</div></td><td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.index.displayName || row.index.key}</div><div className="mt-1 text-slate-600 dark:text-slate-400">{row.index.description || "No description"}</div><div className="mt-1 font-mono text-xs text-slate-500">{row.index.semanticIndexId}</div></td><td className="px-4 py-3"><StatusPill value={row.index.state} /></td><td className="px-4 py-3"><div>{row.index.modelLabel || "—"}</div><div className="text-xs text-slate-500">{row.index.vectorStoreLabel || "No vector store"}</div></td><td className="px-4 py-3">{usage ? <div><div className="font-medium">{usage.totalTokens.toLocaleString()} tokens</div><div className="text-xs text-slate-500">{usage.requestCount} requests · {usage.failedCount + usage.deniedCount} failed/denied</div></div> : <span className="text-slate-500 dark:text-slate-400">No usage reported</span>}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => setDetail({ title: row.index.displayName || row.index.key, data: row.index })}>Details</Button>{canManage ? <Button variant="secondary" disabled={actionLoading} onClick={() => void backfill(row)}>Backfill</Button> : <span className="self-center text-slate-500 dark:text-slate-400">Read-only</span>}</div></td></tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
        <div><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic maintenance</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Maintenance is explicit and scoped to a space. Creation of new semantic generation definitions remains available through daemon/API surfaces until a dedicated console editor is added.</Text></div>
        {selectedMaintenanceSpaces.length === 0 ? <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Select or create a space to inspect semantic maintenance.</Text> : selectedMaintenanceSpaces.map((space) => {
          const maintenance = maintenanceBySpace[space.spaceId];
          return <div key={space.spaceId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"><div className="flex flex-wrap items-start justify-between gap-3"><div><Text as="h4" className="font-medium text-slate-900 dark:text-slate-100">{space.name || space.spaceId}</Text>{maintenance?.status && <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Pending {maintenance.status.queueDepthPending} · Running {maintenance.status.queueDepthRunning} · Failed {maintenance.status.queueDepthFailedRetryable + maintenance.status.queueDepthFailedPermanent}</Text>}{maintenance?.error && <Text intent="danger" size="sm" className="mt-1">{maintenance.error}</Text>}</div>{canManage && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={actionLoading} onClick={() => void runSpaceAction("analyze", space.spaceId)}>Analyze dirty work</Button><Button variant="secondary" disabled={actionLoading} onClick={() => void runSpaceAction("process", space.spaceId)}>Process queue</Button></div>}</div><MaintenanceWorkTable items={maintenance?.work ?? []} canManage={canManage} loading={actionLoading} onRetry={(item) => void updateWork("retry", item)} onCancel={(item) => void updateWork("cancel", item)} /></div>;
        })}
      </div>

      {detail && <DetailDrawer title={detail.title} data={detail.data} onClose={() => setDetail(null)} />}
    </section>
  );
}

function compareSemanticRows(a: SemanticRow, b: SemanticRow) {
  return `${a.space.name || a.space.spaceId}:${a.domain?.name || a.domain?.key || a.index.domainId}:${a.index.displayName || a.index.key}`.localeCompare(`${b.space.name || b.space.spaceId}:${b.domain?.name || b.domain?.key || b.index.domainId}:${b.index.displayName || b.index.key}`);
}

function groupValue(group: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (group[key]) return group[key];
  }
  return "";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</div></div>;
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.replace("SEMANTIC_INDEX_STATE_", "");
  const active = normalized === "ACTIVE";
  const error = normalized === "ERROR";
  const classes = active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : error ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return <span className={`rounded-full px-2 py-1 text-xs ${classes}`}>{normalized || "UNKNOWN"}</span>;
}

function MaintenanceWorkTable({ items, canManage, loading, onRetry, onCancel }: { items: SemanticMaintenanceWorkItemInfo[]; canManage: boolean; loading: boolean; onRetry: (item: SemanticMaintenanceWorkItemInfo) => void; onCancel: (item: SemanticMaintenanceWorkItemInfo) => void }) {
  if (items.length === 0) return <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No maintenance work items found.</Text>;
  return <div className="mt-4 overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-3 py-2">Action</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Index</th><th className="px-3 py-2">Attempts</th><th className="px-3 py-2">Error</th><th className="px-3 py-2">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{items.map((item) => <tr key={item.workItemId}><td className="px-3 py-2">{item.action || "—"}</td><td className="px-3 py-2">{item.status || "—"}</td><td className="px-3 py-2 font-mono text-xs">{item.semanticIndexId || "—"}</td><td className="px-3 py-2">{item.attemptCount}</td><td className="max-w-md truncate px-3 py-2" title={item.lastErrorMessageSanitized}>{item.lastErrorCategory || item.lastErrorMessageSanitized || "—"}</td><td className="px-3 py-2">{canManage ? <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={loading} onClick={() => onRetry(item)}>Retry</Button><Button variant="secondary" disabled={loading} onClick={() => onCancel(item)}>Cancel</Button></div> : <span className="text-slate-500 dark:text-slate-400">Read-only</span>}</td></tr>)}</tbody></table></div>;
}

function DetailDrawer({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60"><aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{title}</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Semantic rule/index diagnostic payload.</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div><pre className="mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre></aside></div>;
}
