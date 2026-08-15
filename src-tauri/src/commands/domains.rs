use mycel_sdk::proto::admin::v1::AdminDomainServiceListDomainsRequest;
use mycel_sdk::proto::client::v1::{Domain, ListDomainsRequest};
use prost_types::Timestamp;
use tauri::State;
use tonic::Code;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDomainsInput {
    pub space_id: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_system: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainInfo {
    pub space_id: String,
    pub domain_id: String,
    pub key: String,
    pub name: String,
    pub description: String,
    pub state: String,
    pub is_default: bool,
    pub system: bool,
    pub create_time: String,
    pub update_time: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListDomainsResponse {
    pub domains: Vec<DomainInfo>,
    pub next_page_token: String,
}

#[tauri::command]
pub async fn admin_list_domains(
    input: ListDomainsInput,
    state: State<'_, AppState>,
) -> Result<ListDomainsResponse, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let page_size = input.page_size.unwrap_or(100);
    let page_token = input.page_token.unwrap_or_default();
    let include_system = input.include_system;
    let admin_result = session
        ._client
        .domains
        .list_domains(tonic::Request::new(AdminDomainServiceListDomainsRequest {
            space_id: space_id.clone(),
            page_size,
            page_token: page_token.clone(),
            include_system,
        }))
        .await;

    let (domains, next_page_token) = match admin_result {
        Ok(response) => {
            let response = response.into_inner();
            (response.domains, response.next_page_token)
        }
        Err(err) if err.code() == Code::PermissionDenied => {
            let response = session
                ._data_client
                .domain
                .list_domains(tonic::Request::new(ListDomainsRequest {
                    space_id,
                    page_size,
                    page_token,
                    include_system,
                }))
                .await
                .map_err(|err| err.to_string())?
                .into_inner();
            (response.domains, response.next_page_token)
        }
        Err(err) => return Err(err.to_string()),
    };

    Ok(ListDomainsResponse {
        domains: domains.into_iter().map(domain_info).collect(),
        next_page_token,
    })
}

fn domain_info(domain: Domain) -> DomainInfo {
    let state = domain.state().as_str_name().to_string();
    DomainInfo {
        space_id: domain.space_id,
        domain_id: domain.domain_id,
        key: domain.key,
        name: domain.name,
        description: domain.description,
        state,
        is_default: domain.default,
        system: domain.system,
        create_time: timestamp_string(domain.create_time),
        update_time: timestamp_string(domain.update_time),
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
