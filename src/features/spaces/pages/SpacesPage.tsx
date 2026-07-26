import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { createSpace as defaultCreateSpace, listSpaces as defaultListSpaces } from "../../../services/adminService";
import type { CreateSpaceInput, CreateSpaceResponse, ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../types/spaces";
import { SpaceFilters, type SpaceFiltersValue } from "../components/SpaceFilters";
import { SpaceTable } from "../components/SpaceTable";

const defaultFilters: SpaceFiltersValue = {
  query: "",
  includeArchived: false,
};

export type SpacesPageProps = {
  listSpacesService?: (input: ListSpacesInput) => Promise<ListSpacesResponse>;
  createSpaceService?: (input: CreateSpaceInput) => Promise<CreateSpaceResponse>;
};

export function SpacesPage({ listSpacesService = defaultListSpaces, createSpaceService = defaultCreateSpace }: SpacesPageProps) {
  const [filters, setFilters] = useState<SpaceFiltersValue>(defaultFilters);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateSpaceInput>({ name: "", ownerUsername: "", defaultDomainKey: "default", defaultDomainName: "Default" });

  const loadSpaces = useCallback(
    async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await listSpacesService({
          pageSize: 100,
          pageToken,
          includeArchived: filters.includeArchived,
        });
        setSpaces((current) => (append ? [...current, ...response.spaces] : response.spaces));
        setNextPageToken(response.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load spaces");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [filters.includeArchived, listSpacesService],
  );

  useEffect(() => {
    void loadSpaces();
  }, [loadSpaces]);

  const submitCreateSpace = useCallback(async () => {
    setError("");
    setCreating(true);
    try {
      await createSpaceService(createForm);
      setShowCreate(false);
      setCreateForm({ name: "", ownerUsername: "", defaultDomainKey: "default", defaultDomainName: "Default" });
      await loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setCreating(false);
    }
  }, [createForm, createSpaceService, loadSpaces]);

  const filteredSpaces = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return spaces.filter((space) => {
      if (!filters.includeArchived && space.state === "SPACE_STATE_ARCHIVED") return false;
      if (query && !space.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [filters, spaces]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text
            as="p"
            size="sm"
            className="font-medium uppercase tracking-[0.3em] text-cyan-300"
          >
            Spaces
          </Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Space Management</H2>
          <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Inspect Mycel spaces and prepare for space lifecycle operations.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void loadSpaces()} disabled={loading || loadingMore}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setShowCreate((value) => !value)}>
            Create space
          </Button>
        </div>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Space name</span>
              <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={createForm.name} onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))} placeholder="martin_space" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Owner username</span>
              <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={createForm.ownerUsername || ""} onChange={(event) => setCreateForm((form) => ({ ...form, ownerUsername: event.target.value }))} placeholder="martin" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Default domain key</span>
              <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={createForm.defaultDomainKey || ""} onChange={(event) => setCreateForm((form) => ({ ...form, defaultDomainKey: event.target.value }))} placeholder="default" />
            </label>
            <label className="space-y-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              <span>Default domain name</span>
              <input className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={createForm.defaultDomainName || ""} onChange={(event) => setCreateForm((form) => ({ ...form, defaultDomainName: event.target.value }))} placeholder="Default" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void submitCreateSpace()} disabled={creating || !createForm.name.trim() || !(createForm.ownerUsername || createForm.ownerUserId || "").trim()}>
              {creating ? "Creating…" : "Create space"}
            </Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</Button>
          </div>
        </div>
      )}

      <SpaceFilters value={filters} onChange={setFilters} />

      {error && <ErrorBox>{error}</ErrorBox>}

      {!loading && (
        <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">
          Showing {filteredSpaces.length} of {spaces.length} loaded space{spaces.length === 1 ? "" : "s"}.
        </Text>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 text-center">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading spaces…
          </Text>
        </div>
      ) : (
        <>
          <SpaceTable spaces={filteredSpaces} />
          {nextPageToken && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void loadSpaces({ append: true, pageToken: nextPageToken })}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading more…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
