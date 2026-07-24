# Space-scoped GQL / graph query console wireframes

Branch: `gkl`

## Design premise

`mycel-admin` can support more than strict Admin API browsing by adding an operator debugging console for space-scoped graph queries. Current Mycel APIs expose a client-scoped structured `QueryService.ExecuteQuery` rather than an Admin GraphQL endpoint, so the console should keep two identities distinct:

- **Operator identity**: admin session used for administration.
- **Client query identity**: user/session context used to execute graph queries in a selected space/domain.

Until an Admin query endpoint exists, the console should not silently run graph queries using the operator token.

## Wireframe: Space detail with query console section

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Back to spaces                                                             │
│ SPACE DETAIL                                                                 │
│ Main Space                                           [Active]                 │
│ Inspect this space's properties and diagnostics.                             │
├──────────────────────────────────────────────────────────────────────────────┤
│ Identity / Ownership / Timestamps / Caller access                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Semantic maintenance                                                         │
│ [Analyze dirty work] [Process work]       Work status [Any ▾]                │
│ Pending 2 | Running 1 | Retryable failed 1 | Permanent failed 0              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Semantic indexes                                                             │
│ Key        Domain       State       Model              Vector store  Action   │
│ notes      default      Active      text-embedding...  mycel-file    Backfill │
├──────────────────────────────────────────────────────────────────────────────┤
│ Graph query console                                                          │
│ Client identity: Not connected                                               │
│ [Connect client session]                                                     │
│                                                                              │
│ Target                                                                       │
│ Space: sp_main                                                               │
│ Domain: [default ▾]                                                          │
│ Mode:   [Read-only ▾]                                                        │
│                                                                              │
│ Query format                                                                 │
│ (•) Structured GraphQuery JSON   ( ) Future GraphQL/GQL text                 │
│                                                                              │
│ Query                                                                        │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ {                                                                        │ │
│ │   "match": { "start": { "alias": "n" } },                            │ │
│ │   "returns": [{ "alias": "n", "outputName": "node", "kind": ... }] │ │
│ │ }                                                                        │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ Page size [100]                       [Run query] [Copy diagnostics]         │
│                                                                              │
│ Results                                                                      │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ No query run yet.                                                        │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Wireframe: Connect client session dialog

```text
┌────────────────────────────────────────────┐
│ Connect client query identity              │
│                                            │
│ Graph/query APIs are user-scoped. Connect  │
│ a client identity to execute read-only     │
│ queries against this space.                │
│                                            │
│ Cluster address                            │
│ [127.0.0.1:19091                         ]│
│ Username                                   │
│ [alice                                   ]│
│ Password                                   │
│ [••••••••                                ]│
│                                            │
│ [Cancel]                    [Connect]      │
└────────────────────────────────────────────┘
```

## Wireframe: Connected query console

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Graph query console                                                          │
│ Client identity: alice                                  [Disconnect]          │
│ Target: sp_main / default                                                    │
│                                                                              │
│ Query editor                                                                 │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ { "match": ..., "returns": ..., "limit": 25 }                         │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ [Run read-only query] [Load next page] [Copy result] [Copy diagnostic report] │
│                                                                              │
│ Result summary: 25 rows, next page available                                 │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ [{ "node": { "nodeId": "...", "labels": [...] } }]                   │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Implementation phases

1. UI shell on `/spaces/:spaceId`: query editor, target selector, result panel, client identity status.
2. Tauri client-session state separate from admin state.
3. Client login/logout commands.
4. Read-only transaction lifecycle: begin transaction for selected space/domain, execute structured query JSON, close transaction.
5. Optional future GraphQL/GQL adapter if Mycel adds a textual GraphQL endpoint or parser.
