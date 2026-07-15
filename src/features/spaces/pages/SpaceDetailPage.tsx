import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { analyzeSemanticDirtyWork as defaultAnalyzeSemanticDirtyWork, backfillSemanticIndex as defaultBackfillSemanticIndex, cancelSemanticMaintenanceWork as defaultCancelSemanticMaintenanceWork, getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus, getSpace as defaultGetSpace, listDomains as defaultListDomains, listSemanticIndexes as defaultListSemanticIndexes, listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork, processSemanticDirtyWork as defaultProcessSemanticDirtyWork, retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork } from "../../../services/adminService";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../types/domains";
import type { ListSemanticIndexesInput, ListSemanticIndexesResponse, SemanticIndexInfo } from "../../../types/semantic";
import type { AnalyzeSemanticDirtyWorkInput, BackfillSemanticIndexInput, GetSemanticMaintenanceStatusInput, ListSemanticMaintenanceWorkInput, ListSemanticMaintenanceWorkResponse, ProcessSemanticDirtyWorkInput, SemanticMaintenanceStatusInfo, SemanticMaintenanceWorkActionInput, SemanticMaintenanceWorkItemInfo } from "../../../types/semanticMaintenance";
import type { SpaceInfo } from "../../../types/spaces";
import { SpaceStateBadge } from "../components/SpaceStateBadge";

export type SpaceDetailPageProps = {
  getSpaceService?: (spaceId: string) => Promise<SpaceInfo>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listSemanticIndexesService?: (input: ListSemanticIndexesInput) => Promise<ListSemanticIndexesResponse>;
  getSemanticMaintenanceStatusService?: (input: GetSemanticMaintenanceStatusInput) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (input: ListSemanticMaintenanceWorkInput) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (input: AnalyzeSemanticDirtyWorkInput) => Promise<unknown>;
  processSemanticDirtyWorkService?: (input: ProcessSemanticDirtyWorkInput) => Promise<unknown>;
  backfillSemanticIndexService?: (input: BackfillSemanticIndexInput) => Promise<unknown>;
};

export function SpaceDetailPage({ getSpaceService = defaultGetSpace, listDomainsService = defaultListDomains, listSemanticIndexesService = defaultListSemanticIndexes, getSemanticMaintenanceStatusService = defaultGetSemanticMaintenanceStatus, listSemanticMaintenanceWorkService = defaultListSemanticMaintenanceWork, retrySemanticMaintenanceWorkService = defaultRetrySemanticMaintenanceWork, cancelSemanticMaintenanceWorkService = defaultCancelSemanticMaintenanceWork, analyzeSemanticDirtyWorkService = defaultAnalyzeSemanticDirtyWork, processSemanticDirtyWorkService = defaultProcessSemanticDirtyWork, backfillSemanticIndexService = defaultBackfillSemanticIndex }: SpaceDetailPageProps) {
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
          Inspect this space's properties. Space-scoped domains and templates will appear here next.
        </Text>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading space…
          </Text>
        </div>
      ) : space ? (
        <div className="grid gap-4 lg:grid-cols-2">
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

      <DomainSection
        domains={domains}
        loading={domainsLoading}
        loadingMore={domainsLoadingMore}
        error={domainsError}
        nextPageToken={domainsNextPageToken}
        includeSystem={includeSystemDomains}
        onIncludeSystemChange={setIncludeSystemDomains}
        onLoadMore={() => void loadDomains({ append: true, pageToken: domainsNextPageToken })}
      />
      <TemplateSection />

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

function TemplateSection() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/70 dark:bg-amber-950/30">
      <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">
        Templates
      </Text>
      <Text intent="muted" size="sm" className="mt-2 max-w-3xl text-slate-700 dark:text-slate-300">
        Templates are space-scoped in the Mycel client API, but the operator-facing Admin API does not currently expose a template listing endpoint. This section is reserved for templates once an admin-safe template API is available.
      </Text>
      <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 p-4 text-sm text-slate-700 dark:border-amber-900/60 dark:bg-slate-950/30 dark:text-slate-300">
        <p className="font-medium text-slate-900 dark:text-slate-100">API status</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Client API: <code>TemplateService.ListTemplates(space_id)</code></li>
          <li>Admin API: no <code>AdminTemplateService</code> is currently defined</li>
          <li>Admin console will avoid using user-scoped client sessions for operator workflows</li>
        </ul>
      </div>
    </div>
  );
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
