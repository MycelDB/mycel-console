use mycel_sdk::proto::admin::v1::{
    AnalyzeSemanticDirtyWorkRequest, AnalyzeSemanticDirtyWorkResponse, BackfillSemanticRuleRequest,
    BackfillSemanticRuleResponse, CancelSemanticMaintenanceWorkRequest,
    GetSemanticMaintenanceStatusRequest, GetSemanticMaintenanceStatusResponse,
    ListSemanticMaintenanceWorkRequest, ProcessSemanticDirtyWorkRequest,
    ProcessSemanticDirtyWorkResponse, RetrySemanticMaintenanceWorkRequest,
    SemanticMaintenanceWorkItem,
};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceSpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceWorkActionInput {
    pub space_id: String,
    pub work_item_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeSemanticDirtyWorkInput {
    pub space_id: String,
    #[serde(default)]
    pub semantic_rule_id: Option<String>,
    #[serde(default)]
    pub embedding_binding_key: Option<String>,
    #[serde(default)]
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSemanticDirtyWorkInput {
    pub space_id: String,
    #[serde(default)]
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackfillSemanticRuleInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    #[serde(default)]
    pub node_ids: Vec<String>,
    #[serde(default)]
    pub force: bool,
    #[serde(default)]
    pub limit: Option<i32>,
    #[serde(default)]
    pub continue_on_error: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticMaintenanceWorkInput {
    pub space_id: String,
    #[serde(default)]
    pub status: Option<String>,
    #[serde(default)]
    pub semantic_rule_id: Option<String>,
    #[serde(default)]
    pub embedding_binding_key: Option<String>,
    #[serde(default)]
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceStatusInfo {
    pub enabled: bool,
    pub degraded: bool,
    pub degraded_reason: String,
    pub queue_depth_pending: i32,
    pub queue_depth_running: i32,
    pub queue_depth_failed_retryable: i32,
    pub queue_depth_failed_permanent: i32,
    pub oldest_pending_age_seconds: i64,
    pub last_dirty_event_at: String,
    pub last_analyzed_at: String,
    pub last_worker_success_at: String,
    pub last_worker_error_at: String,
    pub throttle_state: String,
    pub analyzer_runs: i32,
    pub worker_runs: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceWorkItemInfo {
    pub work_item_id: String,
    pub space_id: String,
    pub domain_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    pub target_node_id: String,
    pub action: String,
    pub status: String,
    pub attempt_count: i32,
    pub not_before: String,
    pub claimed_until: String,
    pub last_error_category: String,
    pub last_error_message_sanitized: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticMaintenanceWorkResponseInfo {
    pub items: Vec<SemanticMaintenanceWorkItemInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AnalyzeSemanticDirtyWorkResponseInfo {
    pub processed_events: i32,
    pub enqueued_items: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessSemanticDirtyWorkResponseInfo {
    pub processed_items: i32,
    pub completed_items: i32,
    pub failed_items: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackfillSemanticRuleResponseInfo {
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    pub selected_count: i32,
    pub generated_count: i32,
    pub skipped_count: i32,
    pub failed_count: i32,
}

#[tauri::command]
pub async fn admin_analyze_semantic_dirty_work(
    input: AnalyzeSemanticDirtyWorkInput,
    state: State<'_, AppState>,
) -> Result<AnalyzeSemanticDirtyWorkResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response: AnalyzeSemanticDirtyWorkResponse = session
        ._client
        .semantic_maintenance
        .analyze_semantic_dirty_work(tonic::Request::new(AnalyzeSemanticDirtyWorkRequest {
            space_id,
            semantic_rule_id: input.semantic_rule_id.unwrap_or_default(),
            embedding_binding_key: input.embedding_binding_key.unwrap_or_default(),
            limit: input.limit.unwrap_or(100),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(AnalyzeSemanticDirtyWorkResponseInfo {
        processed_events: response.processed_events,
        enqueued_items: response.enqueued_items,
    })
}

#[tauri::command]
pub async fn admin_process_semantic_dirty_work(
    input: ProcessSemanticDirtyWorkInput,
    state: State<'_, AppState>,
) -> Result<ProcessSemanticDirtyWorkResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response: ProcessSemanticDirtyWorkResponse = session
        ._client
        .semantic_maintenance
        .process_semantic_dirty_work(tonic::Request::new(ProcessSemanticDirtyWorkRequest {
            space_id,
            limit: input.limit.unwrap_or(100),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ProcessSemanticDirtyWorkResponseInfo {
        processed_items: response.processed_items,
        completed_items: response.completed_items,
        failed_items: response.failed_items,
    })
}

#[tauri::command]
pub async fn admin_backfill_semantic_rule(
    input: BackfillSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<BackfillSemanticRuleResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let semantic_rule_id = input.semantic_rule_id.trim().to_string();
    let embedding_binding_key = input.embedding_binding_key.trim().to_string();
    if space_id.is_empty() || semantic_rule_id.is_empty() || embedding_binding_key.is_empty() {
        return Err(
            "Space ID, semantic rule ID, and embedding binding key are required".to_string(),
        );
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response: BackfillSemanticRuleResponse = session
        ._client
        .semantic_maintenance
        .backfill_semantic_rule(tonic::Request::new(BackfillSemanticRuleRequest {
            space_id,
            semantic_rule_id,
            embedding_binding_key,
            node_ids: input.node_ids,
            force: input.force,
            limit: input.limit.unwrap_or(100),
            continue_on_error: input.continue_on_error,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(BackfillSemanticRuleResponseInfo {
        semantic_rule_id: response.semantic_rule_id,
        embedding_binding_key: response.embedding_binding_key,
        selected_count: response.selected_count,
        generated_count: response.generated_count,
        skipped_count: response.skipped_count,
        failed_count: response.failed_count,
    })
}

#[tauri::command]
pub async fn admin_retry_semantic_maintenance_work(
    input: SemanticMaintenanceWorkActionInput,
    state: State<'_, AppState>,
) -> Result<SemanticMaintenanceWorkItemInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let work_item_id = input.work_item_id.trim().to_string();
    if space_id.is_empty() || work_item_id.is_empty() {
        return Err("Space ID and work item ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic_maintenance
        .retry_semantic_maintenance_work(tonic::Request::new(RetrySemanticMaintenanceWorkRequest {
            space_id,
            work_item_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    response
        .item
        .map(work_item_info)
        .ok_or_else(|| "Retry response did not include a work item".to_string())
}

#[tauri::command]
pub async fn admin_cancel_semantic_maintenance_work(
    input: SemanticMaintenanceWorkActionInput,
    state: State<'_, AppState>,
) -> Result<SemanticMaintenanceWorkItemInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let work_item_id = input.work_item_id.trim().to_string();
    if space_id.is_empty() || work_item_id.is_empty() {
        return Err("Space ID and work item ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .semantic_maintenance
        .cancel_semantic_maintenance_work(tonic::Request::new(
            CancelSemanticMaintenanceWorkRequest {
                space_id,
                work_item_id,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    response
        .item
        .map(work_item_info)
        .ok_or_else(|| "Cancel response did not include a work item".to_string())
}

#[tauri::command]
pub async fn admin_get_semantic_maintenance_status(
    input: SemanticMaintenanceSpaceInput,
    state: State<'_, AppState>,
) -> Result<SemanticMaintenanceStatusInfo, String> {
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
        .semantic_maintenance
        .get_semantic_maintenance_status(tonic::Request::new(GetSemanticMaintenanceStatusRequest {
            space_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(status_info(response))
}

#[tauri::command]
pub async fn admin_list_semantic_maintenance_work(
    input: ListSemanticMaintenanceWorkInput,
    state: State<'_, AppState>,
) -> Result<ListSemanticMaintenanceWorkResponseInfo, String> {
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
        .semantic_maintenance
        .list_semantic_maintenance_work(tonic::Request::new(ListSemanticMaintenanceWorkRequest {
            space_id,
            status: input.status.unwrap_or_default(),
            semantic_rule_id: input.semantic_rule_id.unwrap_or_default(),
            embedding_binding_key: input.embedding_binding_key.unwrap_or_default(),
            limit: input.limit.unwrap_or(100),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListSemanticMaintenanceWorkResponseInfo {
        items: response.items.into_iter().map(work_item_info).collect(),
    })
}

fn status_info(status: GetSemanticMaintenanceStatusResponse) -> SemanticMaintenanceStatusInfo {
    SemanticMaintenanceStatusInfo {
        enabled: status.enabled,
        degraded: status.degraded,
        degraded_reason: status.degraded_reason,
        queue_depth_pending: status.queue_depth_pending,
        queue_depth_running: status.queue_depth_running,
        queue_depth_failed_retryable: status.queue_depth_failed_retryable,
        queue_depth_failed_permanent: status.queue_depth_failed_permanent,
        oldest_pending_age_seconds: status.oldest_pending_age_seconds,
        last_dirty_event_at: status.last_dirty_event_at,
        last_analyzed_at: status.last_analyzed_at,
        last_worker_success_at: status.last_worker_success_at,
        last_worker_error_at: status.last_worker_error_at,
        throttle_state: status.throttle_state,
        analyzer_runs: status.analyzer_runs,
        worker_runs: status.worker_runs,
    }
}

fn work_item_info(item: SemanticMaintenanceWorkItem) -> SemanticMaintenanceWorkItemInfo {
    SemanticMaintenanceWorkItemInfo {
        work_item_id: item.work_item_id,
        space_id: item.space_id,
        domain_id: item.domain_id,
        semantic_rule_id: item.semantic_rule_id,
        embedding_binding_key: item.embedding_binding_key,
        target_node_id: item.target_node_id,
        action: item.action,
        status: item.status,
        attempt_count: item.attempt_count,
        not_before: item.not_before,
        claimed_until: item.claimed_until,
        last_error_category: item.last_error_category,
        last_error_message_sanitized: item.last_error_message_sanitized,
        created_at: item.created_at,
        updated_at: item.updated_at,
    }
}
