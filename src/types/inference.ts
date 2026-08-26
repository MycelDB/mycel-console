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
  kind: string;
  modelName: string;
  connectorTypes: string[];
  dimensions: number;
  inputModalities: string[];
  outputModalities: string[];
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
  modelEndpointKey?: string;
  modelId: string;
  modelKey?: string;
  operation: string;
  enabled: boolean;
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
  kind?: string;
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
  kind?: string;
  model_name?: string;
  connector_types?: string[];
  dimensions?: number;
  input_modalities?: string[];
  output_modalities?: string[];
  vector_space_key?: string;
  context_tokens?: number;
  max_output_tokens?: number;
  enabled?: boolean;
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

export type TimestampInput = { seconds: number; nanos?: number };

export type ProcessingScopeInput = {
  spaceId?: string;
  domainId?: string;
  semanticRuleId?: string;
  nodeId?: string;
  includeDescendants?: boolean;
};

export type ProcessingScopeInfo = Required<ProcessingScopeInput>;

export type InferenceParametersInput = {
  temperature?: number;
  maxInputTokens?: number;
  maxOutputTokens?: number;
  responseFormat?: string;
  metadata?: JsonObject;
};

export type InferencePrivacyRequirementInput = {
  allowedPrivacyClasses?: string[];
  requireLocalEndpoint?: boolean;
  disallowThirdParty?: boolean;
};

export type InferenceProfileInfo = {
  inferenceProfileId: string;
  spaceId: string;
  key: string;
  displayName: string;
  description: string;
  operation: string;
  purpose: string;
  domainIds: string[];
  capabilityRefs: string[];
  endpointRefs: string[];
  modelRefs: string[];
  requiredFeatures: string[];
  enabled: boolean;
  createdBy: string;
  createTime: string;
  updateTime: string;
  metadata?: JsonObject | null;
};

export type ListInferenceProfilesInput = {
  spaceId?: string;
  domainId?: string;
  operation?: string;
  purpose?: string;
  includeDisabled?: boolean;
  pageSize?: number;
  pageToken?: string;
};

export type ListInferenceProfilesResponse = { inferenceProfiles: InferenceProfileInfo[]; nextPageToken: string };

export type CreateInferenceProfileInput = {
  spaceId: string;
  key: string;
  displayName?: string;
  description?: string;
  operation?: string;
  purpose?: string;
  domainIds?: string[];
  capabilityRefs?: string[];
  endpointRefs?: string[];
  modelRefs?: string[];
  requiredFeatures?: string[];
  privacyRequirement?: InferencePrivacyRequirementInput;
  defaultParameters?: InferenceParametersInput;
  enabled?: boolean;
  metadata?: JsonObject;
};

export type InferenceProfileActionInput = { spaceId: string; inferenceProfile?: string; inferenceProfileId?: string; enabled?: boolean };
export type InferenceProfileResponse = { inferenceProfile?: InferenceProfileInfo | null };

export type InferenceCredentialInfo = {
  credentialId: string;
  key: string;
  displayName: string;
  modelEndpointId: string;
  modelEndpointKey?: string;
  ownerType: string;
  ownerId: string;
  authType: string;
  secretId: string;
  status: string;
  isDefault: boolean;
  createTime: string;
  updateTime: string;
  lastUsedTime: string;
  secretVersion: string;
  secretSuffix: string;
  rotatedAt: string;
};

export type ListCredentialsInput = { pageSize?: number; pageToken?: string; ownerType?: string; ownerId?: string; modelEndpointId?: string; includeInactive?: boolean };
export type ListCredentialsResponse = { credentials: InferenceCredentialInfo[]; nextPageToken: string };
export type CreateCredentialInput = { key: string; displayName?: string; modelEndpoint?: string; modelEndpointId?: string; ownerType?: string; ownerId?: string; authType?: string; secretValue?: string; isDefault?: boolean };
export type CredentialStatusInput = { credential?: string; credentialId?: string; status: string };
export type RotateCredentialInput = { credential?: string; credentialId?: string; secretValue?: string; reason?: string };
export type DeleteCredentialInput = { credential?: string; credentialId?: string; deleteGrants?: boolean; deleteSecret?: boolean };
export type CredentialResponse = { credential?: InferenceCredentialInfo | null };
export type DeleteCredentialResponse = { credentialId: string; credentialGrantsDeleted: number; secretDeleted: boolean };

