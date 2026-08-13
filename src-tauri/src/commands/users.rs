use mycel_sdk::proto::admin::v1::{
    CreatePrincipalRequest, DeletePrincipalRequest, DisablePrincipalRequest,
    EnablePrincipalRequest, GetPrincipalRequest, ListPrincipalSessionsRequest,
    ListPrincipalsRequest, Principal, RevokePrincipalSessionRequest,
    RevokePrincipalSessionsRequest, SetPrincipalPasswordRequest,
};
use mycel_sdk::proto::common::v1::{AuthSessionSummary, PrincipalType};
use prost_types::Timestamp;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUsersInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
    #[serde(default)]
    pub include_deleted: bool,
}

pub type ListPrincipalsInput = ListUsersInput;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub principal_id: String,
    // Deprecated compatibility alias for the frontend during principal migration.
    pub user_id: String,
    pub username: String,
    pub display_name: String,
    pub email: String,
    pub r#type: String,
    pub state: String,
    pub login_enabled: bool,
    pub create_time: String,
    pub update_time: String,
}

pub type PrincipalInfo = UserInfo;

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
pub struct UserSessionInfo {
    pub auth_session_id: String,
    pub create_time: String,
    pub last_seen_time: String,
    pub expire_time: String,
    pub state: String,
    pub client: Option<AdminClientInfoDto>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUserSessionsResponse {
    pub sessions: Vec<UserSessionInfo>,
    pub next_page_token: String,
}

pub type ListPrincipalSessionsResponse = ListUserSessionsResponse;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUserSessionsInput {
    pub user_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_inactive: bool,
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
pub struct ListUsersResponse {
    pub users: Vec<UserInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListPrincipalsResponse {
    pub principals: Vec<PrincipalInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserInput {
    pub username: String,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub disabled: bool,
}

pub type CreatePrincipalInput = CreateUserInput;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DisableUserInput {
    pub user_id: String,
    #[serde(default)]
    pub reason: Option<String>,
    pub revoke_sessions: bool,
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
pub struct DeleteUserInput {
    pub user_id: String,
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
pub struct SetUserPasswordInput {
    pub user_id: String,
    pub password: String,
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
pub struct RevokeUserSessionInput {
    pub user_id: String,
    pub auth_session_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokePrincipalSessionInput {
    pub principal_id: String,
    pub auth_session_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokeUserSessionsResponseInfo {
    pub revoked_count: i32,
}

pub type RevokePrincipalSessionsResponseInfo = RevokeUserSessionsResponseInfo;

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
        principals: response.principals.into_iter().map(user_info).collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_list_users(
    input: ListUsersInput,
    state: State<'_, AppState>,
) -> Result<ListUsersResponse, String> {
    let response = admin_list_principals(input, state).await?;
    Ok(ListUsersResponse {
        users: response.principals,
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
        .map(user_info)
        .ok_or_else(|| "Get principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_get_user(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    admin_get_principal(user_id, state).await
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

    list_principal_sessions(
        principal_id,
        input.page_size,
        input.page_token,
        input.include_inactive,
        state,
    )
    .await
}

#[tauri::command]
pub async fn admin_list_user_sessions(
    input: ListUserSessionsInput,
    state: State<'_, AppState>,
) -> Result<ListUserSessionsResponse, String> {
    let user_id = input.user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    list_principal_sessions(
        user_id,
        input.page_size,
        input.page_token,
        input.include_inactive,
        state,
    )
    .await
}

async fn list_principal_sessions(
    principal_id: String,
    page_size: Option<i32>,
    page_token: Option<String>,
    include_inactive: bool,
    state: State<'_, AppState>,
) -> Result<ListPrincipalSessionsResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .list_principal_sessions(tonic::Request::new(ListPrincipalSessionsRequest {
            principal_id,
            page_size: page_size.unwrap_or(100),
            page_token: page_token.unwrap_or_default(),
            include_inactive,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListPrincipalSessionsResponse {
        sessions: response
            .sessions
            .into_iter()
            .map(user_session_info)
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

    revoke_principal_session(principal_id, auth_session_id, state).await
}

#[tauri::command]
pub async fn admin_revoke_user_session(
    input: RevokeUserSessionInput,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let user_id = input.user_id.trim().to_string();
    let auth_session_id = input.auth_session_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }
    if auth_session_id.is_empty() {
        return Err("Auth session ID is required".to_string());
    }

    revoke_principal_session(user_id, auth_session_id, state).await
}

async fn revoke_principal_session(
    principal_id: String,
    auth_session_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
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

    revoke_principal_sessions(principal_id, state).await
}

#[tauri::command]
pub async fn admin_revoke_user_sessions(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<RevokeUserSessionsResponseInfo, String> {
    let user_id = user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    revoke_principal_sessions(user_id, state).await
}

async fn revoke_principal_sessions(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<RevokePrincipalSessionsResponseInfo, String> {
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
        .map(user_info)
        .ok_or_else(|| "Create principal response did not include a principal".to_string())
}

#[tauri::command]
pub async fn admin_create_user(
    input: CreateUserInput,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    admin_create_principal(input, state).await
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

    disable_principal(
        principal_id,
        input.reason.unwrap_or_default(),
        input.revoke_sessions,
        state,
    )
    .await
}

#[tauri::command]
pub async fn admin_disable_user(
    input: DisableUserInput,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let user_id = input.user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    disable_principal(
        user_id,
        input.reason.unwrap_or_default(),
        input.revoke_sessions,
        state,
    )
    .await
}

async fn disable_principal(
    principal_id: String,
    reason: String,
    revoke_sessions: bool,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .disable_principal(tonic::Request::new(DisablePrincipalRequest {
            principal_id,
            reason,
            revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(user_info)
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

    enable_principal(principal_id, state).await
}

#[tauri::command]
pub async fn admin_enable_user(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let user_id = user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    enable_principal(user_id, state).await
}

async fn enable_principal(
    principal_id: String,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
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
        .map(user_info)
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

    delete_principal(principal_id, input.revoke_sessions, state).await
}

#[tauri::command]
pub async fn admin_delete_user(
    input: DeleteUserInput,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let user_id = input.user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    delete_principal(user_id, input.revoke_sessions, state).await
}

async fn delete_principal(
    principal_id: String,
    revoke_sessions: bool,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .delete_principal(tonic::Request::new(DeletePrincipalRequest {
            principal_id,
            revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(user_info)
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

    set_principal_password(principal_id, input.password, input.revoke_sessions, state).await
}

#[tauri::command]
pub async fn admin_set_user_password(
    input: SetUserPasswordInput,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let user_id = input.user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }
    if input.password.is_empty() {
        return Err("Password is required".to_string());
    }

    set_principal_password(user_id, input.password, input.revoke_sessions, state).await
}

async fn set_principal_password(
    principal_id: String,
    password: String,
    revoke_sessions: bool,
    state: State<'_, AppState>,
) -> Result<PrincipalInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .principals
        .set_principal_password(tonic::Request::new(SetPrincipalPasswordRequest {
            principal_id,
            password,
            revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .principal
        .map(user_info)
        .ok_or_else(|| "Set principal password response did not include a principal".to_string())
}

fn user_info(principal: Principal) -> UserInfo {
    let state = principal.state().as_str_name().to_string();
    let principal_type = principal.r#type().as_str_name().to_string();
    let principal_id = principal.principal_id;
    UserInfo {
        principal_id: principal_id.clone(),
        user_id: principal_id,
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

fn user_session_info(session: AuthSessionSummary) -> UserSessionInfo {
    let state = session.state().as_str_name().to_string();
    UserSessionInfo {
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
