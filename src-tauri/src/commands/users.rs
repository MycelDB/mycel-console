use mycel_sdk::proto::admin::v1::{
    CreatePrincipalRequest, DeletePrincipalRequest, DisablePrincipalRequest,
    EnablePrincipalRequest, GetPrincipalRequest, ListPrincipalCapabilitiesRequest,
    ListPrincipalRolesRequest, ListPrincipalSessionsRequest, ListPrincipalsRequest, Principal,
    PrincipalCapabilityGrant, PrincipalRoleGrant, RevokePrincipalSessionRequest,
    RevokePrincipalSessionsRequest, SetPrincipalPasswordRequest,
};
use mycel_sdk::proto::common::v1::{
    AccessScope, AccessScopeType, AuthSessionSummary, Capability, PrincipalType,
};
use prost_types::Timestamp;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalsInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
    #[serde(default)]
    pub include_deleted: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrincipalInfo {
    pub principal_id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub r#type: String,
    pub state: String,
    pub login_enabled: bool,
    pub create_time: String,
    pub update_time: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AdminClientInfoDto {
    pub name: String,
    pub version: String,
    pub platform: String,
    pub device_label: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrincipalSessionInfo {
    pub auth_session_id: String,
    pub create_time: String,
    pub last_seen_time: String,
    pub expire_time: String,
    pub state: String,
    pub client: Option<AdminClientInfoDto>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalSessionsResponse {
    pub sessions: Vec<PrincipalSessionInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalSessionsInput {
    pub principal_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_inactive: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalsResponse {
    pub principals: Vec<PrincipalInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePrincipalInput {
    pub username: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub disabled: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisablePrincipalInput {
    pub principal_id: String,
    #[serde(default)]
    pub reason: Option<String>,
    pub revoke_sessions: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeletePrincipalInput {
    pub principal_id: String,
    pub revoke_sessions: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetPrincipalPasswordInput {
    pub principal_id: String,
    pub password: String,
    pub revoke_sessions: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokePrincipalSessionInput {
    pub principal_id: String,
    pub auth_session_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokePrincipalSessionsResponseInfo {
    pub revoked_count: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessScopeInfo {
    pub r#type: String,
    pub space_id: String,
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrincipalRoleGrantInfo {
    pub role_grant_id: String,
    pub principal_id: String,
    pub role: String,
    pub scope: Option<AccessScopeInfo>,
    pub reason: String,
    pub granted_by_principal_id: String,
    pub create_time: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalRolesResponseInfo {
    pub grants: Vec<PrincipalRoleGrantInfo>,
    pub effective_roles: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrincipalCapabilityGrantInfo {
    pub capability_grant_id: String,
    pub principal_id: String,
    pub capability: String,
    pub scope: Option<AccessScopeInfo>,
    pub reason: String,
    pub granted_by_principal_id: String,
    pub create_time: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalCapabilitiesResponseInfo {
    pub grants: Vec<PrincipalCapabilityGrantInfo>,
    pub effective_capabilities: Vec<String>,
}

#[tauri::command]
pub async fn admin_list_principals(
    input: ListPrincipalsInput,
    state: State<'_, AppState>,
) -> Result<ListPrincipalsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .list_principals(tonic::Request::new(ListPrincipalsRequest {
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_disabled: input.include_disabled,
            include_deleted: input.include_deleted,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListPrincipalsResponse {
        principals: response
            .principals
            .into_iter()
            .map(principal_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_get_principal(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let principal_id = principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .get_principal(tonic::Request::new(GetPrincipalRequest { principal_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Get principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_list_principal_roles(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<ListPrincipalRolesResponseInfo, String> {
    let principal_id = principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .list_principal_roles(tonic::Request::new(ListPrincipalRolesRequest {
            principal_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListPrincipalRolesResponseInfo {
        grants: response.grants.into_iter().map(role_grant_info).collect(),
        effective_roles: response.effective_roles,
    })
}

#[tauri::command]
pub async fn admin_list_principal_capabilities(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<ListPrincipalCapabilitiesResponseInfo, String> {
    let principal_id = principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .list_principal_capabilities(tonic::Request::new(ListPrincipalCapabilitiesRequest {
            principal_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListPrincipalCapabilitiesResponseInfo {
        grants: response
            .grants
            .into_iter()
            .map(capability_grant_info)
            .collect(),
        effective_capabilities: response
            .effective_capabilities
            .into_iter()
            .map(capability_name)
            .collect(),
    })
}

#[tauri::command]
pub async fn admin_list_principal_sessions(
    input: ListPrincipalSessionsInput,
    state: State<'_, AppState>,
) -> Result<ListPrincipalSessionsResponse, String> {
    let principal_id = input.principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .list_principal_sessions(tonic::Request::new(ListPrincipalSessionsRequest {
            principal_id,
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_inactive: input.include_inactive,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListPrincipalSessionsResponse {
        sessions: response
            .sessions
            .into_iter()
            .map(principal_session_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_revoke_principal_session(
    input: RevokePrincipalSessionInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let principal_id = input.principal_id.trim().to_string();
    let auth_session_id = input.auth_session_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }
    if auth_session_id.is_empty() {
        return Err("Auth session ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    session
        ._client
        .principals
        .revoke_principal_session(tonic::Request::new(RevokePrincipalSessionRequest {
            principal_id,
            auth_session_id,
        }))
        .await
        .map_err(|err| err.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn admin_revoke_principal_sessions(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<RevokePrincipalSessionsResponseInfo, String> {
    let principal_id = principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .revoke_principal_sessions(tonic::Request::new(RevokePrincipalSessionsRequest {
            principal_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(RevokePrincipalSessionsResponseInfo {
        revoked_count: response.revoked_count,
    })
}

#[tauri::command]
pub async fn admin_create_principal(
    input: CreatePrincipalInput,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let username = input.username.trim().to_string();
    if username.is_empty() {
        return Err("Username is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .create_principal(tonic::Request::new(CreatePrincipalRequest {
            username,
            password: input.password.filter(|password| !password.is_empty()),
            disabled: input.disabled,
            r#type: PrincipalType::Human as i32,
            login_enabled: !input.disabled,
            ..Default::default()
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Create principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_disable_principal(
    input: DisablePrincipalInput,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let principal_id = input.principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .disable_principal(tonic::Request::new(DisablePrincipalRequest {
            principal_id,
            reason: input.reason.unwrap_or_default(),
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Disable principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_enable_principal(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let principal_id = principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .enable_principal(tonic::Request::new(EnablePrincipalRequest { principal_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Enable principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_delete_principal(
    input: DeletePrincipalInput,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let principal_id = input.principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .delete_principal(tonic::Request::new(DeletePrincipalRequest {
            principal_id,
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Delete principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_set_principal_password(
    input: SetPrincipalPasswordInput,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let principal_id = input.principal_id.trim().to_string();
    if principal_id.is_empty() {
        return Err("Principal ID is required".to_string());
    }
    if input.password.is_empty() {
        return Err("Password is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .set_principal_password(tonic::Request::new(SetPrincipalPasswordRequest {
            principal_id,
            password: input.password,
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(principal_info)
        .ok_or_else(|| "Set principal password response did not include a principal".to_string())
}

fn principal_info(principal: Principal) -> PrincipalInfo {
    let state = principal.state().as_str_name().to_string();
    let principal_type = principal.r#type().as_str_name().to_string();
    PrincipalInfo {
        principal_id: principal.principal_id,
        username: principal.username,
        display_name: principal.display_name,
        email: principal.email,
        r#type: principal_type,
        state,
        login_enabled: principal.login_enabled,
        create_time: timestamp_string(principal.create_time),
        update_time: timestamp_string(principal.update_time),
    }
}

fn role_grant_info(grant: PrincipalRoleGrant) -> PrincipalRoleGrantInfo {
    PrincipalRoleGrantInfo {
        role_grant_id: grant.role_grant_id,
        principal_id: grant.principal_id,
        role: grant.role,
        scope: grant.scope.map(access_scope_info),
        reason: grant.reason,
        granted_by_principal_id: grant.granted_by_principal_id,
        create_time: timestamp_string(grant.create_time),
    }
}

fn capability_grant_info(grant: PrincipalCapabilityGrant) -> PrincipalCapabilityGrantInfo {
    PrincipalCapabilityGrantInfo {
        capability_grant_id: grant.capability_grant_id,
        principal_id: grant.principal_id,
        capability: capability_name(grant.capability),
        scope: grant.scope.map(access_scope_info),
        reason: grant.reason,
        granted_by_principal_id: grant.granted_by_principal_id,
        create_time: timestamp_string(grant.create_time),
    }
}

fn access_scope_info(scope: AccessScope) -> AccessScopeInfo {
    AccessScopeInfo {
        r#type: AccessScopeType::try_from(scope.r#type)
            .map(|scope_type| scope_type.as_str_name().to_string())
            .unwrap_or_else(|_| format!("ACCESS_SCOPE_TYPE_UNKNOWN_{}", scope.r#type)),
        space_id: scope.space_id.unwrap_or_default(),
        domain_id: scope.domain_id.unwrap_or_default(),
    }
}

fn capability_name(capability: i32) -> String {
    Capability::try_from(capability)
        .map(|capability| capability.as_str_name().to_string())
        .unwrap_or_else(|_| format!("CAPABILITY_UNKNOWN_{}", capability))
}

fn principal_session_info(session: AuthSessionSummary) -> PrincipalSessionInfo {
    let state = session.state().as_str_name().to_string();
    PrincipalSessionInfo {
        auth_session_id: session.auth_session_id,
        create_time: timestamp_string(session.create_time),
        last_seen_time: timestamp_string(session.last_seen_time),
        expire_time: timestamp_string(session.expire_time),
        state,
        client: session.client.map(|client| AdminClientInfoDto {
            name: client.name,
            version: client.version,
            platform: client.platform,
            device_label: client.device_label,
        }),
    }
}

fn timestamp_string(timestamp: Option<Timestamp>) -> String {
    timestamp
        .map(|timestamp| {
            if timestamp.nanos == 0 {
                format!("{}", timestamp.seconds)
            } else {
                format!("{}.{:09}", timestamp.seconds, timestamp.nanos)
            }
        })
        .unwrap_or_default()
}
