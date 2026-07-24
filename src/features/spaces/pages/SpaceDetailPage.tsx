import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { analyzeSemanticDirtyWork as defaultAnalyzeSemanticDirtyWork, backfillSemanticIndex as defaultBackfillSemanticIndex, cancelSemanticMaintenanceWork as defaultCancelSemanticMaintenanceWork, clientQueryLogin, clientQueryLogout, executeGql, getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus, getSpace as defaultGetSpace, listDomains as defaultListDomains, listSemanticIndexes as defaultListSemanticIndexes, listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork, listTemplates as defaultListTemplates, lookupSpaceRoute as defaultLookupSpaceRoute, processSemanticDirtyWork as defaultProcessSemanticDirtyWork, retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork } from "../../../services/adminService";
import type { ClientQuerySessionInfo } from "../../../types/clientQuery";
import type { LookupSpaceRouteInput, LookupSpaceRouteResult } from "../../../types/cluster";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../types/domains";
import type { ListSemanticIndexesInput, ListSemanticIndexesResponse, SemanticIndexInfo } from "../../../types/semantic";
import type { AnalyzeSemanticDirtyWorkInput, BackfillSemanticIndexInput, GetSemanticMaintenanceStatusInput, ListSemanticMaintenanceWorkInput, ListSemanticMaintenanceWorkResponse, ProcessSemanticDirtyWorkInput, SemanticMaintenanceStatusInfo, SemanticMaintenanceWorkActionInput, SemanticMaintenanceWorkItemInfo } from "../../../types/semanticMaintenance";
import type { SpaceInfo } from "../../../types/spaces";
import type { ListTemplatesInput, ListTemplatesResponse, TemplateInfo } from "../../../types/templates";
import { SpaceStateBadge } from "../components/SpaceStateBadge";

export type SpaceDetailPageProps = {
  getSpaceService?: (spaceId: string) => Promise<SpaceInfo>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listSemanticIndexesService?: (input: ListSemanticIndexesInput) => Promise<ListSemanticIndexesResponse>;
  listTemplatesService?: (input: ListTemplatesInput) => Promise<ListTemplatesResponse>;
  getSemanticMaintenanceStatusService?: (input: GetSemanticMaintenanceStatusInput) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (input: ListSemanticMaintenanceWorkInput) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (input: AnalyzeSemanticDirtyWorkInput) => Promise<unknown>;
  processSemanticDirtyWorkService?: (input: ProcessSemanticDirtyWorkInput) => Promise<unknown>;
  backfillSemanticIndexService?: (input: BackfillSemanticIndexInput) => Promise<unknown>;
  lookupSpaceRouteService?: (input: LookupSpaceRouteInput) => Promise<LookupSpaceRouteResult>;
};

