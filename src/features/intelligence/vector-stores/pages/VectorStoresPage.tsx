import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  Alert,
  Button,
  Text,
  errorMessage,
  themeClasses,
} from "../../../../components/typography";
import { listVectorStores as defaultListVectorStores } from "../../../../services/adminService";
import type {
  ListVectorStoresInput,
  ListVectorStoresResponse,
  VectorStoreInfo,
} from "../../../../types/inference";
import { VectorStoreTable } from "../../../inference/components/VectorStoreTable";
import type { ConsolePrincipalContext } from "../../../console";

export type VectorStoresPageProps = {
  listVectorStoresService?: (
    input?: ListVectorStoresInput,
  ) => Promise<ListVectorStoresResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function VectorStoresPage({
  listVectorStoresService = defaultListVectorStores,
}: VectorStoresPageProps) {
  const [stores, setStores] = useState<VectorStoreInfo[]>([]);
  const [includeDisabled, setIncludeDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<VectorStoreInfo | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await listVectorStoresService({
        pageSize: 100,
        includeDisabled,
      });
      setStores(response.vectorStores);
    } catch (err) {
      setError(errorMessage(err, "Failed to load vector stores"));
    } finally {
      setLoading(false);
    }
  }, [includeDisabled, listVectorStoresService]);

  useEffect(() => {
    void load();
  }, [load]);

  const totals = useMemo(
    () => ({
      total: stores.length,
      enabled: stores.filter((store) => store.enabled).length,
      disabled: stores.filter((store) => !store.enabled).length,
    }),
    [stores],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Vector stores"
        description="Inspect vector indexes used by semantic search and embedding generation."
        actions={
          <Button
            variant="secondary"
            onClick={() => void load()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Vector stores" value={totals.total} />
        <SummaryCard label="Enabled" value={totals.enabled} />
        <SummaryCard label="Disabled" value={totals.disabled} />
      </div>
      <div
        className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
      >
        <label className={`flex items-center gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          <input
            type="checkbox"
            checked={includeDisabled}
            onChange={(event) => setIncludeDisabled(event.target.checked)}
            disabled={loading}
          />{" "}
          Include disabled vector stores
        </label>
      </div>
      {loading ? (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
        >
          <Text intent="muted">Loading vector stores…</Text>
        </div>
      ) : (
        <VectorStoreTable
          stores={stores}
          onViewDetails={(store) => setDetail(store)}
        />
      )}
      {detail && (
        <DetailDrawer store={detail} onClose={() => setDetail(null)} />
      )}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <div className={`mt-2 text-3xl font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}

function DetailDrawer({
  store,
  onClose,
}: {
  store: VectorStoreInfo;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
      <aside
        className={`h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {store.name || store.key || "Vector store"}
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Vector store diagnostic payload.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <pre className={`mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs ${themeClasses.text.parts.inverseSoft}`}>
          {JSON.stringify(store, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
