use mycel_sdk::proto::admin::v1::{
    AdminAuthSessionSummary, CreateUserRequest, DeleteUserRequest, DisableUserRequest,
    EnableUserRequest, GetUserRequest, ListUserSessionsRequest, ListUsersRequest,
    RevokeUserSessionRequest, RevokeUserSessionsRequest, SetUserPasswordRequest, User,
};
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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub user_id: String,
    pub username: String,
    pub state: String,
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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUsersResponse {
    pub users: Vec<UserInfo>,
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
pub struct DeleteUserInput {
    pub user_id: String,
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
pub struct RevokeUserSessionInput {
    pub user_id: String,
    pub auth_session_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RevokeUserSessionsResponseInfo {
    pub revoked_count: i32,
}

#[tauri::command]
pub async fn admin_list_users(
    input: ListUsersInput,
    state: State<'_, AppState>,
) -> Result<ListUsersResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .list_users(tonic::Request::new(ListUsersRequest {
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_disabled: input.include_disabled,
            include_deleted: input.include_deleted,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListUsersResponse {
        users: response.users.into_iter().map(user_info).collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_get_user(
    user_id: String,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
    let user_id = user_id.trim().to_string();
    if user_id.is_empty() {
        return Err("User ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .get_user(tonic::Request::new(GetUserRequest { user_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Get user response did not include a user".to_string())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .list_user_sessions(tonic::Request::new(ListUserSessionsRequest {
            user_id,
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_inactive: input.include_inactive,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListUserSessionsResponse {
        sessions: response
            .sessions
            .into_iter()
            .map(user_session_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    session
        ._client
        .users
        .revoke_user_session(tonic::Request::new(RevokeUserSessionRequest {
            user_id,
            auth_session_id,
        }))
        .await
        .map_err(|err| err.to_string())?;

    Ok(())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .revoke_user_sessions(tonic::Request::new(RevokeUserSessionsRequest { user_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(RevokeUserSessionsResponseInfo {
        revoked_count: response.revoked_count,
    })
}

#[tauri::command]
pub async fn admin_create_user(
    input: CreateUserInput,
    state: State<'_, AppState>,
) -> Result<UserInfo, String> {
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
        .users
        .create_user(tonic::Request::new(CreateUserRequest {
            username,
            password: input.password.filter(|password| !password.is_empty()),
            disabled: input.disabled,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Create user response did not include a user".to_string())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .disable_user(tonic::Request::new(DisableUserRequest {
            user_id,
            reason: input.reason.unwrap_or_default(),
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Disable user response did not include a user".to_string())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .enable_user(tonic::Request::new(EnableUserRequest { user_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Enable user response did not include a user".to_string())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .delete_user(tonic::Request::new(DeleteUserRequest {
            user_id,
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Delete user response did not include a user".to_string())
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

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .users
        .set_user_password(tonic::Request::new(SetUserPasswordRequest {
            user_id,
            password: input.password,
            revoke_sessions: input.revoke_sessions,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .user
        .map(user_info)
        .ok_or_else(|| "Set user password response did not include a user".to_string())
}

fn user_info(user: User) -> UserInfo {
    let state = user.state().as_str_name().to_string();
    UserInfo {
        user_id: user.user_id,
        username: user.username,
        state,
        create_time: timestamp_string(user.create_time),
        update_time: timestamp_string(user.update_time),
    }
}

fn user_session_info(session: AdminAuthSessionSummary) -> UserSessionInfo {
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