export function SpaceDetailPage({ getSpaceService = defaultGetSpace, listDomainsService = defaultListDomains, listSemanticIndexesService = defaultListSemanticIndexes, listTemplatesService = defaultListTemplates, getSemanticMaintenanceStatusService = defaultGetSemanticMaintenanceStatus, listSemanticMaintenanceWorkService = defaultListSemanticMaintenanceWork, retrySemanticMaintenanceWorkService = defaultRetrySemanticMaintenanceWork, cancelSemanticMaintenanceWorkService = defaultCancelSemanticMaintenanceWork, analyzeSemanticDirtyWorkService = defaultAnalyzeSemanticDirtyWork, processSemanticDirtyWorkService = defaultProcessSemanticDirtyWork, backfillSemanticIndexService = defaultBackfillSemanticIndex, lookupSpaceRouteService = defaultLookupSpaceRoute }: SpaceDetailPageProps) {
  const { spaceId = "" } = useParams();
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsLoadingMore, setDomainsLoadingMore] = useState(false);
  const [domainsError, setDomainsError] = useState("");
  const [domainsNextPageToken, setDomainsNextPageToken] = useState("");
  const [includeSystemDomains, setIncludeSystemDomains] = useState(false);
  const [semanticIndexes, setSemanticIndexes] = useState<SemanticIndexInfo[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(true);
  const [semanticError, setSemanticError] = useState("");
  const [includeDisabledIndexes, setIncludeDisabledIndexes] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState<SemanticMaintenanceStatusInfo | null>(null);
  const [maintenanceWork, setMaintenanceWork] = useState<SemanticMaintenanceWorkItemInfo[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceWorkStatus, setMaintenanceWorkStatus] = useState("");
  const [confirmMaintenanceAction, setConfirmMaintenanceAction] = useState<{ kind: "retry" | "cancel"; item: SemanticMaintenanceWorkItemInfo } | null>(null);
  const [maintenanceActionLoading, setMaintenanceActionLoading] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "domains" | "semantic" | "query" | "templates">("general");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState("");
  const [templatesNextPageToken, setTemplatesNextPageToken] = useState("");
  const [includeArchivedTemplates, setIncludeArchivedTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);
  const [spaceRoute, setSpaceRoute] = useState<LookupSpaceRouteResult | null>(null);
  const [spaceRouteError, setSpaceRouteError] = useState("");

  const loadDomains = useCallback(
    async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
      if (!spaceId) return;
      setDomainsError("");
      if (append) setDomainsLoadingMore(true);
      else setDomainsLoading(true);

      try {
        const response = await listDomainsService({
          spaceId,
          pageSize: 100,
          pageToken,
          includeSystem: includeSystemDomains,
        });
        setDomains((current) => (append ? [...current, ...response.domains] : response.domains));
        setDomainsNextPageToken(response.nextPageToken);
      } catch (err) {
        setDomainsError(err instanceof Error ? err.message : "Failed to load domains");
      } finally {
        if (append) setDomainsLoadingMore(false);
        else setDomainsLoading(false);
      }
    },
    [includeSystemDomains, listDomainsService, spaceId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSpace() {
      if (!spaceId) {
        setError("Space ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await getSpaceService(spaceId);
        if (!cancelled) setSpace(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load space");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSpace();

    return () => {
      cancelled = true;
    };
  }, [getSpaceService, spaceId]);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoute() {
      if (!spaceId) return;
      setSpaceRouteError("");
      try {
        const route = await lookupSpaceRouteService({ spaceId });
        if (!cancelled) setSpaceRoute(route);
      } catch (err) {
        if (!cancelled) {
          setSpaceRoute(null);
          setSpaceRouteError(err instanceof Error ? err.message : "Raft route unavailable");
        }
      }
    }
    void loadRoute();
    return () => { cancelled = true; };
  }, [lookupSpaceRouteService, spaceId]);

  const loadTemplates = useCallback(async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
    if (!spaceId) return;
    setTemplatesLoading(true);
    setTemplatesError("");
    try {
      const response = await listTemplatesService({ spaceId, pageSize: 100, pageToken, includeArchived: includeArchivedTemplates });
      setTemplates((current) => (append ? [...current, ...response.templates] : response.templates));
      setTemplatesNextPageToken(response.nextPageToken || "");
    } catch (err) {
      setTemplatesError(err instanceof Error ? err.message : "Failed to load templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [includeArchivedTemplates, listTemplatesService, spaceId]);

  useEffect(() => {
    if (activeTab === "templates") void loadTemplates();
  }, [activeTab, loadTemplates]);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    async function loadSemanticIndexes() {
      setSemanticLoading(true);
      setSemanticError("");
      try {
        const response = await listSemanticIndexesService({
          spaceId,
          pageSize: 100,
          includeDisabled: includeDisabledIndexes,
        });
        if (!cancelled) setSemanticIndexes(response.indexes);
      } catch (err) {
        if (!cancelled) setSemanticError(err instanceof Error ? err.message : "Failed to load semantic indexes");
      } finally {
        if (!cancelled) setSemanticLoading(false);
      }
    }
    void loadSemanticIndexes();
    return () => {
      cancelled = true;
    };
  }, [includeDisabledIndexes, listSemanticIndexesService, spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    async function loadMaintenance() {
      setMaintenanceLoading(true);
      setMaintenanceError("");
      try {
        const [status, work] = await Promise.all([
          getSemanticMaintenanceStatusService({ spaceId }),
          listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 }),
        ]);
        if (!cancelled) {
          setMaintenanceStatus(status);
          setMaintenanceWork(work.items);
        }
      } catch (err) {
        if (!cancelled) setMaintenanceError(err instanceof Error ? err.message : "Failed to load semantic maintenance data");
      } finally {
        if (!cancelled) setMaintenanceLoading(false);
      }
    }
    void loadMaintenance();
    return () => {
      cancelled = true;
    };
  }, [getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService, maintenanceWorkStatus, spaceId]);

  async function confirmSemanticMaintenanceAction() {
    if (!confirmMaintenanceAction || !spaceId) return;
    setMaintenanceActionLoading(true);
    setMaintenanceError("");
    try {
      const input = { spaceId, workItemId: confirmMaintenanceAction.item.workItemId };
      if (confirmMaintenanceAction.kind === "retry") await retrySemanticMaintenanceWorkService(input);
      else await cancelSemanticMaintenanceWorkService(input);
      const [status, work] = await Promise.all([
        getSemanticMaintenanceStatusService({ spaceId }),
        listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 }),
      ]);
      setMaintenanceStatus(status);
      setMaintenanceWork(work.items);
      setConfirmMaintenanceAction(null);
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : "Failed to update maintenance work item");
    } finally {
      setMaintenanceActionLoading(false);
    }
  }

  async function runBulkMaintenanceAction(kind: "analyze" | "process" | "backfill", semanticIndexId?: string) {
    if (!spaceId) return;
    setMaintenanceActionLoading(true);
    setMaintenanceError("");
    setMaintenanceResult("");
    try {
      if (kind === "analyze") await analyzeSemanticDirtyWorkService({ spaceId, semanticIndexId, limit: 100 });
      if (kind === "process") await processSemanticDirtyWorkService({ spaceId, limit: 100 });
      if (kind === "backfill" && semanticIndexId) await backfillSemanticIndexService({ spaceId, semanticIndexId, limit: 100, continueOnError: true });
      const [status, work] = await Promise.all([getSemanticMaintenanceStatusService({ spaceId }), listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 })]);
      setMaintenanceStatus(status);
      setMaintenanceWork(work.items);
      setMaintenanceResult(`${kind} completed; refreshed maintenance status.`);
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : `Failed to ${kind} semantic maintenance`);
    } finally {
      setMaintenanceActionLoading(false);
    }
  }

  const title = space?.name || spaceId || "Space";

  return (
    <section className="space-y-6">
      <div>
        <Link className="text-sm font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to="/spaces">
          ← Back to spaces
        </Link>
        <Text as="p" size="sm" className="mt-4 font-medium uppercase tracking-[0.3em] text-cyan-300">
          Space detail
        </Text>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <H2 className="text-slate-900 dark:text-slate-100">{title}</H2>
          {space?.state && <SpaceStateBadge state={space.state} />}
        </div>
        <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Inspect this space's general properties, domains, semantic maintenance, and templates.
        </Text>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Space detail sections">
          {[
            ["general", "General"],
            ["domains", "Domains"],
            ["semantic", "Semantic"],
            ["query", "Graph query"],
            ["templates", "Templates"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={[
                "rounded-t-md px-4 py-2 text-sm font-medium transition",
                activeTab === tab
                  ? "border border-b-white border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
              ].join(" ")}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading space…
          </Text>
        </div>
      ) : space && activeTab === "general" ? (
        <div className="grid gap-4 lg:grid-cols-2" role="tabpanel" aria-label="General">
          <DetailCard title="Identity">
            <DetailRow label="Space ID" value={space.spaceId} />
            <DetailRow label="Name" value={space.name} />
            <DetailRow label="Template usage" value={space.templateUsage || "Not reported"} />
          </DetailCard>

          <DetailCard title="Ownership">
            <DetailRow label="Owner type" value={space.owner?.principalType || "Not reported"} />
            <DetailRow label="Owner ID" value={space.owner?.id || "Not reported"} />
            <DetailRow label="Owner display name" value={space.owner?.displayName || "Not reported"} />
          </DetailCard>

          <DetailCard title="Raft placement">
            {spaceRoute ? (
              <>
                <DetailRow label="Partition" value={String(spaceRoute.partitionId)} />
                <DetailRow label="Leader node" value={spaceRoute.leaderNodeId ? String(spaceRoute.leaderNodeId) : "No leader reported"} />
                <DetailList label="Replicas" values={spaceRoute.replicaNodeIds.map(String)} />
              </>
            ) : (
              <DetailRow label="Status" value={spaceRouteError || "Route unavailable or static engine"} />
            )}
          </DetailCard>

          <DetailCard title="Timestamps">
            <DetailRow label="Created" value={formatTimestamp(space.createTime)} />
            <DetailRow label="Updated" value={formatTimestamp(space.updateTime)} />
          </DetailCard>

          <DetailCard title="Caller access">
            <DetailList label="Roles" values={space.callerAccess?.roles} />
            <DetailList label="Capabilities" values={space.callerAccess?.capabilities} />
          </DetailCard>
        </div>
      ) : null}

      {activeTab === "semantic" && <div className="space-y-6" role="tabpanel" aria-label="Semantic">
        <SemanticMaintenanceSection
        status={maintenanceStatus}
        workItems={maintenanceWork}
        loading={maintenanceLoading}
        error={maintenanceError}
        workStatus={maintenanceWorkStatus}
        onWorkStatusChange={setMaintenanceWorkStatus}
        onRetry={(item) => setConfirmMaintenanceAction({ kind: "retry", item })}
        onCancel={(item) => setConfirmMaintenanceAction({ kind: "cancel", item })}
        onAnalyze={() => void runBulkMaintenanceAction("analyze")}
        onProcess={() => void runBulkMaintenanceAction("process")}
        actionLoading={maintenanceActionLoading}
        result={maintenanceResult}
        />

        <SemanticIndexesSection
        indexes={semanticIndexes}
        loading={semanticLoading}
        error={semanticError}
        includeDisabled={includeDisabledIndexes}
        onIncludeDisabledChange={setIncludeDisabledIndexes}
        onBackfill={(index) => void runBulkMaintenanceAction("backfill", index.semanticIndexId)}
        actionLoading={maintenanceActionLoading}
        />
      </div>}

      {activeTab === "query" && <div role="tabpanel" aria-label="Graph query"><GraphQueryConsolePreview spaceId={spaceId} domains={domains} /></div>}

      {activeTab === "domains" && <div role="tabpanel" aria-label="Domains"><DomainSection
        domains={domains}
        loading={domainsLoading}
        loadingMore={domainsLoadingMore}
        error={domainsError}
        nextPageToken={domainsNextPageToken}
        includeSystem={includeSystemDomains}
        onIncludeSystemChange={setIncludeSystemDomains}
        onLoadMore={() => void loadDomains({ append: true, pageToken: domainsNextPageToken })}
      /></div>}
      {activeTab === "templates" && <div role="tabpanel" aria-label="Templates"><TemplateSection templates={templates} loading={templatesLoading} error={templatesError} includeArchived={includeArchivedTemplates} onIncludeArchivedChange={setIncludeArchivedTemplates} nextPageToken={templatesNextPageToken} onLoadMore={() => void loadTemplates({ append: true, pageToken: templatesNextPageToken })} onSelectTemplate={setSelectedTemplate} /></div>}

      {selectedTemplate && <TemplateDetailDialog template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />}

      {confirmMaintenanceAction && (
        <ConfirmMaintenanceActionDialog
          kind={confirmMaintenanceAction.kind}
          item={confirmMaintenanceAction.item}
          loading={maintenanceActionLoading}
          onCancel={() => setConfirmMaintenanceAction(null)}
          onConfirm={() => void confirmSemanticMaintenanceAction()}
        />
      )}
    </section>
  );
}