export type CredentialGrantInfo = {
  credentialGrantId: string;
  credentialId: string;
  scope?: ProcessingScopeInfo | null;
  operations: string[];
  modelEndpointId: string;
  modelEndpointKey?: string;
  modelId: string;
  modelKey?: string;
  priority: number;
  isDefault: boolean;
  allowBackgroundUse: boolean;
  grantedBy: string;
  createTime: string;
  expireTime: string;
  inferenceProfileIds: string[];
  modelEndpointCapabilityIds: string[];
  granteePrincipalIds: string[];
  allowOnBehalfOfPrincipalIds: string[];
  state: string;
  revokedBy: string;
  revokedAt: string;
  reason: string;
};

export type ListCredentialGrantsInput = { spaceId: string; pageSize?: number; pageToken?: string; credentialId?: string; includeExpired?: boolean };
export type ListCredentialGrantsResponse = { credentialGrants: CredentialGrantInfo[]; nextPageToken: string };
export type CreateCredentialGrantInput = { spaceId: string; credential?: string; credentialId?: string; scope?: ProcessingScopeInput; operations?: string[]; modelEndpoint?: string; modelEndpointId?: string; model?: string; modelId?: string; priority?: number; isDefault?: boolean; allowBackgroundUse?: boolean; expiresAt?: TimestampInput; granteePrincipalIds?: string[]; allowOnBehalfOfPrincipalIds?: string[] };
export type CredentialGrantActionInput = { spaceId: string; credentialGrantId: string };
export type CredentialGrantResponse = { credentialGrant?: CredentialGrantInfo | null };
export type DeleteCredentialGrantResponse = { credentialGrantId: string };

export type InferencePolicyInfo = {
  inferencePolicyId: string;
  scope?: ProcessingScopeInfo | null;
  effect: string;
  operations: string[];
  noInference: boolean;
  allowedPrivacyClasses: string[];
  disallowThirdParty: boolean;
  requireLocalEndpoint: boolean;
  reason: string;
  createdBy: string;
  createTime: string;
  expireTime: string;
  action: string;
  inferenceProfileIds: string[];
  maxInputTokens: number;
  maxOutputTokens: number;
  maxRequestsPerRun: number;
  dataClasses: string[];
  priority: number;
  state: string;
  revokedBy: string;
  revokedAt: string;
};

export type ListInferencePoliciesInput = { spaceId: string; pageSize?: number; pageToken?: string; effect?: string; includeExpired?: boolean };
export type ListInferencePoliciesResponse = { inferencePolicies: InferencePolicyInfo[]; nextPageToken: string };
export type CreateInferencePolicyInput = { spaceId: string; scope?: ProcessingScopeInput; effect?: string; operations?: string[]; noInference?: boolean; allowedPrivacyClasses?: string[]; disallowThirdParty?: boolean; requireLocalEndpoint?: boolean; reason?: string; expiresAt?: TimestampInput };
export type InferencePolicyActionInput = { spaceId: string; inferencePolicyId: string };
export type InferencePolicyResponse = { inferencePolicy?: InferencePolicyInfo | null };
export type DeleteInferencePolicyResponse = { inferencePolicyId: string };

export type InferenceUsageEventInfo = {
  usageEventId: string;
  requestId: string;
  operation: string;
  usageMode: string;
  status: string;
  spaceId: string;
  domainId: string;
  nodeId: string;
  automationId: string;
  automationRunId: string;
  semanticRuleId: string;
  actorPrincipalId: string;
  onBehalfOfPrincipalId: string;
  inferenceProfileId: string;
  modelEndpointId: string;
  modelEndpointKey?: string;
  modelId: string;
  modelKey?: string;
  modelEndpointCapabilityId: string;
  credentialId: string;
  credentialGrantId: string;
  policyDecisionId: string;
  providerRequestId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMillis: number;
  errorCode: string;
  errorMessage: string;
  startedAt: string;
  completedAt: string;
  metadata?: JsonObject | null;
};

export type InferenceUsageSummaryInfo = { group: Record<string, string>; requestCount: number; succeededCount: number; failedCount: number; deniedCount: number; inputTokens: number; outputTokens: number; totalTokens: number; totalLatencyMillis: number };
export type ListUsageEventsInput = { spaceId: string; scope?: ProcessingScopeInput; operation?: string; usageMode?: string; status?: string; inferenceProfileId?: string; modelEndpointId?: string; modelId?: string; credentialGrantId?: string; automationId?: string; automationRunId?: string; semanticRuleId?: string; actorPrincipalId?: string; onBehalfOfPrincipalId?: string; since?: TimestampInput; until?: TimestampInput; pageSize?: number; pageToken?: string };
export type ListUsageEventsResponse = { usageEvents: InferenceUsageEventInfo[]; nextPageToken: string };
export type SummarizeUsageInput = { spaceId: string; scope?: ProcessingScopeInput; since?: TimestampInput; until?: TimestampInput; groupBy?: string[] };
export type SummarizeUsageResponse = { summaries: InferenceUsageSummaryInfo[] };
