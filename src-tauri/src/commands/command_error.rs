#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsoleCommandError {
    pub kind: String,
    pub severity: String,
    pub message: String,
    pub detail: Option<String>,
}

impl From<mycel_sdk::ClassifiedError> for ConsoleCommandError {
    fn from(classified: mycel_sdk::ClassifiedError) -> Self {
        Self {
            kind: classified.kind.as_str().to_string(),
            severity: classified.severity.as_str().to_string(),
            message: classified.message,
            detail: classified.detail,
        }
    }
}

pub fn sdk_error(err: mycel_sdk::Error) -> ConsoleCommandError {
    mycel_sdk::classify_error(&err).into()
}

pub fn sdk_error_code(err: &mycel_sdk::Error) -> Option<tonic::Code> {
    match err {
        mycel_sdk::Error::Status(status) => Some(status.code()),
        _ => None,
    }
}

pub fn validation_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: mycel_sdk::ErrorKind::Validation.as_str().to_string(),
        severity: mycel_sdk::ErrorSeverity::Warning.as_str().to_string(),
        message: message.into(),
        detail: None,
    }
}

macro_rules! authenticated_rpc {
    ($client:expr, $service:ident.$method:ident($request:expr $(,)?)) => {{
        let request = $request;
        $client
            .authenticated_call(|client| {
                let request = request.clone();
                Box::pin(client.$service.$method(tonic::Request::new(request)))
            })
            .await
    }};
}

pub(crate) use authenticated_rpc;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_sdk_authentication_errors() {
        let err = sdk_error(mycel_sdk::Error::from(tonic::Status::unauthenticated(
            "invalid credentials",
        )));
        assert_eq!(err.kind, "authentication");
        assert_eq!(err.severity, "warning");
        assert_eq!(err.message, "invalid credentials");
    }

    #[test]
    fn maps_sdk_authorization_errors() {
        let err = sdk_error(mycel_sdk::Error::from(tonic::Status::permission_denied(
            "principal management capability is required",
        )));
        assert_eq!(err.kind, "authorization");
        assert_eq!(err.severity, "warning");
        assert_eq!(err.message, "principal management capability is required");
    }

    #[test]
    fn validation_errors_are_warnings() {
        let err = validation_error("Cluster gRPC address is required");
        assert_eq!(err.kind, "validation");
        assert_eq!(err.severity, "warning");
        assert_eq!(err.message, "Cluster gRPC address is required");
    }

    #[test]
    fn console_login_shares_one_auth_coordinator() {
        let source = include_str!("auth.rs");
        assert!(source.contains("client.data_client()"));
        assert!(!source.contains("access_token: client.access_token()"));
        assert!(!source.contains("refresh_token: client.refresh_token()"));
    }

    #[test]
    fn authenticated_commands_do_not_invoke_generated_clients_directly() {
        let guarded_sources = [
            include_str!("activity.rs"),
            include_str!("auth.rs"),
            include_str!("automations.rs"),
            include_str!("backups.rs"),
            include_str!("cluster.rs"),
            include_str!("domains.rs"),
            include_str!("inference.rs"),
            include_str!("lexical.rs"),
            include_str!("procedure_inference.rs"),
            include_str!("schemas.rs"),
            include_str!("semantic.rs"),
            include_str!("semantic_maintenance.rs"),
            include_str!("spaces.rs"),
            include_str!("users.rs"),
        ];
        for source in guarded_sources {
            assert!(!source.contains("Request::new("));
        }

        let client_query = include_str!("client_query.rs");
        assert_eq!(client_query.matches("Request::new(").count(), 1);
        assert!(client_query.contains(".authenticated_call(|client|"));
        assert!(!include_str!("cluster.rs").contains(".cluster.clone()"));
    }
}
