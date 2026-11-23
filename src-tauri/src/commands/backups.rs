use std::collections::HashMap;

use mycel_sdk::proto::admin::v1::{
    BackupArchiveFormat, BackupDeletionState, BackupPolicy, BackupRetentionClass,
    BackupSetManifestSummary, BackupStatus, BackupSummary, BackupValidationState,
    ClusterBackupBlocker, ClusterBackupNodeArtifact, ClusterBackupSetSummary, ClusterBackupState,
    ClusterBackupStatus, CompatibilitySummary, QuiesceParticipantStatus, QuiesceStatus,
    ValidationBlocker, ValidationSummary,
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
    pub active_read_only: i32,
    pub active_writes: i32,
    pub read_allowlist_profile: String,
    pub deadline: String,
    pub accepting_read_only: bool,
    pub accepting_writes: bool,
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
    pub repository_id: String,
    pub validation: Option<ValidationSummaryInfo>,
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
    pub repository_id: String,
    pub compatibility: Option<CompatibilitySummaryInfo>,
    pub validation: Option<ValidationSummaryInfo>,
    pub deletion_state: String,
    pub retention_class: String,
    pub manifest: Option<BackupSetManifestSummaryInfo>,
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
pub struct ValidationBlockerInfo {
    pub reason: String,
    pub detail: String,
    pub retryable: bool,
    pub field_path: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationSummaryInfo {
    pub state: String,
    pub checked_at: String,
    pub blockers: Vec<ValidationBlockerInfo>,
    pub warnings: Vec<String>,
    pub validator_version: String,
    pub expected_node_count: i32,
    pub node_artifact_count: i32,
    pub required_artifact_count: i32,
    pub validated_artifact_count: i32,
    pub total_artifact_bytes: i64,
    pub checksum_algorithm: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompatibilitySummaryInfo {
    pub state: String,
    pub source_version: String,
    pub daemon_version: String,
    pub required_features: Vec<String>,
    pub blockers: Vec<ValidationBlockerInfo>,
    pub storage_format_versions: HashMap<String, String>,
    pub min_restore_mycel_version: String,
    pub max_restore_mycel_version: String,
    pub supported_restore_target_modes: Vec<String>,
    pub supported_identity_modes: Vec<String>,
    pub requires_same_topology: bool,
    pub requires_source_fencing_for_preserved_identity: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSetManifestSummaryInfo {
    pub manifest_version: i32,
    pub manifest_uri: String,
    pub manifest_checksum_sha256: String,
    pub complete_marker_uri: String,
    pub complete_marker_checksum_sha256: String,
    pub manifest_size_bytes: i64,
    pub total_artifact_bytes: i64,
    pub artifact_count: i32,
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
    pub validation: Option<ValidationSummaryInfo>,
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
        validation: response.validation.map(validation_summary_info),
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
        default_repository_id: String::new(),
        capture_provider: 0,
        quiesce_read_profile: 0,
        allow_read_only_during_quiesce: policy.allow_reads_during_backup,
        derived_subsystems: Vec::new(),
        retention_policy: None,
        validation_options: None,
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

fn backup_validation_state_name(value: i32) -> String {
    BackupValidationState::try_from(value)
        .unwrap_or(BackupValidationState::Unspecified)
        .as_str_name()
        .to_string()
}

fn deletion_state_name(value: i32) -> String {
    BackupDeletionState::try_from(value)
        .unwrap_or(BackupDeletionState::Unspecified)
        .as_str_name()
        .to_string()
}

fn retention_class_name(value: i32) -> String {
    BackupRetentionClass::try_from(value)
        .unwrap_or(BackupRetentionClass::Unspecified)
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
        repository_id: status.repository_id,
        validation: status.validation.map(validation_summary_info),
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
        repository_id: summary.repository_id,
        compatibility: summary.compatibility.map(compatibility_summary_info),
        validation: summary.validation.map(validation_summary_info),
        deletion_state: deletion_state_name(summary.deletion_state),
        retention_class: retention_class_name(summary.retention_class),
        manifest: summary.manifest.map(backup_set_manifest_summary_info),
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

fn validation_blocker_info(blocker: ValidationBlocker) -> ValidationBlockerInfo {
    ValidationBlockerInfo {
        reason: blocker.reason,
        detail: blocker.detail,
        retryable: blocker.retryable,
        field_path: blocker.field_path,
    }
}

fn validation_summary_info(summary: ValidationSummary) -> ValidationSummaryInfo {
    ValidationSummaryInfo {
        state: backup_validation_state_name(summary.state),
        checked_at: summary.checked_at,
        blockers: summary
            .blockers
            .into_iter()
            .map(validation_blocker_info)
            .collect(),
        warnings: summary.warnings,
        validator_version: summary.validator_version,
        expected_node_count: summary.expected_node_count,
        node_artifact_count: summary.node_artifact_count,
        required_artifact_count: summary.required_artifact_count,
        validated_artifact_count: summary.validated_artifact_count,
        total_artifact_bytes: summary.total_artifact_bytes,
        checksum_algorithm: summary.checksum_algorithm,
        errors: summary.errors,
    }
}

fn compatibility_summary_info(summary: CompatibilitySummary) -> CompatibilitySummaryInfo {
    CompatibilitySummaryInfo {
        state: backup_validation_state_name(summary.state),
        source_version: summary.source_version,
        daemon_version: summary.daemon_version,
        required_features: summary.required_features,
        blockers: summary
            .blockers
            .into_iter()
            .map(validation_blocker_info)
            .collect(),
        storage_format_versions: summary.storage_format_versions,
        min_restore_mycel_version: summary.min_restore_mycel_version,
        max_restore_mycel_version: summary.max_restore_mycel_version,
        supported_restore_target_modes: summary.supported_restore_target_modes,
        supported_identity_modes: summary.supported_identity_modes,
        requires_same_topology: summary.requires_same_topology,
        requires_source_fencing_for_preserved_identity: summary
            .requires_source_fencing_for_preserved_identity,
    }
}

fn backup_set_manifest_summary_info(
    summary: BackupSetManifestSummary,
) -> BackupSetManifestSummaryInfo {
    BackupSetManifestSummaryInfo {
        manifest_version: summary.manifest_version,
        manifest_uri: summary.manifest_uri,
        manifest_checksum_sha256: summary.manifest_checksum_sha256,
        complete_marker_uri: summary.complete_marker_uri,
        complete_marker_checksum_sha256: summary.complete_marker_checksum_sha256,
        manifest_size_bytes: summary.manifest_size_bytes,
        total_artifact_bytes: summary.total_artifact_bytes,
        artifact_count: summary.artifact_count,
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
        active_read_only: participant.active_read_only,
        active_writes: participant.active_writes,
        read_allowlist_profile: participant.read_allowlist_profile,
        deadline: participant.deadline,
        accepting_read_only: participant.accepting_read_only,
        accepting_writes: participant.accepting_writes,
    }
}
