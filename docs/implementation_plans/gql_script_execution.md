# GQL script execution

## Goal

Allow users to execute multiple GQL statements from one text input, separated by semicolons, so operators/developers can seed data, set up tests, and run repeatable diagnostics from the CLI, SDKs, and `mycel-admin` query editor.

Example:

```gql
INSERT (:Person {firstName: 'Alice'});
INSERT (:Person {firstName: 'Bob'});
MATCH (p:Person) RETURN p;
```

## Motivation

Single-statement GQL is useful for ad hoc reads/writes. Script execution adds:

- test fixture setup
- multi-node/edge seed data
- repeatable admin/debugging workflows
- one-shot smoke tests
- operator runbooks that can be copied into `mycel-admin`

This should be implemented in Mycel's GQL/parser/API layer, not only in `mycel-admin`, so all clients behave consistently.

## Current state

Current textual GQL support is planned/implemented around:

```proto
rpc ExecuteGQL(ExecuteGQLRequest) returns (ExecuteGQLResponse);
```

with one GQL statement in:

```proto
string query = 2;
```

Current Mycel GQL implementation lives in:

```text
internal/query/gql
```

and the CLI uses:

```go
plan, err := gql.Compile(queryText)
result, err := execution.Execute(ctx, graphWriter, plan)
```

## Design decision

Add explicit script support rather than requiring clients to split text themselves.

Do **not** use naive splitting like:

```js
script.split(";")
```

because semicolons can appear inside strings or future comments:

```gql
INSERT (:Note {text: 'hello; world'});
```

The GQL parser should own script parsing.

## API design

Add a new RPC to `mycel.client.v1.QueryService`:

```proto
rpc ExecuteGQLScript(ExecuteGQLScriptRequest) returns (ExecuteGQLScriptResponse);
```

Request:

```proto
message ExecuteGQLScriptRequest {
  string transaction_id = 1;
  string script = 2;

  // Reserved for parameterized GQL support.
  map<string, google.protobuf.Value> params = 3;

  // If true, stop executing after the first failed statement.
  bool stop_on_error = 4;

  // Maximum rows per statement result. Daemon may cap this.
  int32 page_size = 5;
}
```

Response:

```proto
message ExecuteGQLScriptResponse {
  repeated GQLStatementResult statements = 1;

  // Aggregate/summary result across successful statements.
  QueryResult result = 2;
}

message GQLStatementResult {
  int32 index = 1;
  string statement = 2;
  bool success = 3;
  QueryResult result = 4;
  string error = 5;
}
```

Reuse existing/shared:

```proto
QueryResult
ResultGraph
QueryCounters
QueryRow
QueryValue
```

## Transaction semantics

The RPC executes all statements inside the supplied transaction.

Recommended client helper behavior:

```text
one script execution = one transaction
```

### Read-only transaction

- read-only statements allowed
- write statements rejected
- transaction closed after execution by helper/client

### Read-write transaction

- read-only and write statements allowed
- helper/client commits if execution succeeds
- helper/client rolls back/closes on failure depending on transaction API semantics

### Atomicity

For `mycel-admin` and SDK helpers, default behavior should be:

```text
stop_on_error = true
atomic = true
```

Meaning:

- if all statements succeed: commit
- if any statement fails: rollback/close without commit

The daemon RPC itself should not commit; it only executes inside the transaction passed by the caller. Commit/rollback remains transaction API responsibility.

## Parser/compiler work

### Grammar

Extend the ANTLR grammar:

```text
internal/query/gql/antlr/MycelGQL.g4
```

Add script-level parsing:

```antlr
script
  : statement (';' statement)* ';'? EOF
  ;

statement
  : insertStatement
  | matchStatement
  ;
```

Keep existing single-statement `query` parsing for backward compatibility, or make it delegate to one-statement script parsing.

### Go API

Add to `internal/query/gql`:

```go
func ParseScript(script string) ([]ast.Statement, error)
func CompileScript(script string) ([]planning.Plan, error)
```

or:

```go
type ScriptPlan struct {
    Statements []StatementPlan
    AccessMode analysis.AccessMode
}

type StatementPlan struct {
    Index     int
    Statement string
    Plan      planning.Plan
}

func CompileScript(script string) (ScriptPlan, error)
```

Recommended: return statement text and index so API errors are useful.

### Validation

`CompileScript` should:

- reject empty script
- reject empty statements caused by `;;` unless intentionally allowed
- preserve statement indexes
- infer aggregate access mode:
  - read-only if all statements are read-only
  - read-write if any statement requires write

## Daemon implementation

Update:

```text
internal/daemon/api/client/query_service.go
```

Add:

```go
func (s *QueryService) ExecuteGQLScript(ctx context.Context, req *clientv1.ExecuteGQLScriptRequest) (*clientv1.ExecuteGQLScriptResponse, error)
```

Flow:

1. Validate non-empty script.
2. Reject non-empty params until parameters are implemented:
   ```text
   GQL parameters are reserved but not implemented yet
   ```
3. Authenticate principal.
4. Load transaction.
5. Ensure transaction is active.
6. Compile script.
7. If script requires write and transaction is not read-write, return `FailedPrecondition`.
8. For each statement:
   - execute plan using existing GQL executor
   - convert result to `QueryResult`
   - append `GQLStatementResult`
   - if error and `stop_on_error`, stop immediately
9. Return per-statement results and aggregate result.

### Error handling

If `stop_on_error = true`, response options:

Option A: return gRPC error immediately with statement index in message.

Option B: return successful gRPC response with failed `GQLStatementResult` and `success=false`.

