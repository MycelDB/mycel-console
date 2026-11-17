export type LexicalIndexState =
  | "LEXICAL_INDEX_STATE_UNSPECIFIED"
  | "LEXICAL_INDEX_STATE_READY"
  | "LEXICAL_INDEX_STATE_BUILDING"
  | "LEXICAL_INDEX_STATE_STALE"
  | "LEXICAL_INDEX_STATE_UNAVAILABLE"
  | "LEXICAL_INDEX_STATE_ERROR";

export type SearchScoreKind =
  | "SEARCH_SCORE_KIND_UNSPECIFIED"
  | "SEARCH_SCORE_KIND_BM25"
  | "SEARCH_SCORE_KIND_HYBRID_FUSED";

export type SearchMode = "lexical" | "hybrid";

export type SemanticConsistency = "strict" | "read_your_writes" | "bounded_stale" | "best_effort";

export type SemanticStaleBehavior = "fail" | "serve_last_good" | "skip_channel";

export type PropertyFilterInput = {
  path: string;
  operator: "equals" | "not-equals" | "in" | "contains" | "exists";
  values?: string[];
};

export type SearchFiltersInput = {
  nodeLabels?: string[];
  nodeIds?: string[];
  properties?: PropertyFilterInput[];
};

export type LexicalSearchInput = {
  spaceId: string;
  domainId: string;
  lexicalQuery: string;
  semanticQuery?: string;
  mode?: SearchMode;
  pageSize?: number;
  pageToken?: string;
  allowStale?: boolean;
  maxRevisionLag?: number;
  includeDiagnostics?: boolean;
  lexicalWeight?: number;
  semanticWeight?: number;
  requireBoth?: boolean;
  lexicalCandidates?: number;
  semanticCandidates?: number;
  semanticRuleId?: string;
  embeddingBindingKey?: string;
  semanticMinScore?: number;
  semanticConsistency?: SemanticConsistency;
  semanticStaleBehavior?: SemanticStaleBehavior;
  minRequiredGraphRevision?: number;
  maxSemanticRevisionLag?: number;
  maxSemanticStalenessSeconds?: number;
  filters?: SearchFiltersInput;
};

export type SearchResultSource = {
  kind: string;
  rawScore: number;
  rank: number;
  normalizedScore: number;
};

export type LexicalSearchResult = {
  spaceId: string;
  domainId: string;
  nodeId: string;
  score: number;
  scoreKind: SearchScoreKind | string;
  indexedGraphRevision: number;
  matchedTerms: string[];
  matchedFieldPaths: string[];
  sources: SearchResultSource[];
};

export type LexicalFreshness = {
  state: LexicalIndexState | string;
  indexedGraphRevision: number;
  latestKnownGraphRevision: number;
  revisionLag: number;
  updatedAt: string;
  lastError: string;
};

export type SearchChannelStatus = {
  used: boolean;
  state: string;
  servedGraphRevision: number;
  latestKnownGraphRevision: number;
  revisionLag: number;
  reason: string;
  retryable: boolean;
};

export type SearchChannelDiagnostics = {
  lexical?: SearchChannelStatus | null;
  semantic?: SearchChannelStatus | null;
};

export type LexicalSearchResponse = {
  results: LexicalSearchResult[];
  nextPageToken: string;
  freshness?: LexicalFreshness | null;
  warnings: string[];
  channelDiagnostics?: SearchChannelDiagnostics | null;
};

export type LexicalIndexScopeInput = {
  spaceId: string;
  domainId: string;
};

export type LexicalIndexStatus = {
  spaceId: string;
  domainId: string;
  state: LexicalIndexState | string;
  indexedGraphRevision: number;
  latestKnownGraphRevision: number;
  revisionLag: number;
  liveDocumentCount: number;
  deletedDocumentCount: number;
  segmentCount: number;
  analyzerVersion: string;
  indexFormatVersion: string;
  updatedAt: string;
  lastRebuildAt: string;
  lastError: string;
};

export type RebuildLexicalIndexInput = LexicalIndexScopeInput & {
  force?: boolean;
  dryRun?: boolean;
};

export type RebuildLexicalIndexResponse = {
  spaceId: string;
  domainId: string;
  state: LexicalIndexState | string;
  accepted: boolean;
  dryRun: boolean;
  rebuildId: string;
  warnings: string[];
};
