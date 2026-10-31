use mycel_sdk::proto::admin::v1::{
    AnalyzeSemanticDirtyWorkRequest, AnalyzeSemanticDirtyWorkResponse, BackfillSemanticRuleRequest,
    BackfillSemanticRuleResponse, CancelSemanticMaintenanceWorkRequest,
    GetSemanticMaintenanceStatusRequest, GetSemanticMaintenanceStatusResponse,
    GetSemanticReliabilityStatusRequest, GetSemanticReliabilityStatusResponse,
    ListSemanticMaintenanceWorkRequest, ProcessSemanticDirtyWorkRequest,
    ProcessSemanticDirtyWorkResponse, RebuildSemanticRuleRequest, RebuildSemanticRuleResponse,
    RetrySemanticMaintenanceWorkRequest, SemanticMaintenanceWorkItem, SemanticRebuildStatus,
};
use tauri::State;

use crate::commands::command_error::{
    authenticated_rpc, sdk_error, sdk_error_code, validation_error, ConsoleCommandError,
};
use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceSpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticReliabilityStatusInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticMaintenanceWorkActionInput {
    pub space_id: String,
    pub work_item_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildSemanticRuleInput {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    #[serde(default)]
    pub backfill_limit: Option<i32>,
    #[serde(default)]
    pub maintenance_batch_limit: Option<i32>,
    #[serde(default)]
    pub max_catchup_iterations: Option<i32>,
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
pub struct SemanticRebuildStatusInfo {
    pub rebuild_epoch: String,
    pub state: String,
    pub pinned_target_graph_revision: String,
    pub delta_catchup_graph_revision: String,
    pub semantic_generation: String,
    pub started_at: String,
    pub completed_at: String,
    pub error_message_sanitized: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticReliabilityStatusInfo {
    pub space_id: String,
    pub semantic_rule_id: String,
    pub embedding_binding_key: String,
    pub latest_observed_graph_revision: String,
    pub analyzed_through_graph_revision: String,
    pub fresh_through_graph_revision: String,
    pub unresolved_gap_count: String,
    pub oldest_unresolved_graph_revision: String,
    pub configured_frontier_limit: String,
    pub retained_work_item_count: String,
    pub semantic_generation: String,
    pub capacity_state: String,
    pub degraded: bool,
    pub degraded_reason: String,
    pub rebuild_required: bool,
    pub rebuild: Option<SemanticRebuildStatusInfo>,
    pub configured_gap_interval_limit: String,
    pub configured_revision_span_limit: String,
    pub configured_serialized_byte_limit: String,
    pub retained_gap_interval_count: String,
    pub retained_revision_span: String,
    pub retained_serialized_bytes: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticReliabilityStatusResponseInfo {
    pub supported: bool,
    pub status: Option<SemanticReliabilityStatusInfo>,
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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildSemanticRuleResponseInfo {
    pub rebuild: SemanticRebuildStatusInfo,
    pub reliability: SemanticReliabilityStatusInfo,
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
    let response: AnalyzeSemanticDirtyWorkResponse = authenticated_rpc!(
        session._client,
        semantic_maintenance.analyze_semantic_dirty_work(AnalyzeSemanticDirtyWorkRequest {
            space_id,
            semantic_rule_id: input.semantic_rule_id.unwrap_or_default(),
            embedding_binding_key: input.embedding_binding_key.unwrap_or_default(),
            limit: input.limit.unwrap_or(100),
        })
    )
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
    let response: ProcessSemanticDirtyWorkResponse = authenticated_rpc!(
        session._client,
        semantic_maintenance.process_semantic_dirty_work(ProcessSemanticDirtyWorkRequest {
            space_id,
            limit: input.limit.unwrap_or(100),
        })
    )
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
    let response: BackfillSemanticRuleResponse = authenticated_rpc!(
        session._client,
        semantic_maintenance.backfill_semantic_rule(BackfillSemanticRuleRequest {
            space_id,
            semantic_rule_id,
            embedding_binding_key,
            node_ids: input.node_ids,
            force: input.force,
            limit: input.limit.unwrap_or(100),
            continue_on_error: input.continue_on_error,
        })
    )
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
    let response = authenticated_rpc!(
        session._client,
        semantic_maintenance.retry_semantic_maintenance_work(RetrySemanticMaintenanceWorkRequest {
            space_id,
            work_item_id,
        })
    )
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
    let response = authenticated_rpc!(
        session._client,
        semantic_maintenance.cancel_semantic_maintenance_work(
            CancelSemanticMaintenanceWorkRequest {
                space_id,
                work_item_id,
            },
        )
    )
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
    let response = authenticated_rpc!(
        session._client,
        semantic_maintenance
            .get_semantic_maintenance_status(GetSemanticMaintenanceStatusRequest { space_id })
    )
    .map_err(|err| err.to_string())?
    .into_inner();

    Ok(status_info(response))
}

#[tauri::command]
pub async fn admin_get_semantic_reliability_status(
    input: SemanticReliabilityStatusInput,
    state: State<'_, AppState>,
) -> Result<SemanticReliabilityStatusResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let semantic_rule_id = input.semantic_rule_id.trim().to_string();
    let embedding_binding_key = input.embedding_binding_key.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    if semantic_rule_id.is_empty() {
        return Err("Semantic rule ID is required".to_string());
    }
    if embedding_binding_key.is_empty() {
        return Err("Embedding binding key is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        semantic_maintenance.get_semantic_reliability_status(GetSemanticReliabilityStatusRequest {
            space_id,
            semantic_rule_id,
            embedding_binding_key,
        },)
    );

    match response {
        Ok(response) => Ok(SemanticReliabilityStatusResponseInfo {
            supported: true,
            status: Some(reliability_status_info(response.into_inner())),
        }),
        Err(err) if sdk_error_code(&err) == Some(tonic::Code::Unimplemented) => {
            Ok(SemanticReliabilityStatusResponseInfo {
                supported: false,
                status: None,
            })
        }
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
pub async fn admin_rebuild_semantic_rule(
    input: RebuildSemanticRuleInput,
    state: State<'_, AppState>,
) -> Result<RebuildSemanticRuleResponseInfo, ConsoleCommandError> {
    let space_id = input.space_id.trim().to_string();
    let semantic_rule_id = input.semantic_rule_id.trim().to_string();
    let embedding_binding_key = input.embedding_binding_key.trim().to_string();
    if space_id.is_empty() {
        return Err(validation_error("Space ID is required"));
    }
    if semantic_rule_id.is_empty() {
        return Err(validation_error("Semantic rule ID is required"));
    }
    if embedding_binding_key.is_empty() {
        return Err(validation_error("Embedding binding key is required"));
    }

    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| ConsoleCommandError {
        kind: mycel_sdk::ErrorKind::Authentication.as_str().to_string(),
        severity: mycel_sdk::ErrorSeverity::Warning.as_str().to_string(),
        message: "Not authenticated".to_string(),
        detail: None,
    })?;
    let response: RebuildSemanticRuleResponse = authenticated_rpc!(
        session._client,
        semantic_maintenance.rebuild_semantic_rule(RebuildSemanticRuleRequest {
            space_id,
            semantic_rule_id,
            embedding_binding_key,
            backfill_limit: input.backfill_limit.unwrap_or_default(),
            maintenance_batch_limit: input.maintenance_batch_limit.unwrap_or_default(),
            max_catchup_iterations: input.max_catchup_iterations.unwrap_or_default(),
        })
    )
    .map_err(semantic_rebuild_error)?
    .into_inner();

    rebuild_response_info(response)
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
    let response = authenticated_rpc!(
        session._client,
        semantic_maintenance.list_semantic_maintenance_work(ListSemanticMaintenanceWorkRequest {
            space_id,
            status: input.status.unwrap_or_default(),
            semantic_rule_id: input.semantic_rule_id.unwrap_or_default(),
            embedding_binding_key: input.embedding_binding_key.unwrap_or_default(),
            limit: input.limit.unwrap_or(100),
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();

    Ok(ListSemanticMaintenanceWorkResponseInfo {
        items: response.items.into_iter().map(work_item_info).collect(),
    })
}

fn semantic_rebuild_error(err: mycel_sdk::Error) -> ConsoleCommandError {
    let code = sdk_error_code(&err);
    let mut mapped = sdk_error(err);
    if code == Some(tonic::Code::FailedPrecondition) {
        mapped.kind = mycel_sdk::ErrorKind::Conflict.as_str().to_string();
        mapped.severity = mycel_sdk::ErrorSeverity::Warning.as_str().to_string();
    }
    mapped
}

fn rebuild_response_info(
    response: RebuildSemanticRuleResponse,
) -> Result<RebuildSemanticRuleResponseInfo, ConsoleCommandError> {
    let rebuild = response.rebuild.ok_or_else(|| ConsoleCommandError {
        kind: mycel_sdk::ErrorKind::Internal.as_str().to_string(),
        severity: mycel_sdk::ErrorSeverity::Error.as_str().to_string(),
        message: "Semantic rebuild response did not include rebuild status".to_string(),
        detail: None,
    })?;
    let reliability = response.reliability.ok_or_else(|| ConsoleCommandError {
        kind: mycel_sdk::ErrorKind::Internal.as_str().to_string(),
        severity: mycel_sdk::ErrorSeverity::Error.as_str().to_string(),
        message: "Semantic rebuild response did not include reliability status".to_string(),
        detail: None,
    })?;
    Ok(RebuildSemanticRuleResponseInfo {
        rebuild: rebuild_status_info(rebuild),
        reliability: reliability_status_info(reliability),
        selected_count: response.selected_count,
        generated_count: response.generated_count,
        skipped_count: response.skipped_count,
        failed_count: response.failed_count,
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

fn reliability_status_info(
    status: GetSemanticReliabilityStatusResponse,
) -> SemanticReliabilityStatusInfo {
    SemanticReliabilityStatusInfo {
        space_id: status.space_id,
        semantic_rule_id: status.semantic_rule_id,
        embedding_binding_key: status.embedding_binding_key,
        latest_observed_graph_revision: status.latest_observed_graph_revision.to_string(),
        analyzed_through_graph_revision: status.analyzed_through_graph_revision.to_string(),
        fresh_through_graph_revision: status.fresh_through_graph_revision.to_string(),
        unresolved_gap_count: status.unresolved_gap_count.to_string(),
        oldest_unresolved_graph_revision: status.oldest_unresolved_graph_revision.to_string(),
        configured_frontier_limit: status.configured_frontier_limit.to_string(),
        retained_work_item_count: status.retained_work_item_count.to_string(),
        semantic_generation: status.semantic_generation.to_string(),
        capacity_state: status.capacity_state,
        degraded: status.degraded,
        degraded_reason: status.degraded_reason,
        rebuild_required: status.rebuild_required,
        rebuild: status.rebuild.map(rebuild_status_info),
        configured_gap_interval_limit: status.configured_gap_interval_limit.to_string(),
        configured_revision_span_limit: status.configured_revision_span_limit.to_string(),
        configured_serialized_byte_limit: status.configured_serialized_byte_limit.to_string(),
        retained_gap_interval_count: status.retained_gap_interval_count.to_string(),
        retained_revision_span: status.retained_revision_span.to_string(),
        retained_serialized_bytes: status.retained_serialized_bytes.to_string(),
    }
}

fn rebuild_status_info(status: SemanticRebuildStatus) -> SemanticRebuildStatusInfo {
    SemanticRebuildStatusInfo {
        rebuild_epoch: status.rebuild_epoch,
        state: status.state,
        pinned_target_graph_revision: status.pinned_target_graph_revision.to_string(),
        delta_catchup_graph_revision: status.delta_catchup_graph_revision.to_string(),
        semantic_generation: status.semantic_generation.to_string(),
        started_at: status.started_at,
        completed_at: status.completed_at,
        error_message_sanitized: status.error_message_sanitized,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn semantic_rebuild_failed_precondition_preserves_conflict_category() {
        let mapped = semantic_rebuild_error(mycel_sdk::Error::from(
            tonic::Status::failed_precondition("semantic maintenance state changed"),
        ));
        assert_eq!(mapped.kind, "conflict");
        assert_eq!(mapped.severity, "warning");
    }

    #[test]
    fn semantic_rebuild_leadership_failure_preserves_unavailable_category() {
        let mapped = semantic_rebuild_error(mycel_sdk::Error::from(tonic::Status::unavailable(
            "semantic raft partition has no leader",
        )));
        assert_eq!(mapped.kind, "unavailable");
        assert_eq!(mapped.severity, "error");
    }

    #[test]
    fn semantic_reliability_mapping_preserves_exact_numeric_identities() {
        let mapped = reliability_status_info(GetSemanticReliabilityStatusResponse {
            space_id: "space-a".to_string(),
            semantic_rule_id: "rule-a".to_string(),
            embedding_binding_key: "search".to_string(),
            latest_observed_graph_revision: u64::MAX,
            analyzed_through_graph_revision: 9_007_199_254_740_993,
            fresh_through_graph_revision: 9_007_199_254_740_992,
            unresolved_gap_count: 1,
            oldest_unresolved_graph_revision: 9_007_199_254_740_991,
            configured_frontier_limit: 4096,
            retained_work_item_count: 17,
            semantic_generation: 9_007_199_254_740_994,
            capacity_state: "ok".to_string(),
            degraded: false,
            degraded_reason: String::new(),
            rebuild_required: false,
            rebuild: Some(SemanticRebuildStatus {
                rebuild_epoch: "epoch-a".to_string(),
                state: "completed".to_string(),
                pinned_target_graph_revision: 9_007_199_254_740_995,
                delta_catchup_graph_revision: 9_007_199_254_740_996,
                semantic_generation: 9_007_199_254_740_994,
                started_at: "2026-01-01T00:00:00Z".to_string(),
                completed_at: "2026-01-01T00:01:00Z".to_string(),
                error_message_sanitized: String::new(),
            }),
            configured_gap_interval_limit: 128,
            configured_revision_span_limit: 8192,
            configured_serialized_byte_limit: 65_536,
            retained_gap_interval_count: 1,
            retained_revision_span: 4,
            retained_serialized_bytes: 256,
        });

        assert_eq!(mapped.latest_observed_graph_revision, u64::MAX.to_string());
        assert_eq!(mapped.analyzed_through_graph_revision, "9007199254740993");
        assert_eq!(mapped.semantic_generation, "9007199254740994");
        let rebuild = mapped.rebuild.expect("rebuild status");
        assert_eq!(rebuild.pinned_target_graph_revision, "9007199254740995");
        assert_eq!(rebuild.delta_catchup_graph_revision, "9007199254740996");
    }
}
