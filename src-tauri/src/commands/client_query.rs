use mycel_sdk::proto::client::v1::{
    create_blob_node_request, BeginTransactionRequest, Blob, CloseSessionRequest,
    CloseTransactionRequest, CommitTransactionRequest, CreateBlobNodeMetadata,
    CreateBlobNodeRequest, CreateEdgeRequest, Edge, EdgeCreate, ExecuteGqlRequest,
    ExecuteGqlScriptRequest, ExecuteQueryRequest, GetNodeRequest, GraphPattern, GraphQuery, Node,
    NodePattern, OpenSessionRequest, PathValue, QueryResult, QueryRow, ReturnProjection,
    ReturnProjectionKind, TransactionMode,
};
use mycel_sdk::Config;
use prost_types::{value::Kind, ListValue, Struct, Value as ProstValue};
use serde_json::{json, Map, Value};
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
pub struct ExecuteGqlScriptInput {
    pub space_id: String,
    pub domain_id: String,
    pub script: String,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub stop_on_error: bool,
    #[serde(default)]
    pub read_write: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecuteGqlScriptResponseInfo {
    pub statements: Value,
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

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlobAttachmentInput {
    pub space_id: String,
    pub domain_id: String,
    pub parent_node_id: String,
    pub file_name: String,
    #[serde(default)]
    pub mime_type: String,
    pub content: Vec<u8>,
    #[serde(default)]
    pub labels: Vec<String>,
    #[serde(default)]
    pub properties: Map<String, Value>,
    #[serde(default)]
    pub meta: Map<String, Value>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBlobAttachmentResponseInfo {
    pub node: Value,
    pub blob: Value,
    pub edge: Value,
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
        client_name: "mycel-console-query-console".to_string(),
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

    let mut query_guard = state.client_query.write().await;
    if let Some(session) = query_guard.as_mut() {
        return execute_gql_with_client(&mut session._client, input).await;
    }
    drop(query_guard);

    let mut admin_guard = state.admin.write().await;
    let session = admin_guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    execute_gql_with_client(&mut session._data_client, input).await
}

async fn execute_gql_with_client(
    client: &mut mycel_sdk::Client,
    input: ExecuteGqlInput,
) -> Result<ExecuteGqlResponseInfo, String> {
    let graph_session = client
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
    let tx = client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: if input.read_write {
                TransactionMode::ReadWrite as i32
            } else {
                TransactionMode::ReadOnly as i32
            },
            operation_id: String::new(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;

    let response = client
        .query
        .execute_gql(tonic::Request::new(ExecuteGqlRequest {
            transaction_id: tx.transaction_id.clone(),
            query: input.query,
            params: Default::default(),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            read_options: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    if input.read_write {
        client
            .transaction
            .commit_transaction(tonic::Request::new(CommitTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await
            .map_err(|err| err.to_string())?;
    } else {
        let _ = client
            .transaction
            .close_transaction(tonic::Request::new(CloseTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await;
    }
    let _ = client
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
pub async fn admin_console_execute_gql_script(
    input: ExecuteGqlScriptInput,
    state: State<'_, AppState>,
) -> Result<ExecuteGqlScriptResponseInfo, String> {
    if input.space_id.trim().is_empty() || input.domain_id.trim().is_empty() {
        return Err("Space and domain are required".to_string());
    }
    if input.script.trim().is_empty() {
        return Err("Script is required".to_string());
    }

    let mut query_guard = state.client_query.write().await;
    if let Some(session) = query_guard.as_mut() {
        return execute_gql_script_with_client(&mut session._client, input).await;
    }
    drop(query_guard);

    let mut admin_guard = state.admin.write().await;
    let session = admin_guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    execute_gql_script_with_client(&mut session._data_client, input).await
}

async fn execute_gql_script_with_client(
    client: &mut mycel_sdk::Client,
    input: ExecuteGqlScriptInput,
) -> Result<ExecuteGqlScriptResponseInfo, String> {
    let graph_session = client
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
    let tx = client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: if input.read_write {
                TransactionMode::ReadWrite as i32
            } else {
                TransactionMode::ReadOnly as i32
            },
            operation_id: String::new(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;
    let response = client
        .query
        .execute_gql_script(tonic::Request::new(ExecuteGqlScriptRequest {
            transaction_id: tx.transaction_id.clone(),
            script: input.script,
            params: Default::default(),
            stop_on_error: input.stop_on_error,
            page_size: input.page_size.unwrap_or(100),
            read_options: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    if input.read_write
        && response
            .statements
            .iter()
            .all(|statement| statement.success)
    {
        client
            .transaction
            .commit_transaction(tonic::Request::new(CommitTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await
            .map_err(|err| err.to_string())?;
    } else {
        let _ = client
            .transaction
            .close_transaction(tonic::Request::new(CloseTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await;
    }
    let _ = client
        .session
        .close_session(tonic::Request::new(CloseSessionRequest {
            session_id: graph_session.session_id,
        }))
        .await;
    Ok(ExecuteGqlScriptResponseInfo {
        statements: Value::Array(
            response
                .statements
                .iter()
                .map(statement_result_json)
                .collect(),
        ),
        result: response
            .result
            .as_ref()
            .map(query_result_json)
            .unwrap_or(Value::Null),
    })
}

fn statement_result_json(statement: &mycel_sdk::proto::client::v1::GqlStatementResult) -> Value {
    json!({ "index": statement.index, "statement": statement.statement, "success": statement.success, "result": statement.result.as_ref().map(query_result_json).unwrap_or(Value::Null), "error": statement.error })
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

    let mut query_guard = state.client_query.write().await;
    if let Some(session) = query_guard.as_mut() {
        return execute_graph_query_with_client(&mut session._client, input, query).await;
    }
    drop(query_guard);

    let mut admin_guard = state.admin.write().await;
    let session = admin_guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    execute_graph_query_with_client(&mut session._data_client, input, query).await
}

#[tauri::command]
pub async fn admin_console_create_blob_attachment(
    input: CreateBlobAttachmentInput,
    state: State<'_, AppState>,
) -> Result<CreateBlobAttachmentResponseInfo, String> {
    if input.space_id.trim().is_empty()
        || input.domain_id.trim().is_empty()
        || input.parent_node_id.trim().is_empty()
    {
        return Err("Space, domain, and parent node are required".to_string());
    }
    if input.content.is_empty() {
        return Err("Attachment file content is required".to_string());
    }

    let mut query_guard = state.client_query.write().await;
    if let Some(session) = query_guard.as_mut() {
        return create_blob_attachment_with_client(&mut session._client, input).await;
    }
    drop(query_guard);

    let mut admin_guard = state.admin.write().await;
    let session = admin_guard
        .as_mut()
        .ok_or_else(|| "Not authenticated".to_string())?;
    create_blob_attachment_with_client(&mut session._data_client, input).await
}

async fn create_blob_attachment_with_client(
    client: &mut mycel_sdk::Client,
    input: CreateBlobAttachmentInput,
) -> Result<CreateBlobAttachmentResponseInfo, String> {
    let graph_session = client
        .session
        .open_session(tonic::Request::new(OpenSessionRequest {
            space_id: input.space_id.trim().to_string(),
            domain_id: input.domain_id.trim().to_string(),
            requested_idle_timeout: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .session
        .ok_or_else(|| "OpenSession returned no session".to_string())?;
    let tx = client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: TransactionMode::ReadWrite as i32,
            operation_id: String::new(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;

    let result = async {
        client
            .graph
            .get_node(tonic::Request::new(GetNodeRequest {
                transaction_id: tx.transaction_id.clone(),
                node_id: input.parent_node_id.trim().to_string(),
                read_options: None,
            }))
            .await
            .map_err(|err| err.to_string())?;

        let labels = attachment_labels(input.labels);
        let mut payload = Map::new();
        payload.insert(
            "attached_to_node_id".to_string(),
            json!(input.parent_node_id.trim()),
        );
        payload.insert("attachment_kind".to_string(), json!("file"));

        let stream = tokio_stream::iter(vec![
            CreateBlobNodeRequest {
                part: Some(create_blob_node_request::Part::Metadata(
                    CreateBlobNodeMetadata {
                        transaction_id: tx.transaction_id.clone(),
                        node_id: None,
                        declared_mime_type: input.mime_type.trim().to_string(),
                        original_filename: input.file_name.trim().to_string(),
                        labels,
                        properties: Some(struct_from_map(input.properties)),
                        payload: Some(struct_from_map(payload)),
                        meta: Some(struct_from_map(input.meta)),
                    },
                )),
            },
            CreateBlobNodeRequest {
                part: Some(create_blob_node_request::Part::Chunk(input.content)),
            },
        ]);
        let blob_response = client
            .graph
            .create_blob_node(tonic::Request::new(stream))
            .await
            .map_err(|err| err.to_string())?
            .into_inner();
        let node = blob_response
            .node
            .ok_or_else(|| "CreateBlobNode returned no node".to_string())?;
        let blob = blob_response
            .blob
            .ok_or_else(|| "CreateBlobNode returned no blob".to_string())?;
        let edge_response = client
            .graph
            .create_edge(tonic::Request::new(CreateEdgeRequest {
                transaction_id: tx.transaction_id.clone(),
                edge: Some(EdgeCreate {
                    edge_id: None,
                    from_node_id: input.parent_node_id.trim().to_string(),
                    to_node_id: node.node_id.clone(),
                    labels: vec!["contains".to_string(), "attachment".to_string()],
                    properties: Some(struct_from_map(Map::from_iter([
                        ("kind".to_string(), json!("blob_attachment")),
                        (
                            "original_filename".to_string(),
                            json!(blob.original_filename.clone()),
                        ),
                    ]))),
                    payload: None,
                    meta: None,
                }),
            }))
            .await
            .map_err(|err| err.to_string())?
            .into_inner()
            .edge
            .ok_or_else(|| "CreateEdge returned no edge".to_string())?;

        client
            .transaction
            .commit_transaction(tonic::Request::new(CommitTransactionRequest {
                transaction_id: tx.transaction_id.clone(),
            }))
            .await
            .map_err(|err| err.to_string())?;

        Ok(CreateBlobAttachmentResponseInfo {
            node: node_json(&node),
            blob: blob_json(&blob),
            edge: edge_json(&edge_response),
        })
    }
    .await;

    if result.is_err() {
        let _ = client
            .transaction
            .close_transaction(tonic::Request::new(CloseTransactionRequest {
                transaction_id: tx.transaction_id,
            }))
            .await;
    }
    let _ = client
        .session
        .close_session(tonic::Request::new(CloseSessionRequest {
            session_id: graph_session.session_id,
        }))
        .await;

    result
}

async fn execute_graph_query_with_client(
    client: &mut mycel_sdk::Client,
    input: ExecuteGraphQueryInput,
    query: GraphQuery,
) -> Result<ExecuteGraphQueryResponseInfo, String> {
    let graph_session = client
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
    let tx = client
        .transaction
        .begin_transaction(tonic::Request::new(BeginTransactionRequest {
            session_id: graph_session.session_id.clone(),
            mode: TransactionMode::ReadOnly as i32,
            operation_id: String::new(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner()
        .transaction
        .ok_or_else(|| "BeginTransaction returned no transaction".to_string())?;

    let result = client
        .query
        .execute_query(tonic::Request::new(ExecuteQueryRequest {
            transaction_id: tx.transaction_id.clone(),
            query: Some(query),
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            read_options: None,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let _ = client
        .transaction
        .close_transaction(tonic::Request::new(CloseTransactionRequest {
            transaction_id: tx.transaction_id,
        }))
        .await;
    let _ = client
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
            "edges": result.graph.as_ref().map(|graph| graph.edges.iter().map(edge_json).collect::<Vec<_>>()).unwrap_or_default(),
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
            Some(mycel_sdk::proto::client::v1::query_value::Value::Edge(edge)) => {
                fields.insert(name.clone(), json!({ "edge": edge_json(edge) }));
            }
            Some(mycel_sdk::proto::client::v1::query_value::Value::Path(path)) => {
                fields.insert(name.clone(), json!({ "path": path_json(path) }));
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

fn path_json(path: &PathValue) -> Value {
    json!({
        "nodes": path.nodes.iter().map(node_json).collect::<Vec<_>>(),
        "edges": path.edges.iter().map(edge_json).collect::<Vec<_>>(),
    })
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

fn edge_json(edge: &Edge) -> Value {
    json!({
        "edgeId": edge.edge_id,
        "domainId": edge.domain_id,
        "fromNodeId": edge.from_node_id,
        "toNodeId": edge.to_node_id,
        "labels": edge.labels,
        "properties": edge.properties.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "payload": edge.payload.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
        "meta": edge.meta.as_ref().map(struct_json).unwrap_or_else(|| json!({})),
    })
}

fn blob_json(blob: &Blob) -> Value {
    json!({
        "blobId": blob.blob_id,
        "spaceId": blob.space_id,
        "domainId": blob.domain_id,
        "digest": blob.digest,
        "sizeBytes": blob.size_bytes,
        "mimeType": blob.mime_type,
        "declaredMimeType": blob.declared_mime_type,
        "originalFilename": blob.original_filename,
        "createTime": blob.create_time.as_ref().map(|timestamp| timestamp.seconds.to_string()).unwrap_or_default(),
    })
}

fn attachment_labels(labels: Vec<String>) -> Vec<String> {
    let mut output: Vec<String> = labels
        .into_iter()
        .map(|label| label.trim().to_string())
        .filter(|label| !label.is_empty())
        .collect();
    if !output.iter().any(|label| label == "blob") {
        output.push("blob".to_string());
    }
    if !output.iter().any(|label| label == "attachment") {
        output.push("attachment".to_string());
    }
    output
}

fn struct_from_map(map: Map<String, Value>) -> Struct {
    Struct {
        fields: map
            .into_iter()
            .map(|(key, value)| (key, prost_value(value)))
            .collect(),
    }
}

fn prost_value(value: Value) -> ProstValue {
    let kind = match value {
        Value::Null => Kind::NullValue(0),
        Value::Bool(value) => Kind::BoolValue(value),
        Value::Number(value) => Kind::NumberValue(value.as_f64().unwrap_or(0.0)),
        Value::String(value) => Kind::StringValue(value),
        Value::Array(values) => Kind::ListValue(ListValue {
            values: values.into_iter().map(prost_value).collect(),
        }),
        Value::Object(map) => Kind::StructValue(struct_from_map(map)),
    };
    ProstValue { kind: Some(kind) }
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
                labels: vec![],
                node_ids: vec![],
            }),
            steps: vec![],
        }),
        r#where: None,
        returns,
        order_by: vec![],
        limit,
        max_nodes: 0,
        max_edges: 0,
        path_alias: value
            .get("pathAlias")
            .or_else(|| value.get("path_alias"))
            .and_then(Value::as_str)
            .unwrap_or_default()
            .to_string(),
        aggregate_returns: vec![],
        distinct: value
            .get("distinct")
            .and_then(Value::as_bool)
            .unwrap_or(false),
        offset: value.get("offset").and_then(Value::as_i64).unwrap_or(0) as i32,
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