Recommendation: **Option B** for script execution because it lets UI show partial statement results. Use gRPC error only for request-level failures like invalid transaction, invalid script syntax before statements are identified, or unauthenticated.

### Aggregate result

Aggregate should include:

- summed counters
- rows from the last successful statement that returned rows, or all rows if desired
- deduplicated graph across all statement results

Recommended initial behavior:

```text
aggregate.rows = rows from last successful statement with rows
aggregate.graph = deduped graph across all successful statement results
aggregate.counters = sum of counters across successful statements
```

## SDK work

### Go SDK

Regenerate protos.

Add low-level method:

```go
func (c *Client) ExecuteGQLScript(
    ctx context.Context,
    txID string,
    script string,
    params map[string]*structpb.Value,
    stopOnError bool,
    pageSize int32,
) (*clientv1.ExecuteGQLScriptResponse, error)
```

Add helpers:

```go
func (c *Client) QueryGQLScriptReadOnly(
    ctx context.Context,
    spaceID string,
    domainID string,
    script string,
    pageSize int32,
) (*clientv1.ExecuteGQLScriptResponse, error)

func (c *Client) QueryGQLScriptReadWrite(
    ctx context.Context,
    spaceID string,
    domainID string,
    script string,
    pageSize int32,
) (*clientv1.ExecuteGQLScriptResponse, error)
```

Read-write helper should commit only if response has no failed statement.

### Rust SDK

Regenerate protos.

Add low-level method:

```rust
pub async fn execute_gql_script(
    &mut self,
    transaction_id: impl Into<String>,
    script: impl Into<String>,
    params: Option<HashMap<String, prost_types::Value>>,
    stop_on_error: bool,
    page_size: i32,
) -> Result<ExecuteGqlScriptResponse>;
```

Add helpers:

```rust
pub async fn query_gql_script_read_only(
    &mut self,
    space_id: impl Into<String>,
    domain_id: impl Into<String>,
    script: impl Into<String>,
    page_size: i32,
) -> Result<ExecuteGqlScriptResponse>;

pub async fn query_gql_script_read_write(
    &mut self,
    space_id: impl Into<String>,
    domain_id: impl Into<String>,
    script: impl Into<String>,
    page_size: i32,
) -> Result<ExecuteGqlScriptResponse>;
```

## CLI work

Update:

```text
internal/cli/cmd/query.go
```

Options:

1. Keep `query gql QUERY` and let it accept scripts naturally.
2. Add explicit command:

```bash
mycel query gql-script --space-id ... --domain default --file seed.gql
```

Recommended CLI additions:

```bash
mycel query gql --file seed.gql --read-write --stop-on-error
```

or:

```bash
mycel query gql-script --file seed.gql --space-id ... --domain default
```

## mycel-admin work

Update Graph Query tab in:

```text
src/features/spaces/pages/SpaceDetailPage.tsx
```

### Editor UX

Support multi-statement editor:

```gql
INSERT (:Person {firstName: 'Alice'});
INSERT (:Person {firstName: 'Bob'});
MATCH (p:Person) RETURN p;
```

Controls:

```text
Mode: Read-only | Read-write
Execution: Single statement | Script
Stop on error: [x]
Confirm write queries before running: [x]
```

Default:

```text
Execution = Script if semicolon detected, otherwise Single statement
Stop on error = true
Confirm writes = localStorage preference
```

### Results UX

Add result tabs:

```text
Summary | Statements | Rows | Graph | Raw JSON
```

Statements table:

```text
#  Status  Statement                              Rows  Inserts  Error
1  ✓       INSERT (:Person {firstName:'Alice'})   0     1
2  ✓       INSERT (:Person {firstName:'Bob'})     0     1
3  ✓       MATCH (p:Person) RETURN p              2     0
```

Graph tab:

- render aggregate graph initially
- later allow clicking each statement to show/highlight its graph

## Tests

### Parser tests

- one statement no semicolon
- one statement trailing semicolon
- multiple statements
- semicolon inside string literal
- empty script
- invalid statement with index/position

### Daemon tests

- execute read-only script in read-only transaction
- reject write script in read-only transaction
- execute write script in read-write transaction
- stop on error returns prior successes and failed statement
- aggregate counters sum inserted nodes
- aggregate graph deduplicates nodes

### SDK tests

- low-level request payloads
- read-only helper closes transaction/session
- read-write helper commits on success
- read-write helper does not commit on failed statement

### mycel-admin tests

- semicolon script keeps editor editable
- script mode calls `executeGqlScript`
- write mode confirmation preference persists in localStorage
- statement results render success/failure rows

## Rollout phases

### Phase 1: Parser/compiler

- Add script grammar.
- Add `CompileScript`.
- Add unit tests.

### Phase 2: API/daemon

- Add `ExecuteGQLScript` proto.
- Implement daemon service.
- Regenerate daemon stubs.
- Add daemon tests.

### Phase 3: SDKs/CLI

- Regenerate SDK protos.
- Add Go/Rust helpers.
- Update CLI to accept file/script use cases.

### Phase 4: mycel-admin

- Add script mode and `executeGqlScript` Tauri command.
- Add statement result UI.
- Add aggregate graph/result view.

## Open questions

1. Should scripts support comments immediately?
2. Should `stop_on_error=false` continue after write failures in the same transaction, or are some failures transaction-fatal?
3. Should `ExecuteGQL` itself accept semicolon scripts, or should it reject multiple statements and point users to `ExecuteGQLScript`?
4. Should aggregate rows include only the last row-returning statement or all row-returning statements with statement labels?
5. Should read-write script helper support dry-run/explain mode before commit?
