use mycel_sdk::proto::admin::v1::{
    BackupArchiveFormat, BackupPolicy, BackupStatus, BackupSummary, QuiesceParticipantStatus,
    QuiesceStatus,
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

fn archive_format_name(value: i32) -> String {
    BackupArchiveFormat::try_from(value)
        .unwrap_or(BackupArchiveFormat::Unspecified)
        .as_str_name()
        .to_string()
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