function ConfirmMaintenanceActionDialog({ kind, item, loading, onCancel, onConfirm }: { kind: "retry" | "cancel"; item: SemanticMaintenanceWorkItemInfo; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  const isRetry = kind === "retry";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{isRetry ? "Retry maintenance work item" : "Cancel maintenance work item"}</Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">{isRetry ? "Retry will make this item eligible for processing again." : "Cancel will stop this queued item from being processed."} Review the target before continuing.</Text>
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-950/60"><div><strong>Work item:</strong> {item.workItemId}</div><div><strong>Action:</strong> {item.action || "—"}</div><div><strong>Status:</strong> {item.status || "—"}</div><div><strong>Index:</strong> {item.semanticIndexId || "—"}</div></div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onCancel} disabled={loading}>Keep item unchanged</Button><Button onClick={onConfirm} disabled={loading}>{loading ? "Working…" : isRetry ? "Retry item" : "Cancel item"}</Button></div>
      </div>
    </div>
  );
}

function SemanticMaintenanceSection({ status, workItems, loading, error, workStatus, onWorkStatusChange, onRetry, onCancel, onAnalyze, onProcess, actionLoading, result }: { status: SemanticMaintenanceStatusInfo | null; workItems: SemanticMaintenanceWorkItemInfo[]; loading: boolean; error: string; workStatus: string; onWorkStatusChange: (value: string) => void; onRetry: (item: SemanticMaintenanceWorkItemInfo) => void; onCancel: (item: SemanticMaintenanceWorkItemInfo) => void; onAnalyze: () => void; onProcess: () => void; actionLoading: boolean; result: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic maintenance</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Daemon maintenance status and dirty-work queue for this space.</Text>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onAnalyze} disabled={actionLoading}>Analyze dirty work</Button><Button variant="secondary" onClick={onProcess} disabled={actionLoading}>Process work</Button></div>
        <label className="text-sm text-slate-700 dark:text-slate-300">Work status <select className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={workStatus} onChange={(event) => onWorkStatusChange(event.target.value)}><option value="">Any</option><option value="pending">Pending</option><option value="running">Running</option><option value="failed_retryable">Failed retryable</option><option value="failed_permanent">Failed permanent</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      {result && <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{result}</div>}
      {loading ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading semantic maintenance…</Text> : (
        <>
          {status && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Enabled" value={status.enabled ? "Yes" : "No"} /><Metric label="Degraded" value={status.degraded ? "Yes" : "No"} tone={status.degraded ? "danger" : "default"} /><Metric label="Pending" value={status.queueDepthPending} /><Metric label="Running" value={status.queueDepthRunning} /><Metric label="Retryable failed" value={status.queueDepthFailedRetryable} tone={status.queueDepthFailedRetryable > 0 ? "warning" : "default"} /><Metric label="Permanent failed" value={status.queueDepthFailedPermanent} tone={status.queueDepthFailedPermanent > 0 ? "danger" : "default"} /><Metric label="Oldest pending" value={`${status.oldestPendingAgeSeconds}s`} /><Metric label="Throttle" value={status.throttleState || "None"} /></div>}
          {status?.degradedReason && <ErrorBox className="mt-4">{status.degradedReason}</ErrorBox>}
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Index</th><th className="px-4 py-3">Last error</th><th className="px-4 py-3">Safe actions</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{workItems.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={7}>No maintenance work items found.</td></tr> : workItems.map((item) => <tr key={item.workItemId}><td className="px-4 py-3">{item.action || "—"}</td><td className="px-4 py-3">{item.status || "—"}</td><td className="px-4 py-3">{item.attemptCount}</td><td className="px-4 py-3 font-mono text-xs">{item.domainId || "—"}</td><td className="px-4 py-3 font-mono text-xs">{item.semanticIndexId || "—"}</td><td className="px-4 py-3 max-w-md truncate" title={item.lastErrorMessageSanitized}>{item.lastErrorCategory || item.lastErrorMessageSanitized || "—"}</td><td className="px-4 py-3"><div className="flex gap-2"><Button variant="secondary" onClick={() => onRetry(item)}>Retry</Button><Button variant="secondary" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => onCancel(item)}>Cancel</Button></div></td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "warning" | "danger" }) {
  const valueClass = tone === "danger" ? "text-red-700 dark:text-red-300" : tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-100";
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><Text className={`mt-1 font-semibold ${valueClass}`}>{value}</Text></div>;
}

function SemanticIndexesSection({ indexes, loading, error, includeDisabled, onIncludeDisabledChange, onBackfill, actionLoading }: { indexes: SemanticIndexInfo[]; loading: boolean; error: string; includeDisabled: boolean; onIncludeDisabledChange: (value: boolean) => void; onBackfill: (index: SemanticIndexInfo) => void; actionLoading: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic indexes</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Space/domain-scoped semantic search indexes.</Text>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" checked={includeDisabled} onChange={(event) => onIncludeDisabledChange(event.target.checked)} />
          Include disabled indexes
        </label>
      </div>
      {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      {loading ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading semantic indexes…</Text>
      ) : indexes.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No semantic indexes found for this space.</Text>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Domain ID</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">Vector store</th><th className="px-4 py-3">Index ID</th><th className="px-4 py-3">Safe actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{indexes.map((index) => <tr key={index.semanticIndexId}><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{index.displayName || index.key}</td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{index.domainId}</td><td className="px-4 py-3">{index.state}</td><td className="px-4 py-3">{index.modelLabel || "—"}</td><td className="px-4 py-3">{index.vectorStoreLabel || "—"}</td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{index.semanticIndexId}</td><td className="px-4 py-3"><Button variant="secondary" disabled={actionLoading} onClick={() => onBackfill(index)}>Backfill</Button></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GraphQueryConsolePreview({ spaceId, domains }: { spaceId: string; domains: DomainInfo[] }) {
  const [domainId, setDomainId] = useState("");
  const exampleQuery = "MATCH (n) RETURN n";
  const [queryText, setQueryText] = useState(exampleQuery);
  const [clientSession, setClientSession] = useState<ClientQuerySessionInfo | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addr, setAddr] = useState("127.0.0.1:19091");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [resultView, setResultView] = useState<"rows" | "graph" | "raw">("rows");
  const [readWrite, setReadWrite] = useState(false);
  const [confirmWrite, setConfirmWrite] = useState(false);

  async function connect() {
    setLoading(true);
    setError("");
    try {
      const session = await clientQueryLogin({ addr, username, password });
      setClientSession(session);
      setPassword("");
      setLoginOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client query login failed");
    } finally {
      setLoading(false);
    }
  }

  async function disconnect() {
    setLoading(true);
    try {
      await clientQueryLogout();
      setClientSession(null);
    } finally {
      setLoading(false);
    }
  }

  function requestRunQuery() {
    if (readWrite) {
      setConfirmWrite(true);
      return;
    }
    void runQuery();
  }

  async function runQuery() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await executeGql({ spaceId, domainId, query: queryText, pageSize: 100, readWrite });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  const canRun = Boolean(clientSession && domainId && queryText.trim() && !loading);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Graph query console</Text>
          <Text intent="muted" size="sm" className="mt-1 max-w-3xl text-slate-600 dark:text-slate-400">Execute read-only structured GraphQuery JSON against this space using a separate client/user query identity.</Text>
        </div>
        {clientSession ? <Button variant="secondary" onClick={() => void disconnect()} disabled={loading}>Disconnect client</Button> : <Button variant="secondary" onClick={() => setLoginOpen(true)}>Connect client session</Button>}
      </div>
      {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div><span className="font-medium">Client identity:</span> {clientSession ? `${clientSession.username} @ ${clientSession.addr}` : "Not connected"}</div>
          <div><span className="font-medium">Space:</span> <span className="font-mono text-xs">{spaceId}</span></div>
          <label className="block font-medium">Domain<select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" value={domainId} onChange={(event) => setDomainId(event.target.value)}><option value="">Select domain…</option>{domains.map((domain) => <option key={domain.domainId} value={domain.domainId}>{domain.name || domain.key || domain.domainId}</option>)}</select></label>
          <label className="block font-medium">Mode<select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" value={readWrite ? "read-write" : "read-only"} onChange={(event) => setReadWrite(event.target.value === "read-write")}><option value="read-only">Read-only</option><option value="read-write">Read-write</option></select></label>
        </div>
        <div>
          <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">GQL query</Text>
          <textarea className="mt-2 h-52 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={queryText} onChange={(event) => setQueryText(event.target.value)} onKeyDown={(event) => event.stopPropagation()} spellCheck={false} />
          <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!canRun} onClick={requestRunQuery}>{loading ? "Running…" : readWrite ? "Run write query" : "Run query"}</Button><Button variant="secondary" disabled={!result} onClick={() => void navigator.clipboard?.writeText(JSON.stringify(result ?? null, null, 2))}>Copy result</Button></div>
          {Boolean(result) && <div className="mt-4 flex gap-2" role="tablist" aria-label="Query result views">{(["rows", "graph", "raw"] as const).map((view) => <button key={view} type="button" className={`rounded-md px-3 py-1 text-sm ${resultView === view ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100" : "text-slate-600 dark:text-slate-400"}`} onClick={() => setResultView(view)}>{view === "rows" ? "Rows" : view === "graph" ? "Graph" : "Raw JSON"}</button>)}</div>}
          <QueryResultView result={result} view={resultView} />
        </div>
      </div>
      {confirmWrite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Text as="h3" className="font-semibold">Run read-write GQL?</Text><Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">This will execute in a read-write transaction and commit if the query succeeds. Target: {spaceId} / {domainId}.</Text><pre className="mt-4 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{queryText}</pre><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setConfirmWrite(false)} disabled={loading}>Cancel</Button><Button onClick={() => { setConfirmWrite(false); void runQuery(); }} disabled={loading}>Run and commit</Button></div></div></div>}
      {loginOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Text as="h3" className="font-semibold">Connect client query identity</Text><div className="mt-4 space-y-3"><label className="block text-sm font-medium">Address<input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={addr} onChange={(e) => setAddr(e.target.value)} /></label><label className="block text-sm font-medium">Username<input className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={username} onChange={(e) => setUsername(e.target.value)} /></label><label className="block text-sm font-medium">Password<input type="password" className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" value={password} onChange={(e) => setPassword(e.target.value)} /></label></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setLoginOpen(false)} disabled={loading}>Cancel</Button><Button onClick={() => void connect()} disabled={loading}>{loading ? "Connecting…" : "Connect"}</Button></div></div></div>}
    </div>
  );
}

function QueryResultView({ result, view }: { result: any; view: "rows" | "graph" | "raw" }) {
  if (!result) return <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">No query run yet.</div>;
  const payload = result.result ?? result;
  if (view === "graph") {
    const nodes = payload?.graph?.nodes ?? [];
    return <div className="mt-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800"><Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">Graph preview</Text>{nodes.length === 0 ? <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">No graph nodes returned.</Text> : <div className="mt-3 grid gap-2 sm:grid-cols-2">{nodes.map((node: any) => <div key={node.nodeId} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-950/40"><div className="font-mono text-xs text-slate-600 dark:text-slate-400">{node.nodeId}</div><div className="mt-1 font-medium">{(node.labels ?? []).join(", ") || "Unlabeled node"}</div><div className="mt-1 text-xs text-slate-500">{(node.propertyKeys ?? []).length} properties</div></div>)}</div>}</div>;
  }
  if (view === "rows") {
    const rows = payload?.rows ?? [];
    return <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{rows.length ? JSON.stringify(rows, null, 2) : "No rows returned."}</pre>;
  }
  return <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{JSON.stringify(result, null, 2)}</pre>;
}

function DomainSection({
  domains,
  loading,
  loadingMore,
  error,
  nextPageToken,
  includeSystem,
  onIncludeSystemChange,
  onLoadMore,
}: {
  domains: DomainInfo[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  nextPageToken: string;
  includeSystem: boolean;
  onIncludeSystemChange: (value: boolean) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">
            Domains
          </Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">
            Space-scoped domains available to admin workflows.
          </Text>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-sky-600"
            checked={includeSystem}
            onChange={(event) => onIncludeSystemChange(event.target.checked)}
          />
          Include system domains
        </label>
      </div>
      {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      {loading ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading domains…</Text>
      ) : domains.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No domains found for this space.</Text>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Domain ID</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {domains.map((domain) => (
                  <tr key={domain.domainId}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{domain.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{domain.key || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{domain.domainId}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{domainFlags(domain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextPageToken && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? "Loading more…" : "Load more domains"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function domainFlags(domain: DomainInfo) {
  const flags = [];
  if (domain.isDefault) flags.push("default");
  if (domain.system) flags.push("system");
  return flags.length ? flags.join(", ") : "—";
}

function TemplateSection({ templates, loading, error, includeArchived, onIncludeArchivedChange, nextPageToken, onLoadMore, onSelectTemplate }: { templates: TemplateInfo[]; loading: boolean; error: string; includeArchived: boolean; onIncludeArchivedChange: (value: boolean) => void; nextPageToken: string; onLoadMore: () => void; onSelectTemplate: (template: TemplateInfo) => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Templates</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Operator-visible templates for this space.</Text></div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" checked={includeArchived} onChange={(event) => onIncludeArchivedChange(event.target.checked)} />Include archived templates</label>
      </div>
      {error && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      {loading && templates.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading templates…</Text> : templates.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No templates found for this space.</Text> : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">State</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Fields</th><th className="px-4 py-3">Template ID</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{templates.map((template) => <tr key={template.templateId}><td className="px-4 py-3">{template.state}</td><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{template.displayName || template.key}</td><td className="px-4 py-3">{template.key}</td><td className="px-4 py-3">{template.version || "—"}</td><td className="px-4 py-3">{template.properties.length}</td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{template.templateId}</td><td className="px-4 py-3"><Button variant="secondary" onClick={() => onSelectTemplate(template)}>View details</Button></td></tr>)}</tbody></table></div>
          {nextPageToken && <div className="mt-4 flex justify-center"><Button variant="secondary" onClick={onLoadMore} disabled={loading}>{loading ? "Loading more…" : "Load more templates"}</Button></div>}
        </>
      )}
    </div>
  );
}

function TemplateDetailDialog({ template, onClose }: { template: TemplateInfo; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{template.displayName || template.key}</Text><Text size="sm" intent="muted" className="mt-1 font-mono">{template.templateId}</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><DetailRow label="Key" value={template.key} /><DetailRow label="Version" value={template.version || "—"} /><DetailRow label="State" value={template.state} /><DetailRow label="System" value={template.system ? "Yes" : "No"} /><DetailRow label="Description" value={template.description || "—"} /><DetailRow label="Allow extra properties" value={template.propertiesAllowExtra ? "Yes" : "No"} /></div><div className="mt-6"><Text className="font-medium">Properties</Text>{template.properties.length === 0 ? <Text size="sm" intent="muted" className="mt-2">No declared properties.</Text> : <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Required</th><th className="px-4 py-3">Description</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{template.properties.map((prop) => <tr key={prop.name}><td className="px-4 py-3 font-medium">{prop.name}</td><td className="px-4 py-3">{prop.valueType}</td><td className="px-4 py-3">{prop.required ? "Yes" : "No"}</td><td className="px-4 py-3">{prop.description || "—"}</td></tr>)}</tbody></table></div>}</div></div></div>;
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">
        {title}
      </Text>
      <dl className="mt-4 space-y-3">{children}</dl>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function DetailList({ label, values }: { label: string; values?: string[] }) {
  const displayValues = values?.length ? values : ["Not reported"];
  return <DetailRow label={label} value={displayValues.join(", ")} />;
}

function formatTimestamp(value?: string) {
  if (!value) return "Not reported";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}
