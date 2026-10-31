use mycel_sdk::proto::{
    admin::v1::{
        GetProcedureInferenceAttemptRequest, ListProcedureInferenceAttemptChangesRequest,
        ListProcedureInferenceAttemptsRequest,
    },
    common::v1::{
        InferenceOperation, ProcedureInferenceAttempt, ProcedureInferenceAttemptChange,
        ProcedureInferenceAttemptFilter, ProcedureInferenceAttemptState,
    },
};
use prost_types::Timestamp;
use tauri::State;
use tonic::Code;

use crate::commands::command_error::{
    authenticated_rpc, sdk_error, sdk_error_code, validation_error, ConsoleCommandError,
};
use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcedureInferenceAttemptFilterInput {
    pub domain_id: Option<String>,
    pub procedure_id: Option<String>,
    pub procedure_version: Option<i32>,
    pub binding_id: Option<String>,
    pub binding_version: Option<i32>,
    pub invocation_id: Option<String>,
    pub run_id: Option<String>,
    pub workflow_step_id: Option<String>,
    pub endpoint_id: Option<String>,
    pub model_id: Option<String>,
    pub capability_id: Option<String>,
    pub operation: Option<String>,
    #[serde(default)]
    pub states: Vec<String>,
    pub event_origin_principal_id: Option<String>,
    pub actor_principal_id: Option<String>,
    pub owner_principal_id: Option<String>,
    pub on_behalf_of_principal_id: Option<String>,
    pub requested_at_or_after_seconds: Option<i64>,
    pub requested_before_seconds: Option<i64>,
    pub completed_at_or_after_seconds: Option<i64>,
    pub completed_before_seconds: Option<i64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetProcedureInferenceAttemptInput {
    pub space_id: String,
    pub attempt_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProcedureInferenceAttemptsInput {
    pub space_id: String,
    #[serde(default)]
    pub filter: ProcedureInferenceAttemptFilterInput,
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProcedureInferenceAttemptChangesInput {
    pub space_id: String,
    #[serde(default)]
    pub filter: ProcedureInferenceAttemptFilterInput,
    pub page_size: Option<i32>,
    #[serde(default)]
    pub after_cursor: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcedureInferenceAttemptInfo {
    pub id: String,
    pub record_version: String,
    pub space_id: String,
    pub domain_id: String,
    pub procedure_id: String,
    pub procedure_version: i32,
    pub binding_id: String,
    pub binding_version: i32,
    pub invocation_id: String,
    pub run_id: String,
    pub run_attempt_number: i32,
    pub workflow_step_id: String,
    pub provider_attempt_number: i32,
    pub source_event_id: String,
    pub source_transaction_id: String,
    pub source_graph_revision: String,
    pub event_origin_principal_id: String,
    pub actor_principal_id: String,
    pub owner_principal_id: String,
    pub on_behalf_of_principal_id: String,
    pub operation: String,
    pub profile_id: String,
    pub endpoint_id: String,
    pub model_id: String,
    pub capability_id: String,
    pub policy_decision_id: String,
    pub authorization_revision: String,
    pub configuration_revision: String,
    pub state: String,
    pub outcome_category: String,
    pub input_tokens: String,
    pub output_tokens: String,
    pub total_tokens: String,
    pub token_count_authority: String,
    pub provider_duration_millis: String,
    pub publication_disposition: String,
    pub requested_at: String,
    pub authorized_at: String,
    pub started_at: String,
    pub completed_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcedureInferenceAttemptChangeInfo {
    pub event_id: String,
    pub schema_version: String,
    pub space_id: String,
    pub sequence: String,
    pub change_kind: String,
    pub attempt_id: String,
    pub record_version: String,
    pub attempt: Option<ProcedureInferenceAttemptInfo>,
    pub occurred_at: String,
    pub committed_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProcedureInferenceAttemptsResponseInfo {
    pub attempts: Vec<ProcedureInferenceAttemptInfo>,
    pub next_page_token: String,
    pub snapshot_high_water_sequence: String,
    pub earliest_retained_state_sequence: String,
    pub snapshot_cursor: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProcedureInferenceAttemptChangesResponseInfo {
    pub changes: Vec<ProcedureInferenceAttemptChangeInfo>,
    pub next_cursor: String,
    pub high_water_sequence: String,
    pub earliest_retained_sequence: String,
    pub earliest_retained_state_sequence: String,
    pub history_gap: bool,
}

#[tauri::command]
pub async fn admin_get_procedure_inference_attempt(
    input: GetProcedureInferenceAttemptInput,
    state: State<'_, AppState>,
) -> Result<ProcedureInferenceAttemptInfo, ConsoleCommandError> {
    validate_required(&input.space_id, "Space ID")?;
    validate_required(&input.attempt_id, "Attempt ID")?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.get_procedure_inference_attempt(GetProcedureInferenceAttemptRequest {
            space_id: input.space_id,
            attempt_id: input.attempt_id,
        })
    )
    .map_err(procedure_inference_rpc_error)?
    .into_inner();
    response
        .attempt
        .map(map_attempt)
        .ok_or_else(|| response_error("The daemon returned no procedure inference attempt"))
}

#[tauri::command]
pub async fn admin_list_procedure_inference_attempts(
    input: ListProcedureInferenceAttemptsInput,
    state: State<'_, AppState>,
) -> Result<ListProcedureInferenceAttemptsResponseInfo, ConsoleCommandError> {
    validate_required(&input.space_id, "Space ID")?;
    let page_size = validate_page_size(input.page_size)?;
    let filter = map_filter(input.filter)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_procedure_inference_attempts(ListProcedureInferenceAttemptsRequest {
            space_id: input.space_id,
            filter: Some(filter),
            page_size,
            page_token: input.page_token,
        })
    )
    .map_err(procedure_inference_rpc_error)?
    .into_inner();
    Ok(ListProcedureInferenceAttemptsResponseInfo {
        attempts: response.attempts.into_iter().map(map_attempt).collect(),
        next_page_token: response.next_page_token,
        snapshot_high_water_sequence: response.snapshot_high_water_sequence.to_string(),
        earliest_retained_state_sequence: response.earliest_retained_state_sequence.to_string(),
        snapshot_cursor: response.snapshot_cursor,
    })
}

#[tauri::command]
pub async fn admin_list_procedure_inference_attempt_changes(
    input: ListProcedureInferenceAttemptChangesInput,
    state: State<'_, AppState>,
) -> Result<ListProcedureInferenceAttemptChangesResponseInfo, ConsoleCommandError> {
    validate_required(&input.space_id, "Space ID")?;
    let page_size = validate_page_size(input.page_size)?;
    let filter = map_filter(input.filter)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_procedure_inference_attempt_changes(
            ListProcedureInferenceAttemptChangesRequest {
                space_id: input.space_id,
                filter: Some(filter),
                page_size,
                after_cursor: input.after_cursor,
            }
        )
    )
    .map_err(procedure_inference_rpc_error)?
    .into_inner();
    Ok(ListProcedureInferenceAttemptChangesResponseInfo {
        changes: response.changes.into_iter().map(map_change).collect(),
        next_cursor: response.next_cursor,
        high_water_sequence: response.high_water_sequence.to_string(),
        earliest_retained_sequence: response.earliest_retained_sequence.to_string(),
        earliest_retained_state_sequence: response.earliest_retained_state_sequence.to_string(),
        history_gap: response.history_gap,
    })
}

fn validate_required(value: &str, label: &str) -> Result<(), ConsoleCommandError> {
    if value.trim().is_empty() {
        Err(validation_error(format!("{label} is required")))
    } else {
        Ok(())
    }
}

fn validate_page_size(value: Option<i32>) -> Result<i32, ConsoleCommandError> {
    let page_size = value.unwrap_or(100);
    if !(1..=500).contains(&page_size) {
        return Err(validation_error("Page size must be between 1 and 500"));
    }
    Ok(page_size)
}

fn map_filter(
    input: ProcedureInferenceAttemptFilterInput,
) -> Result<ProcedureInferenceAttemptFilter, ConsoleCommandError> {
    Ok(ProcedureInferenceAttemptFilter {
        domain_id: input.domain_id.unwrap_or_default(),
        procedure_id: input.procedure_id.unwrap_or_default(),
        procedure_version: input.procedure_version.unwrap_or_default(),
        binding_id: input.binding_id.unwrap_or_default(),
        binding_version: input.binding_version.unwrap_or_default(),
        invocation_id: input.invocation_id.unwrap_or_default(),
        run_id: input.run_id.unwrap_or_default(),
        workflow_step_id: input.workflow_step_id.unwrap_or_default(),
        endpoint_id: input.endpoint_id.unwrap_or_default(),
        model_id: input.model_id.unwrap_or_default(),
        capability_id: input.capability_id.unwrap_or_default(),
        operation: parse_operation(input.operation.as_deref())?,
        states: input
            .states
            .iter()
            .map(|state| parse_state(state))
            .collect::<Result<Vec<_>, _>>()?,
        event_origin_principal_id: input.event_origin_principal_id.unwrap_or_default(),
        actor_principal_id: input.actor_principal_id.unwrap_or_default(),
        owner_principal_id: input.owner_principal_id.unwrap_or_default(),
        on_behalf_of_principal_id: input.on_behalf_of_principal_id.unwrap_or_default(),
        requested_at_or_after: timestamp(input.requested_at_or_after_seconds),
        requested_before: timestamp(input.requested_before_seconds),
        completed_at_or_after: timestamp(input.completed_at_or_after_seconds),
        completed_before: timestamp(input.completed_before_seconds),
    })
}

fn parse_operation(value: Option<&str>) -> Result<i32, ConsoleCommandError> {
    let normalized = value.unwrap_or_default().trim().to_ascii_lowercase();
    let operation = match normalized.as_str() {
        "" => InferenceOperation::Unspecified,
        "embeddings" => InferenceOperation::Embeddings,
        "chat" => InferenceOperation::Chat,
        "rerank" => InferenceOperation::Rerank,
        "summarize" => InferenceOperation::Summarize,
        "classify" => InferenceOperation::Classify,
        "image_analysis" => InferenceOperation::ImageAnalysis,
        _ => return Err(validation_error("Unknown inference operation filter")),
    };
    Ok(operation as i32)
}

fn parse_state(value: &str) -> Result<i32, ConsoleCommandError> {
    let state = match value.trim().to_ascii_lowercase().as_str() {
        "requested" => ProcedureInferenceAttemptState::Requested,
        "authorized" => ProcedureInferenceAttemptState::Authorized,
        "started" => ProcedureInferenceAttemptState::Started,
        "succeeded" => ProcedureInferenceAttemptState::Succeeded,
        "failed" => ProcedureInferenceAttemptState::Failed,
        "denied" => ProcedureInferenceAttemptState::Denied,
        "canceled" => ProcedureInferenceAttemptState::Canceled,
        "ambiguous" => ProcedureInferenceAttemptState::Ambiguous,
        _ => {
            return Err(validation_error(
                "Unknown procedure inference attempt state filter",
            ))
        }
    };
    Ok(state as i32)
}

fn timestamp(seconds: Option<i64>) -> Option<Timestamp> {
    seconds.map(|seconds| Timestamp { seconds, nanos: 0 })
}

fn map_attempt(attempt: ProcedureInferenceAttempt) -> ProcedureInferenceAttemptInfo {
    ProcedureInferenceAttemptInfo {
        id: attempt.id,
        record_version: attempt.record_version.to_string(),
        space_id: attempt.space_id,
        domain_id: attempt.domain_id,
        procedure_id: attempt.procedure_id,
        procedure_version: attempt.procedure_version,
        binding_id: attempt.binding_id,
        binding_version: attempt.binding_version,
        invocation_id: attempt.invocation_id,
        run_id: attempt.run_id,
        run_attempt_number: attempt.run_attempt_number,
        workflow_step_id: attempt.workflow_step_id,
        provider_attempt_number: attempt.provider_attempt_number,
        source_event_id: attempt.source_event_id,
        source_transaction_id: attempt.source_transaction_id,
        source_graph_revision: attempt.source_graph_revision.to_string(),
        event_origin_principal_id: attempt.event_origin_principal_id,
        actor_principal_id: attempt.actor_principal_id,
        owner_principal_id: attempt.owner_principal_id,
        on_behalf_of_principal_id: attempt.on_behalf_of_principal_id,
        operation: operation_label(attempt.operation),
        profile_id: attempt.profile_id,
        endpoint_id: attempt.endpoint_id,
        model_id: attempt.model_id,
        capability_id: attempt.capability_id,
        policy_decision_id: attempt.policy_decision_id,
        authorization_revision: attempt.authorization_revision.to_string(),
        configuration_revision: attempt.configuration_revision.to_string(),
        state: state_label(attempt.state),
        outcome_category: attempt.outcome_category,
        input_tokens: attempt.input_tokens.to_string(),
        output_tokens: attempt.output_tokens.to_string(),
        total_tokens: attempt.total_tokens.to_string(),
        token_count_authority: attempt.token_count_authority,
        provider_duration_millis: attempt.provider_duration_millis.to_string(),
        publication_disposition: attempt.publication_disposition,
        requested_at: timestamp_string(attempt.requested_at),
        authorized_at: timestamp_string(attempt.authorized_at),
        started_at: timestamp_string(attempt.started_at),
        completed_at: timestamp_string(attempt.completed_at),
    }
}

fn map_change(change: ProcedureInferenceAttemptChange) -> ProcedureInferenceAttemptChangeInfo {
    ProcedureInferenceAttemptChangeInfo {
        event_id: change.event_id,
        schema_version: change.schema_version,
        space_id: change.space_id,
        sequence: change.sequence.to_string(),
        change_kind: change.change_kind,
        attempt_id: change.attempt_id,
        record_version: change.record_version.to_string(),
        attempt: change.attempt.map(map_attempt),
        occurred_at: timestamp_string(change.occurred_at),
        committed_at: timestamp_string(change.committed_at),
    }
}

fn operation_label(value: i32) -> String {
    match InferenceOperation::try_from(value).unwrap_or(InferenceOperation::Unspecified) {
        InferenceOperation::Embeddings => "embeddings",
        InferenceOperation::Chat => "chat",
        InferenceOperation::Rerank => "rerank",
        InferenceOperation::Summarize => "summarize",
        InferenceOperation::Classify => "classify",
        InferenceOperation::ImageAnalysis => "image_analysis",
        InferenceOperation::Unspecified => "unspecified",
    }
    .to_string()
}

fn state_label(value: i32) -> String {
    match ProcedureInferenceAttemptState::try_from(value)
        .unwrap_or(ProcedureInferenceAttemptState::Unspecified)
    {
        ProcedureInferenceAttemptState::Requested => "requested",
        ProcedureInferenceAttemptState::Authorized => "authorized",
        ProcedureInferenceAttemptState::Started => "started",
        ProcedureInferenceAttemptState::Succeeded => "succeeded",
        ProcedureInferenceAttemptState::Failed => "failed",
        ProcedureInferenceAttemptState::Denied => "denied",
        ProcedureInferenceAttemptState::Canceled => "canceled",
        ProcedureInferenceAttemptState::Ambiguous => "ambiguous",
        ProcedureInferenceAttemptState::Unspecified => "unspecified",
    }
    .to_string()
}

fn timestamp_string(value: Option<Timestamp>) -> String {
    value
        .map(|timestamp| {
            if timestamp.nanos == 0 {
                timestamp.seconds.to_string()
            } else {
                format!("{}.{:09}", timestamp.seconds, timestamp.nanos)
            }
        })
        .unwrap_or_default()
}

fn procedure_inference_rpc_error(err: mycel_sdk::Error) -> ConsoleCommandError {
    if sdk_error_code(&err) == Some(Code::Unimplemented) {
        return unavailable_error(
            "Procedure inference attempt evidence is unavailable on this daemon version",
        );
    }
    sdk_error(err)
}

fn authentication_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: "authentication".to_string(),
        severity: "warning".to_string(),
        message: message.into(),
        detail: None,
    }
}

fn unavailable_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: "unavailable".to_string(),
        severity: "warning".to_string(),
        message: message.into(),
        detail: None,
    }
}

