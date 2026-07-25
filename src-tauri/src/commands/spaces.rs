use mycel_sdk::proto::admin::v1::{
    AdminSpaceServiceGetSpaceRequest, AdminSpaceServiceListSpacesRequest,
};
use mycel_sdk::proto::client::v1::Space;
use mycel_sdk::proto::common::v1::{EffectiveAccess, Principal};
use prost_types::Timestamp;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSpacesInput {
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_archived: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrincipalInfo {
    pub principal_type: String,
    pub id: String,
    pub display_name: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EffectiveAccessInfo {
    pub roles: Vec<String>,
    pub capabilities: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceInfo {
    pub space_id: String,
    pub name: String,
    pub owner: Option<PrincipalInfo>,
    pub state: String,
    pub create_time: String,
    pub update_time: String,
    pub caller_access: Option<EffectiveAccessInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSpacesResponse {
    pub spaces: Vec<SpaceInfo>,
    pub next_page_token: String,
}

#[tauri::command]
pub async fn admin_get_space(
    space_id: String,
    state: State<'_, AppState>,
) -> Result<SpaceInfo, String> {
    let space_id = space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .spaces
        .get_space(tonic::Request::new(AdminSpaceServiceGetSpaceRequest {
            space_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    response
        .space
        .map(space_info)
        .ok_or_else(|| "Get space response did not include a space".to_string())
}

#[tauri::command]
pub async fn admin_list_spaces(
    input: ListSpacesInput,
    state: State<'_, AppState>,
) -> Result<ListSpacesResponse, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .spaces
        .list_spaces(tonic::Request::new(AdminSpaceServiceListSpacesRequest {
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            include_archived: input.include_archived,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListSpacesResponse {
        spaces: response.spaces.into_iter().map(space_info).collect(),
        next_page_token: response.next_page_token,
    })
}

fn space_info(space: Space) -> SpaceInfo {
    let state = space.state().as_str_name().to_string();
    SpaceInfo {
        space_id: space.space_id,
        name: space.name,
        owner: space.owner.map(principal_info),
        state,
        create_time: timestamp_string(space.create_time),
        update_time: timestamp_string(space.update_time),
        caller_access: space.caller_access.map(effective_access_info),
    }
}

fn principal_info(principal: Principal) -> PrincipalInfo {
    PrincipalInfo {
        principal_type: principal.r#type().as_str_name().to_string(),
        id: principal.id,
        display_name: principal.display_name,
    }
}

fn effective_access_info(access: EffectiveAccess) -> EffectiveAccessInfo {
    EffectiveAccessInfo {
        roles: access
            .roles
            .into_iter()
            .map(|role| {
                mycel_sdk::proto::common::v1::SpaceRole::try_from(role)
                    .unwrap_or_default()
                    .as_str_name()
                    .to_string()
            })
            .collect(),
        capabilities: access
            .capabilities
            .into_iter()
            .map(|capability| {
                mycel_sdk::proto::common::v1::Capability::try_from(capability)
                    .unwrap_or_default()
                    .as_str_name()
                    .to_string()
            })
            .collect(),
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
