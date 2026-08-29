import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  Input,
  Text,
  themeClasses,
} from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import {
  createSpace as defaultCreateSpace,
  deleteSpace as defaultDeleteSpace,
  listSpaces as defaultListSpaces,
} from "../../../services/adminService";
import type {
  CreateSpaceInput,
  CreateSpaceResponse,
  DeleteSpaceResponse,
  ListSpacesInput,
  ListSpacesResponse,
  SpaceInfo,
} from "../../../types/spaces";
import {
  SpaceFilters,
  type SpaceFiltersValue,
} from "../components/SpaceFilters";
import { SpaceTable } from "../components/SpaceTable";

const defaultFilters: SpaceFiltersValue = {
  query: "",
  includeArchived: false,
};

export type SpacesPageProps = {
  listSpacesService?: (input: ListSpacesInput) => Promise<ListSpacesResponse>;
  createSpaceService?: (
    input: CreateSpaceInput,
  ) => Promise<CreateSpaceResponse>;
  deleteSpaceService?: (spaceId: string) => Promise<DeleteSpaceResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function SpacesPage({
  listSpacesService = defaultListSpaces,
  createSpaceService = defaultCreateSpace,
  deleteSpaceService = defaultDeleteSpace,
  principalContext,
}: SpacesPageProps) {
  const [filters, setFilters] = useState<SpaceFiltersValue>(defaultFilters);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingSpaceId, setDeletingSpaceId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<SpaceInfo | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [createForm, setCreateForm] = useState<CreateSpaceInput>({
    name: "",
    ownerUsername: "",
    defaultDomainKey: "default",
    defaultDomainName: "default",
  });

  const loadSpaces = useCallback(
    async ({
      append = false,
      pageToken = "",
    }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await listSpacesService({
          pageSize: 100,
          pageToken,
          includeArchived: filters.includeArchived,
        });
        setSpaces((current) =>
          append ? [...current, ...response.spaces] : response.spaces,
        );
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
      setCreateForm({
        name: "",
        ownerUsername: "",
        defaultDomainKey: "default",
        defaultDomainName: "default",
      });
      await loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create space");
    } finally {
      setCreating(false);
    }
  }, [createForm, createSpaceService, loadSpaces]);

  function requestDeleteSpace(space: SpaceInfo) {
    setError("");
    setPendingDelete(space);
    setDeleteConfirmName("");
  }

  async function confirmDeleteSpace() {
    if (!pendingDelete) return;
    const space = pendingDelete;
    setError("");
    setDeletingSpaceId(space.spaceId);
    try {
      await deleteSpaceService(space.spaceId);
      setPendingDelete(null);
      setDeleteConfirmName("");
      await loadSpaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete space");
    } finally {
      setDeletingSpaceId("");
    }
  }

  const canCreateSpace = canUseCapability(principalContext, "space.create");
  const canDeleteSpace = canUseCapability(principalContext, "space.delete");

  const filteredSpaces = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return spaces.filter((space) => {
      if (!filters.includeArchived && space.state === "SPACE_STATE_ARCHIVED")
        return false;
      if (query && !space.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [filters, spaces]);
  const query = filters.query.trim();
  const hasMoreSpaces = Boolean(nextPageToken);
  const showPartialSearchMiss =
    !loading && query && filteredSpaces.length === 0 && hasMoreSpaces;
  const loadMoreButton = (
    <Button
      variant="secondary"
      onClick={() =>
        void loadSpaces({ append: true, pageToken: nextPageToken })
      }
      disabled={loadingMore}
    >
      {loadingMore ? "Loading more…" : "Load more"}
    </Button>
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Data"
        title="Spaces"
        description="Inspect Mycel spaces and prepare for space lifecycle operations."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void loadSpaces()}
              disabled={loading || loadingMore}
            >
              Refresh
            </Button>
            {canCreateSpace && (
              <Button onClick={() => setShowCreate((value) => !value)}>
                Create space
              </Button>
            )}
          </>
        }
      />

      {showCreate && canCreateSpace && (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className={`space-y-1 text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}>
              <span>Space name</span>
              <Input
                className="text-sm"
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
                placeholder="martin_space"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label className={`space-y-1 text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}>
              <span>Owner username</span>
              <Input
                className="text-sm"
                value={createForm.ownerUsername || ""}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    ownerUsername: event.target.value,
                  }))
                }
                placeholder="martin"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label className={`space-y-1 text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}>
              <span>Default domain key</span>
              <Input
                className="text-sm"
                value={createForm.defaultDomainKey || ""}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    defaultDomainKey: event.target.value,
                  }))
                }
                placeholder="default"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
            <label className={`space-y-1 text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}>
              <span>Default domain name</span>
              <Input
                className="text-sm"
                value={createForm.defaultDomainName || ""}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    defaultDomainName: event.target.value,
                  }))
                }
                placeholder="default"
                autoCapitalize="none"
                spellCheck={false}
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              onClick={() => void submitCreateSpace()}
              disabled={
                creating ||
                !createForm.name.trim() ||
                !(
                  createForm.ownerUsername ||
                  createForm.ownerUserId ||
                  ""
                ).trim()
              }
            >
              {creating ? "Creating…" : "Create space"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCreate(false)}
              disabled={creating}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <SpaceFilters value={filters} onChange={setFilters} />

      {error && <Alert>{error}</Alert>}

      {!loading && (
        <Text intent="muted" size="sm">
          Showing {filteredSpaces.length} of {spaces.length} loaded space
          {spaces.length === 1 ? "" : "s"}.
        </Text>
      )}

      {loading ? (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-8 text-center`}
        >
          <Text intent="muted">Loading spaces…</Text>
        </div>
      ) : showPartialSearchMiss ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
          <Text
            as="p"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            No matches among the {spaces.length} loaded space
            {spaces.length === 1 ? "" : "s"}.
          </Text>
          <Text intent="muted" size="sm" className="mt-2">
            More spaces have not been loaded yet. Load more spaces to continue
            searching for “{query}”.
          </Text>
          <div className="mt-4 flex justify-center">{loadMoreButton}</div>
        </div>
      ) : (
        <>
          <SpaceTable
            spaces={filteredSpaces}
            canDelete={canDeleteSpace}
            deletingSpaceId={deletingSpaceId}
            onDelete={requestDeleteSpace}
          />
          {hasMoreSpaces && (
            <div className="flex justify-center">{loadMoreButton}</div>
          )}
        </>
      )}

      <DeleteSpaceDialog
        space={pendingDelete}
        confirmName={deleteConfirmName}
        deleting={Boolean(deletingSpaceId)}
        onConfirmNameChange={setDeleteConfirmName}
        onCancel={() => {
          setPendingDelete(null);
          setDeleteConfirmName("");
        }}
        onConfirm={() => void confirmDeleteSpace()}
      />
    </section>
  );
}

function DeleteSpaceDialog({
  space,
  confirmName,
  deleting,
  onConfirmNameChange,
  onCancel,
  onConfirm,
}: {
  space: SpaceInfo | null;
  confirmName: string;
  deleting: boolean;
  onConfirmNameChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!space) return null;
  const matchesName = confirmName === space.name;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div
        className={`w-full max-w-lg rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <Text
          as="p"
          size="sm"
          className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.danger}`}
        >
          Delete space
        </Text>
        <h2 className={`mt-2 text-xl font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          Confirm space deletion
        </h2>
        <Text intent="muted" className="mt-3">
          Delete{" "}
          <span className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
            {space.name}
          </span>
          ? This is a destructive space lifecycle action and may remove
          associated domains, graph data, semantic state, and access grants.
        </Text>
        <label className={`mt-5 block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}>
          Type{" "}
          <span className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
            {space.name}
          </span>{" "}
          to confirm
          <Input
            className="mt-2 text-sm"
            value={confirmName}
            onChange={(event) => onConfirmNameChange(event.target.value)}
            disabled={deleting}
            autoFocus
          />
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={deleting || !matchesName}
          >
            {deleting ? "Deleting…" : "Delete space"}
          </Button>
        </div>
      </div>
    </div>
  );
}
