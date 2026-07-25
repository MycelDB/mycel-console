use mycel_sdk::proto::admin::v1::{
    DisableAutomationRequest, EnableAutomationRequest, GetAutomationRequest, GetAutomationRunRequest,
    ListAutomationInvocationsRequest, ListAutomationsRequest,
};
use tauri::State;
use tonic::Request;

use crate::state::AppState;

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
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListAutomationInvocationsResponseInfo {
    pub invocations: Vec<AutomationInvocationSummaryInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AutomationRunInfo {
    pub run_json: String,
}

#[tauri::command]
pub async fn admin_list_automations(
    input: DomainAutomationInput,
    state: State<'_, AppState>,
) -> Result<ListAutomationsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .list_automations(Request::new(ListAutomationsRequest {
            domain_id: input.domain_id,
            status: String::new(),
        }))
        .await
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
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .get_automation(Request::new(GetAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(AutomationDefinitionInfo { definition_json: response.definition_json })
}

#[tauri::command]
pub async fn admin_enable_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .enable_automation(Request::new(EnableAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(AutomationDefinitionInfo { definition_json: response.definition_json })
}

#[tauri::command]
pub async fn admin_disable_automation(
    input: AutomationActionInput,
    state: State<'_, AppState>,
) -> Result<AutomationDefinitionInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .disable_automation(Request::new(DisableAutomationRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(AutomationDefinitionInfo { definition_json: response.definition_json })
}

#[tauri::command]
pub async fn admin_list_automation_invocations(
    input: ListAutomationInvocationsInput,
    state: State<'_, AppState>,
) -> Result<ListAutomationInvocationsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .list_automation_invocations(Request::new(ListAutomationInvocationsRequest {
            domain_id: input.domain_id,
            automation_id: input.automation_id.unwrap_or_default(),
            status: input.status.unwrap_or_default(),
            limit: input.limit.unwrap_or(50),
        }))
        .await
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
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_get_automation_run(
    input: GetAutomationRunInput,
    state: State<'_, AppState>,
) -> Result<AutomationRunInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .automation
        .get_automation_run(Request::new(GetAutomationRunRequest {
            domain_id: input.domain_id,
            run_id: input.run_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(AutomationRunInfo { run_json: response.run_json })
}
