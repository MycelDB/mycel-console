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
    pub model_id: String,
    pub operation: String,
    pub enabled: bool,
    pub model_name_override: String,
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
    pub model_name_override: String,
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

    Ok(ListModelEndpointCapabilitiesResponse {
        model_endpoint_capabilities: response
            .model_endpoint_capabilities
            .into_iter()
            .map(model_endpoint_capability_info)
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
) -> ModelEndpointCapabilityInfo {
    ModelEndpointCapabilityInfo {
        model_endpoint_capability_id: capability.model_endpoint_capability_id,
        model_endpoint_id: capability.model_endpoint_id,
        model_id: capability.model_id,
        operation: capability.operation,
        enabled: capability.enabled,
        model_name_override: capability.model_name_override,
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
        model_name_override: input.model_name_override,
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