fn response_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: "internal".to_string(),
        severity: "error".to_string(),
        message: message.into(),
        detail: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_typed_filters_without_interpreting_opaque_cursors() {
        let filter = map_filter(ProcedureInferenceAttemptFilterInput {
            domain_id: Some("domain-1".to_string()),
            procedure_version: Some(7),
            operation: Some("chat".to_string()),
            states: vec!["started".to_string(), "ambiguous".to_string()],
            requested_at_or_after_seconds: Some(123),
            ..Default::default()
        })
        .expect("filter");
        assert_eq!(filter.domain_id, "domain-1");
        assert_eq!(filter.procedure_version, 7);
        assert_eq!(filter.operation, InferenceOperation::Chat as i32);
        assert_eq!(
            filter.states,
            vec![
                ProcedureInferenceAttemptState::Started as i32,
                ProcedureInferenceAttemptState::Ambiguous as i32,
            ]
        );
        assert_eq!(filter.requested_at_or_after.unwrap().seconds, 123);
    }

    #[test]
    fn maps_every_supported_attempt_filter_field() {
        let filter = map_filter(ProcedureInferenceAttemptFilterInput {
            domain_id: Some("domain".to_string()),
            procedure_id: Some("procedure".to_string()),
            procedure_version: Some(2),
            binding_id: Some("binding".to_string()),
            binding_version: Some(3),
            invocation_id: Some("invocation".to_string()),
            run_id: Some("run".to_string()),
            workflow_step_id: Some("step".to_string()),
            endpoint_id: Some("endpoint".to_string()),
            model_id: Some("model".to_string()),
            capability_id: Some("capability".to_string()),
            operation: Some("summarize".to_string()),
            states: vec!["denied".to_string()],
            event_origin_principal_id: Some("origin".to_string()),
            actor_principal_id: Some("actor".to_string()),
            owner_principal_id: Some("owner".to_string()),
            on_behalf_of_principal_id: Some("behalf".to_string()),
            requested_at_or_after_seconds: Some(10),
            requested_before_seconds: Some(20),
            completed_at_or_after_seconds: Some(30),
            completed_before_seconds: Some(40),
        })
        .expect("filter");
        assert_eq!(filter.domain_id, "domain");
        assert_eq!(filter.procedure_id, "procedure");
        assert_eq!(filter.procedure_version, 2);
        assert_eq!(filter.binding_id, "binding");
        assert_eq!(filter.binding_version, 3);
        assert_eq!(filter.invocation_id, "invocation");
        assert_eq!(filter.run_id, "run");
        assert_eq!(filter.workflow_step_id, "step");
        assert_eq!(filter.endpoint_id, "endpoint");
        assert_eq!(filter.model_id, "model");
        assert_eq!(filter.capability_id, "capability");
        assert_eq!(filter.operation, InferenceOperation::Summarize as i32);
        assert_eq!(
            filter.states,
            vec![ProcedureInferenceAttemptState::Denied as i32]
        );
        assert_eq!(filter.event_origin_principal_id, "origin");
        assert_eq!(filter.actor_principal_id, "actor");
        assert_eq!(filter.owner_principal_id, "owner");
        assert_eq!(filter.on_behalf_of_principal_id, "behalf");
        assert_eq!(filter.requested_at_or_after.unwrap().seconds, 10);
        assert_eq!(filter.requested_before.unwrap().seconds, 20);
        assert_eq!(filter.completed_at_or_after.unwrap().seconds, 30);
        assert_eq!(filter.completed_before.unwrap().seconds, 40);
    }

    #[test]
    fn mapped_attempt_is_an_explicit_sanitized_allowlist() {
        let info = map_attempt(ProcedureInferenceAttempt {
            id: "attempt-1".to_string(),
            record_version: u64::MAX,
            credential_grant_id: "grant-that-must-not-cross-the-bridge".to_string(),
            state: ProcedureInferenceAttemptState::Failed as i32,
            outcome_category: "provider_unavailable".to_string(),
            ..Default::default()
        });
        let json = serde_json::to_string(&info).expect("serialize");
        assert!(json.contains("attempt-1"));
        assert!(json.contains(&u64::MAX.to_string()));
        assert!(json.contains("provider_unavailable"));
        for forbidden in [
            "credentialGrantId",
            "prompt",
            "outputBody",
            "providerRequestId",
            "rawError",
            "metadata",
        ] {
            assert!(!json.contains(forbidden), "unexpected field {forbidden}");
        }
        assert!(!json.contains("grant-that-must-not-cross-the-bridge"));
    }

    #[test]
    fn rejects_unknown_enum_filters_and_oversized_pages() {
        assert!(parse_operation(Some("other")).is_err());
        assert!(parse_state("other").is_err());
        assert!(validate_page_size(Some(501)).is_err());
    }
}
