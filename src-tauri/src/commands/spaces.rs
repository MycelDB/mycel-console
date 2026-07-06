use mycel_sdk::proto::admin::v1::AdminSpaceServiceListSpacesRequest;
use mycel_sdk::proto::client::v1::Space;
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
pub struct SpaceInfo {
    pub space_id: String,
    pub name: String,
    pub state: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSpacesResponse {
    pub spaces: Vec<SpaceInfo>,
    pub next_page_token: String,
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
        state,
    }
}
