use mycel_sdk::proto::admin::v1::{
    CreateSemanticRuleRequest, DeleteSemanticRuleRequest, GetSemanticRuleRequest,
    ListSemanticRulesRequest, SemanticEmbeddingBinding, SemanticGenerationRule,
    SemanticMaintenancePolicy, SemanticSourceAssemblyPolicy, SemanticStoragePolicy,
    SemanticTargetSelector, SemanticTriggerPolicy, SetSemanticRuleEnabledRequest,
    UpdateSemanticRuleRequest, ValidateSemanticRuleRequest,
};
use mycel_sdk::proto::client::v1::{
    Node, SearchIndexState, SearchIndexStatus, SemanticEmbeddingBindingSummary,
    SemanticGenerationRuleSummary, SemanticRuleState, SemanticRuleStatus, SemanticSearchRequest,
};
use serde_json::{json, Value};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticRulesInput {
    pub space_id: String,
    #[serde(default)]
    pub domain_id: Option<String>,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSemanticRuleInput {
    pub space_id: String,
    pub semantic_rule_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateSemanticRuleInput {
    pub rule: SemanticGenerationRuleInfo,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSemanticRuleInput {
    pub rule: SemanticGenerationRuleInfo,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSemanticRuleInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub rule: SemanticGenerationRuleInfo,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetSemanticRuleEnabledInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteSemanticRuleInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    #[serde(default)]
    pub purge_vectors: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchInput {
    pub space_id: String,
    pub domain_id: String,
    #[serde(default)]
    pub semantic_rule_id: Option<String>,
    #[serde(default)]
    pub embedding_binding_key: Option<String>,
    pub query: String,
    #[serde(default)]
    pub limit: Option<i32>,
    #[serde(default)]
    pub min_score: Option<f64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchResponseInfo {
    pub results: Vec<SemanticSearchResultInfo>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSearchResultInfo {
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    pub record_id: String,
    pub node_id: String,
    pub score: f64,
    pub node: Option<Value>,
    pub matched_chunk_ids: Vec<String>,
    pub snippet: String,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticGenerationRuleInfo {
    #[serde(default)]
    pub semantic_rule_id: String,
    pub space_id: String,
    pub domain_id: String,
    pub key: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub trigger: Option<SemanticTriggerPolicyInfo>,
    #[serde(default)]
    pub selector: Option<SemanticTargetSelectorInfo>,
    #[serde(default)]
    pub source: Option<SemanticSourceAssemblyPolicyInfo>,
    #[serde(default)]
    pub embeddings: Vec<SemanticEmbeddingBindingInfo>,
    #[serde(default)]
    pub maintenance: Option<SemanticMaintenancePolicyInfo>,
    #[serde(default)]
    pub storage: Option<SemanticStoragePolicyInfo>,
    #[serde(default)]
    pub owner_principal_id: String,
    #[serde(default)]
    pub created_by_principal_id: String,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTriggerPolicyInfo {
    #[serde(default)]
    pub events: Vec<String>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub debounce: String,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticTargetSelectorInfo {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub gql: String,
    #[serde(default)]
    pub target_alias: String,
    #[serde(default)]
    pub max_results: i32,
    #[serde(default)]
    pub node_ids: Vec<String>,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticSourceAssemblyPolicyInfo {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub include_properties: Vec<String>,
    #[serde(default)]
    pub exclude_properties: Vec<String>,
    #[serde(default)]
    pub max_depth: Option<i32>,
    #[serde(default)]
    pub minimum_text_length: i32,
    #[serde(default)]
    pub context_gql: String,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticEmbeddingBindingInfo {
    #[serde(default)]
    pub key: String,
    #[serde(default)]
    pub purpose: String,
    #[serde(default)]
    pub intelligence_profile: String,
    #[serde(default)]
    pub intelligence_profile_id: String,
    #[serde(default)]
    pub vector_store: String,
    #[serde(default)]
    pub vector_store_id: String,
    #[serde(default)]
    pub enabled: bool,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenancePolicyInfo {
    #[serde(default)]
    pub dirty_cooldown: String,
    #[serde(default)]
    pub max_batch_size: i32,
    #[serde(default)]
    pub worker_concurrency: i32,
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticStoragePolicyInfo {
    #[serde(default)]
    pub searchable: bool,
    #[serde(default)]
    pub physical_index: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticGenerationRuleSummaryInfo {
    pub semantic_rule_id: String,
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub space_id: String,
    pub domain_id: String,
    pub enabled: bool,
    pub state: String,
    pub bindings: Vec<SemanticEmbeddingBindingSummaryInfo>,
    pub status: Option<SemanticRuleStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticEmbeddingBindingSummaryInfo {
    pub key: String,
    pub purpose: String,
    pub intelligence_profile_id: String,
    pub intelligence_profile_key: String,
    pub vector_store_id: String,
    pub vector_store_key: String,
    pub enabled: bool,
    pub search_index: Option<SearchIndexStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchIndexStatusInfo {
    pub state: String,
    pub live_record_count: i64,
    pub last_rebuild_at: String,
    pub last_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticRuleStatusInfo {
    pub queue_depth_pending: i32,
    pub queue_depth_running: i32,
    pub queue_depth_failed_retryable: i32,
    pub queue_depth_failed_permanent: i32,
    pub last_refresh_at: String,
    pub last_backfill_at: String,
    pub last_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticRuleValidationDiagnosticInfo {
    pub severity: String,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticRulesResponseInfo {
    pub rules: Vec<SemanticGenerationRuleSummaryInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetSemanticRuleResponseInfo {
    pub rule: Option<SemanticGenerationRuleInfo>,
    pub summary: Option<SemanticGenerationRuleSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateSemanticRuleResponseInfo {
    pub valid: bool,
    pub diagnostics: Vec<SemanticRuleValidationDiagnosticInfo>,
    pub normalized_rule: Option<SemanticGenerationRuleInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MutateSemanticRuleResponseInfo {
    pub rule: Option<SemanticGenerationRuleInfo>,
    pub summary: Option<SemanticGenerationRuleSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteSemanticRuleResponseInfo {
    pub semantic_rule_id: String,
    pub vectors_purged: bool,
    pub work_items_deleted: i32,
    pub policy_decisions_deleted: i32,
}

#[tauri::command]
pub async fn admin_list_semantic_rules(
    input: ListSemanticRulesInput,
    state: State<'_, AppState>,
) -> Result<ListSemanticRulesResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .list_semantic_rules(tonic::Request::new(ListSemanticRulesRequest {
            space_id,
            domain_id: input.domain_id.unwrap_or_default(),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_disabled: input.include_disabled,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListSemanticRulesResponseInfo {
        rules: response.rules.into_iter().map(rule_summary_info).collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn client_semantic_search(
    input: SemanticSearchInput,
    state: State<'_, AppState>,
) -> Result<SemanticSearchResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    let query = input.query.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    if domain_id.is_empty() {
        return Err("Domain ID is required".to_string());
    }
    if query.is_empty() {
        return Err("Search text is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._data_client
        .semantic
        .semantic_search(tonic::Request::new(SemanticSearchRequest {
            space_id,
            domain_id,
            semantic_rule_id: clean_optional(input.semantic_rule_id),
            embedding_binding_key: clean_optional(input.embedding_binding_key),
            query,
            limit: input.limit.unwrap_or(10),
            min_score: input.min_score,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(SemanticSearchResponseInfo {
        results: response
            .results
            .into_iter()
            .map(|result| SemanticSearchResultInfo {
                semantic_rule_id: result.semantic_rule_id,
                embedding_binding_key: result.embedding_binding_key,
                record_id: result.record_id,
                node_id: result.node_id,
                score: result.score,
                node: result.node.as_ref().map(node_json),
                matched_chunk_ids: result.matched_chunk_ids,
                snippet: result.snippet,
            })
            .collect(),
        warnings: response.warnings,
    })
}

#[tauri::command]
pub async fn admin_get_semantic_rule(
    input: GetSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<GetSemanticRuleResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let semantic_rule_id = input.semantic_rule_id.trim().to_string();
    if space_id.is_empty() || semantic_rule_id.is_empty() {
        return Err("Space ID and semantic rule ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .get_semantic_rule(tonic::Request::new(GetSemanticRuleRequest {
            space_id,
            semantic_rule_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(GetSemanticRuleResponseInfo {
        rule: response.rule.map(rule_info),
        summary: response.summary.map(rule_summary_info),
    })
}

#[tauri::command]
pub async fn admin_validate_semantic_rule(
    input: ValidateSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<ValidateSemanticRuleResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .validate_semantic_rule(tonic::Request::new(ValidateSemanticRuleRequest {
            rule: Some(rule_proto(input.rule)),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ValidateSemanticRuleResponseInfo {
        valid: response.valid,
        diagnostics: response
            .diagnostics
            .into_iter()
            .map(|item| SemanticRuleValidationDiagnosticInfo {
                severity: item.severity,
                path: item.path,
                message: item.message,
            })
            .collect(),
        normalized_rule: response.normalized_rule.map(rule_info),
    })
}

#[tauri::command]
pub async fn admin_create_semantic_rule(
    input: CreateSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<MutateSemanticRuleResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .create_semantic_rule(tonic::Request::new(CreateSemanticRuleRequest {
            rule: Some(rule_proto(input.rule)),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(MutateSemanticRuleResponseInfo {
        rule: response.rule.map(rule_info),
        summary: response.summary.map(rule_summary_info),
    })
}

#[tauri::command]
pub async fn admin_update_semantic_rule(
    input: UpdateSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<MutateSemanticRuleResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .update_semantic_rule(tonic::Request::new(UpdateSemanticRuleRequest {
            space_id: input.space_id,
            semantic_rule_id: input.semantic_rule_id,
            rule: Some(rule_proto(input.rule)),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(MutateSemanticRuleResponseInfo {
        rule: response.rule.map(rule_info),
        summary: response.summary.map(rule_summary_info),
    })
}

#[tauri::command]
pub async fn admin_set_semantic_rule_enabled(
    input: SetSemanticRuleEnabledInput,
    state: State<'_, AppState>,
) -> Result<MutateSemanticRuleResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .set_semantic_rule_enabled(tonic::Request::new(SetSemanticRuleEnabledRequest {
            space_id: input.space_id,
            semantic_rule_id: input.semantic_rule_id,
            enabled: input.enabled,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(MutateSemanticRuleResponseInfo {
        rule: response.rule.map(rule_info),
        summary: response.summary.map(rule_summary_info),
    })
}

#[tauri::command]
pub async fn admin_delete_semantic_rule(
    input: DeleteSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<DeleteSemanticRuleResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic
        .delete_semantic_rule(tonic::Request::new(DeleteSemanticRuleRequest {
            space_id: input.space_id,
            semantic_rule_id: input.semantic_rule_id,
            purge_vectors: input.purge_vectors,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(DeleteSemanticRuleResponseInfo {
        semantic_rule_id: response.semantic_rule_id,
        vectors_purged: response.vectors_purged,
        work_items_deleted: response.work_items_deleted,
        policy_decisions_deleted: response.policy_decisions_deleted,
    })
}

fn rule_proto(rule: SemanticGenerationRuleInfo) -> SemanticGenerationRule {
    SemanticGenerationRule {
        semantic_rule_id: rule.semantic_rule_id,
        space_id: rule.space_id,
        domain_id: rule.domain_id,
        key: rule.key,
        display_name: rule.display_name,
        description: rule.description,
        enabled: rule.enabled,
        trigger: rule.trigger.map(|item| SemanticTriggerPolicy {
            events: item.events,
            labels: item.labels,
            debounce: item.debounce,
        }),
        selector: rule.selector.map(|item| SemanticTargetSelector {
            mode: item.mode,
            labels: item.labels,
            gql: item.gql,
            target_alias: item.target_alias,
            max_results: item.max_results,
            node_ids: item.node_ids,
        }),
        source: rule.source.map(|item| SemanticSourceAssemblyPolicy {
            mode: item.mode,
            include_properties: item.include_properties,
            exclude_properties: item.exclude_properties,
            max_depth: item.max_depth,
            minimum_text_length: item.minimum_text_length,
            context_gql: item.context_gql,
        }),
        embeddings: rule
            .embeddings
            .into_iter()
            .map(|item| SemanticEmbeddingBinding {
                key: item.key,
                purpose: item.purpose,
                intelligence_profile: item.intelligence_profile,
                intelligence_profile_id: item.intelligence_profile_id,
                vector_store: item.vector_store,
                vector_store_id: item.vector_store_id,
                enabled: item.enabled,
                metadata: None,
            })
            .collect(),
        maintenance: rule.maintenance.map(|item| SemanticMaintenancePolicy {
            dirty_cooldown: item.dirty_cooldown,
            max_batch_size: item.max_batch_size,
            worker_concurrency: item.worker_concurrency,
        }),
        storage: rule.storage.map(|item| SemanticStoragePolicy {
            searchable: item.searchable,
            physical_index: item.physical_index,
        }),
        owner_principal_id: rule.owner_principal_id,
        created_by_principal_id: rule.created_by_principal_id,
        created_at: rule.created_at,
        updated_at: rule.updated_at,
    }
}

fn rule_info(rule: SemanticGenerationRule) -> SemanticGenerationRuleInfo {
    SemanticGenerationRuleInfo {
        semantic_rule_id: rule.semantic_rule_id,
        space_id: rule.space_id,
        domain_id: rule.domain_id,
        key: rule.key,
        display_name: rule.display_name,
        description: rule.description,
        enabled: rule.enabled,
        trigger: rule.trigger.map(|item| SemanticTriggerPolicyInfo {
            events: item.events,
            labels: item.labels,
            debounce: item.debounce,
        }),
        selector: rule.selector.map(|item| SemanticTargetSelectorInfo {
            mode: item.mode,
            labels: item.labels,
            gql: item.gql,
            target_alias: item.target_alias,
            max_results: item.max_results,
            node_ids: item.node_ids,
        }),
        source: rule.source.map(|item| SemanticSourceAssemblyPolicyInfo {
            mode: item.mode,
            include_properties: item.include_properties,
            exclude_properties: item.exclude_properties,
            max_depth: item.max_depth,
            minimum_text_length: item.minimum_text_length,
            context_gql: item.context_gql,
        }),
        embeddings: rule
            .embeddings
            .into_iter()
            .map(|item| SemanticEmbeddingBindingInfo {
                key: item.key,
                purpose: item.purpose,
                intelligence_profile: item.intelligence_profile,
                intelligence_profile_id: item.intelligence_profile_id,
                vector_store: item.vector_store,
                vector_store_id: item.vector_store_id,
                enabled: item.enabled,
            })
            .collect(),
        maintenance: rule.maintenance.map(|item| SemanticMaintenancePolicyInfo {
            dirty_cooldown: item.dirty_cooldown,
            max_batch_size: item.max_batch_size,
            worker_concurrency: item.worker_concurrency,
        }),
        storage: rule.storage.map(|item| SemanticStoragePolicyInfo {
            searchable: item.searchable,
            physical_index: item.physical_index,
        }),
        owner_principal_id: rule.owner_principal_id,
        created_by_principal_id: rule.created_by_principal_id,
        created_at: rule.created_at,
        updated_at: rule.updated_at,
    }
}

fn rule_summary_info(rule: SemanticGenerationRuleSummary) -> SemanticGenerationRuleSummaryInfo {
    SemanticGenerationRuleSummaryInfo {
        semantic_rule_id: rule.semantic_rule_id,
        key: rule.key,
        display_name: rule.display_name,
        description: rule.description,
        space_id: rule.space_id,
        domain_id: rule.domain_id,
        enabled: rule.enabled,
        state: SemanticRuleState::try_from(rule.state)
            .unwrap_or(SemanticRuleState::Unspecified)
            .as_str_name()
            .to_string(),
        bindings: rule
            .bindings
            .into_iter()
            .map(binding_summary_info)
            .collect(),
        status: rule.status.map(rule_status_info),
    }
}

fn binding_summary_info(
    binding: SemanticEmbeddingBindingSummary,
) -> SemanticEmbeddingBindingSummaryInfo {
    SemanticEmbeddingBindingSummaryInfo {
        key: binding.key,
        purpose: binding.purpose,
        intelligence_profile_id: binding.intelligence_profile_id,
        intelligence_profile_key: binding.intelligence_profile_key,
        vector_store_id: binding.vector_store_id,
        vector_store_key: binding.vector_store_key,
        enabled: binding.enabled,
        search_index: binding.search_index.map(search_status_info),
    }
}

fn search_status_info(status: SearchIndexStatus) -> SearchIndexStatusInfo {
    SearchIndexStatusInfo {
        state: SearchIndexState::try_from(status.state)
            .unwrap_or(SearchIndexState::Unspecified)
            .as_str_name()
            .to_string(),
        live_record_count: status.live_record_count,
        last_rebuild_at: status.last_rebuild_at,
        last_error: status.last_error,
    }
}

fn rule_status_info(status: SemanticRuleStatus) -> SemanticRuleStatusInfo {
    SemanticRuleStatusInfo {
        queue_depth_pending: status.queue_depth_pending,
        queue_depth_running: status.queue_depth_running,
        queue_depth_failed_retryable: status.queue_depth_failed_retryable,
        queue_depth_failed_permanent: status.queue_depth_failed_permanent,
        last_refresh_at: status.last_refresh_at,
        last_backfill_at: status.last_backfill_at,
        last_error: status.last_error,
    }
}

fn clean_optional(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    })
}

fn node_json(node: &Node) -> Value {
    json!({
        "nodeId": node.node_id,
        "domainId": node.domain_id,
        "labels": node.labels,
        "properties": node.properties.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "payload": node.payload.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "meta": node.meta.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
    })
}

fn struct_json(value: &prost_types::Struct) -> Value {
    Value::Object(
        value
            .fields
            .iter()
            .map(|(key, value)| (key.clone(), prost_value_json(value)))
            .collect(),
    )
}

fn prost_value_json(value: &prost_types::Value) -> Value {
    match &value.kind {
        Some(prost_types::value::Kind::NullValue(_)) | None => Value::Null,
        Some(prost_types::value::Kind::NumberValue(number)) => json!(number),
        Some(prost_types::value::Kind::StringValue(text)) => json!(text),
        Some(prost_types::value::Kind::BoolValue(value)) => json!(value),
        Some(prost_types::value::Kind::StructValue(value)) => struct_json(value),
        Some(prost_types::value::Kind::ListValue(value)) => {
            Value::Array(value.values.iter().map(prost_value_json).collect())
        }
    }
}
