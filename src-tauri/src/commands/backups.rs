use std::collections::HashMap;

use mycel_sdk::proto::admin::v1::{
    BackupArchiveFormat, BackupPolicy, BackupStatus, BackupSummary, ClusterBackupBlocker,
    ClusterBackupNodeArtifact, ClusterBackupSetSummary, ClusterBackupState, ClusterBackupStatus,
    QuiesceParticipantStatus, QuiesceStatus,
};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPolicyInfo {
    pub enabled: bool,
    pub backup_dir: String,
    pub interval_seconds: i64,
    pub retention_count: i32,
    pub include_logs: bool,
    pub quiesce_drain_timeout_seconds: i64,
    pub backup_timeout_seconds: i64,
    pub retry_after_seconds: i64,
    pub status_history_limit: i32,
    pub allow_reads_during_backup: bool,
    pub schedule_kind: String,
    pub time_of_day: String,
    pub timezone: String,
    pub weekdays: Vec<i32>,
    pub run_missed: bool,
    pub archive_format: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatusInfo {
    pub backup_id: String,
    pub state: String,
    pub started_at: String,
    pub completed_at: String,
    pub archive_path: String,
    pub manifest_path: String,
    pub error: String,
    pub participants: Vec<QuiesceParticipantStatusInfo>,
    pub last_success_at: String,
    pub next_run_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSummaryInfo {
    pub backup_id: String,
    pub archive_name: String,
    pub created_at: String,
    pub completed_at: String,
    pub size_bytes: i64,
    pub checksum_sha256: String,
    pub include_logs: bool,
    pub archive_format: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuiesceStatusInfo {
    pub participants: Vec<QuiesceParticipantStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuiesceParticipantStatusInfo {
    pub name: String,
    pub quiesced: bool,
    pub active: i32,
    pub reason: String,
    pub mode: String,
    pub source: String,
    pub since: String,
    pub last_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupStatusResponse {
    pub status: Option<BackupStatusInfo>,
    pub quiesce: Option<QuiesceStatusInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupsResponse {
    pub backups: Vec<BackupSummaryInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerBackupInput {
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TriggerBackupResponseInfo {
    pub status: Option<BackupStatusInfo>,
    pub backup: Option<BackupSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBackupResponseInfo {
    pub backup_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartClusterBackupInput {
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub output_dir: String,
    #[serde(default)]
    pub archive_format: String,
    #[serde(default)]
    pub idempotency_key: String,
    #[serde(default)]
    pub convergence_timeout_seconds: i64,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBackupIDInput {
    #[serde(default)]
    pub backup_set_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelClusterBackupInput {
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListClusterBackupsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateClusterBackupSetInput {
    #[serde(default)]
    pub backup_set_path: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBackupStatusInfo {
    pub backup_set_id: String,
    pub state: String,
    pub cluster_id: String,
    pub reason: String,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: String,
    pub expected_nodes: i32,
    pub manifest_uri: String,
    pub nodes: Vec<ClusterBackupNodeArtifactInfo>,
    pub failed_phase: String,
    pub error: String,
    pub raft_barriers: HashMap<String, u64>,
    pub state_code: String,
    pub blockers: Vec<ClusterBackupBlockerInfo>,
    pub cancel_requested: bool,
    pub current_phase: String,
    pub retry_after_seconds: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBackupBlockerInfo {
    pub node_name: String,
    pub node_id: String,
    pub raft_node_id: u64,
    pub raft_group: String,
    pub reason: String,
    pub applied_index: u64,
    pub commit_index: u64,
    pub detail: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBackupSetSummaryInfo {
    pub backup_set_id: String,
    pub state: String,
    pub cluster_id: String,
    pub created_at: String,
    pub completed_at: String,
    pub expected_nodes: i32,
    pub manifest_uri: String,
    pub nodes: Vec<ClusterBackupNodeArtifactInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterBackupNodeArtifactInfo {
    pub pod_name: String,
    pub node_id: String,
    pub ordinal: i32,
    pub raft_node_id: u64,
    pub archive_name: String,
    pub archive_uri: String,
    pub manifest_name: String,
    pub manifest_uri: String,
    pub size_bytes: i64,
    pub checksum_sha256: String,
    pub applied_indexes: HashMap<String, u64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartClusterBackupResponseInfo {
    pub status: Option<ClusterBackupStatusInfo>,
    pub backup_set: Option<ClusterBackupSetSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetClusterBackupStatusResponseInfo {
    pub status: Option<ClusterBackupStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelClusterBackupResponseInfo {
    pub status: Option<ClusterBackupStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListClusterBackupsResponseInfo {
    pub backup_sets: Vec<ClusterBackupSetSummaryInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateClusterBackupSetResponseInfo {
    pub valid: bool,
    pub errors: Vec<String>,
    pub backup_set: Option<ClusterBackupSetSummaryInfo>,
}

#[tauri::command]
pub async fn admin_get_backup_policy(
    state: State<'_, AppState>,
) -> Result<BackupPolicyInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    session
        ._client
        .get_backup_policy()
        .await
        .map(backup_policy_info)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn admin_update_backup_policy(
    input: BackupPolicyInfo,
    state: State<'_, AppState>,
) -> Result<BackupPolicyInfo, String> {
    let policy = backup_policy(input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    session
        ._client
        .update_backup_policy(policy)
        .await
        .map(backup_policy_info)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn admin_get_backup_status(
    state: State<'_, AppState>,
) -> Result<BackupStatusResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .get_backup_status()
        .await
        .map_err(|err| err.to_string())?;

    Ok(BackupStatusResponse {
        status: response.status.map(backup_status_info),
        quiesce: response.quiesce.map(quiesce_status_info),
    })
}

#[tauri::command]
pub async fn admin_list_backups(
    input: ListBackupsInput,
    state: State<'_, AppState>,
) -> Result<ListBackupsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .list_backups(
            input.page_size.unwrap_or(100),
            input.page_token.unwrap_or_default(),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ListBackupsResponse {
        backups: response
            .backups
            .into_iter()
            .map(backup_summary_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_trigger_backup(
    input: TriggerBackupInput,
    state: State<'_, AppState>,
) -> Result<TriggerBackupResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .trigger_backup(input.reason)
        .await
        .map_err(|err| err.to_string())?;

    Ok(TriggerBackupResponseInfo {
        status: response.status.map(backup_status_info),
        backup: response.backup.map(backup_summary_info),
    })
}

#[tauri::command]
pub async fn admin_delete_backup(
    backup_id: String,
    state: State<'_, AppState>,
) -> Result<DeleteBackupResponseInfo, String> {
    let backup_id = backup_id.trim().to_string();
    if backup_id.is_empty() {
        return Err("Backup ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .delete_backup(backup_id)
        .await
        .map_err(|err| err.to_string())?;

    Ok(DeleteBackupResponseInfo {
        backup_id: response.backup_id,
    })
}

#[tauri::command]
pub async fn admin_start_cluster_backup(
    input: StartClusterBackupInput,
    state: State<'_, AppState>,
) -> Result<StartClusterBackupResponseInfo, String> {
    let output_dir = input.output_dir.trim().to_string();
    if output_dir.is_empty() {
        return Err("Cluster backup output directory is required".to_string());
    }
    let archive_format = parse_archive_format(&input.archive_format)?;

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .start_cluster_backup(
            input.reason,
            output_dir,
            archive_format,
            input.idempotency_key,
            input.convergence_timeout_seconds,
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(StartClusterBackupResponseInfo {
        status: response.status.map(cluster_backup_status_info),
        backup_set: response.backup_set.map(cluster_backup_set_summary_info),
    })
}

#[tauri::command]
pub async fn admin_get_cluster_backup_status(
    input: ClusterBackupIDInput,
    state: State<'_, AppState>,
) -> Result<GetClusterBackupStatusResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .get_cluster_backup_status(input.backup_set_id)
        .await
        .map_err(|err| err.to_string())?;

    Ok(GetClusterBackupStatusResponseInfo {
        status: response.status.map(cluster_backup_status_info),
    })
}

#[tauri::command]
pub async fn admin_cancel_cluster_backup(
    input: CancelClusterBackupInput,
    state: State<'_, AppState>,
) -> Result<CancelClusterBackupResponseInfo, String> {
    let backup_set_id = input.backup_set_id.trim().to_string();
    if backup_set_id.is_empty() {
        return Err("Backup set ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .cancel_cluster_backup(backup_set_id, input.reason)
        .await
        .map_err(|err| err.to_string())?;

    Ok(CancelClusterBackupResponseInfo {
        status: response.status.map(cluster_backup_status_info),
    })
}

#[tauri::command]
pub async fn admin_list_cluster_backups(
    input: ListClusterBackupsInput,
    state: State<'_, AppState>,
) -> Result<ListClusterBackupsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .list_cluster_backups(
            input.page_size.unwrap_or(50),
            input.page_token.unwrap_or_default(),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ListClusterBackupsResponseInfo {
        backup_sets: response
            .backup_sets
            .into_iter()
            .map(cluster_backup_set_summary_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_validate_cluster_backup_set(
    input: ValidateClusterBackupSetInput,
    state: State<'_, AppState>,
) -> Result<ValidateClusterBackupSetResponseInfo, String> {
    let backup_set_path = input.backup_set_path.trim().to_string();
    if backup_set_path.is_empty() {
        return Err("Backup set path is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .validate_cluster_backup_set(backup_set_path)
        .await
        .map_err(|err| err.to_string())?;

    Ok(ValidateClusterBackupSetResponseInfo {
        valid: response.valid,
        errors: response.errors,
        backup_set: response.backup_set.map(cluster_backup_set_summary_info),
    })
}

fn backup_policy_info(policy: BackupPolicy) -> BackupPolicyInfo {
    BackupPolicyInfo {
        enabled: policy.enabled,
        backup_dir: policy.backup_dir,
        interval_seconds: i64::from(policy.interval_hours) * 3600,
        retention_count: policy.retention_count,
        include_logs: policy.include_logs,
        quiesce_drain_timeout_seconds: policy.quiesce_drain_timeout_seconds,
        backup_timeout_seconds: policy.backup_timeout_seconds,
        retry_after_seconds: policy.retry_after_seconds,
        status_history_limit: policy.status_history_limit,
        allow_reads_during_backup: policy.allow_reads_during_backup,
        schedule_kind: policy.schedule_kind,
        time_of_day: policy.time_of_day,
        timezone: policy.timezone,
        weekdays: policy.weekdays,
        run_missed: policy.run_missed,
        archive_format: archive_format_name(policy.archive_format),
    }
}

#[allow(deprecated)]
fn backup_policy(policy: BackupPolicyInfo) -> Result<BackupPolicy, String> {
    let archive_format = BackupArchiveFormat::from_str_name(policy.archive_format.trim())
        .ok_or_else(|| format!("Invalid backup archive format: {}", policy.archive_format))?;

    Ok(BackupPolicy {
        enabled: policy.enabled,
        backup_dir: policy.backup_dir,
        interval_hours: (policy.interval_seconds / 3600) as i32,
        retention_count: policy.retention_count,
        include_logs: policy.include_logs,
        compression: String::new(),
        quiesce_drain_timeout_seconds: policy.quiesce_drain_timeout_seconds,
        backup_timeout_seconds: policy.backup_timeout_seconds,
        retry_after_seconds: policy.retry_after_seconds,
        status_history_limit: policy.status_history_limit,
        allow_reads_during_backup: policy.allow_reads_during_backup,
        schedule_kind: policy.schedule_kind,
        time_of_day: policy.time_of_day,
        timezone: policy.timezone,
        weekdays: policy.weekdays,
        run_missed: policy.run_missed,
        archive_format: archive_format as i32,
    })
}

fn backup_status_info(status: BackupStatus) -> BackupStatusInfo {
    BackupStatusInfo {
        backup_id: status.backup_id,
        state: status.state,
        started_at: status.started_at,
        completed_at: status.completed_at,
        archive_path: status.archive_path,
        manifest_path: status.manifest_path,
        error: status.error,
        participants: status
            .participants
            .into_iter()
            .map(quiesce_participant_status_info)
            .collect(),
        last_success_at: status.last_success_at,
        next_run_at: status.next_run_at,
    }
}

fn backup_summary_info(backup: BackupSummary) -> BackupSummaryInfo {
    BackupSummaryInfo {
        backup_id: backup.backup_id,
        archive_name: backup.archive_name,
        created_at: backup.created_at,
        completed_at: backup.completed_at,
        size_bytes: backup.size_bytes,
        checksum_sha256: backup.checksum_sha256,
        include_logs: backup.include_logs,
        archive_format: archive_format_name(backup.archive_format),
    }
}

fn parse_archive_format(value: &str) -> Result<BackupArchiveFormat, String> {
    let value = value.trim();
    if value.is_empty() || value == "BACKUP_ARCHIVE_FORMAT_UNSPECIFIED" {
        return Ok(BackupArchiveFormat::Unspecified);
    }
    BackupArchiveFormat::from_str_name(value)
        .ok_or_else(|| format!("Invalid backup archive format: {value}"))
}

fn archive_format_name(value: i32) -> String {
    BackupArchiveFormat::try_from(value)
        .unwrap_or(BackupArchiveFormat::Unspecified)
        .as_str_name()
        .to_string()
}

fn cluster_backup_state_name(value: i32) -> String {
    ClusterBackupState::try_from(value)
        .unwrap_or(ClusterBackupState::Unspecified)
        .as_str_name()
        .to_string()
}

fn cluster_backup_status_info(status: ClusterBackupStatus) -> ClusterBackupStatusInfo {
    ClusterBackupStatusInfo {
        backup_set_id: status.backup_set_id,
        state: status.state,
        cluster_id: status.cluster_id,
        reason: status.reason,
        created_at: status.created_at,
        updated_at: status.updated_at,
        completed_at: status.completed_at,
        expected_nodes: status.expected_nodes,
        manifest_uri: status.manifest_uri,
        nodes: status
            .nodes
            .into_iter()
            .map(cluster_backup_node_artifact_info)
            .collect(),
        failed_phase: status.failed_phase,
        error: status.error,
        raft_barriers: status.raft_barriers,
        state_code: cluster_backup_state_name(status.state_code),
        blockers: status
            .blockers
            .into_iter()
            .map(cluster_backup_blocker_info)
            .collect(),
        cancel_requested: status.cancel_requested,
        current_phase: status.current_phase,
        retry_after_seconds: status.retry_after_seconds,
    }
}

fn cluster_backup_blocker_info(blocker: ClusterBackupBlocker) -> ClusterBackupBlockerInfo {
    ClusterBackupBlockerInfo {
        node_name: blocker.node_name,
        node_id: blocker.node_id,
        raft_node_id: blocker.raft_node_id,
        raft_group: blocker.raft_group,
        reason: blocker.reason,
        applied_index: blocker.applied_index,
        commit_index: blocker.commit_index,
        detail: blocker.detail,
    }
}

fn cluster_backup_set_summary_info(
    summary: ClusterBackupSetSummary,
) -> ClusterBackupSetSummaryInfo {
    ClusterBackupSetSummaryInfo {
        backup_set_id: summary.backup_set_id,
        state: summary.state,
        cluster_id: summary.cluster_id,
        created_at: summary.created_at,
        completed_at: summary.completed_at,
        expected_nodes: summary.expected_nodes,
        manifest_uri: summary.manifest_uri,
        nodes: summary
            .nodes
            .into_iter()
            .map(cluster_backup_node_artifact_info)
            .collect(),
    }
}

fn cluster_backup_node_artifact_info(
    node: ClusterBackupNodeArtifact,
) -> ClusterBackupNodeArtifactInfo {
    ClusterBackupNodeArtifactInfo {
        pod_name: node.pod_name,
        node_id: node.node_id,
        ordinal: node.ordinal,
        raft_node_id: node.raft_node_id,
        archive_name: node.archive_name,
        archive_uri: node.archive_uri,
        manifest_name: node.manifest_name,
        manifest_uri: node.manifest_uri,
        size_bytes: node.size_bytes,
        checksum_sha256: node.checksum_sha256,
        applied_indexes: node.applied_indexes,
    }
}

fn quiesce_status_info(status: QuiesceStatus) -> QuiesceStatusInfo {
    QuiesceStatusInfo {
        participants: status
            .participants
            .into_iter()
            .map(quiesce_participant_status_info)
            .collect(),
    }
}

fn quiesce_participant_status_info(
    participant: QuiesceParticipantStatus,
) -> QuiesceParticipantStatusInfo {
    QuiesceParticipantStatusInfo {
        name: participant.name,
        quiesced: participant.quiesced,
        active: participant.active,
        reason: participant.reason,
        mode: participant.mode,
        source: participant.source,
        since: participant.since,
        last_error: participant.last_error,
    }
}
