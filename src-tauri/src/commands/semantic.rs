use mycel_sdk::proto::admin::v1::AdminSemanticServiceListSemanticIndexesRequest;
use mycel_sdk::proto::client::v1::SemanticIndex;
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticIndexesInput {
    pub space_id: String,
    #[serde(default)]
    pub domain_id: Option<String>,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub include_disabled: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SemanticIndexInfo {
    pub semantic_index_id: String,
    pub key: String,
    pub display_name: String,
    pub description: String,
    pub space_id: String,
    pub domain_id: String,
    pub model_label: String,
    pub vector_store_label: String,
    pub state: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSemanticIndexesResponse {
    pub indexes: Vec<SemanticIndexInfo>,
    pub next_page_token: String,
}

#[tauri::command]
pub async fn admin_list_semantic_indexes(
    input: ListSemanticIndexesInput,
    state: State<'_, AppState>,
) -> Result<ListSemanticIndexesResponse, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }

    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;

    let response = session
        ._client
        .semantic
        .list_semantic_indexes(tonic::Request::new(
            AdminSemanticServiceListSemanticIndexesRequest {
                space_id,
                domain_id: input.domain_id.unwrap_or_default(),
                page_size: input.page_size.unwrap_or(100),
                page_token: input.page_token.unwrap_or_default(),
                include_disabled: input.include_disabled,
            },
        ))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListSemanticIndexesResponse {
        indexes: response
            .indexes
            .into_iter()
            .map(semantic_index_info)
            .collect(),
        next_page_token: response.next_page_token,
    })
}

fn semantic_index_info(index: SemanticIndex) -> SemanticIndexInfo {
    let state = index.state().as_str_name().to_string();
    SemanticIndexInfo {
        semantic_index_id: index.semantic_index_id,
        key: index.key,
        display_name: index.display_name,
        description: index.description,
        space_id: index.space_id,
        domain_id: index.domain_id,
        model_label: index.model_label,
        vector_store_label: index.vector_store_label,
        state,
    }
}
