use std::collections::HashMap;

use mycel_sdk::proto::admin::v1::{
    ApplyRepositoryRetentionRequest, BackupAlertCondition, BackupArchiveFormat,
    BackupCaptureProvider, BackupDeletionState, BackupDeploymentMode, BackupDerivedPolicyMode,
    BackupDerivedSubsystem, BackupMetric, BackupNodeArtifact, BackupObservabilitySnapshot,
    BackupOperation, BackupOperationBlocker, BackupOperationState, BackupPolicy,
    BackupQuiesceReadProfile, BackupRepository, BackupRepositoryProvider,
    BackupRepositoryValidationSummary, BackupRetentionClass, BackupSetManifestSummary,
    BackupSetSummary, BackupValidationState, CapacityEstimate, CompatibilitySummary,
    DerivedSubsystemPolicy, EncryptionMode, GetBackupObservabilityRequest,
    PlanRepositoryRetentionRequest, PlanRestoreRequest, RepositoryRetentionAction,
    RepositoryRetentionPlan, RestoreAuthSessionPolicy, RestoreIdentityMode, RestorePlanSummary,
    RestoreTargetMode, RetentionPolicy, S3CompatibleRepositoryConfig, SecretReference,
    SecretReferenceScheme, StartBackupRequest, ValidationBlocker, ValidationOptions,
    ValidationProbeResult, ValidationSummary,
};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationOptionsInfo {
    pub include_artifact_checks: bool,
    pub include_external_dependency_checks: bool,
    pub include_capacity_estimates: bool,
    pub require_complete_marker: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RetentionPolicyInfo {
    pub keep_last_successful: i32,
    pub keep_for_seconds: i64,
    pub delete_incomplete_after_seconds: i64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DerivedSubsystemPolicyInfo {
    pub subsystem: String,
    pub mode: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPolicyInfo {
    pub default_repository_id: String,
    pub capture_provider: String,
    pub quiesce_read_profile: String,
    pub allow_read_only_during_quiesce: bool,
    pub derived_subsystems: Vec<DerivedSubsystemPolicyInfo>,
    pub retention_policy: Option<RetentionPolicyInfo>,
    pub validation_options: Option<ValidationOptionsInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretReferenceInfo {
    pub scheme: String,
    pub name: String,
    pub namespace: String,
    pub path: String,
    pub keys: HashMap<String, String>,
    pub description: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptionPolicyInfo {
    pub mode: String,
    pub key_ref: Option<SecretReferenceInfo>,
    pub kms_key_id: String,
    pub require_bucket_default_encryption: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct S3CompatibleRepositoryConfigInfo {
    pub bucket: String,
    pub prefix: String,
    pub region: String,
    pub endpoint_uri: String,
    pub force_path_style: bool,
    pub disable_tls: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidationProbeResultInfo {
    pub name: String,
    pub state: String,
    pub detail: String,
    pub checked_at: String,
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
pub struct BackupRepositoryValidationSummaryInfo {
    pub state: String,
    pub checked_at: String,
    pub probes: Vec<ValidationProbeResultInfo>,
    pub blockers: Vec<ValidationBlockerInfo>,
    pub sanitized_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRepositoryInfo {
    pub repository_id: String,
    pub display_name: String,
    pub provider: String,
    pub s3: Option<S3CompatibleRepositoryConfigInfo>,
    pub credential_ref: Option<SecretReferenceInfo>,
    pub encryption: Option<EncryptionPolicyInfo>,
    pub tls_ca_ref: Option<SecretReferenceInfo>,
    pub dev_only: bool,
    pub create_time: String,
    pub update_time: String,
    pub validation: Option<BackupRepositoryValidationSummaryInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupRepositoriesInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupRepositoriesResponseInfo {
    pub repositories: Vec<BackupRepositoryInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRepositoryIDInput {
    #[serde(default)]
    pub repository_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBackupRepositoryResponseInfo {
    pub repository_id: String,
    pub state: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateBackupRepositoryResponseInfo {
    pub repository: Option<BackupRepositoryInfo>,
    pub validation: Option<BackupRepositoryValidationSummaryInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SecretReferenceInput {
    #[serde(default)]
    pub scheme: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub namespace: String,
    #[serde(default)]
    pub path: String,
    #[serde(default)]
    pub keys: HashMap<String, String>,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EncryptionPolicyInput {
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub key_ref: Option<SecretReferenceInput>,
    #[serde(default)]
    pub kms_key_id: String,
    #[serde(default)]
    pub require_bucket_default_encryption: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct S3CompatibleRepositoryConfigInput {
    #[serde(default)]
    pub bucket: String,
    #[serde(default)]
    pub prefix: String,
    #[serde(default)]
    pub region: String,
    #[serde(default)]
    pub endpoint_uri: String,
    #[serde(default)]
    pub force_path_style: bool,
    #[serde(default)]
    pub disable_tls: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupRepositoryInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub s3: Option<S3CompatibleRepositoryConfigInput>,
    #[serde(default)]
    pub credential_ref: Option<SecretReferenceInput>,
    #[serde(default)]
    pub encryption: Option<EncryptionPolicyInput>,
    #[serde(default)]
    pub tls_ca_ref: Option<SecretReferenceInput>,
    #[serde(default)]
    pub dev_only: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanRepositoryRetentionInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub retention_policy: Option<RetentionPolicyInfo>,
    #[serde(default)]
    pub now: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyRepositoryRetentionInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub retention_policy: Option<RetentionPolicyInfo>,
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub now: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryRetentionActionInfo {
    pub backup_set_id: String,
    pub prefix: String,
    pub action: String,
    pub reason: String,
    pub created_at: String,
    pub completed_at: String,
    pub object_count: i32,
    pub deleted_objects: i32,
    pub retryable: bool,
    pub blocked: bool,
    pub error: String,
    pub retention_cutoff: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryRetentionPlanInfo {
    pub repository_id: String,
    pub planned_at: String,
    pub retention_policy: Option<RetentionPolicyInfo>,
    pub dry_run: bool,
    pub actions: Vec<RepositoryRetentionActionInfo>,
    pub warnings: Vec<String>,
    pub deleted_objects: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryRetentionResponseInfo {
    pub plan: Option<RepositoryRetentionPlanInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBackupObservabilityInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub include_retention_probe: bool,
    #[serde(default)]
    pub stale_operation_after_seconds: i64,
    #[serde(default)]
    pub backup_freshness_after_seconds: i64,
    #[serde(default)]
    pub incomplete_backup_after_seconds: i64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupMetricInfo {
    pub name: String,
    pub description: String,
    pub unit: String,
    pub value: f64,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupAlertConditionInfo {
    pub name: String,
    pub severity: String,
    pub firing: bool,
    pub reason: String,
    pub expression: String,
    pub labels: HashMap<String, String>,
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupObservabilitySnapshotInfo {
    pub observed_at: String,
    pub repository_id: String,
    pub metrics: Vec<BackupMetricInfo>,
    pub alerts: Vec<BackupAlertConditionInfo>,
    pub summary_state: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBackupObservabilityResponseInfo {
    pub snapshot: Option<BackupObservabilitySnapshotInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StartBackupInput {
    #[serde(default)]
    pub reason: String,
    #[serde(default)]
    pub archive_format: String,
    #[serde(default)]
    pub idempotency_key: String,
    #[serde(default)]
    pub convergence_timeout_seconds: i64,
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub capture_provider: String,
    #[serde(default)]
    pub quiesce_read_profile: String,
    #[serde(default)]
    pub validation_options: Option<ValidationOptionsInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupOperationIDInput {
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub backup_operation_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelBackupOperationInput {
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub backup_operation_id: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupOperationsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupSetsInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSetIDInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub validation_options: Option<ValidationOptionsInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBackupSetInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub reason: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanRestoreInput {
    #[serde(default)]
    pub repository_id: String,
    #[serde(default)]
    pub backup_set_id: String,
    #[serde(default)]
    pub validation_options: Option<ValidationOptionsInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupOperationInfo {
    pub backup_operation_id: String,
    pub backup_set_id: String,
    pub repository_id: String,
    pub deployment_id: String,
    pub deployment_name: String,
    pub deployment_mode: String,
    pub state: String,
    pub phase: String,
    pub reason: String,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: String,
    pub expected_node_count: i32,
    pub manifest_uri: String,
    pub nodes: Vec<BackupNodeArtifactInfo>,
    pub raft_barriers: HashMap<String, u64>,
    pub blockers: Vec<BackupOperationBlockerInfo>,
    pub validation: Option<ValidationSummaryInfo>,
    pub cancel_requested: bool,
    pub retry_after_seconds: i64,
    pub failed_phase: String,
    pub error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupOperationBlockerInfo {
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
pub struct BackupSetSummaryInfo {
    pub backup_set_id: String,
    pub repository_id: String,
    pub deployment_id: String,
    pub deployment_name: String,
    pub deployment_mode: String,
    pub state: String,
    pub created_at: String,
    pub completed_at: String,
    pub expected_node_count: i32,
    pub manifest_uri: String,
    pub nodes: Vec<BackupNodeArtifactInfo>,
    pub compatibility: Option<CompatibilitySummaryInfo>,
    pub validation: Option<ValidationSummaryInfo>,
    pub deletion_state: String,
    pub retention_class: String,
    pub manifest: Option<BackupSetManifestSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupNodeArtifactInfo {
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
pub struct StartBackupResponseInfo {
    pub operation: Option<BackupOperationInfo>,
    pub backup_set: Option<BackupSetSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GetBackupOperationResponseInfo {
    pub operation: Option<BackupOperationInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CancelBackupOperationResponseInfo {
    pub operation: Option<BackupOperationInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupOperationsResponseInfo {
    pub operations: Vec<BackupOperationInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListBackupSetsResponseInfo {
    pub backup_sets: Vec<BackupSetSummaryInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateBackupSetResponseInfo {
    pub valid: bool,
    pub errors: Vec<String>,
    pub backup_set: Option<BackupSetSummaryInfo>,
    pub validation: Option<ValidationSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBackupSetResponseInfo {
    pub repository_id: String,
    pub backup_set_id: String,
    pub state: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapacityEstimateInfo {
    pub required_bytes: i64,
    pub available_bytes: i64,
    pub blockers: Vec<ValidationBlockerInfo>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestorePlanSummaryInfo {
    pub restore_plan_id: String,
    pub repository_id: String,
    pub backup_set_id: String,
    pub target_mode: String,
    pub identity_mode: String,
    pub auth_session_policy: String,
    pub restorable: bool,
    pub validation: Option<ValidationSummaryInfo>,
    pub compatibility: Option<CompatibilitySummaryInfo>,
    pub capacity: Option<CapacityEstimateInfo>,
    pub derived_actions: Vec<DerivedSubsystemPolicyInfo>,
    pub blockers: Vec<ValidationBlockerInfo>,
    pub planned_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanRestoreResponseInfo {
    pub plan: Option<RestorePlanSummaryInfo>,
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
pub async fn admin_list_backup_repositories(
    input: ListBackupRepositoriesInput,
    state: State<'_, AppState>,
) -> Result<ListBackupRepositoriesResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .list_backup_repositories(
            input.page_size.unwrap_or(50),
            input.page_token.unwrap_or_default(),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ListBackupRepositoriesResponseInfo {
        repositories: response
            .repositories
            .into_iter()
            .map(backup_repository_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_validate_backup_repository(
    input: BackupRepositoryIDInput,
    state: State<'_, AppState>,
) -> Result<ValidateBackupRepositoryResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .validate_backup_repository(repository_id)
        .await
        .map_err(|err| err.to_string())?;

    Ok(ValidateBackupRepositoryResponseInfo {
        repository: response.repository.map(backup_repository_info),
        validation: response
            .validation
            .map(backup_repository_validation_summary_info),
    })
}

#[tauri::command]
pub async fn admin_create_backup_repository(
    input: BackupRepositoryInput,
    state: State<'_, AppState>,
) -> Result<BackupRepositoryInfo, String> {
    let repository = backup_repository_from_input(input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let repository = session
        ._client
        .create_backup_repository(repository)
        .await
        .map_err(|err| err.to_string())?;
    Ok(backup_repository_info(repository))
}

#[tauri::command]
pub async fn admin_update_backup_repository(
    input: BackupRepositoryInput,
    state: State<'_, AppState>,
) -> Result<BackupRepositoryInfo, String> {
    let repository = backup_repository_from_input(input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let repository = session
        ._client
        .update_backup_repository(repository)
        .await
        .map_err(|err| err.to_string())?;
    Ok(backup_repository_info(repository))
}

#[tauri::command]
pub async fn admin_delete_backup_repository(
    input: BackupRepositoryIDInput,
    state: State<'_, AppState>,
) -> Result<DeleteBackupRepositoryResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .delete_backup_repository(repository_id)
        .await
        .map_err(|err| err.to_string())?;
    Ok(DeleteBackupRepositoryResponseInfo {
        repository_id: response.repository_id,
        state: deletion_state_name(response.state),
    })
}

#[tauri::command]
pub async fn admin_plan_repository_retention(
    input: PlanRepositoryRetentionInput,
    state: State<'_, AppState>,
) -> Result<RepositoryRetentionResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .plan_repository_retention(PlanRepositoryRetentionRequest {
            repository_id,
            retention_policy: input.retention_policy.map(retention_policy_from_info),
            now: input.now,
        })
        .await
        .map_err(|err| err.to_string())?;
    Ok(RepositoryRetentionResponseInfo {
        plan: response.plan.map(repository_retention_plan_info),
    })
}

#[tauri::command]
pub async fn admin_apply_repository_retention(
    input: ApplyRepositoryRetentionInput,
    state: State<'_, AppState>,
) -> Result<RepositoryRetentionResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .apply_repository_retention(ApplyRepositoryRetentionRequest {
            repository_id,
            retention_policy: input.retention_policy.map(retention_policy_from_info),
            reason: input.reason,
            now: input.now,
        })
        .await
        .map_err(|err| err.to_string())?;
    Ok(RepositoryRetentionResponseInfo {
        plan: response.plan.map(repository_retention_plan_info),
    })
}

#[tauri::command]
pub async fn admin_get_backup_observability(
    input: GetBackupObservabilityInput,
    state: State<'_, AppState>,
) -> Result<GetBackupObservabilityResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .get_backup_observability(GetBackupObservabilityRequest {
            repository_id: input.repository_id,
            include_retention_probe: input.include_retention_probe,
            stale_operation_after_seconds: input.stale_operation_after_seconds,
            backup_freshness_after_seconds: input.backup_freshness_after_seconds,
            incomplete_backup_after_seconds: input.incomplete_backup_after_seconds,
        })
        .await
        .map_err(|err| err.to_string())?;
    Ok(GetBackupObservabilityResponseInfo {
        snapshot: response.snapshot.map(backup_observability_snapshot_info),
    })
}

#[tauri::command]
pub async fn admin_start_backup(
    input: StartBackupInput,
    state: State<'_, AppState>,
) -> Result<StartBackupResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }
    let archive_format = parse_archive_format(&input.archive_format)?;
    let capture_provider = parse_capture_provider(&input.capture_provider)?;
    let quiesce_read_profile = parse_quiesce_read_profile(&input.quiesce_read_profile)?;

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .start_backup(StartBackupRequest {
            reason: input.reason,
            archive_format: archive_format as i32,
            idempotency_key: input.idempotency_key,
            convergence_timeout_seconds: input.convergence_timeout_seconds,
            repository_id,
            capture_provider: capture_provider as i32,
            validation_options: input.validation_options.map(validation_options_from_info),
            quiesce_read_profile: quiesce_read_profile as i32,
        })
        .await
        .map_err(|err| err.to_string())?;

    Ok(StartBackupResponseInfo {
        operation: response.operation.map(backup_operation_info),
        backup_set: response.backup_set.map(backup_set_summary_info),
    })
}

#[tauri::command]
pub async fn admin_get_backup_operation(
    input: BackupOperationIDInput,
    state: State<'_, AppState>,
) -> Result<GetBackupOperationResponseInfo, String> {
    let backup_set_id = input.backup_set_id.trim().to_string();
    let backup_operation_id = input.backup_operation_id.trim().to_string();
    let operation_lookup_id = if backup_set_id.is_empty() {
        backup_operation_id
    } else {
        backup_set_id
    };
    if operation_lookup_id.is_empty() {
        return Err("Backup set ID or backup operation ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .get_backup_operation(operation_lookup_id)
        .await
        .map_err(|err| err.to_string())?;

    Ok(GetBackupOperationResponseInfo {
        operation: response.operation.map(backup_operation_info),
    })
}

#[tauri::command]
pub async fn admin_cancel_backup_operation(
    input: CancelBackupOperationInput,
    state: State<'_, AppState>,
) -> Result<CancelBackupOperationResponseInfo, String> {
    let backup_set_id = input.backup_set_id.trim().to_string();
    let backup_operation_id = input.backup_operation_id.trim().to_string();
    let operation_lookup_id = if backup_set_id.is_empty() {
        backup_operation_id
    } else {
        backup_set_id
    };
    if operation_lookup_id.is_empty() {
        return Err("Backup set ID or backup operation ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .cancel_backup_operation(operation_lookup_id, input.reason)
        .await
        .map_err(|err| err.to_string())?;

    Ok(CancelBackupOperationResponseInfo {
        operation: response.operation.map(backup_operation_info),
    })
}

#[tauri::command]
pub async fn admin_list_backup_operations(
    input: ListBackupOperationsInput,
    state: State<'_, AppState>,
) -> Result<ListBackupOperationsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .list_backup_operations(
            input.page_size.unwrap_or(50),
            input.page_token.unwrap_or_default(),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ListBackupOperationsResponseInfo {
        operations: response
            .operations
            .into_iter()
            .map(backup_operation_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_backup_sets(
    input: ListBackupSetsInput,
    state: State<'_, AppState>,
) -> Result<ListBackupSetsResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .list_backup_sets(
            repository_id,
            input.page_size.unwrap_or(50),
            input.page_token.unwrap_or_default(),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ListBackupSetsResponseInfo {
        backup_sets: response
            .backup_sets
            .into_iter()
            .map(backup_set_summary_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_validate_backup_set(
    input: BackupSetIDInput,
    state: State<'_, AppState>,
) -> Result<ValidateBackupSetResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    let backup_set_id = input.backup_set_id.trim().to_string();
    if repository_id.is_empty() || backup_set_id.is_empty() {
        return Err("Backup repository ID and backup set ID are required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .validate_backup_set_with_options(
            repository_id,
            backup_set_id,
            input.validation_options.map(validation_options_from_info),
        )
        .await
        .map_err(|err| err.to_string())?;

    Ok(ValidateBackupSetResponseInfo {
        valid: response.valid,
        errors: response.errors,
        backup_set: response.backup_set.map(backup_set_summary_info),
        validation: response.validation.map(validation_summary_info),
    })
}

#[tauri::command]
pub async fn admin_delete_backup_set(
    input: DeleteBackupSetInput,
    state: State<'_, AppState>,
) -> Result<DeleteBackupSetResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    let backup_set_id = input.backup_set_id.trim().to_string();
    if repository_id.is_empty() || backup_set_id.is_empty() {
        return Err("Backup repository ID and backup set ID are required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .delete_backup_set(repository_id, backup_set_id, input.reason)
        .await
        .map_err(|err| err.to_string())?;

    Ok(DeleteBackupSetResponseInfo {
        repository_id: response.repository_id,
        backup_set_id: response.backup_set_id,
        state: deletion_state_name(response.state),
    })
}

#[tauri::command]
pub async fn admin_plan_restore(
    input: PlanRestoreInput,
    state: State<'_, AppState>,
) -> Result<PlanRestoreResponseInfo, String> {
    let repository_id = input.repository_id.trim().to_string();
    let backup_set_id = input.backup_set_id.trim().to_string();
    if repository_id.is_empty() || backup_set_id.is_empty() {
        return Err("Backup repository ID and backup set ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .plan_restore(PlanRestoreRequest {
            repository_id,
            backup_set_id,
            target_mode: RestoreTargetMode::NewDeploymentBootstrap as i32,
            identity_mode: RestoreIdentityMode::PreserveBackupId as i32,
            auth_session_policy: RestoreAuthSessionPolicy::PreserveRestoredSessions as i32,
            validation_options: input.validation_options.map(validation_options_from_info),
            target: None,
            staging: None,
        })
        .await
        .map_err(|err| err.to_string())?;
    Ok(PlanRestoreResponseInfo {
        plan: response.plan.map(restore_plan_summary_info),
    })
}

fn backup_policy_info(policy: BackupPolicy) -> BackupPolicyInfo {
    BackupPolicyInfo {
        default_repository_id: policy.default_repository_id,
        capture_provider: capture_provider_name(policy.capture_provider),
        quiesce_read_profile: quiesce_read_profile_name(policy.quiesce_read_profile),
        allow_read_only_during_quiesce: policy.allow_read_only_during_quiesce,
        derived_subsystems: policy
            .derived_subsystems
            .into_iter()
            .map(derived_subsystem_policy_info)
            .collect(),
        retention_policy: policy.retention_policy.map(retention_policy_info),
        validation_options: policy.validation_options.map(validation_options_info),
    }
}

fn backup_policy(policy: BackupPolicyInfo) -> Result<BackupPolicy, String> {
    Ok(BackupPolicy {
        default_repository_id: policy.default_repository_id,
        capture_provider: parse_capture_provider(&policy.capture_provider)? as i32,
        quiesce_read_profile: parse_quiesce_read_profile(&policy.quiesce_read_profile)? as i32,
        allow_read_only_during_quiesce: policy.allow_read_only_during_quiesce,
        derived_subsystems: policy
            .derived_subsystems
            .into_iter()
            .map(derived_subsystem_policy_from_info)
            .collect::<Result<Vec<_>, _>>()?,
        retention_policy: policy.retention_policy.map(retention_policy_from_info),
        validation_options: policy.validation_options.map(validation_options_from_info),
    })
}

fn backup_repository_from_input(input: BackupRepositoryInput) -> Result<BackupRepository, String> {
    let repository_id = input.repository_id.trim().to_string();
    if repository_id.is_empty() {
        return Err("Backup repository ID is required".to_string());
    }
    let provider = if input.provider.trim().is_empty() {
        BackupRepositoryProvider::S3Compatible
    } else {
        parse_repository_provider(&input.provider)?
    };
    Ok(BackupRepository {
        repository_id,
        display_name: input.display_name,
        provider: provider as i32,
        s3: input.s3.map(s3_repository_config_from_input),
        credential_ref: input
            .credential_ref
            .map(secret_reference_from_input)
            .transpose()?,
        encryption: input
            .encryption
            .map(encryption_policy_from_input)
            .transpose()?,
        tls_ca_ref: input
            .tls_ca_ref
            .map(secret_reference_from_input)
            .transpose()?,
        dev_only: input.dev_only,
        create_time: String::new(),
        update_time: String::new(),
        validation: None,
    })
}

fn secret_reference_from_input(input: SecretReferenceInput) -> Result<SecretReference, String> {
    Ok(SecretReference {
        scheme: parse_secret_reference_scheme(&input.scheme)? as i32,
        name: input.name,
        namespace: input.namespace,
        path: input.path,
        keys: input.keys,
        description: input.description,
    })
}

fn encryption_policy_from_input(
    input: EncryptionPolicyInput,
) -> Result<mycel_sdk::proto::admin::v1::EncryptionPolicy, String> {
    Ok(mycel_sdk::proto::admin::v1::EncryptionPolicy {
        mode: parse_encryption_mode(&input.mode)? as i32,
        key_ref: input.key_ref.map(secret_reference_from_input).transpose()?,
        kms_key_id: input.kms_key_id,
        require_bucket_default_encryption: input.require_bucket_default_encryption,
    })
}

fn s3_repository_config_from_input(
    input: S3CompatibleRepositoryConfigInput,
) -> S3CompatibleRepositoryConfig {
    S3CompatibleRepositoryConfig {
        bucket: input.bucket,
        prefix: input.prefix,
        region: input.region,
        endpoint_uri: input.endpoint_uri,
        force_path_style: input.force_path_style,
        disable_tls: input.disable_tls,
    }
}

fn validation_options_from_info(input: ValidationOptionsInfo) -> ValidationOptions {
    ValidationOptions {
        include_artifact_checks: input.include_artifact_checks,
        include_external_dependency_checks: input.include_external_dependency_checks,
        include_capacity_estimates: input.include_capacity_estimates,
        require_complete_marker: input.require_complete_marker,
    }
}

fn validation_options_info(options: ValidationOptions) -> ValidationOptionsInfo {
    ValidationOptionsInfo {
        include_artifact_checks: options.include_artifact_checks,
        include_external_dependency_checks: options.include_external_dependency_checks,
        include_capacity_estimates: options.include_capacity_estimates,
        require_complete_marker: options.require_complete_marker,
    }
}

fn retention_policy_from_info(input: RetentionPolicyInfo) -> RetentionPolicy {
    RetentionPolicy {
        keep_last_successful: input.keep_last_successful,
        keep_for_seconds: input.keep_for_seconds,
        delete_incomplete_after_seconds: input.delete_incomplete_after_seconds,
    }
}

fn retention_policy_info(policy: RetentionPolicy) -> RetentionPolicyInfo {
    RetentionPolicyInfo {
        keep_last_successful: policy.keep_last_successful,
        keep_for_seconds: policy.keep_for_seconds,
        delete_incomplete_after_seconds: policy.delete_incomplete_after_seconds,
    }
}

fn derived_subsystem_policy_from_info(
    input: DerivedSubsystemPolicyInfo,
) -> Result<DerivedSubsystemPolicy, String> {
    Ok(DerivedSubsystemPolicy {
        subsystem: parse_derived_subsystem(&input.subsystem)? as i32,
        mode: parse_derived_policy_mode(&input.mode)? as i32,
    })
}

fn derived_subsystem_policy_info(policy: DerivedSubsystemPolicy) -> DerivedSubsystemPolicyInfo {
    DerivedSubsystemPolicyInfo {
        subsystem: derived_subsystem_name(policy.subsystem),
        mode: derived_policy_mode_name(policy.mode),
    }
}

fn repository_retention_action_info(
    action: RepositoryRetentionAction,
) -> RepositoryRetentionActionInfo {
    RepositoryRetentionActionInfo {
        backup_set_id: action.backup_set_id,
        prefix: action.prefix,
        action: action.action,
        reason: action.reason,
        created_at: action.created_at,
        completed_at: action.completed_at,
        object_count: action.object_count,
        deleted_objects: action.deleted_objects,
        retryable: action.retryable,
        blocked: action.blocked,
        error: action.error,
        retention_cutoff: action.retention_cutoff,
    }
}

fn repository_retention_plan_info(plan: RepositoryRetentionPlan) -> RepositoryRetentionPlanInfo {
    RepositoryRetentionPlanInfo {
        repository_id: plan.repository_id,
        planned_at: plan.planned_at,
        retention_policy: plan.retention_policy.map(retention_policy_info),
        dry_run: plan.dry_run,
        actions: plan
            .actions
            .into_iter()
            .map(repository_retention_action_info)
            .collect(),
        warnings: plan.warnings,
        deleted_objects: plan.deleted_objects,
    }
}

fn backup_metric_info(metric: BackupMetric) -> BackupMetricInfo {
    BackupMetricInfo {
        name: metric.name,
        description: metric.description,
        unit: metric.unit,
        value: metric.value,
        labels: metric.labels,
    }
}

fn backup_alert_condition_info(alert: BackupAlertCondition) -> BackupAlertConditionInfo {
    BackupAlertConditionInfo {
        name: alert.name,
        severity: alert.severity,
        firing: alert.firing,
        reason: alert.reason,
        expression: alert.expression,
        labels: alert.labels,
        evidence: alert.evidence,
    }
}

fn backup_observability_snapshot_info(
    snapshot: BackupObservabilitySnapshot,
) -> BackupObservabilitySnapshotInfo {
    BackupObservabilitySnapshotInfo {
        observed_at: snapshot.observed_at,
        repository_id: snapshot.repository_id,
        metrics: snapshot
            .metrics
            .into_iter()
            .map(backup_metric_info)
            .collect(),
        alerts: snapshot
            .alerts
            .into_iter()
            .map(backup_alert_condition_info)
            .collect(),
        summary_state: snapshot.summary_state,
    }
}

fn backup_operation_info(operation: BackupOperation) -> BackupOperationInfo {
    BackupOperationInfo {
        backup_operation_id: operation.backup_operation_id,
        backup_set_id: operation.backup_set_id,
        repository_id: operation.repository_id,
        deployment_id: operation.deployment_id,
        deployment_name: operation.deployment_name,
        deployment_mode: deployment_mode_name(operation.deployment_mode),
        state: backup_operation_state_name(operation.state),
        phase: operation.phase,
        reason: operation.reason,
        created_at: operation.created_at,
        updated_at: operation.updated_at,
        completed_at: operation.completed_at,
        expected_node_count: operation.expected_node_count,
        manifest_uri: operation.manifest_uri,
        nodes: operation
            .nodes
            .into_iter()
            .map(backup_node_artifact_info)
            .collect(),
        raft_barriers: operation.raft_barriers,
        blockers: operation
            .blockers
            .into_iter()
            .map(backup_operation_blocker_info)
            .collect(),
        validation: operation.validation.map(validation_summary_info),
        cancel_requested: operation.cancel_requested,
        retry_after_seconds: operation.retry_after_seconds,
        failed_phase: operation.failed_phase,
        error: operation.error,
    }
}

fn backup_operation_blocker_info(blocker: BackupOperationBlocker) -> BackupOperationBlockerInfo {
    BackupOperationBlockerInfo {
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

fn backup_set_summary_info(summary: BackupSetSummary) -> BackupSetSummaryInfo {
    BackupSetSummaryInfo {
        backup_set_id: summary.backup_set_id,
        repository_id: summary.repository_id,
        deployment_id: summary.deployment_id,
        deployment_name: summary.deployment_name,
        deployment_mode: deployment_mode_name(summary.deployment_mode),
        state: backup_operation_state_name(summary.state),
        created_at: summary.created_at,
        completed_at: summary.completed_at,
        expected_node_count: summary.expected_node_count,
        manifest_uri: summary.manifest_uri,
        nodes: summary
            .nodes
            .into_iter()
            .map(backup_node_artifact_info)
            .collect(),
        compatibility: summary.compatibility.map(compatibility_summary_info),
        validation: summary.validation.map(validation_summary_info),
        deletion_state: deletion_state_name(summary.deletion_state),
        retention_class: retention_class_name(summary.retention_class),
        manifest: summary.manifest.map(backup_set_manifest_summary_info),
    }
}

fn backup_node_artifact_info(node: BackupNodeArtifact) -> BackupNodeArtifactInfo {
    BackupNodeArtifactInfo {
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

fn capacity_estimate_info(estimate: CapacityEstimate) -> CapacityEstimateInfo {
    CapacityEstimateInfo {
        required_bytes: estimate.required_bytes,
        available_bytes: estimate.available_bytes,
        blockers: estimate
            .blockers
            .into_iter()
            .map(validation_blocker_info)
            .collect(),
        warnings: estimate.warnings,
    }
}

fn restore_plan_summary_info(plan: RestorePlanSummary) -> RestorePlanSummaryInfo {
    RestorePlanSummaryInfo {
        restore_plan_id: plan.restore_plan_id,
        repository_id: plan.repository_id,
        backup_set_id: plan.backup_set_id,
        target_mode: restore_target_mode_name(plan.target_mode),
        identity_mode: restore_identity_mode_name(plan.identity_mode),
        auth_session_policy: restore_auth_session_policy_name(plan.auth_session_policy),
        restorable: plan.restorable,
        validation: plan.validation.map(validation_summary_info),
        compatibility: plan.compatibility.map(compatibility_summary_info),
        capacity: plan.capacity.map(capacity_estimate_info),
        derived_actions: plan
            .derived_actions
            .into_iter()
            .map(derived_subsystem_policy_info)
            .collect(),
        blockers: plan
            .blockers
            .into_iter()
            .map(validation_blocker_info)
            .collect(),
        planned_at: plan.planned_at,
    }
}

fn secret_reference_info(reference: SecretReference) -> SecretReferenceInfo {
    SecretReferenceInfo {
        scheme: secret_reference_scheme_name(reference.scheme),
        name: reference.name,
        namespace: reference.namespace,
        path: reference.path,
        keys: reference.keys,
        description: reference.description,
    }
}

fn encryption_policy_info(
    policy: mycel_sdk::proto::admin::v1::EncryptionPolicy,
) -> EncryptionPolicyInfo {
    EncryptionPolicyInfo {
        mode: encryption_mode_name(policy.mode),
        key_ref: policy.key_ref.map(secret_reference_info),
        kms_key_id: policy.kms_key_id,
        require_bucket_default_encryption: policy.require_bucket_default_encryption,
    }
}

fn s3_repository_config_info(
    config: S3CompatibleRepositoryConfig,
) -> S3CompatibleRepositoryConfigInfo {
    S3CompatibleRepositoryConfigInfo {
        bucket: config.bucket,
        prefix: config.prefix,
        region: config.region,
        endpoint_uri: config.endpoint_uri,
        force_path_style: config.force_path_style,
        disable_tls: config.disable_tls,
    }
}

fn validation_probe_result_info(probe: ValidationProbeResult) -> ValidationProbeResultInfo {
    ValidationProbeResultInfo {
        name: probe.name,
        state: backup_validation_state_name(probe.state),
        detail: probe.detail,
        checked_at: probe.checked_at,
    }
}

fn backup_repository_validation_summary_info(
    summary: BackupRepositoryValidationSummary,
) -> BackupRepositoryValidationSummaryInfo {
    BackupRepositoryValidationSummaryInfo {
        state: backup_validation_state_name(summary.state),
        checked_at: summary.checked_at,
        probes: summary
            .probes
            .into_iter()
            .map(validation_probe_result_info)
            .collect(),
        blockers: summary
            .blockers
            .into_iter()
            .map(validation_blocker_info)
            .collect(),
        sanitized_error: summary.sanitized_error,
    }
}

fn backup_repository_info(repository: BackupRepository) -> BackupRepositoryInfo {
    BackupRepositoryInfo {
        repository_id: repository.repository_id,
        display_name: repository.display_name,
        provider: repository_provider_name(repository.provider),
        s3: repository.s3.map(s3_repository_config_info),
        credential_ref: repository.credential_ref.map(secret_reference_info),
        encryption: repository.encryption.map(encryption_policy_info),
        tls_ca_ref: repository.tls_ca_ref.map(secret_reference_info),
        dev_only: repository.dev_only,
        create_time: repository.create_time,
        update_time: repository.update_time,
        validation: repository
            .validation
            .map(backup_repository_validation_summary_info),
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

fn parse_archive_format(value: &str) -> Result<BackupArchiveFormat, String> {
    if value.trim().is_empty() {
        return Ok(BackupArchiveFormat::TarZst);
    }
    BackupArchiveFormat::from_str_name(value)
        .ok_or_else(|| format!("Unsupported backup archive format: {value}"))
}

fn parse_capture_provider(value: &str) -> Result<BackupCaptureProvider, String> {
    if value.trim().is_empty() {
        return Ok(BackupCaptureProvider::Auto);
    }
    BackupCaptureProvider::from_str_name(value)
        .ok_or_else(|| format!("Unsupported backup capture provider: {value}"))
}

fn parse_quiesce_read_profile(value: &str) -> Result<BackupQuiesceReadProfile, String> {
    if value.trim().is_empty() {
        return Ok(BackupQuiesceReadProfile::ControlOnly);
    }
    BackupQuiesceReadProfile::from_str_name(value)
        .ok_or_else(|| format!("Unsupported backup quiesce read profile: {value}"))
}

fn parse_repository_provider(value: &str) -> Result<BackupRepositoryProvider, String> {
    BackupRepositoryProvider::from_str_name(value)
        .ok_or_else(|| format!("Unsupported backup repository provider: {value}"))
}

fn parse_secret_reference_scheme(value: &str) -> Result<SecretReferenceScheme, String> {
    if value.trim().is_empty() {
        return Ok(SecretReferenceScheme::Env);
    }
    SecretReferenceScheme::from_str_name(value)
        .ok_or_else(|| format!("Unsupported secret reference scheme: {value}"))
}

fn parse_encryption_mode(value: &str) -> Result<EncryptionMode, String> {
    if value.trim().is_empty() {
        return Ok(EncryptionMode::Unspecified);
    }
    EncryptionMode::from_str_name(value)
        .ok_or_else(|| format!("Unsupported encryption mode: {value}"))
}

fn parse_derived_subsystem(value: &str) -> Result<BackupDerivedSubsystem, String> {
    if value.trim().is_empty() {
        return Ok(BackupDerivedSubsystem::Unspecified);
    }
    BackupDerivedSubsystem::from_str_name(value)
        .ok_or_else(|| format!("Unsupported derived subsystem: {value}"))
}

fn parse_derived_policy_mode(value: &str) -> Result<BackupDerivedPolicyMode, String> {
    if value.trim().is_empty() {
        return Ok(BackupDerivedPolicyMode::Unspecified);
    }
    BackupDerivedPolicyMode::from_str_name(value)
        .ok_or_else(|| format!("Unsupported derived policy mode: {value}"))
}

fn repository_provider_name(value: i32) -> String {
    BackupRepositoryProvider::try_from(value)
        .unwrap_or(BackupRepositoryProvider::Unspecified)
        .as_str_name()
        .to_string()
}

fn secret_reference_scheme_name(value: i32) -> String {
    SecretReferenceScheme::try_from(value)
        .unwrap_or(SecretReferenceScheme::Unspecified)
        .as_str_name()
        .to_string()
}

fn encryption_mode_name(value: i32) -> String {
    EncryptionMode::try_from(value)
        .unwrap_or(EncryptionMode::Unspecified)
        .as_str_name()
        .to_string()
}

fn capture_provider_name(value: i32) -> String {
    BackupCaptureProvider::try_from(value)
        .unwrap_or(BackupCaptureProvider::Unspecified)
        .as_str_name()
        .to_string()
}

fn quiesce_read_profile_name(value: i32) -> String {
    BackupQuiesceReadProfile::try_from(value)
        .unwrap_or(BackupQuiesceReadProfile::Unspecified)
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

fn deployment_mode_name(value: i32) -> String {
    BackupDeploymentMode::try_from(value)
        .unwrap_or(BackupDeploymentMode::Unspecified)
        .as_str_name()
        .to_string()
}

fn backup_operation_state_name(value: i32) -> String {
    BackupOperationState::try_from(value)
        .unwrap_or(BackupOperationState::Unspecified)
        .as_str_name()
        .to_string()
}

fn derived_subsystem_name(value: i32) -> String {
    BackupDerivedSubsystem::try_from(value)
        .unwrap_or(BackupDerivedSubsystem::Unspecified)
        .as_str_name()
        .to_string()
}

fn derived_policy_mode_name(value: i32) -> String {
    BackupDerivedPolicyMode::try_from(value)
        .unwrap_or(BackupDerivedPolicyMode::Unspecified)
        .as_str_name()
        .to_string()
}

fn restore_target_mode_name(value: i32) -> String {
    RestoreTargetMode::try_from(value)
        .unwrap_or(RestoreTargetMode::Unspecified)
        .as_str_name()
        .to_string()
}

fn restore_identity_mode_name(value: i32) -> String {
    RestoreIdentityMode::try_from(value)
        .unwrap_or(RestoreIdentityMode::Unspecified)
        .as_str_name()
        .to_string()
}

fn restore_auth_session_policy_name(value: i32) -> String {
    RestoreAuthSessionPolicy::try_from(value)
        .unwrap_or(RestoreAuthSessionPolicy::Unspecified)
        .as_str_name()
        .to_string()
}
