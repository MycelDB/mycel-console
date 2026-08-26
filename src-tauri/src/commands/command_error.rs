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

pub fn validation_error(message: impl Into<String>) -> ConsoleCommandError {
    ConsoleCommandError {
        kind: mycel_sdk::ErrorKind::Validation.as_str().to_string(),
        severity: mycel_sdk::ErrorSeverity::Warning.as_str().to_string(),
        message: message.into(),
        detail: None,
    }
}

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
}
