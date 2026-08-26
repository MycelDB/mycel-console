use mycel_sdk::proto::admin::v1::{
    ActivityEvent, GetActivityEventRequest, ListActivityEventsRequest,
};
use prost_types::Timestamp;
use tauri::State;
use tonic::Request;

use crate::state::AppState;

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListActivityEventsInput {
    pub page_size: Option<i32>,
    pub page_token: Option<String>,
    pub since_seconds: Option<i64>,
    pub until_seconds: Option<i64>,
    pub severities: Option<Vec<String>>,
    pub categories: Option<Vec<String>>,
    pub types: Option<Vec<String>>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActivityEventInfo {
    pub event_id: String,
    pub occurred_at: String,
    pub ingested_at: String,
    pub severity: String,
    pub category: String,
    pub event_type: String,
    pub message: String,
    pub source: String,
    pub actor: String,
    pub resource: String,
    pub correlation_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListActivityEventsResponseInfo {
    pub events: Vec<ActivityEventInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetActivityEventInput {
    pub event_id: String,
}

#[tauri::command]
pub async fn admin_get_activity_event(
    input: GetActivityEventInput,
    state: State<'_, AppState>,
) -> Result<ActivityEventInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .activity
        .get_activity_event(Request::new(GetActivityEventRequest {
            event_id: input.event_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    response
        .event
        .map(map_event)
        .ok_or_else(|| "Activity event not found".to_string())
}

#[tauri::command]
pub async fn admin_list_activity_events(
    input: ListActivityEventsInput,
    state: State<'_, AppState>,
) -> Result<ListActivityEventsResponseInfo, String> {
    let mut guard = state.admin.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    let response = session
        ._client
        .activity
        .list_activity_events(Request::new(ListActivityEventsRequest {
            since: timestamp_from_seconds(input.since_seconds),
            until: timestamp_from_seconds(input.until_seconds),
            severities: input.severities.unwrap_or_default(),
            categories: input.categories.unwrap_or_default(),
            types: input.types.unwrap_or_default(),
            source_node_id: String::new(),
            source_pod_name: String::new(),
            source_component: String::new(),
            source_service: String::new(),
            actor_principal_id: String::new(),
            resource_kind: String::new(),
            resource_id: String::new(),
            correlation_id: String::new(),
            page_size: input.page_size.unwrap_or(50),
            page_token: input.page_token.unwrap_or_default(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListActivityEventsResponseInfo {
        events: response.events.into_iter().map(map_event).collect(),
        next_page_token: response.next_page_token,
    })
}

fn timestamp_from_seconds(seconds: Option<i64>) -> Option<Timestamp> {
    seconds.map(|seconds| Timestamp { seconds, nanos: 0 })
}

fn map_event(event: ActivityEvent) -> ActivityEventInfo {
    ActivityEventInfo {
        event_id: event.event_id,
        occurred_at: format_ts(event.occurred_at),
        ingested_at: format_ts(event.ingested_at),
        severity: event.severity,
        category: event.category,
        event_type: event.r#type,
        message: event.message,
        source: event
            .source
            .map(|s| {
                first_non_empty(vec![
                    s.service,
                    s.component,
                    s.node_name,
                    s.node_id,
                    s.pod_name,
                ])
            })
            .unwrap_or_default(),
        actor: event
            .actor
            .map(|a| first_non_empty(vec![a.username, a.principal_id]))
            .unwrap_or_default(),
        resource: event
            .resource
            .map(|r| first_non_empty(vec![r.name, r.id, r.kind]))
            .unwrap_or_default(),
        correlation_id: event.correlation_id,
    }
}

fn first_non_empty(values: Vec<String>) -> String {
    values
        .into_iter()
        .find(|value| !value.trim().is_empty())
        .unwrap_or_default()
}

fn format_ts(ts: Option<prost_types::Timestamp>) -> String {
    ts.map(|value| {
        if value.nanos == 0 {
            format!("{}", value.seconds)
        } else {
            format!("{}.{:09}", value.seconds, value.nanos)
        }
    })
    .unwrap_or_default()
}
