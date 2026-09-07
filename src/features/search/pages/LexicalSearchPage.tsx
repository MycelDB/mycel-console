import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Alert,
  Button,
  ErrorGroup,
  errorMessage,
  Input,
  ResourceIdText,
  Select,
  Text,
  themeClasses,
} from "../../../components/typography";
import {
  canUseCapability,
  type ConsolePrincipalContext,
} from "../../console";
import {
  getLexicalIndexStatus as defaultGetLexicalIndexStatus,
  lexicalSearch as defaultLexicalSearch,
  listDomains as defaultListDomains,
  listSpaces as defaultListSpaces,
  rebuildLexicalIndex as defaultRebuildLexicalIndex,
} from "../../../services/adminService";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../types/domains";
import type {
  LexicalIndexScopeInput,
  LexicalIndexStatus,
  LexicalSearchInput,
  LexicalSearchResponse,
  RebuildLexicalIndexInput,
  RebuildLexicalIndexResponse,
} from "../../../types/lexical";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../types/spaces";

export type LexicalSearchPageProps = {
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  lexicalSearchService?: (input: LexicalSearchInput) => Promise<LexicalSearchResponse>;
  getLexicalIndexStatusService?: (input: LexicalIndexScopeInput) => Promise<LexicalIndexStatus>;
  rebuildLexicalIndexService?: (input: RebuildLexicalIndexInput) => Promise<RebuildLexicalIndexResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function LexicalSearchPage({
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  lexicalSearchService = defaultLexicalSearch,
  getLexicalIndexStatusService = defaultGetLexicalIndexStatus,
  rebuildLexicalIndexService = defaultRebuildLexicalIndex,
  principalContext,
}: LexicalSearchPageProps) {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [domainId, setDomainId] = useState("");
  const [query, setQuery] = useState("");
  const [pageSize, setPageSize] = useState(20);
  const [pageToken, setPageToken] = useState("");
  const [allowStale, setAllowStale] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchResponse, setSearchResponse] = useState<LexicalSearchResponse | null>(null);
  const [status, setStatus] = useState<LexicalIndexStatus | null>(null);
  const [rebuildNotice, setRebuildNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSpacesService({ pageSize: 100 })
      .then((response) => {
        if (cancelled) return;
        setSpaces(response.spaces);
        setSpaceId((current) => current || response.spaces[0]?.spaceId || "");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Unable to load spaces"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listSpacesService]);

  useEffect(() => {
    let cancelled = false;
    setDomains([]);
    setDomainId("");
    setStatus(null);
    setSearchResponse(null);
    if (!spaceId) return () => {
      cancelled = true;
    };
    listDomainsService({ spaceId, pageSize: 100, includeSystem: false })
      .then((response) => {
        if (cancelled) return;
        setDomains(response.domains);
        const defaultDomain = response.domains.find((domain) => domain.isDefault) || response.domains[0];
        setDomainId(defaultDomain?.domainId || "");
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Unable to load domains"));
      });
    return () => {
      cancelled = true;
    };
  }, [spaceId, listDomainsService]);

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.spaceId === spaceId),
    [spaceId, spaces],
  );
  const selectedDomain = useMemo(
    () => domains.find((domain) => domain.domainId === domainId),
    [domainId, domains],
  );

  async function loadStatus() {
    if (!spaceId || !domainId) return;
    setError("");
    setStatusLoading(true);
    try {
      setStatus(await getLexicalIndexStatusService({ spaceId, domainId }));
    } catch (err) {
      setError(errorMessage(err, "Unable to load lexical index status"));
    } finally {
      setStatusLoading(false);
    }
  }

  async function submitSearch(event?: FormEvent<HTMLFormElement>, nextPageToken = pageToken) {
    event?.preventDefault();
    if (!spaceId || !domainId || !query.trim()) return;
    setError("");
    setRebuildNotice("");
    setSearchLoading(true);
    try {
      const response = await lexicalSearchService({
        spaceId,
        domainId,
        query: query.trim(),
        pageSize,
        pageToken: nextPageToken,
        allowStale,
        includeDiagnostics,
      });
      setSearchResponse(response);
      setPageToken(nextPageToken);
      if (response.freshness) {
        setStatus((current) => current || {
          spaceId,
          domainId,
          state: response.freshness?.state || "",
          indexedGraphRevision: response.freshness?.indexedGraphRevision || 0,
          latestKnownGraphRevision: response.freshness?.latestKnownGraphRevision || 0,
          revisionLag: response.freshness?.revisionLag || 0,
          liveDocumentCount: 0,
          deletedDocumentCount: 0,
          segmentCount: 0,
          analyzerVersion: "",
          indexFormatVersion: "",
          updatedAt: response.freshness?.updatedAt || "",
          lastRebuildAt: "",
          lastError: response.freshness?.lastError || "",
        });
      }
    } catch (err) {
      setError(errorMessage(err, "Lexical search failed"));
    } finally {
      setSearchLoading(false);
    }
  }

  async function rebuild(dryRun: boolean) {
    if (!spaceId || !domainId) return;
    setError("");
    setRebuildNotice("");
    setRebuildLoading(true);
    try {
      const response = await rebuildLexicalIndexService({ spaceId, domainId, dryRun });
      setRebuildNotice(
        dryRun
          ? `Dry run accepted: ${response.accepted ? "yes" : "no"}`
          : `Rebuild ${response.state}: accepted=${response.accepted}`,
      );
      await loadStatus();
    } catch (err) {
      setError(errorMessage(err, "Unable to rebuild lexical index"));
    } finally {
      setRebuildLoading(false);
    }
  }

  const scopeReady = Boolean(spaceId && domainId);
  const canMaintainLexical = canUseCapability(principalContext, "system.maintain_space");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Search"
        title="Lexical search"
        description="Run BM25 full-text search over node payload and property text, inspect index freshness, and trigger maintenance rebuilds."
      />
      {error ? <ErrorGroup errors={[{ id: "lexical-search", source: "Lexical search", message: error }]} /> : null}
      {rebuildNotice ? <Alert variant="success">{rebuildNotice}</Alert> : null}

      <section className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`}>
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Space"
            value={spaceId}
            onChange={setSpaceId}
            disabled={loading}
            placeholder="Select a space"
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
              hint: space.spaceId,
            }))}
          />
          <Select
            label="Domain"
            value={domainId}
            onChange={setDomainId}
            disabled={!spaceId}
            placeholder="Select a domain"
            options={domains.map((domain) => ({
              value: domain.domainId,
              label: domain.key || domain.name || domain.domainId,
              hint: domain.domainId,
            }))}
          />
        </div>
        <div className="mt-3 grid gap-2 text-xs md:grid-cols-2">
          <Text intent="muted">Space ID: <ResourceIdText value={selectedSpace?.spaceId || spaceId || "none"} /></Text>
          <Text intent="muted">Domain ID: <ResourceIdText value={selectedDomain?.domainId || domainId || "none"} /></Text>
        </div>
      </section>

      <form className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`} onSubmit={(event) => void submitSearch(event, "")}>
        <label className="space-y-2">
          <Text as="span" size="sm" intent="subtle">Query</Text>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'"vector database" AND raft'} />
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Page size</Text>
            <Input type="number" min={1} max={100} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value) || 20)} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={allowStale} onChange={(event) => setAllowStale(event.target.checked)} />
            Allow stale results
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeDiagnostics} onChange={(event) => setIncludeDiagnostics(event.target.checked)} />
            Include diagnostics
          </label>
          <Button type="submit" disabled={!scopeReady || !query.trim() || searchLoading}>{searchLoading ? "Searching…" : "Search"}</Button>
        </div>
      </form>

      <section className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text as="h2" intent="primary" className="text-lg font-semibold">Index status</Text>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void loadStatus()} disabled={!scopeReady || statusLoading}>{statusLoading ? "Loading…" : "Refresh"}</Button>
            {canMaintainLexical ? (
              <>
                <Button variant="secondary" onClick={() => void rebuild(true)} disabled={!scopeReady || rebuildLoading}>Dry run</Button>
                <Button variant="secondary" onClick={() => void rebuild(false)} disabled={!scopeReady || rebuildLoading}>Rebuild</Button>
              </>
            ) : null}
          </div>
        </div>
        {status ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-4">
            <div><dt className={themeClasses.text.parts.quietLight}>State</dt><dd>{status.state}</dd></div>
            <div><dt className={themeClasses.text.parts.quietLight}>Revision lag</dt><dd>{status.revisionLag}</dd></div>
            <div><dt className={themeClasses.text.parts.quietLight}>Segments</dt><dd>{status.segmentCount}</dd></div>
            <div><dt className={themeClasses.text.parts.quietLight}>Live documents</dt><dd>{status.liveDocumentCount}</dd></div>
          </dl>
        ) : (
          <Text intent="muted" size="sm" className="mt-3">Refresh status for the selected scope.</Text>
        )}
      </section>

      <section className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`}>
        <Text as="h2" intent="primary" className="text-lg font-semibold">Results</Text>
        {searchResponse?.warnings.length ? (
          <div className="mt-3 space-y-2">
            {searchResponse.warnings.map((warning) => <Alert key={warning} variant="warning">{warning}</Alert>)}
          </div>
        ) : null}
        {searchResponse?.freshness ? (
          <Text intent="muted" size="sm" className="mt-3">
            Freshness: {searchResponse.freshness.state}; indexed {searchResponse.freshness.indexedGraphRevision}, latest {searchResponse.freshness.latestKnownGraphRevision}, lag {searchResponse.freshness.revisionLag}
          </Text>
        ) : null}
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {(searchResponse?.results || []).map((result) => (
            <div key={`${result.nodeId}-${result.indexedGraphRevision}`} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text intent="primary" className="font-medium"><ResourceIdText value={result.nodeId} /></Text>
                <Text intent="muted" size="sm">score {result.score.toFixed(4)} · {result.scoreKind}</Text>
              </div>
              <Text intent="muted" size="xs" className="mt-1">Revision {result.indexedGraphRevision}</Text>
              {includeDiagnostics ? (
                <Text intent="muted" size="xs" className="mt-1">Terms: {result.matchedTerms.join(", ") || "none"}; fields: {result.matchedFieldPaths.join(", ") || "none"}</Text>
              ) : null}
            </div>
          ))}
        </div>
        {searchResponse && searchResponse.results.length === 0 ? <Text intent="muted" size="sm">No lexical matches.</Text> : null}
        {searchResponse?.nextPageToken ? (
          <Button className="mt-4" variant="secondary" onClick={() => void submitSearch(undefined, searchResponse.nextPageToken)} disabled={searchLoading}>Next page</Button>
        ) : null}
      </section>
    </div>
  );
}
