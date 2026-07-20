export type JsonObject = Record<string, unknown>;

export type InferencePackageInfo = {
  inferencePackageId: string;
  name: string;
  version: string;
  source: string;
  checksum: string;
  definitionCounts: Record<string, number>;
  installedAt: string;
  installedBy: string;
};

export type ListInferencePackagesInput = {
  pageSize?: number;
  pageToken?: string;
};

export type ListInferencePackagesResponse = {
  packages: InferencePackageInfo[];
  nextPageToken: string;
};

export type ModelEndpointInfo = {
  modelEndpointId: string;
  key: string;
  name: string;
  connectorType: string;
  endpointUrl: string;
  networkClass: string;
  privacyClass: string;
  authModes: string[];
  operations: string[];
  enabled: boolean;
  metadata?: JsonObject | null;
};

export type InferenceModelInfo = {
  modelId: string;
  key: string;
  operation: string;
  modelName: string;
  connectorTypes: string[];
  dimensions: number;
  modality: string;
  vectorSpaceKey: string;
  metadata?: JsonObject | null;
};

export type VectorStoreInfo = {
  vectorStoreId: string;
  key: string;
  name: string;
  type: string;
  privacyClass: string;
  enabled: boolean;
  config?: JsonObject | null;
};

export type ModelEndpointCapabilityInfo = {
  modelEndpointCapabilityId: string;
  modelEndpointId: string;
  modelId: string;
  operation: string;
  enabled: boolean;
  modelNameOverride: string;
  metadata?: JsonObject | null;
};

export type ListModelEndpointsInput = {
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
};

export type ListModelsInput = {
  pageSize?: number;
  pageToken?: string;
  operation?: string;
};

export type ListVectorStoresInput = {
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
};

export type ListModelEndpointCapabilitiesInput = {
  pageSize?: number;
  pageToken?: string;
  modelEndpointId?: string;
  modelId?: string;
  operation?: string;
  includeDisabled?: boolean;
};

export type ListModelEndpointsResponse = {
  modelEndpoints: ModelEndpointInfo[];
  nextPageToken: string;
};

export type ListModelsResponse = {
  models: InferenceModelInfo[];
  nextPageToken: string;
};

export type ListVectorStoresResponse = {
  vectorStores: VectorStoreInfo[];
  nextPageToken: string;
};

export type ListModelEndpointCapabilitiesResponse = {
  modelEndpointCapabilities: ModelEndpointCapabilityInfo[];
  nextPageToken: string;
};

export type ModelEndpointInput = {
  key: string;
  name?: string;
  connector_type?: string;
  endpoint_url?: string;
  network_class?: string;
  privacy_class?: string;
  auth_modes?: string[];
  operations?: string[];
  enabled?: boolean;
  metadata?: JsonObject;
};

export type InferenceModelInput = {
  key: string;
  operation?: string;
  model_name?: string;
  connector_types?: string[];
  dimensions?: number;
  modality?: string;
  vector_space_key?: string;
  metadata?: JsonObject;
};

export type VectorStoreInput = {
  key: string;
  name?: string;
  type?: string;
  privacy_class?: string;
  enabled?: boolean;
  config?: JsonObject;
};

export type ModelEndpointCapabilityDefinitionInput = {
  model_endpoint?: string;
  model_endpoint_id?: string;
  model?: string;
  model_id?: string;
  operation?: string;
  enabled?: boolean;
  model_name_override?: string;
  metadata?: JsonObject;
};

export type InferencePackageDocument = {
  name: string;
  version: string;
  source?: string;
  checksum?: string;
  model_endpoints?: ModelEndpointInput[];
  models?: InferenceModelInput[];
  vector_stores?: VectorStoreInput[];
  model_endpoint_capabilities?: ModelEndpointCapabilityDefinitionInput[];
};

export type ApplyInferencePackageResponse = {
  package?: InferencePackageInfo | null;
  modelEndpointCount: number;
  modelCount: number;
  vectorStoreCount: number;
  capabilityCount: number;
};
