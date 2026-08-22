use std::collections::HashMap;

use mycel_sdk::proto::admin::v1::{
    AdminInferenceCatalogServiceApplyInferencePackageRequest,
    AdminInferenceCatalogServiceListInferencePackagesRequest,
    AdminInferenceCatalogServiceListModelEndpointCapabilitiesRequest,
    AdminInferenceCatalogServiceListModelEndpointsRequest,
    AdminInferenceCatalogServiceListModelsRequest,
    AdminInferenceCatalogServiceListVectorStoresRequest, InferenceModel, InferencePackage,
    ModelEndpoint, ModelEndpointCapability, ModelEndpointCapabilityDefinition, VectorStore,
};

use mycel_sdk::proto::admin::v1::{
    AdminIntelligenceAccessCredentialServiceCreateCredentialRequest,
    AdminIntelligenceAccessCredentialServiceDeleteCredentialRequest,
    AdminIntelligenceAccessCredentialServiceListCredentialsRequest,
    AdminIntelligenceAccessCredentialServiceRotateCredentialRequest,
    AdminIntelligenceAccessCredentialServiceSetCredentialStatusRequest,
    AdminIntelligenceAccessGrantServiceCreateCredentialGrantRequest,
    AdminIntelligenceAccessGrantServiceDeleteCredentialGrantRequest,
    AdminIntelligenceAccessGrantServiceExpireCredentialGrantRequest,
    AdminIntelligenceAccessGrantServiceListCredentialGrantsRequest,
    AdminIntelligenceAccessPolicyServiceCreateAccessPolicyRequest,
    AdminIntelligenceAccessPolicyServiceDeleteAccessPolicyRequest,
    AdminIntelligenceAccessPolicyServiceExpireAccessPolicyRequest,
    AdminIntelligenceAccessPolicyServiceListAccessPoliciesRequest,
    AdminIntelligenceAccessProfileServiceCreateIntelligenceProfileRequest,
    AdminIntelligenceAccessProfileServiceDeleteIntelligenceProfileRequest,
    AdminIntelligenceAccessProfileServiceListIntelligenceProfilesRequest,
    AdminIntelligenceAccessProfileServiceSetIntelligenceProfileEnabledRequest,
    AdminIntelligenceAccessUsageServiceListUsageEventsRequest,
    AdminIntelligenceAccessUsageServiceSummarizeUsageRequest, IntelligenceAccessPolicy,
    IntelligenceAccessUsageEvent, IntelligenceAccessUsageSummary, IntelligenceCredential,
    IntelligenceCredentialGrant, IntelligenceProfile,
};
use mycel_sdk::proto::common::v1::{
    InferenceOperation, InferenceParameters, InferencePrivacyClass, InferencePrivacyRequirement,
    IntelligenceAccessGrantState, IntelligenceAccessPolicyAction, IntelligenceAccessPolicyState,
    IntelligenceAccessScope, IntelligenceAccessUsageMode, IntelligenceAccessUsageStatus,
};

