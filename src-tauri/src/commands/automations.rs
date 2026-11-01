use std::collections::HashSet;

use mycel_sdk::proto::{
    admin::v1::{
        CreateAutomationRequest, DeleteAutomationRequest, DisableAutomationRequest,
        DisableGraphAutomationBindingRequest, DisableGraphProcedureRequest,
        EnableAutomationRequest, EnableGraphAutomationBindingRequest, EnableGraphProcedureRequest,
        GetAutomationRequest, GetAutomationRunRequest, GetGraphAutomationBindingRequest,
        GetGraphProcedureRequest, ListAutomationInvocationsRequest, ListAutomationsRequest,
        ListGraphAutomationBindingsRequest, ListGraphProceduresRequest, UpdateAutomationRequest,
        ValidateAutomationRequest,
    },
    common::v1::{
        AutomationRun, AutomationRunState, ProcedureControlBarrier, ProcedureControlTargetStatus,
    },
};
use prost_types::Timestamp;
use tauri::State;

use crate::commands::command_error::{
    authenticated_rpc, sdk_error, sdk_error_code, validation_error, ConsoleCommandError,
};
use crate::state::AppState;
use tonic::Code;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainAutomationInput {
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationActionInput {
    pub domain_id: String,
    pub automation_id: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAutomationInvocationsInput {
    pub domain_id: String,
    pub automation_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i32>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetAutomationRunInput {
    pub domain_id: String,
    pub run_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationDefinitionSummaryInfo {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub events: Vec<String>,
    pub labels: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAutomationsResponseInfo {
    pub automations: Vec<AutomationDefinitionSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationDefinitionInfo {
    pub definition_json: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationDefinitionInput {
    pub domain_id: String,
    pub definition_json: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAutomationInput {
    pub domain_id: String,
    pub automation_id: String,
    pub definition_json: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ValidateAutomationInfo {
    pub valid: bool,
    pub error: String,
    pub normalized_definition_json: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationInvocationSummaryInfo {
    pub id: String,
    pub automation_id: String,
    pub automation_version: i32,
    pub event_id: String,
    pub changed_element_id: String,
    pub event_type: String,
    pub status: String,
    pub skip_reason: String,
    pub created_at: String,
    pub updated_at: String,
    pub binding_id: String,
    pub binding_version: i32,
    pub procedure_id: String,
    pub procedure_version: i32,
    pub actor_principal_id: String,
    pub owner_principal_id: String,
    pub on_behalf_of_principal_id: String,
    pub event_origin_principal_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAutomationInvocationsResponseInfo {
    pub invocations: Vec<AutomationInvocationSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationRunProjectionInfo {
    pub id: String,
    pub domain_id: String,
    pub invocation_id: String,
    pub binding_id: String,
    pub binding_version: i32,
    pub procedure_id: String,
    pub procedure_version: i32,
    pub attempt_number: i32,
    pub state: String,
    pub state_code: i32,
    pub outcome_category: String,
    pub actor_principal_id: String,
    pub owner_principal_id: String,
    pub on_behalf_of_principal_id: String,
    pub event_origin_principal_id: String,
    pub inference_profile: String,
    pub inference_profile_id: String,
    pub policy_decision_id: String,
    pub endpoint_id: String,
    pub model_id: String,
    pub capability_id: String,
    pub input_tokens: String,
    pub output_tokens: String,
    pub total_tokens: String,
    pub token_count_authority: String,
    pub inference_attempt_ids: Vec<String>,
    pub started_at: String,
    pub completed_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationRunInfo {
    pub projection: Option<AutomationRunProjectionInfo>,
    pub diagnostic_json: String,
    pub compatibility: String,
}

#[tauri::command]
pub async fn admin_list_automations(
    input: DomainAutomationInput,
    state: State<'_, AppState>,
) -> Result<ListAutomationsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_automations(ListAutomationsRequest {
            domain_id: input.domain_id,
            status: String::new(),
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(ListAutomationsResponseInfo {
        automations: response
            .automations
            .into_iter()
            .map(|item| AutomationDefinitionSummaryInfo {
                id: item.id,
                name: item.name,
                version: item.version,
                status: item.status,
                events: item.events,
                labels: item.labels,
                updated_at: item.updated_at,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_get_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.get_automation(GetAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(AutomationDefinitionInfo {
        definition_json: response.definition_json,
    })
}

#[tauri::command]
pub async fn admin_enable_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.enable_automation(EnableAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(AutomationDefinitionInfo {
        definition_json: response.definition_json,
    })
}

#[tauri::command]
pub async fn admin_disable_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.disable_automation(DisableAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(AutomationDefinitionInfo {
        definition_json: response.definition_json,
    })
}

#[tauri::command]
pub async fn admin_validate_automation(
    input: AutomationDefinitionInput,
    state: State<'_, AppState>,
) -> Result<ValidateAutomationInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.validate_automation(ValidateAutomationRequest {
            domain_id: input.domain_id,
            definition_json: input.definition_json,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(ValidateAutomationInfo {
        valid: response.valid,
        error: response.error,
        normalized_definition_json: response.normalized_definition_json,
    })
}

#[tauri::command]
pub async fn admin_create_automation(
    input: AutomationDefinitionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.create_automation(CreateAutomationRequest {
            domain_id: input.domain_id,
            definition_json: input.definition_json,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(AutomationDefinitionInfo {
        definition_json: response.definition_json,
    })
}

#[tauri::command]
pub async fn admin_update_automation(
    input: UpdateAutomationInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.update_automation(UpdateAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
            definition_json: input.definition_json,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(AutomationDefinitionInfo {
        definition_json: response.definition_json,
    })
}

#[tauri::command]
pub async fn admin_delete_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    authenticated_rpc!(
        session._client,
        automation.delete_automation(DeleteAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        })
    )
    .map_err(|err| err.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn admin_list_automation_invocations(
    input: ListAutomationInvocationsInput,
    state: State<'_, AppState>,
) -> Result<ListAutomationInvocationsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_automation_invocations(ListAutomationInvocationsRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id.unwrap_or_default(),
            status: input.status.unwrap_or_default(),
            limit: input.limit.unwrap_or(50),
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(ListAutomationInvocationsResponseInfo {
        invocations: response
            .invocations
            .into_iter()
            .map(|item| AutomationInvocationSummaryInfo {
                id: item.id,
                automation_id: item.automation_id,
                automation_version: item.automation_version,
                event_id: item.event_id,
                changed_element_id: item.changed_element_id,
                event_type: item.event_type,
                status: item.status,
                skip_reason: item.skip_reason,
                created_at: item.created_at,
                updated_at: item.updated_at,
                binding_id: item.binding_id,
                binding_version: item.binding_version,
                procedure_id: item.procedure_id,
                procedure_version: item.procedure_version,
                actor_principal_id: item.actor_principal_id,
                owner_principal_id: item.owner_principal_id,
                on_behalf_of_principal_id: item.on_behalf_of_principal_id,
                event_origin_principal_id: item.event_origin_principal_id,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_get_automation_run(
    input: GetAutomationRunInput,
    state: State<'_, AppState>,
) -> Result<AutomationRunInfo, ConsoleCommandError> {
    validate_run_input(&input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.get_automation_run(GetAutomationRunRequest {
            domain_id: input.domain_id.clone(),
            run_id: input.run_id.clone(),
        })
    )
    .map_err(sdk_error)?
    .into_inner();
    let Some(run) = response.run else {
        return Ok(AutomationRunInfo {
            projection: None,
            diagnostic_json: String::new(),
            compatibility: "typed_projection_unavailable".to_string(),
        });
    };
    let projection = map_automation_run(&input, run)?;
    let diagnostic_json = serde_json::to_string_pretty(&projection)
        .map_err(|_| response_error("Failed to serialize sanitized automation run evidence"))?;
    Ok(AutomationRunInfo {
        projection: Some(projection),
        diagnostic_json,
        compatibility: "typed_projection_available".to_string(),
    })
}

fn validate_run_input(input: &GetAutomationRunInput) -> Result<(), ConsoleCommandError> {
    if input.domain_id.trim().is_empty() || input.run_id.trim().is_empty() {
        return Err(validation_error("Domain ID and run ID are required"));
    }
    Ok(())
}

fn map_automation_run(
    input: &GetAutomationRunInput,
    run: AutomationRun,
) -> Result<AutomationRunProjectionInfo, ConsoleCommandError> {
    let requested_run_id = input.run_id.trim();
    if run.domain_id != input.domain_id.trim()
        || (run.id != requested_run_id && run.invocation_id != requested_run_id)
    {
        return Err(response_error(
            "The daemon returned automation run evidence for a different identity",
        ));
    }
    if run.binding_version < 0 || run.procedure_version < 0 || run.attempt_number < 0 {
        return Err(response_error(
            "The daemon returned invalid automation run version evidence",
        ));
    }
    if run.input_tokens < 0 || run.output_tokens < 0 || run.total_tokens < 0 {
        return Err(response_error(
            "The daemon returned invalid automation run token evidence",
        ));
    }
    let attempt_ids = run
        .inference_attempt_ids
        .iter()
        .map(|value| value.trim())
        .collect::<Vec<_>>();
    let unique_attempt_ids = attempt_ids.iter().copied().collect::<HashSet<_>>();
    if attempt_ids.iter().any(|value| value.is_empty())
        || unique_attempt_ids.len() != attempt_ids.len()
    {
        return Err(response_error(
            "The daemon returned invalid automation run attempt references",
        ));
    }
    let state = match AutomationRunState::try_from(run.state) {
        Ok(AutomationRunState::Running) => "running",
        Ok(AutomationRunState::Succeeded) => "succeeded",
        Ok(AutomationRunState::Skipped) => "skipped",
        Ok(AutomationRunState::Retryable) => "retryable",
        Ok(AutomationRunState::Failed) => "failed",
        Ok(AutomationRunState::Canceled) => "canceled",
        Ok(AutomationRunState::Unspecified) | Err(_) => "unsupported",
    };
    Ok(AutomationRunProjectionInfo {
        id: run.id,
        domain_id: run.domain_id,
        invocation_id: run.invocation_id,
        binding_id: run.binding_id,
        binding_version: run.binding_version,
        procedure_id: run.procedure_id,
        procedure_version: run.procedure_version,
        attempt_number: run.attempt_number,
        state: state.to_string(),
        state_code: run.state,
        outcome_category: run.outcome_category,
        actor_principal_id: run.actor_principal_id,
        owner_principal_id: run.owner_principal_id,
        on_behalf_of_principal_id: run.on_behalf_of_principal_id,
        event_origin_principal_id: run.event_origin_principal_id,
        inference_profile: run.inference_profile,
        inference_profile_id: run.inference_profile_id,
        policy_decision_id: run.policy_decision_id,
        endpoint_id: run.endpoint_id,
        model_id: run.model_id,
        capability_id: run.capability_id,
        input_tokens: run.input_tokens.to_string(),
        output_tokens: run.output_tokens.to_string(),
        total_tokens: run.total_tokens.to_string(),
        token_count_authority: run.token_count_authority,
        inference_attempt_ids: run.inference_attempt_ids,
        started_at: timestamp_string(run.started_at),
        completed_at: timestamp_string(run.completed_at),
    })
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProcedureSummaryInfo {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub updated_at: String,
    pub operation: String,
    pub inference_profile: String,
    pub inference_profile_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGraphProceduresResponseInfo {
    pub procedures: Vec<GraphProcedureSummaryInfo>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProcedureActionInput {
    pub domain_id: String,
    pub procedure_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProcedureInfo {
    pub procedure_json: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProcedureControlInput {
    pub space_id: String,
    pub domain_id: String,
    pub procedure_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcedureControlBarrierInfo {
    pub space_id: String,
    pub domain_id: String,
    pub procedure_id: String,
    pub procedure_version: i32,
    pub target_status: String,
    pub control_epoch: String,
    pub controlling_principal_id: String,
    pub affected_partitions: Vec<u32>,
    pub acknowledged_partitions: Vec<u32>,
    pub completed: bool,
    pub completion_revision: String,
    pub committed_at: String,
    pub completed_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphProcedureControlResponseInfo {
    pub control: ProcedureControlBarrierInfo,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphAutomationBindingSummaryInfo {
    pub id: String,
    pub name: String,
    pub version: i32,
    pub status: String,
    pub procedure_id: String,
    pub procedure_version: i32,
    pub trigger_type: String,
    pub events: Vec<String>,
    pub labels: Vec<String>,
    pub actor_principal_id: String,
    pub owner_principal_id: String,
    pub on_behalf_of_principal_id: String,
    pub inference_profile: String,
    pub inference_profile_id: String,
    pub scope_space_id: String,
    pub scope_domain_id: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListGraphAutomationBindingsResponseInfo {
    pub bindings: Vec<GraphAutomationBindingSummaryInfo>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphAutomationBindingActionInput {
    pub domain_id: String,
    pub binding_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphAutomationBindingInfo {
    pub binding_json: String,
}

#[tauri::command]
pub async fn admin_list_graph_procedures(
    input: DomainAutomationInput,
    state: State<'_, AppState>,
) -> Result<ListGraphProceduresResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_graph_procedures(ListGraphProceduresRequest {
            domain_id: input.domain_id,
            status: String::new(),
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(ListGraphProceduresResponseInfo {
        procedures: response
            .procedures
            .into_iter()
            .map(|item| GraphProcedureSummaryInfo {
                id: item.id,
                name: item.name,
                version: item.version,
                status: item.status,
                updated_at: item.updated_at,
                operation: item.operation,
                inference_profile: item.inference_profile,
                inference_profile_id: item.inference_profile_id,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_get_graph_procedure(
    input: GraphProcedureActionInput,
    state: State<'_, AppState>,
) -> Result<GraphProcedureInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.get_graph_procedure(GetGraphProcedureRequest {
            domain_id: input.domain_id,
            procedure_id: input.procedure_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(GraphProcedureInfo {
        procedure_json: response.procedure_json,
    })
}

#[tauri::command]
pub async fn admin_enable_graph_procedure(
    input: GraphProcedureControlInput,
    state: State<'_, AppState>,
) -> Result<GraphProcedureControlResponseInfo, ConsoleCommandError> {
    validate_control_input(&input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.enable_graph_procedure(EnableGraphProcedureRequest {
            space_id: input.space_id.clone(),
            domain_id: input.domain_id.clone(),
            procedure_id: input.procedure_id.clone(),
        })
    )
    .map_err(procedure_control_rpc_error)?
    .into_inner();
    Ok(GraphProcedureControlResponseInfo {
        control: validate_control_barrier(
            &input,
            ProcedureControlTargetStatus::Enabled,
            response.control,
        )?,
    })
}

#[tauri::command]
pub async fn admin_disable_graph_procedure(
    input: GraphProcedureControlInput,
    state: State<'_, AppState>,
) -> Result<GraphProcedureControlResponseInfo, ConsoleCommandError> {
    validate_control_input(&input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| authentication_error("Not authenticated"))?;
    let response = authenticated_rpc!(
        session._client,
        automation.disable_graph_procedure(DisableGraphProcedureRequest {
            space_id: input.space_id.clone(),
            domain_id: input.domain_id.clone(),
            procedure_id: input.procedure_id.clone(),
        })
    )
    .map_err(procedure_control_rpc_error)?
    .into_inner();
    Ok(GraphProcedureControlResponseInfo {
        control: validate_control_barrier(
            &input,
            ProcedureControlTargetStatus::Disabled,
            response.control,
        )?,
    })
}

#[tauri::command]
pub async fn admin_list_graph_automation_bindings(
    input: DomainAutomationInput,
    state: State<'_, AppState>,
) -> Result<ListGraphAutomationBindingsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.list_graph_automation_bindings(ListGraphAutomationBindingsRequest {
            domain_id: input.domain_id,
            status: String::new(),
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(ListGraphAutomationBindingsResponseInfo {
        bindings: response
            .bindings
            .into_iter()
            .map(|item| GraphAutomationBindingSummaryInfo {
                id: item.id,
                name: item.name,
                version: item.version,
                status: item.status,
                procedure_id: item.procedure_id,
                procedure_version: item.procedure_version,
                trigger_type: item.trigger_type,
                events: item.events,
                labels: item.labels,
                actor_principal_id: item.actor_principal_id,
                owner_principal_id: item.owner_principal_id,
                on_behalf_of_principal_id: item.on_behalf_of_principal_id,
                inference_profile: item.inference_profile,
                inference_profile_id: item.inference_profile_id,
                scope_space_id: item.scope_space_id,
                scope_domain_id: item.scope_domain_id,
                updated_at: item.updated_at,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_get_graph_automation_binding(
    input: GraphAutomationBindingActionInput,
    state: State<'_, AppState>,
) -> Result<GraphAutomationBindingInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.get_graph_automation_binding(GetGraphAutomationBindingRequest {
            domain_id: input.domain_id,
            binding_id: input.binding_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(GraphAutomationBindingInfo {
        binding_json: response.binding_json,
    })
}

#[tauri::command]
pub async fn admin_enable_graph_automation_binding(
    input: GraphAutomationBindingActionInput,
    state: State<'_, AppState>,
) -> Result<GraphAutomationBindingInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.enable_graph_automation_binding(EnableGraphAutomationBindingRequest {
            domain_id: input.domain_id,
            binding_id: input.binding_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(GraphAutomationBindingInfo {
        binding_json: response.binding_json,
    })
}

#[tauri::command]
pub async fn admin_disable_graph_automation_binding(
    input: GraphAutomationBindingActionInput,
    state: State<'_, AppState>,
) -> Result<GraphAutomationBindingInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(
        session._client,
        automation.disable_graph_automation_binding(DisableGraphAutomationBindingRequest {
            domain_id: input.domain_id,
            binding_id: input.binding_id,
        })
    )
    .map_err(|err| err.to_string())?
    .into_inner();
    Ok(GraphAutomationBindingInfo {
        binding_json: response.binding_json,
    })
}

fn validate_control_input(input: &GraphProcedureControlInput) -> Result<(), ConsoleCommandError> {
    for (label, value) in [
        ("Space ID", &input.space_id),
        ("Domain ID", &input.domain_id),
        ("Procedure ID", &input.procedure_id),
    ] {
        if value.trim().is_empty() {
            return Err(validation_error(format!("{label} is required")));
        }
    }
    Ok(())
}

fn validate_control_barrier(
    input: &GraphProcedureControlInput,
    expected_status: ProcedureControlTargetStatus,
    control: Option<ProcedureControlBarrier>,
) -> Result<ProcedureControlBarrierInfo, ConsoleCommandError> {
    let control = control.ok_or_else(|| {
        response_error("The daemon returned no procedure control barrier evidence")
    })?;
    let target_status = ProcedureControlTargetStatus::try_from(control.target_status)
        .map_err(|_| response_error("The daemon returned an unknown procedure target state"))?;
    if control.space_id != input.space_id
        || control.domain_id != input.domain_id
        || control.procedure_id != input.procedure_id
    {
        return Err(response_error(
            "The procedure control barrier identity does not match the requested procedure",
        ));
    }
    if target_status != expected_status {
        return Err(response_error(
            "The procedure control barrier target state does not match the requested action",
        ));
    }
    if control.procedure_version <= 0
        || control.control_epoch == 0
        || control.controlling_principal_id.trim().is_empty()
        || control.completion_revision == 0
        || control.committed_at.is_none()
        || control.completed_at.is_none()
    {
        return Err(response_error(
            "The daemon returned incomplete procedure control barrier evidence",
        ));
    }
    if !control.completed {
        return Err(response_error(
            "The procedure control barrier did not complete; no success was recorded",
        ));
    }
    if control.affected_partitions.is_empty()
        || !same_unique_partitions(
            &control.affected_partitions,
            &control.acknowledged_partitions,
        )
    {
        return Err(response_error(
            "The procedure control barrier does not acknowledge every affected partition",
        ));
    }

    Ok(ProcedureControlBarrierInfo {
        space_id: control.space_id,
        domain_id: control.domain_id,
        procedure_id: control.procedure_id,
        procedure_version: control.procedure_version,
        target_status: match target_status {
            ProcedureControlTargetStatus::Enabled => "enabled",
            ProcedureControlTargetStatus::Disabled => "disabled",
            ProcedureControlTargetStatus::Unspecified => "unspecified",
        }
        .to_string(),
        control_epoch: control.control_epoch.to_string(),
        controlling_principal_id: control.controlling_principal_id,
        affected_partitions: control.affected_partitions,
        acknowledged_partitions: control.acknowledged_partitions,
        completed: control.completed,
        completion_revision: control.completion_revision.to_string(),
        committed_at: timestamp_string(control.committed_at),
        completed_at: timestamp_string(control.completed_at),
    })
}

fn same_unique_partitions(affected: &[u32], acknowledged: &[u32]) -> bool {
    let affected_set = affected.iter().copied().collect::<HashSet<_>>();
    let acknowledged_set = acknowledged.iter().copied().collect::<HashSet<_>>();
    affected_set.len() == affected.len()
        && acknowledged_set.len() == acknowledged.len()
        && affected_set == acknowledged_set
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

fn procedure_control_rpc_error(err: mycel_sdk::Error) -> ConsoleCommandError {
    if sdk_error_code(&err) == Some(Code::Unimplemented) {
        return ConsoleCommandError {
            kind: "unavailable".to_string(),
            severity: "error".to_string(),
            message: "Procedure controls are unavailable on this daemon version".to_string(),
            detail: None,
        };
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

fn response_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: "internal".to_string(),
        severity: "error".to_string(),
        message: message.into(),
        detail: None,
    }
}

#[cfg(test)]
mod automation_run_tests {
    use super::*;

    fn input() -> GetAutomationRunInput {
        GetAutomationRunInput {
            domain_id: "domain-1".to_string(),
            run_id: "run-1".to_string(),
        }
    }

    fn run(state: i32) -> AutomationRun {
        AutomationRun {
            id: "run-1".to_string(),
            domain_id: "domain-1".to_string(),
            invocation_id: "invocation-1".to_string(),
            binding_id: "binding-1".to_string(),
            binding_version: 2,
            procedure_id: "procedure-1".to_string(),
            procedure_version: 3,
            attempt_number: 4,
            state,
            outcome_category: "published".to_string(),
            actor_principal_id: "actor-1".to_string(),
            owner_principal_id: "owner-1".to_string(),
            on_behalf_of_principal_id: "subject-1".to_string(),
            event_origin_principal_id: "origin-1".to_string(),
            inference_profile: "production-chat".to_string(),
            inference_profile_id: "profile-1".to_string(),
            policy_decision_id: "decision-1".to_string(),
            endpoint_id: "endpoint-1".to_string(),
            model_id: "model-1".to_string(),
            capability_id: "capability-1".to_string(),
            input_tokens: i64::MAX - 2,
            output_tokens: i64::MAX - 1,
            total_tokens: i64::MAX,
            token_count_authority: "provider".to_string(),
            inference_attempt_ids: vec!["attempt-1".to_string(), "attempt-2".to_string()],
            started_at: Some(Timestamp {
                seconds: 1_793_478_000,
                nanos: 0,
            }),
            completed_at: Some(Timestamp {
                seconds: 1_793_478_001,
                nanos: 25,
            }),
        }
    }

    #[test]
    fn maps_every_supported_run_state() {
        let cases = [
            (AutomationRunState::Running, "running"),
            (AutomationRunState::Succeeded, "succeeded"),
            (AutomationRunState::Skipped, "skipped"),
            (AutomationRunState::Retryable, "retryable"),
            (AutomationRunState::Failed, "failed"),
            (AutomationRunState::Canceled, "canceled"),
        ];
        for (state, expected) in cases {
            let mapped = map_automation_run(&input(), run(state as i32)).unwrap();
            assert_eq!(mapped.state, expected);
            assert_eq!(mapped.state_code, state as i32);
        }
    }

    #[test]
    fn unknown_and_unspecified_states_fail_closed() {
        for state in [AutomationRunState::Unspecified as i32, 999] {
            let mapped = map_automation_run(&input(), run(state)).unwrap();
            assert_eq!(mapped.state, "unsupported");
            assert_eq!(mapped.state_code, state);
        }
    }

    #[test]
    fn accepts_invocation_id_lookup_for_run_projection() {
        let mut input = input();
        input.run_id = "invocation-1".to_string();
        let mapped = map_automation_run(&input, run(AutomationRunState::Failed as i32)).unwrap();
        assert_eq!(mapped.id, "run-1");
        assert_eq!(mapped.invocation_id, "invocation-1");
        assert_eq!(mapped.state, "failed");
    }

    #[test]
    fn preserves_exact_tokens_and_partial_optional_data() {
        let mapped =
            map_automation_run(&input(), run(AutomationRunState::Succeeded as i32)).unwrap();
        assert_eq!(mapped.input_tokens, (i64::MAX - 2).to_string());
        assert_eq!(mapped.output_tokens, (i64::MAX - 1).to_string());
        assert_eq!(mapped.total_tokens, i64::MAX.to_string());
        assert_eq!(mapped.completed_at, "1793478001.000000025");

        let mut partial = run(AutomationRunState::Running as i32);
        partial.binding_id.clear();
        partial.binding_version = 0;
        partial.procedure_id.clear();
        partial.procedure_version = 0;
        partial.outcome_category.clear();
        partial.completed_at = None;
        partial.inference_attempt_ids.clear();
        let mapped = map_automation_run(&input(), partial).unwrap();
        assert!(mapped.binding_id.is_empty());
        assert!(mapped.procedure_id.is_empty());
        assert!(mapped.outcome_category.is_empty());
        assert!(mapped.completed_at.is_empty());
        assert!(mapped.inference_attempt_ids.is_empty());
    }

    #[test]
    fn rejects_mismatched_identity_and_invalid_evidence() {
        let mut mismatched = run(AutomationRunState::Succeeded as i32);
        mismatched.id = "run-other".to_string();
        assert_eq!(
            map_automation_run(&input(), mismatched).unwrap_err().kind,
            "internal"
        );

        let mut invalid = run(AutomationRunState::Succeeded as i32);
        invalid.input_tokens = -1;
        assert_eq!(
            map_automation_run(&input(), invalid).unwrap_err().kind,
            "internal"
        );

        let mut duplicate = run(AutomationRunState::Succeeded as i32);
        duplicate.inference_attempt_ids = vec!["attempt-1".to_string(), "attempt-1".to_string()];
        assert_eq!(
            map_automation_run(&input(), duplicate).unwrap_err().kind,
            "internal"
        );
    }

    #[test]
    fn sanitized_projection_excludes_legacy_sensitive_fields() {
        let projection =
            map_automation_run(&input(), run(AutomationRunState::Succeeded as i32)).unwrap();
        let json = serde_json::to_string(&projection).unwrap();
        for forbidden in [
            "credentialId",
            "credentialGrantId",
            "providerRequestId",
            "rawError",
            "renderedInputHash",
            "outputHash",
            "graphContent",
        ] {
            assert!(!json.contains(forbidden), "unexpected field {forbidden}");
        }
    }
}

#[cfg(test)]
mod procedure_control_tests {
    use super::*;

    fn input() -> GraphProcedureControlInput {
        GraphProcedureControlInput {
            space_id: "space-1".to_string(),
            domain_id: "domain-1".to_string(),
            procedure_id: "procedure-1".to_string(),
        }
    }

    fn completed_barrier(status: ProcedureControlTargetStatus) -> ProcedureControlBarrier {
        ProcedureControlBarrier {
            space_id: "space-1".to_string(),
            domain_id: "domain-1".to_string(),
            procedure_id: "procedure-1".to_string(),
            procedure_version: 4,
            target_status: status as i32,
            control_epoch: u64::MAX,
            controlling_principal_id: "principal-1".to_string(),
            affected_partitions: vec![3, 1, 2],
            acknowledged_partitions: vec![1, 2, 3],
            completed: true,
            completion_revision: u64::MAX - 1,
            committed_at: Some(Timestamp {
                seconds: 1_793_478_000,
                nanos: 0,
            }),
            completed_at: Some(Timestamp {
                seconds: 1_793_478_001,
                nanos: 25,
            }),
        }
    }

    #[test]
    fn maps_completed_barrier_with_exact_unsigned_decimal_values() {
        let result = validate_control_barrier(
            &input(),
            ProcedureControlTargetStatus::Enabled,
            Some(completed_barrier(ProcedureControlTargetStatus::Enabled)),
        )
        .unwrap();
        assert_eq!(result.target_status, "enabled");
        assert_eq!(result.control_epoch, u64::MAX.to_string());
        assert_eq!(result.completion_revision, (u64::MAX - 1).to_string());
        assert_eq!(result.completed_at, "1793478001.000000025");
    }

    #[test]
    fn rejects_missing_partial_and_mismatched_barriers() {
        let missing =
            validate_control_barrier(&input(), ProcedureControlTargetStatus::Enabled, None)
                .unwrap_err();
        assert!(missing.message.contains("no procedure control barrier"));

        let mut partial = completed_barrier(ProcedureControlTargetStatus::Enabled);
        partial.completed = false;
        let partial_error = validate_control_barrier(
            &input(),
            ProcedureControlTargetStatus::Enabled,
            Some(partial),
        )
        .unwrap_err();
        assert!(partial_error.message.contains("did not complete"));

        let mut mismatched = completed_barrier(ProcedureControlTargetStatus::Enabled);
        mismatched.procedure_id = "other".to_string();
        let mismatch_error = validate_control_barrier(
            &input(),
            ProcedureControlTargetStatus::Enabled,
            Some(mismatched),
        )
        .unwrap_err();
        assert!(mismatch_error.message.contains("identity"));
    }

    #[test]
    fn rejects_unacknowledged_partitions_and_wrong_target() {
        let mut unacknowledged = completed_barrier(ProcedureControlTargetStatus::Disabled);
        unacknowledged.acknowledged_partitions.pop();
        let partition_error = validate_control_barrier(
            &input(),
            ProcedureControlTargetStatus::Disabled,
            Some(unacknowledged),
        )
        .unwrap_err();
        assert!(partition_error.message.contains("every affected partition"));

        let target_error = validate_control_barrier(
            &input(),
            ProcedureControlTargetStatus::Enabled,
            Some(completed_barrier(ProcedureControlTargetStatus::Disabled)),
        )
        .unwrap_err();
        assert!(target_error.message.contains("target state"));
    }

    #[test]
    fn preserves_authorization_failure_category() {
        let error = procedure_control_rpc_error(mycel_sdk::Error::from(
            tonic::Status::permission_denied("automation.manage capability is required"),
        ));
        assert_eq!(error.kind, "authorization");
        assert_eq!(error.severity, "warning");
    }

    #[test]
    fn reports_older_daemon_controls_as_unavailable() {
        let error = procedure_control_rpc_error(mycel_sdk::Error::from(
            tonic::Status::unimplemented("unknown method"),
        ));
        assert_eq!(error.kind, "unavailable");
        assert!(error.message.contains("daemon version"));
    }

    #[test]
    fn requires_explicit_control_identity() {
        let error = validate_control_input(&GraphProcedureControlInput {
            space_id: " ".to_string(),
            domain_id: "domain-1".to_string(),
            procedure_id: "procedure-1".to_string(),
        })
        .unwrap_err();
        assert_eq!(error.kind, "validation");
    }
}
