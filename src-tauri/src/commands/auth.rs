use mycel_sdk::proto::common::v1::{AccessScope, AccessScopeType};
use tauri::State;
use tokio::{
    net::TcpStream,
    time::{timeout, Duration},
};

use crate::state::{AdminSession, AppState, PrincipalSession};

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
) -> Result<PrincipalSession, String> {
    let addr = input.addr.trim().to_string();
    let username = input.username.trim().to_string();

    if addr.is_empty() {
        return Err("Cluster gRPC address is required".to_string());
    }
    if username.is_empty() {
        return Err("Principal username is required".to_string());
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

    let data_client = mycel_sdk::dial(mycel_sdk::Config {
        addr: addr.clone(),
        access_token: client.access_token(),
        access_token_expire_time: client.access_token_expire_time(),
        refresh_token: client.refresh_token(),
        ..Default::default()
    })
    .await
    .map_err(|err| err.to_string())?;

    let operator = client.who_am_i().await.map_err(|err| err.to_string())?;
    let session = AdminSession {
        addr,
        principal_id: operator.principal_id,
        username: operator.username,
        _client: client,
        _data_client: data_client,
    };
    let summary = session.summary();

    *state.admin.write().await = Some(session);

    Ok(summary)
}

#[tauri::command]
pub async fn admin_logout(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(mut session) = state.admin.write().await.take() {
        let _ = session._client.logout_principal(None).await;
    }
    Ok(())
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAccessScopeInput {
    pub r#type: Option<String>,
    pub space_id: Option<String>,
    pub domain_id: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetMyAccessInput {
    pub scope: Option<MyAccessScopeInput>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAccessScopeInfo {
    pub kind: String,
    pub space_id: Option<String>,
    pub domain_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAccessRoleInfo {
    pub role: String,
    pub scope: Option<MyAccessScopeInfo>,
    pub source: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAccessCapabilityInfo {
    pub capability: String,
    pub scope: Option<MyAccessScopeInfo>,
    pub source: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAccessInfo {
    pub principal: PrincipalSession,
    pub effective_roles: Vec<String>,
    pub effective_capabilities: Vec<String>,
    pub roles: Vec<MyAccessRoleInfo>,
    pub capabilities: Vec<MyAccessCapabilityInfo>,
    pub warnings: Vec<String>,
    pub complete: bool,
}

#[tauri::command]
pub async fn admin_whoami(state: State<'_, AppState>) -> Result<Option<PrincipalSession>, String> {
    Ok(state.admin.read().await.as_ref().map(AdminSession::summary))
}

#[tauri::command]
pub async fn admin_get_my_access(
    input: Option<GetMyAccessInput>,
    state: State<'_, AppState>,
) -> Result<MyAccessInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .get_my_access(input.and_then(|value| value.scope).map(scope_input))
        .await
        .map_err(|err| err.to_string())?;
    let principal = response.principal.unwrap_or_default();
    Ok(MyAccessInfo {
        principal: PrincipalSession {
            addr: session.addr.clone(),
            principal_id: principal.principal_id,
            username: principal.username,
        },
        effective_roles: response.effective_roles,
        effective_capabilities: response.effective_capabilities,
        roles: response
            .roles
            .into_iter()
            .map(|role| MyAccessRoleInfo {
                role: role.role,
                scope: role.scope.map(scope_info),
                source: role.source,
            })
            .collect(),
        capabilities: response
            .capabilities
            .into_iter()
            .map(|capability| MyAccessCapabilityInfo {
                capability: capability.capability,
                scope: capability.scope.map(scope_info),
                source: capability.source,
                role: optional(capability.role),
            })
            .collect(),
        warnings: response.warnings,
        complete: response.complete,
    })
}

fn scope_input(input: MyAccessScopeInput) -> AccessScope {
    let kind = input.r#type.unwrap_or_default().to_ascii_lowercase();
    let r#type = match kind.as_str() {
        "space" => AccessScopeType::Space,
        "domain" => AccessScopeType::Domain,
        "system" => AccessScopeType::System,
        _ if input
            .domain_id
            .as_ref()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false) =>
        {
            AccessScopeType::Domain
        }
        _ if input
            .space_id
            .as_ref()
            .map(|value| !value.trim().is_empty())
            .unwrap_or(false) =>
        {
            AccessScopeType::Space
        }
        _ => AccessScopeType::Unspecified,
    };
    AccessScope {
        r#type: r#type as i32,
        space_id: input.space_id.and_then(optional),
        domain_id: input.domain_id.and_then(optional),
    }
}

fn scope_info(scope: AccessScope) -> MyAccessScopeInfo {
    let kind = match AccessScopeType::try_from(scope.r#type).unwrap_or(AccessScopeType::Unspecified)
    {
        AccessScopeType::System => "system",
        AccessScopeType::Space => "space",
        AccessScopeType::Domain => "domain",
        AccessScopeType::Unspecified => "system",
    };
    MyAccessScopeInfo {
        kind: kind.to_string(),
        space_id: scope.space_id.and_then(optional),
        domain_id: scope.domain_id.and_then(optional),
    }
}

fn optional(value: String) -> Option<String> {
    let trimmed = value.trim().to_string();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}
