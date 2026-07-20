import { useCallback, useEffect, useState } from "react";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import {
  applyInferencePackage as defaultApplyInferencePackage,
  listInferencePackages as defaultListInferencePackages,
  listModelEndpointCapabilities as defaultListModelEndpointCapabilities,
  listModelEndpoints as defaultListModelEndpoints,
  listModels as defaultListModels,
  listVectorStores as defaultListVectorStores,
} from "../../../services/adminService";
import type {
  ApplyInferencePackageResponse,
  InferenceModelInfo,
  InferencePackageDocument,
  InferencePackageInfo,
  ListInferencePackagesInput,
  ListInferencePackagesResponse,
  ListModelEndpointCapabilitiesInput,
  ListModelEndpointCapabilitiesResponse,
  ListModelEndpointsInput,
  ListModelEndpointsResponse,
  ListModelsInput,
  ListModelsResponse,
  ListVectorStoresInput,
  ListVectorStoresResponse,
  ModelEndpointCapabilityInfo,
  ModelEndpointInfo,
  VectorStoreInfo,
} from "../../../types/inference";
import { ImportInferencePackageModal } from "../components/ImportInferencePackageModal";
import { ImportInferencePackageSummaryDialog } from "../components/ImportInferencePackageSummaryDialog";
import { InferencePackageTable } from "../components/InferencePackageTable";
import { InferenceModelTable } from "../components/InferenceModelTable";
import { ModelEndpointCapabilityTable } from "../components/ModelEndpointCapabilityTable";
import { ModelEndpointTable } from "../components/ModelEndpointTable";
import { VectorStoreTable } from "../components/VectorStoreTable";

type InferenceTab = "packages" | "endpoints" | "models" | "vectorStores" | "capabilities";

function CatalogDetailDrawer({ title, data, onClose }: { title: string; data: unknown; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60"><aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{title}</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Inference catalog detail and raw diagnostic payload.</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div><pre className="mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(data, null, 2)}</pre></aside></div>;
}

const inferenceTabs: Array<{ id: InferenceTab; label: string; description: string }> = [
  { id: "packages", label: "Packages", description: "Install-only package records and import history." },
  { id: "endpoints", label: "Endpoints", description: "Reachable model service endpoints." },
  { id: "models", label: "Models", description: "Inference models available to endpoints." },
  { id: "vectorStores", label: "Vector stores", description: "Vector storage and search backends." },
  { id: "capabilities", label: "Capabilities", description: "Endpoint/model operation bindings." },
];

export type InferencePageProps = {
  listInferencePackagesService?: (input?: ListInferencePackagesInput) => Promise<ListInferencePackagesResponse>;
  listModelEndpointsService?: (input?: ListModelEndpointsInput) => Promise<ListModelEndpointsResponse>;
  listModelsService?: (input?: ListModelsInput) => Promise<ListModelsResponse>;
  listVectorStoresService?: (input?: ListVectorStoresInput) => Promise<ListVectorStoresResponse>;
  listModelEndpointCapabilitiesService?: (input?: ListModelEndpointCapabilitiesInput) => Promise<ListModelEndpointCapabilitiesResponse>;
  applyInferencePackageService?: (input: InferencePackageDocument) => Promise<ApplyInferencePackageResponse>;
};

