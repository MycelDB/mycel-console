use tokio::sync::RwLock;

pub struct AppState {
    pub admin: RwLock<Option<AdminSession>>,
    pub client_query: RwLock<Option<ClientQuerySession>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            admin: RwLock::new(None),
            client_query: RwLock::new(None),
        }
    }
}

pub struct ClientQuerySession {
    pub _client: mycel_sdk::Client,
}

pub struct AdminSession {
    pub addr: String,
    pub operator_id: String,
    pub username: String,
    pub _client: mycel_sdk::AdminClient,
}

impl AdminSession {
    pub fn summary(&self) -> OperatorSession {
        OperatorSession {
            addr: self.addr.clone(),
            operator_id: self.operator_id.clone(),
            username: self.username.clone(),
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OperatorSession {
    pub addr: String,
    pub operator_id: String,
    pub username: String,
}
