export type SemanticIndexState =
  | "SEMANTIC_INDEX_STATE_UNSPECIFIED"
  | "SEMANTIC_INDEX_STATE_ACTIVE"
  | "SEMANTIC_INDEX_STATE_BUILDING"
  | "SEMANTIC_INDEX_STATE_STALE"
  | "SEMANTIC_INDEX_STATE_DISABLED"
  | "SEMANTIC_INDEX_STATE_ERROR";

export type SemanticIndexInfo = {
  semanticIndexId: string;
  key: string;
  displayName: string;
  description: string;
  spaceId: string;
  domainId: string;
  modelLabel: string;
  vectorStoreLabel: string;
  state: SemanticIndexState | string;
};

export type ListSemanticIndexesInput = {
  spaceId: string;
  domainId?: string;
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
};

export type ListSemanticIndexesResponse = {
  indexes: SemanticIndexInfo[];
  nextPageToken: string;
};
