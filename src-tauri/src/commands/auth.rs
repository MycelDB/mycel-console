use tauri::State;
use tokio::{
    net::TcpStream,
    time::{timeout, Duration},
};

use crate::state::{AdminSession, AppState, OperatorSession};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    pub addr: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDiagnosticCheck {
    pub id: String,
    pub label: String,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDiagnosticsResponse {
    pub addr: String,
    pub checks: Vec<ConnectionDiagnosticCheck>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionDiagnosticsInput {
    pub addr: String,
}

#[tauri::command]
pub async fn admin_connection_diagnostics(
    input: ConnectionDiagnosticsInput,
) -> Result<ConnectionDiagnosticsResponse, String> {
    let addr = input.addr.trim().to_string();
    if addr.is_empty() {
        return Err("Cluster gRPC address is required".to_string());
    }

    let tcp_target = addr
        .strip_prefix("http://")
        .or_else(|| addr.strip_prefix("https://"))
        .unwrap_or(&addr)
        .trim_end_matches('/')
        .to_string();

    let mut checks = Vec::new();
    checks.push(check("address", "Address", "pass", format!("Using {addr}")));

    match timeout(Duration::from_secs(3), TcpStream::connect(&tcp_target)).await {
        Ok(Ok(_)) => checks.push(check(
            "tcp",
            "TCP reachable",
            "pass",
            format!("Connected to {tcp_target}"),
        )),
        Ok(Err(err)) => checks.push(check("tcp", "TCP reachable", "fail", err.to_string())),
        Err(_) => checks.push(check(
            "tcp",
            "TCP reachable",
            "fail",
            "Timed out after 3 seconds".to_string(),
        )),
    }

    Ok(ConnectionDiagnosticsResponse { addr, checks })
}

fn check(id: &str, label: &str, status: &str, detail: String) -> ConnectionDiagnosticCheck {
    ConnectionDiagnosticCheck {
        id: id.to_string(),
        label: label.to_string(),
        status: status.to_string(),
        detail,
    }
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
