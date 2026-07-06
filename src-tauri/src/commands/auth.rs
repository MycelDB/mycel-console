use tauri::State;

use crate::state::{AdminSession, AppState, OperatorSession};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    pub addr: String,
    pub username: String,
    pub password: String,
}

#[tauri::command]
pub async fn admin_login(
    input: LoginInput,
    state: State<'_, AppState>,
) -> Result<OperatorSession, String> {
    let addr = input.addr.trim().to_string();
    let username = input.username.trim().to_string();

    if addr.is_empty() {
        return Err("Cluster gRPC address is required".to_string());
    }
    if username.is_empty() {
        return Err("Operator username is required".to_string());
    }
    if input.password.is_empty() {
        return Err("Password is required".to_string());
    }

    let mut client = mycel_sdk::dial_admin(mycel_sdk::Config {
        addr: addr.clone(),
        username,
        password: input.password,
        ..Default::default()
    })
    .await
    .map_err(|err| err.to_string())?;

    let operator = client.who_am_i().await.map_err(|err| err.to_string())?;
    let session = AdminSession {
        addr,
        operator_id: operator.operator_id,
        username: operator.username,
        _client: client,
    };
    let summary = session.summary();

    *state.admin.write().await = Some(session);

    Ok(summary)
}

#[tauri::command]
pub async fn admin_logout(state: State<'_, AppState>) -> Result<(), String> {
    *state.admin.write().await = None;
    Ok(())
}

#[tauri::command]
pub async fn admin_whoami(state: State<'_, AppState>) -> Result<Option<OperatorSession>, String> {
    Ok(state.admin.read().await.as_ref().map(AdminSession::summary))
}
