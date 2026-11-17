use mycel_sdk::proto::admin::v1::RebuildLexicalIndexRequest;
use mycel_sdk::proto::client::v1::{
    FilterOperator, GetLexicalIndexStatusRequest, HybridFusionStrategy, HybridSearchOptions,
    LexicalIndexStatus, LexicalSearchOptions, ProjectionConsistency, ProjectionConsistencyPolicy,
    PropertyFilter, SearchChannelStatus, SearchFilters, SearchMode, SearchRequest, SearchResult,
    SearchResultSource, SemanticSearchOptions, StaleProjectionBehavior,
};
use tauri::State;

use crate::commands::command_error::authenticated_rpc;
use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LexicalSearchInput {
    pub space_id: String,
    pub domain_id: String,
    pub lexical_query: String,
    #[serde(default)]
    pub semantic_query: Option<String>,
    #[serde(default)]
    pub mode: Option<String>,
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
    #[serde(default)]
    pub lexical_weight: Option<f64>,
    #[serde(default)]
    pub semantic_weight: Option<f64>,
    #[serde(default)]
    pub require_both: bool,
    #[serde(default)]
    pub lexical_candidates: Option<i32>,
    #[serde(default)]
    pub semantic_candidates: Option<i32>,
    #[serde(default)]
    pub semantic_rule_id: Option<String>,
    #[serde(default)]
    pub embedding_binding_key: Option<String>,
    #[serde(default)]
    pub semantic_min_score: Option<f64>,
    #[serde(default)]
    pub semantic_consistency: Option<String>,
    #[serde(default)]
    pub semantic_stale_behavior: Option<String>,
    #[serde(default)]
    pub min_required_graph_revision: Option<i64>,
    #[serde(default)]
    pub max_semantic_revision_lag: Option<i64>,
    #[serde(default)]
    pub max_semantic_staleness_seconds: Option<i64>,
    #[serde(default)]
    pub filters: Option<SearchFiltersInput>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchFiltersInput {
    #[serde(default)]
    pub node_labels: Vec<String>,
    #[serde(default)]
    pub node_ids: Vec<String>,
    #[serde(default)]
    pub properties: Vec<PropertyFilterInput>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PropertyFilterInput {
    pub path: String,
    pub operator: String,
    #[serde(default)]
    pub values: Vec<String>,
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
    pub channel_diagnostics: Option<SearchChannelDiagnosticsInfo>,
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
    pub sources: Vec<SearchResultSourceInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultSourceInfo {
    pub kind: String,
    pub raw_score: f64,
    pub rank: i32,
    pub normalized_score: f64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchChannelDiagnosticsInfo {
    pub lexical: Option<SearchChannelStatusInfo>,
    pub semantic: Option<SearchChannelStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchChannelStatusInfo {
    pub used: bool,
    pub state: String,
    pub served_graph_revision: i64,
    pub latest_known_graph_revision: i64,
    pub revision_lag: i64,
    pub reason: String,
    pub retryable: bool,
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
    let request = build_search_request(input)?;
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = authenticated_rpc!(session._data_client, search.search(request))
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(LexicalSearchResponseInfo {
        results: response
            .results
            .into_iter()
            .map(search_result_info)
            .collect(),
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
        channel_diagnostics: response.channel_diagnostics.map(|diagnostics| {
            SearchChannelDiagnosticsInfo {
                lexical: diagnostics.lexical.map(search_channel_status_info),
                semantic: diagnostics.semantic.map(search_channel_status_info),
            }
        }),
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
    let response = authenticated_rpc!(
        session._data_client,
        search.get_lexical_index_status(GetLexicalIndexStatusRequest {
            space_id,
            domain_id,
        })
    )
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
    let response = authenticated_rpc!(
        session._client,
        lexical_maintenance.rebuild_lexical_index(RebuildLexicalIndexRequest {
            space_id,
            domain_id,
            force: input.force,
            dry_run: input.dry_run,
        })
    )
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
        sources: result.sources.into_iter().map(search_source_info).collect(),
    }
}

fn search_source_info(source: SearchResultSource) -> SearchResultSourceInfo {
    SearchResultSourceInfo {
        kind: source.kind().as_str_name().to_string(),
        raw_score: source.raw_score,
        rank: source.rank,
        normalized_score: source.normalized_score,
    }
}

fn search_channel_status_info(status: SearchChannelStatus) -> SearchChannelStatusInfo {
    SearchChannelStatusInfo {
        used: status.used,
        state: status.state().as_str_name().to_string(),
        served_graph_revision: status.served_graph_revision,
        latest_known_graph_revision: status.latest_known_graph_revision,
        revision_lag: status.revision_lag,
        reason: status.reason,
        retryable: status.retryable,
    }
}

fn build_search_request(input: LexicalSearchInput) -> Result<SearchRequest, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    let lexical_query = input.lexical_query.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    let mode = search_mode(input.mode.as_deref())?;
    let is_hybrid = mode == SearchMode::Hybrid as i32;
    let semantic_consistency = semantic_consistency_policy(&input, is_hybrid)?;
    let semantic_query = trim_optional(input.semantic_query);
    let lexical_weight = input.lexical_weight.unwrap_or(0.5);
    let semantic_weight = input.semantic_weight.unwrap_or(0.5);
    if !is_hybrid && lexical_query.is_empty() {
        return Err("Lexical query is required".to_string());
    }
    if is_hybrid {
        validate_hybrid_queries(
            &lexical_query,
            semantic_query.as_deref(),
            lexical_weight,
            semantic_weight,
            input.require_both,
        )?;
    }
    Ok(SearchRequest {
        space_id,
        domain_id,
        mode,
        filters: search_filters(input.filters)?,
        page_size: input.page_size.unwrap_or(20),
        page_token: input.page_token.unwrap_or_default(),
        include_diagnostics: input.include_diagnostics,
        allow_stale: input.allow_stale,
        max_revision_lag: input.max_revision_lag.unwrap_or(0),
        hybrid: if is_hybrid {
            Some(HybridSearchOptions {
                lexical_weight,
                semantic_weight,
                fusion_strategy: HybridFusionStrategy::WeightedReciprocalRank as i32,
                require_both: input.require_both,
            })
        } else {
            None
        },
        semantic: if is_hybrid {
            Some(SemanticSearchOptions {
                semantic_rule_id: trim_optional(input.semantic_rule_id),
                embedding_binding_key: trim_optional(input.embedding_binding_key),
                min_score: input.semantic_min_score,
                candidate_count: input.semantic_candidates.unwrap_or(0),
                query: semantic_query,
            })
        } else {
            None
        },
        lexical: Some(LexicalSearchOptions {
            candidate_count: input.lexical_candidates.unwrap_or(0),
            query: (!lexical_query.is_empty()).then_some(lexical_query),
        }),
        semantic_consistency,
    })
}

fn semantic_consistency_policy(
    input: &LexicalSearchInput,
    is_hybrid: bool,
) -> Result<Option<ProjectionConsistencyPolicy>, String> {
    let consistency = trim_optional_ref(input.semantic_consistency.as_deref());
    let stale_behavior = trim_optional_ref(input.semantic_stale_behavior.as_deref());
    let min_required_graph_revision = input.min_required_graph_revision.unwrap_or(0);
    let max_revision_lag = input.max_semantic_revision_lag.unwrap_or(0);
    let max_staleness_seconds = input.max_semantic_staleness_seconds.unwrap_or(0);
    let has_policy_field = consistency.is_some()
        || stale_behavior.is_some()
        || min_required_graph_revision != 0
        || max_revision_lag != 0
        || max_staleness_seconds != 0;
    if !has_policy_field {
        return Ok(None);
    }
    if !is_hybrid {
        return Err("Semantic consistency options are only supported in hybrid search".to_string());
    }
    if min_required_graph_revision < 0 || max_revision_lag < 0 || max_staleness_seconds < 0 {
        return Err(
            "Semantic consistency revision and staleness bounds must not be negative".to_string(),
        );
    }
    let consistency = consistency.ok_or_else(|| {
        "semanticConsistency is required when semantic consistency options are set".to_string()
    })?;
    let consistency = projection_consistency(consistency)?;
    let stale_behavior = match stale_behavior {
        Some(value) => stale_projection_behavior(value)?,
        None => default_stale_behavior(consistency),
    };
    if consistency == ProjectionConsistency::Strict
        && stale_behavior != StaleProjectionBehavior::Fail
    {
        return Err("Strict semantic consistency requires fail stale behavior".to_string());
    }
    if consistency == ProjectionConsistency::ReadYourWrites && min_required_graph_revision == 0 {
        return Err(
            "Read-your-writes semantic consistency requires a minimum graph revision".to_string(),
        );
    }
    if consistency == ProjectionConsistency::BoundedStale
        && max_revision_lag == 0
        && max_staleness_seconds == 0
    {
        return Err(
            "Bounded-stale semantic consistency requires max revision lag or staleness".to_string(),
        );
    }
    Ok(Some(ProjectionConsistencyPolicy {
        consistency: consistency as i32,
        min_required_graph_revision,
        max_revision_lag,
        max_staleness: (max_staleness_seconds > 0).then_some(prost_types::Duration {
            seconds: max_staleness_seconds,
            nanos: 0,
        }),
        stale_behavior: stale_behavior as i32,
    }))
}

fn projection_consistency(raw: &str) -> Result<ProjectionConsistency, String> {
    match raw.trim().to_ascii_lowercase().replace('-', "_").as_str() {
        "strict" | "projection_consistency_strict" => Ok(ProjectionConsistency::Strict),
        "read_your_writes" | "read_your_write" | "projection_consistency_read_your_writes" => {
            Ok(ProjectionConsistency::ReadYourWrites)
        }
        "bounded_stale" | "projection_consistency_bounded_stale" => {
            Ok(ProjectionConsistency::BoundedStale)
        }
        "best_effort" | "projection_consistency_best_effort" => {
            Ok(ProjectionConsistency::BestEffort)
        }
        other => Err(format!("Unsupported semantic consistency: {other}")),
    }
}

fn stale_projection_behavior(raw: &str) -> Result<StaleProjectionBehavior, String> {
    match raw.trim().to_ascii_lowercase().replace('-', "_").as_str() {
        "fail" | "stale_projection_behavior_fail" => Ok(StaleProjectionBehavior::Fail),
        "serve_last_good" | "stale_projection_behavior_serve_last_good" => {
            Ok(StaleProjectionBehavior::ServeLastGood)
        }
        "skip_channel" | "stale_projection_behavior_skip_channel" => {
            Ok(StaleProjectionBehavior::SkipChannel)
        }
        other => Err(format!("Unsupported semantic stale behavior: {other}")),
    }
}

fn default_stale_behavior(consistency: ProjectionConsistency) -> StaleProjectionBehavior {
    match consistency {
        ProjectionConsistency::BestEffort => StaleProjectionBehavior::SkipChannel,
        ProjectionConsistency::ReadYourWrites | ProjectionConsistency::BoundedStale => {
            StaleProjectionBehavior::ServeLastGood
        }
        _ => StaleProjectionBehavior::Fail,
    }
}

fn validate_hybrid_queries(
    lexical_query: &str,
    semantic_query: Option<&str>,
    lexical_weight: f64,
    semantic_weight: f64,
    require_both: bool,
) -> Result<(), String> {
    if lexical_weight < 0.0 || semantic_weight < 0.0 {
        return Err("Hybrid weights must be non-negative".to_string());
    }
    let use_defaults = lexical_weight == 0.0 && semantic_weight == 0.0;
    let lexical_enabled = use_defaults || lexical_weight > 0.0 || require_both;
    let semantic_enabled = use_defaults || semantic_weight > 0.0 || require_both;
    if lexical_enabled && lexical_query.is_empty() {
        return Err("Lexical query is required when lexical retrieval is enabled".to_string());
    }
    if semantic_enabled && semantic_query.is_none() {
        return Err("Semantic query is required when semantic retrieval is enabled".to_string());
    }
    Ok(())
}

fn search_mode(raw: Option<&str>) -> Result<i32, String> {
    match raw
        .unwrap_or("lexical")
        .trim()
        .to_ascii_lowercase()
        .as_str()
    {
        "" | "lexical" => Ok(SearchMode::Lexical as i32),
        "hybrid" => Ok(SearchMode::Hybrid as i32),
        other => Err(format!("Unsupported search mode: {other}")),
    }
}

fn search_filters(input: Option<SearchFiltersInput>) -> Result<Option<SearchFilters>, String> {
    let Some(input) = input else {
        return Ok(None);
    };
    let node_labels = trim_vec(input.node_labels);
    let node_ids = trim_vec(input.node_ids);
    let mut properties = Vec::new();
    for property in input.properties {
        let path = property.path.trim().to_string();
        if path.is_empty() {
            return Err("Property filter path is required".to_string());
        }
        properties.push(PropertyFilter {
            path,
            operator: filter_operator(&property.operator)? as i32,
            values: trim_vec(property.values),
        });
    }
    if node_labels.is_empty() && node_ids.is_empty() && properties.is_empty() {
        return Ok(None);
    }
    Ok(Some(SearchFilters {
        node_labels,
        properties,
        node_ids,
    }))
}

fn filter_operator(raw: &str) -> Result<FilterOperator, String> {
    match raw.trim().to_ascii_lowercase().replace('_', "-").as_str() {
        "equals" | "eq" | "=" => Ok(FilterOperator::Equals),
        "not-equals" | "ne" | "!=" => Ok(FilterOperator::NotEquals),
        "in" => Ok(FilterOperator::In),
        "contains" => Ok(FilterOperator::Contains),
        "exists" => Ok(FilterOperator::Exists),
        other => Err(format!("Unsupported property filter operator: {other}")),
    }
}

fn trim_optional(value: Option<String>) -> Option<String> {
    value
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn trim_optional_ref(value: Option<&str>) -> Option<&str> {
    value.map(str::trim).filter(|value| !value.is_empty())
}

fn trim_vec(values: Vec<String>) -> Vec<String> {
    values
        .into_iter()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .collect()
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

#[cfg(test)]
mod tests {
    use super::*;

    fn input(mode: &str) -> LexicalSearchInput {
        LexicalSearchInput {
            space_id: "space-id".to_string(),
            domain_id: "domain-id".to_string(),
            lexical_query: "  title:raft  ".to_string(),
            semantic_query: Some("  how does raft recover?  ".to_string()),
            mode: Some(mode.to_string()),
            ..LexicalSearchInput::default()
        }
    }

    #[test]
    fn lexical_request_owns_its_query() {
        let request = build_search_request(input("lexical")).expect("lexical request");
        assert_eq!(
            request.lexical.and_then(|options| options.query),
            Some("title:raft".to_string())
        );
        assert!(request.semantic.is_none());
    }

    #[test]
    fn hybrid_request_populates_distinct_channel_queries() {
        let request = build_search_request(input("hybrid")).expect("hybrid request");
        assert_eq!(
            request.lexical.and_then(|options| options.query),
            Some("title:raft".to_string())
        );
        assert_eq!(
            request.semantic.and_then(|options| options.query),
            Some("how does raft recover?".to_string())
        );
        assert!(request.semantic_consistency.is_none());
    }

    #[test]
    fn hybrid_request_maps_semantic_consistency_policy() {
        let mut input = input("hybrid");
        input.semantic_consistency = Some("bounded-stale".to_string());
        input.semantic_stale_behavior = Some("serve-last-good".to_string());
        input.max_semantic_revision_lag = Some(25);
        input.max_semantic_staleness_seconds = Some(120);

        let request = build_search_request(input).expect("hybrid request");
        let policy = request.semantic_consistency.expect("semantic policy");
        assert_eq!(
            policy.consistency,
            ProjectionConsistency::BoundedStale as i32
        );
        assert_eq!(
            policy.stale_behavior,
            StaleProjectionBehavior::ServeLastGood as i32
        );
        assert_eq!(policy.max_revision_lag, 25);
        assert_eq!(policy.max_staleness.expect("max staleness").seconds, 120);
    }

    #[test]
    fn semantic_consistency_policy_is_hybrid_only_and_validated() {
        let mut lexical = input("lexical");
        lexical.semantic_consistency = Some("best_effort".to_string());
        assert_eq!(
            build_search_request(lexical).unwrap_err(),
            "Semantic consistency options are only supported in hybrid search"
        );

        let mut missing_revision = input("hybrid");
        missing_revision.semantic_consistency = Some("read_your_writes".to_string());
        assert_eq!(
            build_search_request(missing_revision).unwrap_err(),
            "Read-your-writes semantic consistency requires a minimum graph revision"
        );

        let mut missing_bound = input("hybrid");
        missing_bound.semantic_consistency = Some("bounded_stale".to_string());
        assert_eq!(
            build_search_request(missing_bound).unwrap_err(),
            "Bounded-stale semantic consistency requires max revision lag or staleness"
        );
    }

    #[test]
    fn hybrid_request_requires_each_enabled_channel_query() {
        let mut missing_semantic = input("hybrid");
        missing_semantic.semantic_query = None;
        assert_eq!(
            build_search_request(missing_semantic).unwrap_err(),
            "Semantic query is required when semantic retrieval is enabled"
        );

        let mut semantic_only = input("hybrid");
        semantic_only.lexical_query.clear();
        semantic_only.lexical_weight = Some(0.0);
        assert!(build_search_request(semantic_only).is_ok());
    }
}
