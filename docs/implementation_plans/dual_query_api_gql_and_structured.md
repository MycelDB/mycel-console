# Dual query API: structured GraphQuery and textual GQL

## Goal

Support two first-class query entry points for Mycel graph data:

1. **Programmatic structured queries** using the existing protobuf `GraphQuery` API.
2. **Textual GQL queries** using the existing Mycel GQL parser/compiler/executor pipeline.

This gives SDK users a typed API for generated/programmatic queries while giving humans, CLIs, notebooks, and `mycel-admin` a natural text query interface.

## Current state

### Existing public gRPC API

`mycel.client.v1.QueryService.ExecuteQuery` exists in:

```text
api/proto/mycel/client/v1/query.proto
```

Current shape:

```proto
rpc ExecuteQuery(ExecuteQueryRequest) returns (ExecuteQueryResponse);

message ExecuteQueryRequest {
  string transaction_id = 1;
  GraphQuery query = 2;
  int32 page_size = 3;
  string page_token = 4;
}
```

This is the structured/programmatic query API.

### Existing textual GQL implementation

The daemon repository already has a GQL parser/compiler/execution path:

```text
internal/query/gql
```

The CLI uses it in:

```text
internal/cli/cmd/query.go
```

Example flow:

```go
plan, err := gql.Compile(queryText)
result, err := execution.Execute(ctx, graphWriter, plan)
```

However, this textual GQL capability is not currently exposed as a public gRPC API.

## API design

### Keep structured API

Retain and continue supporting:

```proto
rpc ExecuteQuery(ExecuteQueryRequest) returns (ExecuteQueryResponse);
```

This remains the recommended API for SDKs and application code that builds queries programmatically.

### Add textual GQL API

Add a sibling method to `QueryService`:

```proto
rpc ExecuteGQL(ExecuteGQLRequest) returns (ExecuteGQLResponse);
```

Proposed request:

```proto
message ExecuteGQLRequest {
  string transaction_id = 1;
  string query = 2;

  // Optional named parameters for future parameterized GQL support.
  map<string, google.protobuf.Value> params = 3;

  int32 page_size = 4;
  string page_token = 5;
}
```

Proposed response:

```proto
message ExecuteGQLResponse {
  QueryResult result = 1;
}
```

### Shared result model

Introduce a shared result envelope used by both structured and textual query APIs:

```proto
message QueryResult {
  repeated QueryRow rows = 1;
  ResultGraph graph = 2;
  QueryCounters counters = 3;
  string next_page_token = 4;
}

message ResultGraph {
  repeated Node nodes = 1;
  repeated Edge edges = 2;
}

message QueryCounters {
  int32 rows_returned = 1;
  int32 nodes_inserted = 2;
  int32 nodes_updated = 3;
  int32 nodes_deleted = 4;
  int32 edges_inserted = 5;
  int32 edges_deleted = 6;
}
```

`ExecuteQueryResponse` can be evolved to include the same envelope:

```proto
message ExecuteQueryResponse {
  repeated QueryRow rows = 1;
  string next_page_token = 2;

  // New normalized result envelope. Existing fields can remain during transition.
  QueryResult result = 3;
}
```

If backward compatibility is not required, simplify to:

```proto
message ExecuteQueryResponse {
  QueryResult result = 1;
}
```

## Result semantics

GQL naturally returns rows/bindings:

```gql
MATCH (p:Person)-[:KNOWS]->(f:Person)
RETURN p, f
```

But Mycel should also expose graph-shaped result data for visualization/debugging. Therefore responses should include both:

- `rows`: exact return bindings
- `graph`: deduplicated nodes/edges observed in result values
- `counters`: mutation/read counters and diagnostics

## Daemon implementation tasks

### 1. Proto changes

Modify:

```text
api/proto/mycel/client/v1/query.proto
```

Add:

- `ExecuteGQL`
- `ExecuteGQLRequest`
- `ExecuteGQLResponse`
- shared `QueryResult`
- `ResultGraph`
- `QueryCounters`

Regenerate protobufs for all languages/repos.

### 2. Query service implementation

In the daemon QueryService implementation:

- Add `ExecuteGQL(ctx, req)`.
- Validate:
  - transaction exists
  - transaction is active
  - query text is non-empty
  - access mode required by GQL plan is compatible with transaction mode
- Compile text query:

```go
plan, err := gql.Compile(req.Query)
```

- Execute with existing GQL executor:

```go
result, err := execution.Execute(ctx, graphWriter, plan)
```

- Convert GQL execution result to `QueryResult`.
- Fill both row bindings and response-level graph where possible.

### 3. Structured API result unification

Update existing `ExecuteQuery` implementation to populate `QueryResult` too.