export function InferencePage({
  listInferencePackagesService = defaultListInferencePackages,
  listModelEndpointsService = defaultListModelEndpoints,
  listModelsService = defaultListModels,
  listVectorStoresService = defaultListVectorStores,
  listModelEndpointCapabilitiesService = defaultListModelEndpointCapabilities,
  applyInferencePackageService = defaultApplyInferencePackage,
}: InferencePageProps) {
  const [packages, setPackages] = useState<InferencePackageInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [summary, setSummary] = useState<ApplyInferencePackageResponse | null>(null);
  const [activeTab, setActiveTab] = useState<InferenceTab>("packages");
  const [endpoints, setEndpoints] = useState<ModelEndpointInfo[]>([]);
  const [models, setModels] = useState<InferenceModelInfo[]>([]);
  const [vectorStores, setVectorStores] = useState<VectorStoreInfo[]>([]);
  const [capabilities, setCapabilities] = useState<ModelEndpointCapabilityInfo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [includeDisabledCatalog, setIncludeDisabledCatalog] = useState(false);
  const [operationFilter, setOperationFilter] = useState("");
  const [detail, setDetail] = useState<{ title: string; data: unknown } | null>(null);

  const loadPackages = useCallback(async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
    setError("");
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const response = await listInferencePackagesService({ pageSize: 50, pageToken });
      setPackages((current) => append ? [...current, ...response.packages] : response.packages);
      setNextPageToken(response.nextPageToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inference packages");
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, [listInferencePackagesService]);

  useEffect(() => { void loadPackages(); }, [loadPackages]);

  useEffect(() => {
    if (activeTab === "packages") return;
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        if (activeTab === "endpoints") {
          const response = await listModelEndpointsService({ pageSize: 100, includeDisabled: includeDisabledCatalog });
          if (!cancelled) setEndpoints(response.modelEndpoints);
        } else if (activeTab === "models") {
          const response = await listModelsService({ pageSize: 100, operation: operationFilter });
          if (!cancelled) setModels(response.models);
        } else if (activeTab === "vectorStores") {
          const response = await listVectorStoresService({ pageSize: 100, includeDisabled: includeDisabledCatalog });
          if (!cancelled) setVectorStores(response.vectorStores);
        } else if (activeTab === "capabilities") {
          const response = await listModelEndpointCapabilitiesService({ pageSize: 100, operation: operationFilter, includeDisabled: includeDisabledCatalog });
          if (!cancelled) setCapabilities(response.modelEndpointCapabilities);
        }
      } catch (err) {
        if (!cancelled) setCatalogError(err instanceof Error ? err.message : "Failed to load inference catalog");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    void loadCatalog();
    return () => { cancelled = true; };
  }, [activeTab, includeDisabledCatalog, listModelEndpointCapabilitiesService, listModelEndpointsService, listModelsService, listVectorStoresService, operationFilter]);

  async function handleImport(document: InferencePackageDocument) {
    setImporting(true);
    setError("");
    try {
      const result = await applyInferencePackageService(document);
      setImportOpen(false);
      setSummary(result);
      await loadPackages();
    } catch (err) {
      throw err instanceof Error ? err : new Error("Failed to import inference package");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">Inference</Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Inference Packages</H2>
          <Text intent="muted" className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Import inference package JSON files and review package deployment history. Packages are install-only, idempotent deployment units. Uninstall is not supported.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void loadPackages()} disabled={loading || loadingMore || importing}>Refresh</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)} disabled={importing}>Import package JSON</Button>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inference catalog sections">
          {inferenceTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`rounded-t-lg border px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "border-slate-200 border-b-white bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100"
                  : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {activeTab !== "packages" && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70">
          {(activeTab === "models" || activeTab === "capabilities") && (
            <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
              Operation
              <input
                className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={operationFilter}
                onChange={(event) => setOperationFilter(event.target.value)}
                placeholder="embeddings"
              />
            </label>
          )}
          {(activeTab === "endpoints" || activeTab === "vectorStores" || activeTab === "capabilities") && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
                checked={includeDisabledCatalog}
                onChange={(event) => setIncludeDisabledCatalog(event.target.checked)}
              />
              Include disabled
            </label>
          )}
        </div>
      )}

      {activeTab !== "packages" && !catalogLoading && !catalogError && (
        <div className="flex flex-wrap gap-2">
          {(activeTab === "endpoints" ? endpoints : activeTab === "models" ? models : activeTab === "vectorStores" ? vectorStores : capabilities).map((item: any) => (
            <Button key={item.modelEndpointId || item.modelId || item.vectorStoreId || item.capabilityId} variant="secondary" onClick={() => setDetail({ title: item.key || item.name || item.modelEndpointCapabilityId || item.capabilityId || "Catalog item", data: item })}>View {item.key || item.name || "details"}</Button>
          ))}
        </div>
      )}

      {activeTab === "packages" ? (
        loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
            <Text intent="muted" className="text-slate-600 dark:text-slate-400">Loading inference packages…</Text>
          </div>
        ) : (
          <>
            <InferencePackageTable packages={packages} />
            {nextPageToken && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => void loadPackages({ append: true, pageToken: nextPageToken })} disabled={loadingMore}>{loadingMore ? "Loading more…" : "Load more"}</Button>
              </div>
            )}
          </>
        )
      ) : catalogLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">Loading inference catalog…</Text>
        </div>
      ) : catalogError ? (
        <ErrorBox>{catalogError}</ErrorBox>
      ) : activeTab === "endpoints" ? (
        <ModelEndpointTable endpoints={endpoints} />
      ) : activeTab === "models" ? (
        <InferenceModelTable models={models} />
      ) : activeTab === "vectorStores" ? (
        <VectorStoreTable stores={vectorStores} />
      ) : (
        <ModelEndpointCapabilityTable capabilities={capabilities} />
      )}

      <ImportInferencePackageModal open={importOpen} loading={importing} onClose={() => setImportOpen(false)} onImport={handleImport} />
      {detail && <CatalogDetailDrawer title={detail.title} data={detail.data} onClose={() => setDetail(null)} />}

      <ImportInferencePackageSummaryDialog
        result={summary}
        onClose={() => setSummary(null)}
        onViewCatalog={(target) => {
          setSummary(null);
          setActiveTab(target);
        }}
      />
    </section>
  );
}

