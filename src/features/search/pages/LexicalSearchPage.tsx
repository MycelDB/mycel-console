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
  SearchMode,
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
  const [mode, setMode] = useState<SearchMode>("lexical");
  const [pageSize, setPageSize] = useState(20);
  const [pageToken, setPageToken] = useState("");
  const [allowStale, setAllowStale] = useState(false);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [lexicalWeight, setLexicalWeight] = useState(0.5);
  const [semanticWeight, setSemanticWeight] = useState(0.5);
  const [requireBoth, setRequireBoth] = useState(false);
  const [lexicalCandidates, setLexicalCandidates] = useState(0);
  const [semanticCandidates, setSemanticCandidates] = useState(0);
  const [semanticRuleId, setSemanticRuleId] = useState("");
  const [embeddingBindingKey, setEmbeddingBindingKey] = useState("");
  const [labelFilters, setLabelFilters] = useState("");
  const [propertyFilters, setPropertyFilters] = useState("");
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
        mode,
        pageSize,
        pageToken: mode === "hybrid" ? "" : nextPageToken,
        allowStale,
        includeDiagnostics,
        lexicalWeight: mode === "hybrid" ? lexicalWeight : undefined,
        semanticWeight: mode === "hybrid" ? semanticWeight : undefined,
        requireBoth: mode === "hybrid" ? requireBoth : undefined,
        lexicalCandidates: lexicalCandidates || undefined,
        semanticCandidates: mode === "hybrid" ? semanticCandidates || undefined : undefined,
        semanticRuleId: mode === "hybrid" ? semanticRuleId.trim() || undefined : undefined,
        embeddingBindingKey: mode === "hybrid" ? embeddingBindingKey.trim() || undefined : undefined,
        filters: buildSearchFilters(labelFilters, propertyFilters),
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
        title="Search"
        description="Run lexical or hybrid lexical + semantic search, inspect index freshness, and trigger maintenance rebuilds."
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
        <div className="grid gap-4 md:grid-cols-2">
          <Select
            label="Mode"
            value={mode}
            onChange={(value) => setMode(value as SearchMode)}
            options={[
              { value: "lexical", label: "Lexical" },
              { value: "hybrid", label: "Hybrid lexical + semantic" },
            ]}
          />
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Query</Text>
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={'"vector database" AND raft'} />
          </label>
        </div>
        {mode === "hybrid" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <label className="space-y-2">
              <Text as="span" size="sm" intent="subtle">Lexical weight</Text>
              <Input type="number" min={0} step={0.1} value={lexicalWeight} onChange={(event) => setLexicalWeight(Number(event.target.value) || 0)} />
            </label>
            <label className="space-y-2">
              <Text as="span" size="sm" intent="subtle">Semantic weight</Text>
              <Input type="number" min={0} step={0.1} value={semanticWeight} onChange={(event) => setSemanticWeight(Number(event.target.value) || 0)} />
            </label>
            <label className="space-y-2">
              <Text as="span" size="sm" intent="subtle">Lexical candidates</Text>
              <Input type="number" min={0} value={lexicalCandidates} onChange={(event) => setLexicalCandidates(Number(event.target.value) || 0)} />
            </label>
            <label className="space-y-2">
              <Text as="span" size="sm" intent="subtle">Semantic candidates</Text>
              <Input type="number" min={0} value={semanticCandidates} onChange={(event) => setSemanticCandidates(Number(event.target.value) || 0)} />
            </label>
            <label className="flex items-center gap-2 text-sm md:col-span-4">
              <input type="checkbox" checked={requireBoth} onChange={(event) => setRequireBoth(event.target.checked)} />
              Require both lexical and semantic matches
            </label>
            <label className="space-y-2 md:col-span-2">
              <Text as="span" size="sm" intent="subtle">Semantic rule ID</Text>
              <Input value={semanticRuleId} onChange={(event) => setSemanticRuleId(event.target.value)} placeholder="optional" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <Text as="span" size="sm" intent="subtle">Embedding binding key</Text>
              <Input value={embeddingBindingKey} onChange={(event) => setEmbeddingBindingKey(event.target.value)} placeholder="optional; requires rule ID" />
            </label>
          </div>
        ) : null}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Required labels</Text>
            <Input value={labelFilters} onChange={(event) => setLabelFilters(event.target.value)} placeholder="comma separated, e.g. Note,Incident" />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Property filters</Text>
            <Input value={propertyFilters} onChange={(event) => setPropertyFilters(event.target.value)} placeholder="tags:contains:k3s; status:equals:published" />
          </label>
        </div>
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
                <div className="mt-1 space-y-1">
                  <Text intent="muted" size="xs">Terms: {result.matchedTerms.join(", ") || "none"}; fields: {result.matchedFieldPaths.join(", ") || "none"}</Text>
                  {result.sources?.length ? (
                    <Text intent="muted" size="xs">Sources: {result.sources.map((source) => `${source.kind.replace("SEARCH_RESULT_SOURCE_KIND_", "").toLowerCase()} rank ${source.rank}`).join("; ")}</Text>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {searchResponse && searchResponse.results.length === 0 ? <Text intent="muted" size="sm">No search matches.</Text> : null}
        {searchResponse?.nextPageToken && mode !== "hybrid" ? (
          <Button className="mt-4" variant="secondary" onClick={() => void submitSearch(undefined, searchResponse.nextPageToken)} disabled={searchLoading}>Next page</Button>
        ) : null}
      </section>
    </div>
  );
}

function buildSearchFilters(labelText: string, propertyText: string): LexicalSearchInput["filters"] | undefined {
  const nodeLabels = labelText.split(",").map((value) => value.trim()).filter(Boolean);
  const properties = propertyText
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((spec) => {
      const [path = "", operator = "", valueText = ""] = spec.split(":");
      const normalizedOperator = operator.trim().replace(/_/g, "-") as "equals" | "not-equals" | "in" | "contains" | "exists";
      return {
        path: path.trim(),
        operator: normalizedOperator,
        values: valueText.split(",").map((value) => value.trim()).filter(Boolean),
      };
    })
    .filter((filter) => filter.path && filter.operator);
  if (!nodeLabels.length && !properties.length) return undefined;
  return { nodeLabels, properties };
}