use prost_types::{value::Kind, ListValue, Struct, Timestamp, Value};
use serde_json::Map;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInferencePackagesInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferencePackageInfo {
    pub inference_package_id: String,
    pub name: String,
    pub version: String,
    pub source: String,
    pub checksum: String,
    pub definition_counts: HashMap<String, i32>,
    pub installed_at: String,
    pub installed_by: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInferencePackagesResponse {
    pub packages: Vec<InferencePackageInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelEndpointsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub operation: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListVectorStoresInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelEndpointCapabilitiesInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub model_endpoint_id: Option<String>,
    #[serde(default)]
    pub model_id: Option<String>,
    #[serde(default)]
    pub operation: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEndpointInfo {
    pub model_endpoint_id: String,
    pub key: String,
    pub name: String,
    pub connector_type: String,
    pub endpoint_url: String,
    pub network_class: String,
    pub privacy_class: String,
    pub auth_modes: Vec<String>,
    pub operations: Vec<String>,
    pub enabled: bool,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceModelInfo {
    pub model_id: String,
    pub key: String,
    pub operation: String,
    pub model_name: String,
    pub connector_types: Vec<String>,
    pub dimensions: i32,
    pub modality: String,
    pub vector_space_key: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VectorStoreInfo {
    pub vector_store_id: String,
    pub key: String,
    pub name: String,
    pub r#type: String,
    pub privacy_class: String,
    pub enabled: bool,
    pub config: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelEndpointCapabilityInfo {
    pub model_endpoint_capability_id: String,
    pub model_endpoint_id: String,
    pub model_endpoint_key: String,
    pub model_id: String,
    pub model_key: String,
    pub operation: String,
    pub enabled: bool,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelEndpointsResponse {
    pub model_endpoints: Vec<ModelEndpointInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelsResponse {
    pub models: Vec<InferenceModelInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListVectorStoresResponse {
    pub vector_stores: Vec<VectorStoreInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListModelEndpointCapabilitiesResponse {
    pub model_endpoint_capabilities: Vec<ModelEndpointCapabilityInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyInferencePackageInput {
    pub name: String,
    pub version: String,
    #[serde(default)]
    pub source: Option<String>,
    #[serde(default)]
    pub checksum: Option<String>,
    #[serde(default, alias = "model_endpoints")]
    pub model_endpoints: Vec<ModelEndpointInput>,
    #[serde(default)]
    pub models: Vec<InferenceModelInput>,
    #[serde(default, alias = "vector_stores")]
    pub vector_stores: Vec<VectorStoreInput>,
    #[serde(default, alias = "model_endpoint_capabilities")]
    pub model_endpoint_capabilities: Vec<ModelEndpointCapabilityDefinitionInput>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct ModelEndpointInput {
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub connector_type: String,
    #[serde(default)]
    pub endpoint_url: String,
    #[serde(default)]
    pub network_class: String,
    #[serde(default)]
    pub privacy_class: String,
    #[serde(default)]
    pub auth_modes: Vec<String>,
    #[serde(default)]
    pub operations: Vec<String>,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub metadata: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct InferenceModelInput {
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub operation: String,
    #[serde(default)]
    pub model_name: String,
    #[serde(default)]
    pub connector_types: Vec<String>,
    #[serde(default)]
    pub dimensions: i32,
    #[serde(default)]
    pub modality: String,
    #[serde(default)]
    pub vector_space_key: String,
    #[serde(default)]
    pub metadata: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct VectorStoreInput {
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub r#type: String,
    #[serde(default)]
    pub privacy_class: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub config: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
pub struct ModelEndpointCapabilityDefinitionInput {
    #[serde(default)]
    pub model_endpoint: String,
    #[serde(default)]
    pub model_endpoint_id: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub model_id: String,
    #[serde(default)]
    pub operation: String,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub metadata: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyInferencePackageResponseInfo {
    pub package: Option<InferencePackageInfo>,
    pub model_endpoint_count: usize,
    pub model_count: usize,
    pub vector_store_count: usize,
    pub capability_count: usize,
}

#[tauri::command]
pub async fn admin_list_inference_packages(
    input: ListInferencePackagesInput,
    state: State<'_, AppState>,
) -> Result<ListInferencePackagesResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .list_inference_packages(tonic::Request::new(
            AdminInferenceCatalogServiceListInferencePackagesRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListInferencePackagesResponse {
        packages: response.packages.into_iter().map(package_info).collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_model_endpoints(
    input: ListModelEndpointsInput,
    state: State<'_, AppState>,
) -> Result<ListModelEndpointsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .list_model_endpoints(tonic::Request::new(
            AdminInferenceCatalogServiceListModelEndpointsRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                include_disabled: input.include_disabled,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListModelEndpointsResponse {
        model_endpoints: response
            .model_endpoints
            .into_iter()
            .map(model_endpoint_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_models(
    input: ListModelsInput,
    state: State<'_, AppState>,
) -> Result<ListModelsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .list_models(tonic::Request::new(
            AdminInferenceCatalogServiceListModelsRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                operation: input.operation.unwrap_or_default(),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListModelsResponse {
        models: response
            .models
            .into_iter()
            .map(inference_model_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_vector_stores(
    input: ListVectorStoresInput,
    state: State<'_, AppState>,
) -> Result<ListVectorStoresResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .list_vector_stores(tonic::Request::new(
            AdminInferenceCatalogServiceListVectorStoresRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                include_disabled: input.include_disabled,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListVectorStoresResponse {
        vector_stores: response
            .vector_stores
            .into_iter()
            .map(vector_store_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_model_endpoint_capabilities(
    input: ListModelEndpointCapabilitiesInput,
    state: State<'_, AppState>,
) -> Result<ListModelEndpointCapabilitiesResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .list_model_endpoint_capabilities(tonic::Request::new(
            AdminInferenceCatalogServiceListModelEndpointCapabilitiesRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                model_endpoint_id: input.model_endpoint_id,
                model_id: input.model_id,
                operation: input.operation.unwrap_or_default(),
                include_disabled: input.include_disabled,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    let endpoint_keys = endpoint_key_map(
        session
            ._client
            .inference_catalog
            .list_model_endpoints(tonic::Request::new(
                AdminInferenceCatalogServiceListModelEndpointsRequest {
                    page_size: 1000,
                    page_token: String::new(),
                    include_disabled: true,
                },
            ))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .model_endpoints,
    );
    let model_keys = model_key_map(
        session
            ._client
            .inference_catalog
            .list_models(tonic::Request::new(
                AdminInferenceCatalogServiceListModelsRequest {
                    page_size: 1000,
                    page_token: String::new(),
                    operation: String::new(),
                },
            ))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .models,
    );

    Ok(ListModelEndpointCapabilitiesResponse {
        model_endpoint_capabilities: response
            .model_endpoint_capabilities
            .into_iter()
            .map(|capability| {
                model_endpoint_capability_info(capability, &endpoint_keys, &model_keys)
            })
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_apply_inference_package(
    input: ApplyInferencePackageInput,
    state: State<'_, AppState>,
) -> Result<ApplyInferencePackageResponseInfo, String> {
    let name = input.name.trim().to_string();
    let version = input.version.trim().to_string();
    if name.is_empty() {
        return Err("Package name is required".to_string());
    }
    if version.is_empty() {
        return Err("Package version is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .inference_catalog
        .apply_inference_package(tonic::Request::new(
            AdminInferenceCatalogServiceApplyInferencePackageRequest {
                name,
                version,
                source: input.source.unwrap_or_default(),
                checksum: input.checksum.unwrap_or_default(),
                model_endpoints: input
                    .model_endpoints
                    .into_iter()
                    .map(model_endpoint)
                    .collect(),
                models: input.models.into_iter().map(inference_model).collect(),
                vector_stores: input.vector_stores.into_iter().map(vector_store).collect(),
                model_endpoint_capabilities: input
                    .model_endpoint_capabilities
                    .into_iter()
                    .map(model_endpoint_capability_definition)
                    .collect(),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ApplyInferencePackageResponseInfo {
        package: response.package.map(package_info),
        model_endpoint_count: response.model_endpoints.len(),
        model_count: response.models.len(),
        vector_store_count: response.vector_stores.len(),
        capability_count: response.model_endpoint_capabilities.len(),
    })
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimestampInput {
    pub seconds: i64,
    #[serde(default)]
    pub nanos: i32,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessScopeInput {
    #[serde(default)]
    pub space_id: String,
    #[serde(default)]
    pub domain_id: String,
    #[serde(default)]
    pub semantic_rule_id: String,
    #[serde(default)]
    pub embedding_binding_key: String,
    #[serde(default)]
    pub node_id: String,
    #[serde(default)]
    pub include_descendants: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessScopeInfo {
    pub space_id: String,
    pub domain_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    pub node_id: String,
    pub include_descendants: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferenceParametersInput {
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub max_input_tokens: i32,
    #[serde(default)]
    pub max_output_tokens: i32,
    #[serde(default)]
    pub response_format: String,
    #[serde(default)]
    pub metadata: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InferencePrivacyRequirementInput {
    #[serde(default)]
    pub allowed_privacy_classes: Vec<String>,
    #[serde(default)]
    pub require_local_endpoint: bool,
    #[serde(default)]
    pub disallow_third_party: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListIntelligenceProfilesInput {
    #[serde(default)]
    pub space_id: String,
    #[serde(default)]
    pub domain_id: String,
    #[serde(default)]
    pub operation: String,
    #[serde(default)]
    pub purpose: String,
    #[serde(default)]
    pub include_disabled: bool,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntelligenceProfileInput {
    pub space_id: String,
    pub key: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub operation: String,
    #[serde(default)]
    pub purpose: String,
    #[serde(default)]
    pub domain_ids: Vec<String>,
    #[serde(default)]
    pub capability_refs: Vec<String>,
    #[serde(default)]
    pub endpoint_refs: Vec<String>,
    #[serde(default)]
    pub model_refs: Vec<String>,
    #[serde(default)]
    pub required_features: Vec<String>,
    #[serde(default)]
    pub privacy_requirement: Option<InferencePrivacyRequirementInput>,
    #[serde(default)]
    pub default_parameters: Option<InferenceParametersInput>,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub metadata: Option<Map<String, serde_json::Value>>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceProfileActionInput {
    pub space_id: String,
    #[serde(default)]
    pub inference_profile: String,
    #[serde(default)]
    pub inference_profile_id: String,
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceProfileInfo {
    pub inference_profile_id: String,
    pub space_id: String,
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub operation: String,
    pub purpose: String,
    pub domain_ids: Vec<String>,
    pub capability_refs: Vec<String>,
    pub endpoint_refs: Vec<String>,
    pub model_refs: Vec<String>,
    pub required_features: Vec<String>,
    pub enabled: bool,
    pub created_by: String,
    pub create_time: String,
    pub update_time: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListIntelligenceProfilesResponse {
    pub inference_profiles: Vec<IntelligenceProfileInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceProfileResponse {
    pub inference_profile: Option<IntelligenceProfileInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCredentialsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub owner_type: String,
    #[serde(default)]
    pub owner_id: String,
    #[serde(default)]
    pub model_endpoint_id: Option<String>,
    #[serde(default)]
    pub include_inactive: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCredentialInput {
    pub key: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub model_endpoint: String,
    #[serde(default)]
    pub model_endpoint_id: String,
    #[serde(default)]
    pub owner_type: String,
    #[serde(default)]
    pub owner_id: String,
    #[serde(default)]
    pub auth_type: String,
    #[serde(default)]
    pub secret_value: String,
    #[serde(default)]
    pub is_default: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialStatusInput {
    #[serde(default)]
    pub credential: String,
    #[serde(default)]
    pub credential_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RotateCredentialInput {
    #[serde(default)]
    pub credential: String,
    #[serde(default)]
    pub credential_id: String,
    #[serde(default)]
    pub secret_value: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCredentialInput {
    #[serde(default)]
    pub credential: String,
    #[serde(default)]
    pub credential_id: String,
    #[serde(default)]
    pub delete_grants: bool,
    #[serde(default)]
    pub delete_secret: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceCredentialInfo {
    pub credential_id: String,
    pub key: String,
    pub display_name: String,
    pub model_endpoint_id: String,
    pub model_endpoint_key: String,
    pub owner_type: String,
    pub owner_id: String,
    pub auth_type: String,
    pub secret_id: String,
    pub status: String,
    pub is_default: bool,
    pub create_time: String,
    pub update_time: String,
    pub last_used_time: String,
    pub secret_version: String,
    pub secret_suffix: String,
    pub rotated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListCredentialsResponse {
    pub credentials: Vec<IntelligenceCredentialInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialResponse {
    pub credential: Option<IntelligenceCredentialInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteCredentialResponseInfo {
    pub credential_id: String,
    pub credential_grants_deleted: i32,
    pub secret_deleted: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListIntelligenceCredentialGrantsInput {
    pub space_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub credential_id: Option<String>,
    #[serde(default)]
    pub include_expired: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntelligenceCredentialGrantInput {
    pub space_id: String,
    #[serde(default)]
    pub credential: String,
    #[serde(default)]
    pub credential_id: String,
    #[serde(default)]
    pub scope: Option<IntelligenceAccessScopeInput>,
    #[serde(default)]
    pub operations: Vec<String>,
    #[serde(default)]
    pub model_endpoint: String,
    #[serde(default)]
    pub model_endpoint_id: String,
    #[serde(default)]
    pub model: String,
    #[serde(default)]
    pub model_id: String,
    #[serde(default)]
    pub priority: i32,
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub allow_background_use: bool,
    #[serde(default)]
    pub expires_at: Option<TimestampInput>,
    #[serde(default)]
    pub grantee_principal_ids: Vec<String>,
    #[serde(default)]
    pub allow_on_behalf_of_principal_ids: Vec<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceCredentialGrantActionInput {
    pub space_id: String,
    pub credential_grant_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceCredentialGrantInfo {
    pub credential_grant_id: String,
    pub credential_id: String,
    pub scope: Option<IntelligenceAccessScopeInfo>,
    pub operations: Vec<String>,
    pub model_endpoint_id: String,
    pub model_endpoint_key: String,
    pub model_id: String,
    pub model_key: String,
    pub priority: i32,
    pub is_default: bool,
    pub allow_background_use: bool,
    pub granted_by: String,
    pub create_time: String,
    pub expire_time: String,
    pub inference_profile_ids: Vec<String>,
    pub model_endpoint_capability_ids: Vec<String>,
    pub grantee_principal_ids: Vec<String>,
    pub allow_on_behalf_of_principal_ids: Vec<String>,
    pub state: String,
    pub revoked_by: String,
    pub revoked_at: String,
    pub reason: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListIntelligenceCredentialGrantsResponse {
    pub credential_grants: Vec<IntelligenceCredentialGrantInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceCredentialGrantResponse {
    pub credential_grant: Option<IntelligenceCredentialGrantInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteIntelligenceCredentialGrantResponseInfo {
    pub credential_grant_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInferencePoliciesInput {
    pub space_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub effect: String,
    #[serde(default)]
    pub include_expired: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateIntelligenceAccessPolicyInput {
    pub space_id: String,
    #[serde(default)]
    pub scope: Option<IntelligenceAccessScopeInput>,
    #[serde(default)]
    pub effect: String,
    #[serde(default)]
    pub operations: Vec<String>,
    #[serde(default)]
    pub no_inference: bool,
    #[serde(default)]
    pub allowed_privacy_classes: Vec<String>,
    #[serde(default)]
    pub disallow_third_party: bool,
    #[serde(default)]
    pub require_local_endpoint: bool,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub expires_at: Option<TimestampInput>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessPolicyActionInput {
    pub space_id: String,
    pub inference_policy_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessPolicyInfo {
    pub inference_policy_id: String,
    pub scope: Option<IntelligenceAccessScopeInfo>,
    pub effect: String,
    pub operations: Vec<String>,
    pub no_inference: bool,
    pub allowed_privacy_classes: Vec<String>,
    pub disallow_third_party: bool,
    pub require_local_endpoint: bool,
    pub reason: String,
    pub created_by: String,
    pub create_time: String,
    pub expire_time: String,
    pub action: String,
    pub inference_profile_ids: Vec<String>,
    pub max_input_tokens: i32,
    pub max_output_tokens: i32,
    pub max_requests_per_run: i32,
    pub data_classes: Vec<String>,
    pub priority: i32,
    pub state: String,
    pub revoked_by: String,
    pub revoked_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListInferencePoliciesResponse {
    pub inference_policies: Vec<IntelligenceAccessPolicyInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessPolicyResponse {
    pub inference_policy: Option<IntelligenceAccessPolicyInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteIntelligenceAccessPolicyResponseInfo {
    pub inference_policy_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUsageEventsInput {
    pub space_id: String,
    #[serde(default)]
    pub scope: Option<IntelligenceAccessScopeInput>,
    #[serde(default)]
    pub operation: String,
    #[serde(default)]
    pub usage_mode: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub inference_profile_id: String,
    #[serde(default)]
    pub model_endpoint_id: String,
    #[serde(default)]
    pub model_id: String,
    #[serde(default)]
    pub credential_grant_id: String,
    #[serde(default)]
    pub automation_id: String,
    #[serde(default)]
    pub automation_run_id: String,
    #[serde(default)]
    pub semantic_rule_id: String,
    #[serde(default)]
    pub actor_principal_id: String,
    #[serde(default)]
    pub on_behalf_of_principal_id: String,
    #[serde(default)]
    pub since: Option<TimestampInput>,
    #[serde(default)]
    pub until: Option<TimestampInput>,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummarizeUsageInput {
    pub space_id: String,
    #[serde(default)]
    pub scope: Option<IntelligenceAccessScopeInput>,
    #[serde(default)]
    pub since: Option<TimestampInput>,
    #[serde(default)]
    pub until: Option<TimestampInput>,
    #[serde(default)]
    pub group_by: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessUsageEventInfo {
    pub usage_event_id: String,
    pub request_id: String,
    pub operation: String,
    pub usage_mode: String,
    pub status: String,
    pub space_id: String,
    pub domain_id: String,
    pub node_id: String,
    pub automation_id: String,
    pub automation_run_id: String,
    pub semantic_rule_id: String,
    pub actor_principal_id: String,
    pub on_behalf_of_principal_id: String,
    pub inference_profile_id: String,
    pub model_endpoint_id: String,
    pub model_endpoint_key: String,
    pub model_id: String,
    pub model_key: String,
    pub model_endpoint_capability_id: String,
    pub credential_id: String,
    pub credential_grant_id: String,
    pub policy_decision_id: String,
    pub provider_request_id: String,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
    pub latency_millis: i64,
    pub error_code: String,
    pub error_message: String,
    pub started_at: String,
    pub completed_at: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IntelligenceAccessUsageSummaryInfo {
    pub group: HashMap<String, String>,
    pub request_count: i64,
    pub succeeded_count: i64,
    pub failed_count: i64,
    pub denied_count: i64,
    pub input_tokens: i64,
    pub output_tokens: i64,
    pub total_tokens: i64,
    pub total_latency_millis: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUsageEventsResponse {
    pub usage_events: Vec<IntelligenceAccessUsageEventInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SummarizeUsageResponse {
    pub summaries: Vec<IntelligenceAccessUsageSummaryInfo>,
}

#[tauri::command]
pub async fn admin_list_inference_profiles(
    input: ListIntelligenceProfilesInput,
    state: State<'_, AppState>,
) -> Result<ListIntelligenceProfilesResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_profiles
        .list_intelligence_profiles(tonic::Request::new(
            AdminIntelligenceAccessProfileServiceListIntelligenceProfilesRequest {
                space_id: input.space_id,
                domain_id: input.domain_id,
                operation: inference_operation_value(&input.operation),
                purpose: input.purpose,
                include_disabled: input.include_disabled,
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListIntelligenceProfilesResponse {
        inference_profiles: response
            .intelligence_profiles
            .into_iter()
            .map(inference_profile_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_create_inference_profile(
    input: CreateIntelligenceProfileInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceProfileResponse, String> {
    if input.space_id.trim().is_empty() {
        return Err("Space ID is required".to_string());
    }
    if input.key.trim().is_empty() {
        return Err("Profile key is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_profiles
        .create_intelligence_profile(tonic::Request::new(
            AdminIntelligenceAccessProfileServiceCreateIntelligenceProfileRequest {
                space_id: input.space_id,
                key: input.key,
                display_name: input.display_name,
                description: input.description,
                operation: inference_operation_value(&input.operation),
                purpose: input.purpose,
                domain_ids: input.domain_ids,
                capability_refs: input.capability_refs,
                endpoint_refs: input.endpoint_refs,
                model_refs: input.model_refs,
                required_features: input.required_features,
                privacy_requirement: input.privacy_requirement.map(privacy_requirement),
                default_parameters: input.default_parameters.map(inference_parameters),
                enabled: input.enabled,
                metadata: input.metadata.map(struct_from_map),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceProfileResponse {
        inference_profile: response.intelligence_profile.map(inference_profile_info),
    })
}

#[tauri::command]
pub async fn admin_set_inference_profile_enabled(
    input: IntelligenceProfileActionInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceProfileResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_profiles
        .set_intelligence_profile_enabled(tonic::Request::new(
            AdminIntelligenceAccessProfileServiceSetIntelligenceProfileEnabledRequest {
                space_id: input.space_id,
                intelligence_profile: input.inference_profile,
                intelligence_profile_id: input.inference_profile_id,
                enabled: input.enabled,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceProfileResponse {
        inference_profile: response.intelligence_profile.map(inference_profile_info),
    })
}

#[tauri::command]
pub async fn admin_delete_inference_profile(
    input: IntelligenceProfileActionInput,
    state: State<'_, AppState>,
) -> Result<HashMap<String, String>, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_profiles
        .delete_intelligence_profile(tonic::Request::new(
            AdminIntelligenceAccessProfileServiceDeleteIntelligenceProfileRequest {
                space_id: input.space_id,
                intelligence_profile: input.inference_profile,
                intelligence_profile_id: input.inference_profile_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(HashMap::from([(
        "inferenceProfileId".to_string(),
        response.intelligence_profile_id,
    )]))
}

#[tauri::command]
pub async fn admin_list_inference_credentials(
    input: ListCredentialsInput,
    state: State<'_, AppState>,
) -> Result<ListCredentialsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_credentials
        .list_credentials(tonic::Request::new(
            AdminIntelligenceAccessCredentialServiceListCredentialsRequest {
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                owner_type: input.owner_type,
                owner_id: input.owner_id,
                model_endpoint_id: input.model_endpoint_id,
                include_inactive: input.include_inactive,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let endpoint_keys = endpoint_key_map(
        session
            ._client
            .inference_catalog
            .list_model_endpoints(tonic::Request::new(
                AdminInferenceCatalogServiceListModelEndpointsRequest {
                    page_size: 1000,
                    page_token: String::new(),
                    include_disabled: true,
                },
            ))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .model_endpoints,
    );
    Ok(ListCredentialsResponse {
        credentials: response
            .credentials
            .into_iter()
            .map(|credential| credential_info_with_keys(credential, &endpoint_keys))
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_create_inference_credential(
    input: CreateCredentialInput,
    state: State<'_, AppState>,
) -> Result<CredentialResponse, String> {
    if input.key.trim().is_empty() {
        return Err("Credential key is required".to_string());
    }
    let secret_value = credential_secret_value(input.secret_value)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_credentials
        .create_credential(tonic::Request::new(
            AdminIntelligenceAccessCredentialServiceCreateCredentialRequest {
                key: input.key,
                display_name: input.display_name,
                model_endpoint: input.model_endpoint,
                model_endpoint_id: input.model_endpoint_id,
                owner_type: input.owner_type,
                owner_id: input.owner_id,
                auth_type: input.auth_type,
                is_default: input.is_default,
                secret_value,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(CredentialResponse {
        credential: response.credential.map(credential_info),
    })
}

#[tauri::command]
pub async fn admin_set_inference_credential_status(
    input: CredentialStatusInput,
    state: State<'_, AppState>,
) -> Result<CredentialResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_credentials
        .set_credential_status(tonic::Request::new(
            AdminIntelligenceAccessCredentialServiceSetCredentialStatusRequest {
                credential: input.credential,
                credential_id: input.credential_id,
                status: input.status,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(CredentialResponse {
        credential: response.credential.map(credential_info),
    })
}

#[tauri::command]
pub async fn admin_rotate_inference_credential(
    input: RotateCredentialInput,
    state: State<'_, AppState>,
) -> Result<CredentialResponse, String> {
    let secret_value = credential_secret_value(input.secret_value)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_credentials
        .rotate_credential(tonic::Request::new(
            AdminIntelligenceAccessCredentialServiceRotateCredentialRequest {
                credential: input.credential,
                credential_id: input.credential_id,
                secret_value,
                reason: input.reason,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(CredentialResponse {
        credential: response.credential.map(credential_info),
    })
}

#[tauri::command]
pub async fn admin_delete_inference_credential(
    input: DeleteCredentialInput,
    state: State<'_, AppState>,
) -> Result<DeleteCredentialResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_credentials
        .delete_credential(tonic::Request::new(
            AdminIntelligenceAccessCredentialServiceDeleteCredentialRequest {
                credential: input.credential,
                credential_id: input.credential_id,
                delete_grants: input.delete_grants,
                delete_secret: input.delete_secret,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(DeleteCredentialResponseInfo {
        credential_id: response.credential_id,
        credential_grants_deleted: response.credential_grants_deleted,
        secret_deleted: response.secret_deleted,
    })
}

#[tauri::command]
pub async fn admin_list_inference_credential_grants(
    input: ListIntelligenceCredentialGrantsInput,
    state: State<'_, AppState>,
) -> Result<ListIntelligenceCredentialGrantsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_grants
        .list_credential_grants(tonic::Request::new(
            AdminIntelligenceAccessGrantServiceListCredentialGrantsRequest {
                space_id: input.space_id,
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                credential_id: input.credential_id,
                include_expired: input.include_expired,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let endpoint_keys = endpoint_key_map(
        session
            ._client
            .inference_catalog
            .list_model_endpoints(tonic::Request::new(
                AdminInferenceCatalogServiceListModelEndpointsRequest {
                    page_size: 1000,
                    page_token: String::new(),
                    include_disabled: true,
                },
            ))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .model_endpoints,
    );
    let model_keys = model_key_map(
        session
            ._client
            .inference_catalog
            .list_models(tonic::Request::new(
                AdminInferenceCatalogServiceListModelsRequest {
                    page_size: 1000,
                    page_token: String::new(),
                    operation: String::new(),
                },
            ))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .models,
    );
    Ok(ListIntelligenceCredentialGrantsResponse {
        credential_grants: response
            .credential_grants
            .into_iter()
            .map(|grant| credential_grant_info_with_keys(grant, &endpoint_keys, &model_keys))
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_create_inference_credential_grant(
    input: CreateIntelligenceCredentialGrantInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceCredentialGrantResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_grants
        .create_credential_grant(tonic::Request::new(
            AdminIntelligenceAccessGrantServiceCreateCredentialGrantRequest {
                space_id: input.space_id,
                credential: input.credential,
                credential_id: input.credential_id,
                scope: input.scope.map(processing_scope),
                operations: input.operations,
                model_endpoint: input.model_endpoint,
                model_endpoint_id: input.model_endpoint_id,
                model: input.model,
                model_id: input.model_id,
                priority: input.priority,
                is_default: input.is_default,
                allow_background_use: input.allow_background_use,
                expires_at: input.expires_at.map(timestamp_from_input),
                grantee_principal_ids: input.grantee_principal_ids,
                allow_on_behalf_of_principal_ids: input.allow_on_behalf_of_principal_ids,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceCredentialGrantResponse {
        credential_grant: response.credential_grant.map(credential_grant_info),
    })
}

#[tauri::command]
pub async fn admin_expire_inference_credential_grant(
    input: IntelligenceCredentialGrantActionInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceCredentialGrantResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_grants
        .expire_credential_grant(tonic::Request::new(
            AdminIntelligenceAccessGrantServiceExpireCredentialGrantRequest {
                space_id: input.space_id,
                credential_grant_id: input.credential_grant_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceCredentialGrantResponse {
        credential_grant: response.credential_grant.map(credential_grant_info),
    })
}

#[tauri::command]
pub async fn admin_delete_inference_credential_grant(
    input: IntelligenceCredentialGrantActionInput,
    state: State<'_, AppState>,
) -> Result<DeleteIntelligenceCredentialGrantResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_grants
        .delete_credential_grant(tonic::Request::new(
            AdminIntelligenceAccessGrantServiceDeleteCredentialGrantRequest {
                space_id: input.space_id,
                credential_grant_id: input.credential_grant_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(DeleteIntelligenceCredentialGrantResponseInfo {
        credential_grant_id: response.credential_grant_id,
    })
}

#[tauri::command]
pub async fn admin_list_inference_policies(
    input: ListInferencePoliciesInput,
    state: State<'_, AppState>,
) -> Result<ListInferencePoliciesResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_policies
        .list_access_policies(tonic::Request::new(
            AdminIntelligenceAccessPolicyServiceListAccessPoliciesRequest {
                space_id: input.space_id,
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                effect: input.effect,
                include_expired: input.include_expired,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListInferencePoliciesResponse {
        inference_policies: response
            .access_policies
            .into_iter()
            .map(inference_policy_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_create_inference_policy(
    input: CreateIntelligenceAccessPolicyInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceAccessPolicyResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_policies
        .create_access_policy(tonic::Request::new(
            AdminIntelligenceAccessPolicyServiceCreateAccessPolicyRequest {
                space_id: input.space_id,
                scope: input.scope.map(processing_scope),
                effect: input.effect,
                operations: input.operations,
                no_intelligence: input.no_inference,
                allowed_privacy_classes: input.allowed_privacy_classes,
                disallow_third_party: input.disallow_third_party,
                require_local_endpoint: input.require_local_endpoint,
                reason: input.reason,
                expires_at: input.expires_at.map(timestamp_from_input),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceAccessPolicyResponse {
        inference_policy: response.access_policy.map(inference_policy_info),
    })
}

#[tauri::command]
pub async fn admin_expire_inference_policy(
    input: IntelligenceAccessPolicyActionInput,
    state: State<'_, AppState>,
) -> Result<IntelligenceAccessPolicyResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_policies
        .expire_access_policy(tonic::Request::new(
            AdminIntelligenceAccessPolicyServiceExpireAccessPolicyRequest {
                space_id: input.space_id,
                access_policy_id: input.inference_policy_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(IntelligenceAccessPolicyResponse {
        inference_policy: response.access_policy.map(inference_policy_info),
    })
}

#[tauri::command]
pub async fn admin_delete_inference_policy(
    input: IntelligenceAccessPolicyActionInput,
    state: State<'_, AppState>,
) -> Result<DeleteIntelligenceAccessPolicyResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_policies
        .delete_access_policy(tonic::Request::new(
            AdminIntelligenceAccessPolicyServiceDeleteAccessPolicyRequest {
                space_id: input.space_id,
                access_policy_id: input.inference_policy_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(DeleteIntelligenceAccessPolicyResponseInfo {
        inference_policy_id: response.access_policy_id,
    })
}

#[tauri::command]
pub async fn admin_list_inference_usage_events(
    input: ListUsageEventsInput,
    state: State<'_, AppState>,
) -> Result<ListUsageEventsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_usage
        .list_usage_events(tonic::Request::new(
            AdminIntelligenceAccessUsageServiceListUsageEventsRequest {
                space_id: input.space_id,
                scope: input.scope.map(inference_scope),
                operation: inference_operation_value(&input.operation),
                usage_mode: inference_usage_mode_value(&input.usage_mode),
                status: inference_usage_status_value(&input.status),
                intelligence_profile_id: input.inference_profile_id,
                model_endpoint_id: input.model_endpoint_id,
                model_id: input.model_id,
                credential_grant_id: input.credential_grant_id,
                automation_id: input.automation_id,
                automation_run_id: input.automation_run_id,
                semantic_rule_id: input.semantic_rule_id,
                embedding_binding_key: String::new(),
                actor_principal_id: input.actor_principal_id,
                on_behalf_of_principal_id: input.on_behalf_of_principal_id,
                since: input.since.map(timestamp_from_input),
                until: input.until.map(timestamp_from_input),
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let endpoint_keys = match session
        ._client
        .inference_catalog
        .list_model_endpoints(tonic::Request::new(
            AdminInferenceCatalogServiceListModelEndpointsRequest {
                page_size: 1000,
                page_token: String::new(),
                include_disabled: true,
            },
        ))
        .await
    {
        Ok(response) => endpoint_key_map(response.into_inner().model_endpoints),
        Err(err) if err.code() == tonic::Code::PermissionDenied => HashMap::new(),
        Err(err) => return Err(err.to_string()),
    };
    let model_keys = match session
        ._client
        .inference_catalog
        .list_models(tonic::Request::new(
            AdminInferenceCatalogServiceListModelsRequest {
                page_size: 1000,
                page_token: String::new(),
                operation: String::new(),
            },
        ))
        .await
    {
        Ok(response) => model_key_map(response.into_inner().models),
        Err(err) if err.code() == tonic::Code::PermissionDenied => HashMap::new(),
        Err(err) => return Err(err.to_string()),
    };
    Ok(ListUsageEventsResponse {
        usage_events: response
            .usage_events
            .into_iter()
            .map(|event| usage_event_info_with_keys(event, &endpoint_keys, &model_keys))
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_summarize_inference_usage(
    input: SummarizeUsageInput,
    state: State<'_, AppState>,
) -> Result<SummarizeUsageResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .inference_usage
        .summarize_usage(tonic::Request::new(
            AdminIntelligenceAccessUsageServiceSummarizeUsageRequest {
                space_id: input.space_id,
                scope: input.scope.map(inference_scope),
                since: input.since.map(timestamp_from_input),
                until: input.until.map(timestamp_from_input),
                group_by: input.group_by,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(SummarizeUsageResponse {
        summaries: response
            .summaries
            .into_iter()
            .map(usage_summary_info)
            .collect(),
    })
}

fn default_true() -> bool {
    true
}

fn inference_operation_value(value: &str) -> i32 {
    match value.trim().to_ascii_lowercase().as_str() {
        "embeddings" | "embedding" => InferenceOperation::Embeddings as i32,
        "chat" => InferenceOperation::Chat as i32,
        "rerank" => InferenceOperation::Rerank as i32,
        "summarize" | "summary" => InferenceOperation::Summarize as i32,
        "classify" | "classification" => InferenceOperation::Classify as i32,
        _ => InferenceOperation::Unspecified as i32,
    }
}

fn inference_usage_mode_value(value: &str) -> i32 {
    match value.trim().to_ascii_lowercase().as_str() {
        "interactive" => IntelligenceAccessUsageMode::Interactive as i32,
        "automation" => IntelligenceAccessUsageMode::Automation as i32,
        "background" => IntelligenceAccessUsageMode::Background as i32,
        "semantic" => IntelligenceAccessUsageMode::Semantic as i32,
        _ => IntelligenceAccessUsageMode::Unspecified as i32,
    }
}

fn inference_usage_status_value(value: &str) -> i32 {
    match value.trim().to_ascii_lowercase().as_str() {
        "succeeded" | "success" => IntelligenceAccessUsageStatus::Succeeded as i32,
        "failed" | "failure" => IntelligenceAccessUsageStatus::Failed as i32,
        "denied" => IntelligenceAccessUsageStatus::Denied as i32,
        _ => IntelligenceAccessUsageStatus::Unspecified as i32,
    }
}

fn privacy_class_value(value: &str) -> i32 {
    match value.trim().to_ascii_lowercase().as_str() {
        "local_only" | "local-only" | "local" => InferencePrivacyClass::LocalOnly as i32,
        "private" => InferencePrivacyClass::Private as i32,
        "third_party" | "third-party" | "thirdparty" => InferencePrivacyClass::ThirdParty as i32,
        _ => InferencePrivacyClass::Unspecified as i32,
    }
}

fn enum_label(raw: &'static str, prefix: &str) -> String {
    raw.strip_prefix(prefix).unwrap_or(raw).to_ascii_lowercase()
}

fn operation_label(value: i32) -> String {
    InferenceOperation::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_OPERATION_"))
        .unwrap_or_default()
}
fn usage_mode_label(value: i32) -> String {
    IntelligenceAccessUsageMode::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_USAGE_MODE_"))
        .unwrap_or_default()
}
fn usage_status_label(value: i32) -> String {
    IntelligenceAccessUsageStatus::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_USAGE_STATUS_"))
        .unwrap_or_default()
}
fn grant_state_label(value: i32) -> String {
    IntelligenceAccessGrantState::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_GRANT_STATE_"))
        .unwrap_or_default()
}
fn policy_action_label(value: i32) -> String {
    IntelligenceAccessPolicyAction::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_POLICY_ACTION_"))
        .unwrap_or_default()
}
fn policy_state_label(value: i32) -> String {
    IntelligenceAccessPolicyState::try_from(value)
        .map(|v| enum_label(v.as_str_name(), "INFERENCE_POLICY_STATE_"))
        .unwrap_or_default()
}

fn timestamp_from_input(input: TimestampInput) -> Timestamp {
    Timestamp {
        seconds: input.seconds,
        nanos: input.nanos,
    }
}

fn processing_scope(input: IntelligenceAccessScopeInput) -> IntelligenceAccessScope {
    IntelligenceAccessScope {
        space_id: input.space_id,
        domain_id: input.domain_id,
        semantic_rule_id: input.semantic_rule_id,
        embedding_binding_key: input.embedding_binding_key,
        node_id: input.node_id,
        include_descendants: input.include_descendants,
    }
}

fn inference_scope(input: IntelligenceAccessScopeInput) -> IntelligenceAccessScope {
    IntelligenceAccessScope {
        space_id: input.space_id,
        domain_id: input.domain_id,
        semantic_rule_id: input.semantic_rule_id,
        embedding_binding_key: input.embedding_binding_key,
        node_id: input.node_id,
        include_descendants: input.include_descendants,
    }
}

fn processing_scope_info(scope: IntelligenceAccessScope) -> IntelligenceAccessScopeInfo {
    IntelligenceAccessScopeInfo {
        space_id: scope.space_id,
        domain_id: scope.domain_id,
        semantic_rule_id: scope.semantic_rule_id,
        embedding_binding_key: scope.embedding_binding_key,
        node_id: scope.node_id,
        include_descendants: scope.include_descendants,
    }
}

fn inference_parameters(input: InferenceParametersInput) -> InferenceParameters {
    InferenceParameters {
        temperature: input.temperature,
        max_input_tokens: input.max_input_tokens,
        max_output_tokens: input.max_output_tokens,
        response_format: input.response_format,
        metadata: input.metadata.map(struct_from_map),
    }
}

fn privacy_requirement(input: InferencePrivacyRequirementInput) -> InferencePrivacyRequirement {
    InferencePrivacyRequirement {
        allowed_privacy_classes: input
            .allowed_privacy_classes
            .iter()
            .map(|value| privacy_class_value(value))
            .collect(),
        require_local_endpoint: input.require_local_endpoint,
        disallow_third_party: input.disallow_third_party,
    }
}

fn credential_secret_value(secret_value: String) -> Result<String, String> {
    if !secret_value.trim().is_empty() {
        return Ok(secret_value);
    }
    Err("API key is required".to_string())
}

fn inference_profile_info(profile: IntelligenceProfile) -> IntelligenceProfileInfo {
    IntelligenceProfileInfo {
        inference_profile_id: profile.intelligence_profile_id,
        space_id: profile.space_id,
        key: profile.key,
        display_name: profile.display_name,
        description: profile.description,
        operation: operation_label(profile.operation),
        purpose: profile.purpose,
        domain_ids: profile.domain_ids,
        capability_refs: profile.capability_refs,
        endpoint_refs: profile.endpoint_refs,
        model_refs: profile.model_refs,
        required_features: profile.required_features,
        enabled: profile.enabled,
        created_by: profile.created_by,
        create_time: timestamp_string(profile.create_time),
        update_time: timestamp_string(profile.update_time),
        metadata: profile.metadata.map(json_from_struct),
    }
}

fn endpoint_key_map(endpoints: Vec<ModelEndpoint>) -> HashMap<String, String> {
    endpoints
        .into_iter()
        .map(|endpoint| (endpoint.model_endpoint_id, endpoint.key))
        .collect()
}

fn model_key_map(models: Vec<InferenceModel>) -> HashMap<String, String> {
    models
        .into_iter()
        .map(|model| (model.model_id, model.key))
        .collect()
}

fn credential_info(credential: IntelligenceCredential) -> IntelligenceCredentialInfo {
    credential_info_with_keys(credential, &HashMap::new())
}

fn credential_info_with_keys(
    credential: IntelligenceCredential,
    endpoint_keys: &HashMap<String, String>,
) -> IntelligenceCredentialInfo {
    let model_endpoint_key = endpoint_keys
        .get(&credential.model_endpoint_id)
        .cloned()
        .unwrap_or_default();
    IntelligenceCredentialInfo {
        credential_id: credential.credential_id,
        key: credential.key,
        display_name: credential.display_name,
        model_endpoint_id: credential.model_endpoint_id,
        model_endpoint_key,
        owner_type: credential.owner_type,
        owner_id: credential.owner_id,
        auth_type: credential.auth_type,
        secret_id: credential.secret_id,
        status: credential.status,
        is_default: credential.is_default,
        create_time: timestamp_string(credential.create_time),
        update_time: timestamp_string(credential.update_time),
        last_used_time: timestamp_string(credential.last_used_time),
        secret_version: credential.secret_version,
        secret_suffix: credential.secret_suffix,
        rotated_at: timestamp_string(credential.rotated_at),
    }
}

fn credential_grant_info(grant: IntelligenceCredentialGrant) -> IntelligenceCredentialGrantInfo {
    credential_grant_info_with_keys(grant, &HashMap::new(), &HashMap::new())
}

fn credential_grant_info_with_keys(
    grant: IntelligenceCredentialGrant,
    endpoint_keys: &HashMap<String, String>,
    model_keys: &HashMap<String, String>,
) -> IntelligenceCredentialGrantInfo {
    let model_endpoint_key = endpoint_keys
        .get(&grant.model_endpoint_id)
        .cloned()
        .unwrap_or_default();
    let model_key = model_keys.get(&grant.model_id).cloned().unwrap_or_default();
    IntelligenceCredentialGrantInfo {
        credential_grant_id: grant.credential_grant_id,
        credential_id: grant.credential_id,
        scope: grant.scope.map(processing_scope_info),
        operations: grant.operations,
        model_endpoint_id: grant.model_endpoint_id,
        model_endpoint_key,
        model_id: grant.model_id,
        model_key,
        priority: grant.priority,
        is_default: grant.is_default,
        allow_background_use: grant.allow_background_use,
        granted_by: grant.granted_by,
        create_time: timestamp_string(grant.create_time),
        expire_time: timestamp_string(grant.expire_time),
        inference_profile_ids: grant.intelligence_profile_ids,
        model_endpoint_capability_ids: grant.model_endpoint_capability_ids,
        grantee_principal_ids: grant.grantee_principal_ids,
        allow_on_behalf_of_principal_ids: grant.allow_on_behalf_of_principal_ids,
        state: grant_state_label(grant.state),
        revoked_by: grant.revoked_by,
        revoked_at: timestamp_string(grant.revoked_at),
        reason: grant.reason,
    }
}

fn inference_policy_info(policy: IntelligenceAccessPolicy) -> IntelligenceAccessPolicyInfo {
    IntelligenceAccessPolicyInfo {
        inference_policy_id: policy.access_policy_id,
        scope: policy.scope.map(processing_scope_info),
        effect: policy.effect,
        operations: policy.operations,
        no_inference: policy.no_intelligence,
        allowed_privacy_classes: policy.allowed_privacy_classes,
        disallow_third_party: policy.disallow_third_party,
        require_local_endpoint: policy.require_local_endpoint,
        reason: policy.reason,
        created_by: policy.created_by,
        create_time: timestamp_string(policy.create_time),
        expire_time: timestamp_string(policy.expire_time),
        action: policy_action_label(policy.action),
        inference_profile_ids: policy.intelligence_profile_ids,
        max_input_tokens: policy.max_input_tokens,
        max_output_tokens: policy.max_output_tokens,
        max_requests_per_run: policy.max_requests_per_run,
        data_classes: policy.data_classes,
        priority: policy.priority,
        state: policy_state_label(policy.state),
        revoked_by: policy.revoked_by,
        revoked_at: timestamp_string(policy.revoked_at),
    }
}

fn usage_event_info_with_keys(
    event: IntelligenceAccessUsageEvent,
    endpoint_keys: &HashMap<String, String>,
    model_keys: &HashMap<String, String>,
) -> IntelligenceAccessUsageEventInfo {
    let model_endpoint_key = endpoint_keys
        .get(&event.model_endpoint_id)
        .cloned()
        .unwrap_or_default();
    let model_key = model_keys.get(&event.model_id).cloned().unwrap_or_default();
    IntelligenceAccessUsageEventInfo {
        usage_event_id: event.usage_event_id,
        request_id: event.request_id,
        operation: operation_label(event.operation),
        usage_mode: usage_mode_label(event.usage_mode),
        status: usage_status_label(event.status),
        space_id: event.space_id,
        domain_id: event.domain_id,
        node_id: event.node_id,
        automation_id: event.automation_id,
        automation_run_id: event.automation_run_id,
        semantic_rule_id: event.semantic_rule_id,
        actor_principal_id: event.actor_principal_id,
        on_behalf_of_principal_id: event.on_behalf_of_principal_id,
        inference_profile_id: event.intelligence_profile_id,
        model_endpoint_id: event.model_endpoint_id,
        model_endpoint_key,
        model_id: event.model_id,
        model_key,
        model_endpoint_capability_id: event.model_endpoint_capability_id,
        credential_id: event.credential_id,
        credential_grant_id: event.credential_grant_id,
        policy_decision_id: event.policy_decision_id,
        provider_request_id: event.provider_request_id,
        input_tokens: event.input_tokens,
        output_tokens: event.output_tokens,
        total_tokens: event.total_tokens,
        latency_millis: event.latency_millis,
        error_code: event.error_code,
        error_message: event.error_message,
        started_at: timestamp_string(event.started_at),
        completed_at: timestamp_string(event.completed_at),
        metadata: event.metadata.map(json_from_struct),
    }
}

fn usage_summary_info(
    summary: IntelligenceAccessUsageSummary,
) -> IntelligenceAccessUsageSummaryInfo {
    IntelligenceAccessUsageSummaryInfo {
        group: summary.group,
        request_count: summary.request_count,
        succeeded_count: summary.succeeded_count,
        failed_count: summary.failed_count,
        denied_count: summary.denied_count,
        input_tokens: summary.input_tokens,
        output_tokens: summary.output_tokens,
        total_tokens: summary.total_tokens,
        total_latency_millis: summary.total_latency_millis,
    }
}

fn model_endpoint_info(endpoint: ModelEndpoint) -> ModelEndpointInfo {
    ModelEndpointInfo {
        model_endpoint_id: endpoint.model_endpoint_id,
        key: endpoint.key,
        name: endpoint.name,
        connector_type: endpoint.connector_type,
        endpoint_url: endpoint.endpoint_url,
        network_class: endpoint.network_class,
        privacy_class: endpoint.privacy_class,
        auth_modes: endpoint.auth_modes,
        operations: endpoint.operations,
        enabled: endpoint.enabled,
        metadata: endpoint.metadata.map(json_from_struct),
    }
}

fn inference_model_info(model: InferenceModel) -> InferenceModelInfo {
    InferenceModelInfo {
        model_id: model.model_id,
        key: model.key,
        operation: model.operation,
        model_name: model.model_name,
        connector_types: model.connector_types,
        dimensions: model.dimensions,
        modality: model.modality,
        vector_space_key: model.vector_space_key,
        metadata: model.metadata.map(json_from_struct),
    }
}

fn vector_store_info(store: VectorStore) -> VectorStoreInfo {
    VectorStoreInfo {
        vector_store_id: store.vector_store_id,
        key: store.key,
        name: store.name,
        r#type: store.r#type,
        privacy_class: store.privacy_class,
        enabled: store.enabled,
        config: store.config.map(json_from_struct),
    }
}

fn model_endpoint_capability_info(
    capability: ModelEndpointCapability,
    endpoint_keys: &HashMap<String, String>,
    model_keys: &HashMap<String, String>,
) -> ModelEndpointCapabilityInfo {
    let model_endpoint_key = endpoint_keys
        .get(&capability.model_endpoint_id)
        .cloned()
        .unwrap_or_default();
    let model_key = model_keys
        .get(&capability.model_id)
        .cloned()
        .unwrap_or_default();
    ModelEndpointCapabilityInfo {
        model_endpoint_capability_id: capability.model_endpoint_capability_id,
        model_endpoint_id: capability.model_endpoint_id,
        model_endpoint_key,
        model_id: capability.model_id,
        model_key,
        operation: capability.operation,
        enabled: capability.enabled,
        metadata: capability.metadata.map(json_from_struct),
    }
}

fn package_info(package: InferencePackage) -> InferencePackageInfo {
    InferencePackageInfo {
        inference_package_id: package.inference_package_id,
        name: package.name,
        version: package.version,
        source: package.source,
        checksum: package.checksum,
        definition_counts: package.definition_counts,
        installed_at: timestamp_string(package.installed_at),
        installed_by: package.installed_by,
    }
}

fn model_endpoint(input: ModelEndpointInput) -> ModelEndpoint {
    ModelEndpoint {
        model_endpoint_id: String::new(),
        key: input.key,
        name: input.name,
        connector_type: input.connector_type,
        endpoint_url: input.endpoint_url,
        network_class: input.network_class,
        privacy_class: input.privacy_class,
        auth_modes: input.auth_modes,
        operations: input.operations,
        enabled: input.enabled,
        metadata: input.metadata.map(struct_from_map),
        network_class_value: 0,
        privacy_class_value: 0,
        auth_type_values: Vec::new(),
        operation_values: Vec::new(),
    }
}

fn inference_model(input: InferenceModelInput) -> InferenceModel {
    InferenceModel {
        model_id: String::new(),
        key: input.key,
        operation: input.operation,
        model_name: input.model_name,
        connector_types: input.connector_types,
        dimensions: input.dimensions,
        modality: input.modality,
        vector_space_key: input.vector_space_key,
        metadata: input.metadata.map(struct_from_map),
        operation_value: 0,
        input_modalities: Vec::new(),
        output_modalities: Vec::new(),
        context_tokens: 0,
        max_output_tokens: 0,
        enabled: true,
    }
}

fn vector_store(input: VectorStoreInput) -> VectorStore {
    VectorStore {
        vector_store_id: String::new(),
        key: input.key,
        name: input.name,
        r#type: input.r#type,
        privacy_class: input.privacy_class,
        enabled: input.enabled,
        config: input.config.map(struct_from_map),
        privacy_class_value: 0,
    }
}

fn model_endpoint_capability_definition(
    input: ModelEndpointCapabilityDefinitionInput,
) -> ModelEndpointCapabilityDefinition {
    ModelEndpointCapabilityDefinition {
        model_endpoint: input.model_endpoint,
        model_endpoint_id: input.model_endpoint_id,
        model: input.model,
        model_id: input.model_id,
        operation: input.operation,
        enabled: input.enabled,
        model_name_override: String::new(),
        metadata: input.metadata.map(struct_from_map),
    }
}

fn struct_from_map(map: Map<String, serde_json::Value>) -> Struct {
    Struct {
        fields: map
            .into_iter()
            .map(|(key, value)| (key, prost_value(value)))
            .collect(),
    }
}

fn json_from_struct(value: Struct) -> serde_json::Value {
    serde_json::Value::Object(
        value
            .fields
            .into_iter()
            .map(|(key, value)| (key, json_from_prost_value(value)))
            .collect(),
    )
}

fn json_from_prost_value(value: Value) -> serde_json::Value {
    match value.kind {
        Some(Kind::NullValue(_)) | None => serde_json::Value::Null,
        Some(Kind::BoolValue(value)) => serde_json::Value::Bool(value),
        Some(Kind::NumberValue(value)) => serde_json::Number::from_f64(value)
            .map(serde_json::Value::Number)
            .unwrap_or(serde_json::Value::Null),
        Some(Kind::StringValue(value)) => serde_json::Value::String(value),
        Some(Kind::ListValue(value)) => serde_json::Value::Array(
            value
                .values
                .into_iter()
                .map(json_from_prost_value)
                .collect(),
        ),
        Some(Kind::StructValue(value)) => json_from_struct(value),
    }
}

fn prost_value(value: serde_json::Value) -> Value {
    let kind = match value {
        serde_json::Value::Null => Kind::NullValue(0),
        serde_json::Value::Bool(value) => Kind::BoolValue(value),
        serde_json::Value::Number(value) => Kind::NumberValue(value.as_f64().unwrap_or(0.0)),
        serde_json::Value::String(value) => Kind::StringValue(value),
        serde_json::Value::Array(values) => Kind::ListValue(ListValue {
            values: values.into_iter().map(prost_value).collect(),
        }),
        serde_json::Value::Object(map) => Kind::StructValue(struct_from_map(map)),
    };
    Value { kind: Some(kind) }
}

fn timestamp_string(timestamp: Option<Timestamp>) -> String {
    timestamp
        .map(|timestamp| {
            if timestamp.nanos == 0 {
                format!("{}", timestamp.seconds)
            } else {
                format!("{}.{:09}", timestamp.seconds, timestamp.nanos)
            }
        })
        .unwrap_or_default()
}
