use mycel_sdk::proto::admin::v1::{DeleteDomainSchemaRequest, GetDomainSchemaRequest};
use tauri::State;
use tonic::Request;

use crate::state::AppState;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetDomainSchemaInput {
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainSchemaInfo {
    pub domain_id: String,
    pub gwl: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteDomainSchemaInput {
    pub domain_id: String,
}

#[tauri::command]
pub async fn admin_get_domain_schema(
    input: GetDomainSchemaInput,
    state: State<'_, AppState>,
) -> Result<DomainSchemaInfo, String> {
    let domain_id = input.domain_id.trim().to_string();
    if domain_id.is_empty() {
        return Err("Domain ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .schema
        .get_domain_schema(Request::new(GetDomainSchemaRequest {
            domain_id: domain_id.clone(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(DomainSchemaInfo {
        domain_id,
        gwl: response.gwl,
    })
}

#[tauri::command]
pub async fn admin_delete_domain_schema(
    input: DeleteDomainSchemaInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let domain_id = input.domain_id.trim().to_string();
    if domain_id.is_empty() {
        return Err("Domain ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    session
        ._client
        .schema
        .delete_domain_schema(Request::new(DeleteDomainSchemaRequest { domain_id }))
        .await
        .map_err(|err| err.to_string())?;
    Ok(())
}
