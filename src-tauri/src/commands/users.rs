use mycel_sdk::proto::admin::v1::{
    CreateUserRequest, DeleteUserRequest, DisableUserRequest, EnableUserRequest, ListUsersRequest,
    SetUserPasswordRequest, User,
};
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
    }
}