This lets clients consume one result shape whether queries came from text or structured protobuf.

### 4. Tests

Add daemon tests for:

- `ExecuteGQL` read-only `MATCH ... RETURN`
- invalid syntax returns clear error
- unknown alias/invalid semantic query returns clear error
- read-write GQL rejected inside read-only transaction if mutation query is used
- insert/mutation GQL works inside read-write transaction if intended
- rows and graph are both populated for node-returning queries
- result graph deduplicates repeated nodes/edges

## Go SDK work

Update generated protos.

Add convenience methods:

```go
func (c *Client) ExecuteQuery(ctx context.Context, txID string, query *clientv1.GraphQuery, pageSize int32) (*clientv1.QueryResult, error)
func (c *Client) ExecuteGQL(ctx context.Context, txID string, query string, params map[string]any, pageSize int32) (*clientv1.QueryResult, error)
```

Optional helper:

```go
func (c *Client) QueryGQLReadOnly(ctx context.Context, spaceID, domainID, query string, pageSize int32) (*clientv1.QueryResult, error)
```

This helper would:

1. open session
2. begin read-only transaction
3. execute GQL
4. close transaction/session

## Rust SDK work

Update generated protos in `mycel-rust-sdk`.

Add methods to `mycel-sdk` client layer:

```rust
pub async fn execute_query(
    &mut self,
    transaction_id: impl Into<String>,
    query: GraphQuery,
    page_size: i32,
) -> Result<QueryResult>;

pub async fn execute_gql(
    &mut self,
    transaction_id: impl Into<String>,
    query: impl Into<String>,
    params: Option<HashMap<String, prost_types::Value>>,
    page_size: i32,
) -> Result<QueryResult>;
```

Optional read-only helper:

```rust
pub async fn query_gql_read_only(
    &mut self,
    space_id: impl Into<String>,
    domain_id: impl Into<String>,
    query: impl Into<String>,
    page_size: i32,
) -> Result<QueryResult>;
```

## mycel-admin work

### 1. Replace JSON-first query editor with GQL-first editor

In `/spaces/:spaceId`, update **Graph query** tab:

Default editor content:

```gql
MATCH (n) RETURN n LIMIT 25
```

UI modes:

```text
Mode: GQL text | Structured GraphQuery JSON
```

Default mode: `GQL text`.

### 2. Update Tauri commands

Current branch added provisional structured execution commands. Replace/augment with:

```text
admin_console_client_query_login
admin_console_client_query_logout
admin_console_execute_gql
admin_console_execute_graph_query
```

`admin_console_execute_gql` should:

1. require connected client identity
2. open graph session for `spaceId + domainId`
3. begin transaction
   - read-only by default
   - optionally read-write if mutations are enabled and confirmed
4. call Rust SDK `execute_gql`
5. close/commit/rollback transaction as appropriate
6. close graph session
7. return `QueryResult`

### 3. UI result views

Show query result in three tabs:

```text
Rows | Graph | Raw JSON
```

- `Rows`: table of returned bindings
- `Graph`: node/edge visualization placeholder initially, then real graph view
- `Raw JSON`: full diagnostic payload

### 4. Safety UX

- Default to read-only mode.
- If query appears to mutate (`INSERT`, `UPDATE`, `DELETE`, etc.), require read-write mode and confirmation.
- Show target identity, space, and domain prominently.
- Add copy diagnostic report.

## Documentation updates

Update docs/examples in each repo:

- `mycel-api`: document proto API
- `mycel`: daemon and CLI examples
- `mycel-go-sdk`: GQL examples
- `mycel-rust-sdk`: GQL examples
- `mycel-admin`: operator query console usage

## Phased rollout

### Phase 1: API + daemon

- Add `ExecuteGQL` proto.
- Implement daemon method using existing GQL compiler/executor.
- Add tests.

### Phase 2: SDKs

- Regenerate protos.
- Add Go SDK methods.
- Add Rust SDK methods.
- Add examples and tests.

### Phase 3: mycel-admin

- Convert graph query tab to GQL-first.
- Add `admin_console_execute_gql` command.
- Display rows/raw JSON.
- Keep structured JSON mode as advanced option.

### Phase 4: graph visualization

- Add response-level graph rendering.
- Highlight returned bindings on graph.
- Add copy/export diagnostics.

## Open questions

1. Should `ExecuteGQL` allow mutations, or should GQL mutations have a separate endpoint?
2. Should transaction mode be inferred from compiled plan, or strictly controlled by caller?
3. Should textual GQL support named parameters immediately, or reserve `params` for later?
4. Should `ResultGraph` include edges immediately, or start with nodes only if current executor does not return edges?
5. Is backward compatibility required for `ExecuteQueryResponse`, or can it switch entirely to `QueryResult`?
