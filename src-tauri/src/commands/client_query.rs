use mycel_sdk::proto::client::v1::{
    BeginTransactionRequest, CloseSessionRequest, CloseTransactionRequest,
    CommitTransactionRequest, ExecuteGqlRequest, ExecuteQueryRequest, GraphPattern, GraphQuery,
    Node, NodePattern, OpenSessionRequest, QueryResult, QueryRow, ReturnProjection,
    ReturnProjectionKind, TransactionMode,
};
use mycel_sdk::Config;
use serde_json::{json, Value};
use tauri::State;

use crate::state::{AppState, ClientQuerySession};

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientQueryLoginInput {
    pub addr: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClientQuerySessionInfo {
    pub addr: String,
    pub username: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGqlInput {
    pub space_id: String,
    pub domain_id: String,
    pub query: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
    #[serde(default)]
    pub read_write: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGqlResponseInfo {
    pub result: Value,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGraphQueryInput {
    pub space_id: String,
    pub domain_id: String,
    pub query_json: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGraphQueryResponseInfo {
    pub rows: Value,
    pub next_page_token: String,
}

#[tauri::command]
pub async fn admin_console_client_query_login(
    input: ClientQueryLoginInput,
    state: State<'_, AppState>,
) -> Result<ClientQuerySessionInfo, String> {
    let addr = input.addr.trim().to_string();
    let username = input.username.trim().to_string();
    if addr.is_empty() || username.is_empty() || input.password.is_empty() {
        return Err("Address, username, and password are required".to_string());
    }
    let cfg = Config {
        addr: addr.clone(),
        username: username.clone(),
        password: input.password,
        client_name: "mycel-admin-query-console".to_string(),
        ..Config::default()
    };
    let client = mycel_sdk::dial(cfg).await.map_err(|err| err.to_string())?;
    let mut guard = state.client_query.write().await;
    *guard = Some(ClientQuerySession { _client: client });
    Ok(ClientQuerySessionInfo { addr, username })
}

#[tauri::command]
pub async fn admin_console_client_query_logout(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.client_query.write().await;
    if let Some(session) = guard.as_mut() {
        let _ = session._client.logout(None).await;
    }
    *guard = None;
    Ok(())
}

#[tauri::command]
pub async fn admin_console_execute_gql(
    input: ExecuteGqlInput,
    state: State<'_, AppState>,
) -> Result<ExecuteGqlResponseInfo, String> {
    if input.space_id.trim().is_empty() || input.domain_id.trim().is_empty() {
        return Err("Space and domain are required".to_string());
    }
    if input.query.trim().is_empty() {
        return Err("Query is required".to_string());
    }
    let mut guard = state.client_query.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Client query identity is not connected".to_string())?;

    let graph_session = session
        ._client
        .session
        .open_session(tonic::Request::new(OpenSessionRequest {
            space_id: input.space_id,
            domain_id: input.domain_id,
            requested_idle_timeout: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .session
        .ok_or_else(|| "OpenSession returned no session".to_string())?;
    let tx = session
        ._client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: if input.read_write {
                TransactionMode::ReadWrite as i32
            } else {
                TransactionMode::ReadOnly as i32
            },
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;

    let response = session
        ._client
        .query
        .execute_gql(tonic::Request::new(ExecuteGqlRequest {
            transaction_id: tx.transaction_id.clone(),
            query: input.query,
            params: Default::default(),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    if input.read_write {
        session
            ._client
            .transaction
            .commit_transaction(tonic::Request::new(CommitTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await
            .map_err(|err| err.to_string())?;
    } else {
        let _ = session
            ._client
            .transaction
            .close_transaction(tonic::Request::new(CloseTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await;
    }
    let _ = session
        ._client
        .session
        .close_session(tonic::Request::new(CloseSessionRequest {
            session_id: graph_session.session_id,
        }))
        .await;

    Ok(ExecuteGqlResponseInfo {
        result: response
            .result
            .as_ref()
            .map(query_result_json)
            .unwrap_or(Value::Null),
    })
}

#[tauri::command]
pub async fn admin_console_execute_graph_query(
    input: ExecuteGraphQueryInput,
    state: State<'_, AppState>,
) -> Result<ExecuteGraphQueryResponseInfo, String> {
    if input.space_id.trim().is_empty() || input.domain_id.trim().is_empty() {
        return Err("Space and domain are required".to_string());
    }
    let query = parse_graph_query(&input.query_json)?;
    let mut guard = state.client_query.write().await;
    let session = guard
        .as_mut()
        .ok_or_else(|| "Client query identity is not connected".to_string())?;

    let graph_session = session
        ._client
        .session
        .open_session(tonic::Request::new(OpenSessionRequest {
            space_id: input.space_id,
            domain_id: input.domain_id,
            requested_idle_timeout: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .session
        .ok_or_else(|| "OpenSession returned no session".to_string())?;
    let tx = session
        ._client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: TransactionMode::ReadOnly as i32,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;

    let result = session
        ._client
        .query
        .execute_query(tonic::Request::new(ExecuteQueryRequest {
            transaction_id: tx.transaction_id.clone(),
            query: Some(query),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let _ = session
        ._client
        .transaction
        .close_transaction(tonic::Request::new(CloseTransactionRequest {
            transaction_id: tx.transaction_id,
        }))
        .await;
    let _ = session
        ._client
        .session
        .close_session(tonic::Request::new(CloseSessionRequest {
            session_id: graph_session.session_id,
        }))
        .await;

    Ok(ExecuteGraphQueryResponseInfo {
        rows: Value::String(format!("{:#?}", result.rows)),
        next_page_token: result.next_page_token,
    })
}

fn query_result_json(result: &QueryResult) -> Value {
    json!({
        "rows": result.rows.iter().map(query_row_json).collect::<Vec<_>>(),
        "graph": {
            "nodes": result.graph.as_ref().map(|graph| graph.nodes.iter().map(node_json).collect::<Vec<_>>()).unwrap_or_default(),
            "edges": [],
        },
        "counters": result.counters.as_ref().map(|counters| json!({
            "rowsReturned": counters.rows_returned,
            "nodesInserted": counters.nodes_inserted,
            "nodesUpdated": counters.nodes_updated,
            "nodesDeleted": counters.nodes_deleted,
            "edgesInserted": counters.edges_inserted,
            "edgesDeleted": counters.edges_deleted,
        })).unwrap_or(Value::Null),
        "nextPageToken": result.next_page_token,
    })
}

fn query_row_json(row: &QueryRow) -> Value {
    let mut fields = serde_json::Map::new();
    for (name, value) in &row.fields {
        match &value.value {
            Some(mycel_sdk::proto::client::v1::query_value::Value::Node(node)) => {
                fields.insert(name.clone(), json!({ "node": node_json(node) }));
            }
            Some(mycel_sdk::proto::client::v1::query_value::Value::Scalar(value)) => {
                fields.insert(name.clone(), json!({ "scalar": prost_value_json(value) }));
            }
            Some(mycel_sdk::proto::client::v1::query_value::Value::Tree(tree)) => {
                fields.insert(name.clone(), json!({ "tree": format!("{tree:?}") }));
            }
            None => {
                fields.insert(name.clone(), Value::Null);
            }
        }
    }
    Value::Object(fields)
}

fn node_json(node: &Node) -> Value {
    json!({
        "nodeId": node.node_id,
        "domainId": node.domain_id,
        "labels": node.labels,
        "properties": node.properties.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "payload": node.payload.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "meta": node.meta.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
    })
}

fn struct_json(value: &prost_types::Struct) -> Value {
    Value::Object(
        value
            .fields
            .iter()
            .map(|(key, value)| (key.clone(), prost_value_json(value)))
            .collect(),
    )
}

fn prost_value_json(value: &prost_types::Value) -> Value {
    match &value.kind {
        Some(prost_types::value::Kind::NullValue(_)) | None => Value::Null,
        Some(prost_types::value::Kind::NumberValue(number)) => json!(number),
        Some(prost_types::value::Kind::StringValue(text)) => json!(text),
        Some(prost_types::value::Kind::BoolValue(value)) => json!(value),
        Some(prost_types::value::Kind::StructValue(value)) => struct_json(value),
        Some(prost_types::value::Kind::ListValue(value)) => {
            Value::Array(value.values.iter().map(prost_value_json).collect())
        }
    }
}

fn parse_graph_query(raw: &str) -> Result<GraphQuery, String> {
    let value: Value =
        serde_json::from_str(raw).map_err(|err| format!("Invalid query JSON: {err}"))?;
    let start_alias = value
        .pointer("/match/start/alias")
        .and_then(Value::as_str)
        .unwrap_or("n")
        .to_string();
    let limit = value.get("limit").and_then(Value::as_i64).unwrap_or(25) as i32;
    let returns = value
        .get("returns")
        .and_then(Value::as_array)
        .map(|items| items.iter().map(parse_return_projection).collect())
        .unwrap_or_else(|| {
            vec![ReturnProjection {
                alias: start_alias.clone(),
                output_name: "node".to_string(),
                kind: ReturnProjectionKind::Node as i32,
            }]
        });
    Ok(GraphQuery {
        r#match: Some(GraphPattern {
            start: Some(NodePattern {
                alias: start_alias,
                template_key: None,
                labels: vec![],
            }),
            steps: vec![],
        }),
        r#where: None,
        returns,
        order_by: vec![],
        limit,
    })
}

fn parse_return_projection(value: &Value) -> ReturnProjection {
    let alias = value
        .get("alias")
        .and_then(Value::as_str)
        .unwrap_or("n")
        .to_string();
    let output_name = value
        .get("outputName")
        .or_else(|| value.get("output_name"))
        .and_then(Value::as_str)
        .unwrap_or("node")
        .to_string();
    ReturnProjection {
        alias,
        output_name,
        kind: ReturnProjectionKind::Node as i32,
    }
}
