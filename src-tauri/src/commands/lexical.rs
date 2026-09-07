use mycel_sdk::proto::admin::v1::RebuildLexicalIndexRequest;
use mycel_sdk::proto::client::v1::{
    GetLexicalIndexStatusRequest, LexicalIndexStatus, SearchMode, SearchRequest, SearchResult,
};
use tauri::State;

use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalSearchInput {
    pub space_id: String,
    pub domain_id: String,
    pub query: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub allow_stale: bool,
    #[serde(default)]
    pub max_revision_lag: Option<i64>,
    #[serde(default)]
    pub include_diagnostics: bool,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalIndexScopeInput {
    pub space_id: String,
    pub domain_id: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildLexicalIndexInput {
    pub space_id: String,
    pub domain_id: String,
    #[serde(default)]
    pub force: bool,
    #[serde(default)]
    pub dry_run: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalSearchResponseInfo {
    pub results: Vec<LexicalSearchResultInfo>,
    pub next_page_token: String,
    pub freshness: Option<LexicalFreshnessInfo>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalSearchResultInfo {
    pub space_id: String,
    pub domain_id: String,
    pub node_id: String,
    pub score: f64,
    pub score_kind: String,
    pub indexed_graph_revision: i64,
    pub matched_terms: Vec<String>,
    pub matched_field_paths: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalFreshnessInfo {
    pub state: String,
    pub indexed_graph_revision: i64,
    pub latest_known_graph_revision: i64,
    pub revision_lag: i64,
    pub updated_at: String,
    pub last_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalIndexStatusInfo {
    pub space_id: String,
    pub domain_id: String,
    pub state: String,
    pub indexed_graph_revision: i64,
    pub latest_known_graph_revision: i64,
    pub revision_lag: i64,
    pub live_document_count: i64,
    pub deleted_document_count: i64,
    pub segment_count: i32,
    pub analyzer_version: String,
    pub index_format_version: String,
    pub updated_at: String,
    pub last_rebuild_at: String,
    pub last_error: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RebuildLexicalIndexResponseInfo {
    pub space_id: String,
    pub domain_id: String,
    pub state: String,
    pub accepted: bool,
    pub dry_run: bool,
    pub rebuild_id: String,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub async fn client_lexical_search(
    input: LexicalSearchInput,
    state: State<'_, AppState>,
) -> Result<LexicalSearchResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    let query = input.query.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    if query.is_empty() {
        return Err("Search query is required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._data_client
        .search
        .search(tonic::Request::new(SearchRequest {
            space_id,
            domain_id,
            mode: SearchMode::Lexical as i32,
            query,
            filters: None,
            page_size: input.page_size.unwrap_or(20),
            page_token: input.page_token.unwrap_or_default(),
            include_diagnostics: input.include_diagnostics,
            allow_stale: input.allow_stale,
            max_revision_lag: input.max_revision_lag.unwrap_or(0),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(LexicalSearchResponseInfo {
        results: response.results.into_iter().map(search_result_info).collect(),
        next_page_token: response.next_page_token,
        freshness: response.freshness.map(|freshness| LexicalFreshnessInfo {
            state: freshness.state().as_str_name().to_string(),
            indexed_graph_revision: freshness.indexed_graph_revision,
            latest_known_graph_revision: freshness.latest_known_graph_revision,
            revision_lag: freshness.revision_lag,
            updated_at: freshness.updated_at,
            last_error: freshness.last_error,
        }),
        warnings: response.warnings,
    })
}

#[tauri::command]
pub async fn client_get_lexical_index_status(
    input: LexicalIndexScopeInput,
    state: State<'_, AppState>,
) -> Result<LexicalIndexStatusInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._data_client
        .search
        .get_lexical_index_status(tonic::Request::new(GetLexicalIndexStatusRequest {
            space_id,
            domain_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(status_info(response.status.unwrap_or_default()))
}

#[tauri::command]
pub async fn admin_rebuild_lexical_index(
    input: RebuildLexicalIndexInput,
    state: State<'_, AppState>,
) -> Result<RebuildLexicalIndexResponseInfo, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .lexical_maintenance
        .rebuild_lexical_index(tonic::Request::new(RebuildLexicalIndexRequest {
            space_id,
            domain_id,
            force: input.force,
            dry_run: input.dry_run,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let state = response.state().as_str_name().to_string();
    Ok(RebuildLexicalIndexResponseInfo {
        space_id: response.space_id,
        domain_id: response.domain_id,
        state,
        accepted: response.accepted,
        dry_run: response.dry_run,
        rebuild_id: response.rebuild_id,
        warnings: response.warnings,
    })
}

fn search_result_info(result: SearchResult) -> LexicalSearchResultInfo {
    let score_kind = result.score_kind().as_str_name().to_string();
    LexicalSearchResultInfo {
        space_id: result.space_id,
        domain_id: result.domain_id,
        node_id: result.node_id,
        score: result.score,
        score_kind,
        indexed_graph_revision: result.indexed_graph_revision,
        matched_terms: result.matched_terms,
        matched_field_paths: result.matched_field_paths,
    }
}

fn status_info(status: LexicalIndexStatus) -> LexicalIndexStatusInfo {
    let state = status.state().as_str_name().to_string();
    LexicalIndexStatusInfo {
        space_id: status.space_id,
        domain_id: status.domain_id,
        state,
        indexed_graph_revision: status.indexed_graph_revision,
        latest_known_graph_revision: status.latest_known_graph_revision,
        revision_lag: status.revision_lag,
        live_document_count: status.live_document_count,
        deleted_document_count: status.deleted_document_count,
        segment_count: status.segment_count,
        analyzer_version: status.analyzer_version,
        index_format_version: status.index_format_version,
        updated_at: status.updated_at,
        last_rebuild_at: status.last_rebuild_at,
        last_error: status.last_error,
    }
}
