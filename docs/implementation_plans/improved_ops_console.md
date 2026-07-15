# Improved Operations Console

## Goal

Evolve `mycel-admin` from a resource browser into an operator-focused debugging and incident response console.

The app should help a responsible DevOps/operator answer:

- Is the cluster healthy?
- What changed recently?
- Why is a user-reported workflow failing?
- What resources are involved?
- What action is safe to take?
- How can I capture/share a diagnostic report?

## Operator principles

1. **Prefer diagnosis before mutation**
   - Every action should be preceded by enough context to understand impact.

2. **Make unsafe actions explicit**
   - Destructive/disruptive actions need confirmation and impact summaries.

3. **Show relationships, not just rows**
   - Operators debug linked systems. IDs should be resolved to labels where possible.

4. **Preserve evidence**
   - Diagnostic pages should have copy/export report actions.

5. **Separate local app settings from cluster resources**
   - Settings configure the admin console; feature pages manage cluster resources.

---

## Workstream 1: Connection diagnostics and better errors

### Problem

Errors like `transport error: transport error` are not actionable.

### Features

Add a connection diagnostics panel available from login and settings.

Checks:

- input address normalized
- TCP reachable
- gRPC connection attempt
- operator login attempt
- `whoami` attempt
- selected TLS/plaintext mode
- currently authenticated session summary

### UI

```text
Connection diagnostics
Address: 127.0.0.1:19091
TCP reachable: yes
gRPC connect: pass
Authentication: pass
Operator: admin

[Retry] [Copy diagnostics]
```

### Implementation notes

Initial version can run diagnostics through Tauri commands:

- `admin_test_tcp_connection(addr)`
- `admin_test_login(input)` or reuse login with dry-run behavior
- `admin_whoami`

Later improve Rust SDK error mapping so UI can distinguish:

- invalid endpoint
- TCP refused
- timeout
- TLS mismatch
- unauthenticated
- permission denied

### Acceptance

- Login failures show a structured diagnostic card.
- Operator can copy a diagnostic report.

---

## Workstream 2: User detail page with sessions

### Problem

User reported issues often start with account/session state, but current UI only has a user table.

### Features

Add:

```text
/users/:userId
```

Sections:

1. Identity
   - user ID
   - username
   - state
   - created
   - updated

2. Sessions
   - auth session ID
   - state
   - created
   - last seen
   - expires
   - client name/version/platform/device
   - include inactive toggle

3. Actions
   - enable/disable
   - set password
   - revoke one session
   - revoke all sessions
   - delete user

4. Owned spaces
   - derive from `ListSpaces` where owner is the selected user

### APIs

Existing:

- `AdminUserService.GetUser`
- `AdminUserService.ListUserSessions`
- `AdminUserService.RevokeUserSession`
- `AdminUserService.RevokeUserSessions`
- existing user mutation APIs
- `AdminSpaceService.ListSpaces`

### Acceptance

- User rows link to `/users/:userId`.
- Page shows user properties and sessions.
- Revoke session actions use in-app confirmation.

---

## Workstream 3: Troubleshoot workflow

### Problem

Operators need a guided flow for user-reported issues, not separate manual page-hopping.

### Features

Add top-level nav:

```text
Troubleshoot
```

Initial workflows:

- User cannot log in
- User cannot access space
- Semantic search returns no results
- Semantic search errors
- Inference provider unavailable
- Backup failed
- Daemon unreachable

### UI

```text
Troubleshoot
User: [select]
Space: [select]
Domain: [select]
Problem: [semantic search no results]

[Run checks]
```

Output:

```text
✅ User active
✅ Active session exists
⚠ Access grants cannot be fully verified with current Admin API
✅ Space active
✅ Domain active
❌ No active semantic index found
✅ Inference endpoint enabled
⚠ Maintenance has failed retryable work

[Copy report] [Open user] [Open space] [Open inference]
```

### Acceptance

- First version can produce a report from existing APIs.
- Missing API checks should be explicit warnings, not silent omissions.

---

## Workstream 4: Space/domain/semantic index diagnostics

### Problem

Semantic indexes are space/domain scoped and should be diagnosable from space details.

### Features

Enhance `/spaces/:spaceId` with sections/tabs:

- Properties
- Domains
- Templates/API status
- Semantic indexes
- Semantic maintenance

Semantic index table:

- index ID
- key
- display name
- domain
- state
- model label
- vector store label
- enabled/disabled inclusion

### APIs

Existing:

- `AdminDomainService.ListDomains`
- `AdminSemanticService.ListSemanticIndexes`
- `AdminSemanticService.UpsertSemanticIndex`
- `AdminSemanticService.DeleteSemanticIndex`

### Acceptance

- Space detail can list semantic indexes per domain.
- Disabled indexes can be included.
- Index rows link to diagnostics/details.

---

## Workstream 5: Semantic maintenance dashboard

### Problem

Semantic search failures often come from stale indexes, failed backfills, or maintenance queue issues.

### Features

Add Maintenance/Semantic maintenance page or section.

Show:

- degraded state/reason
- pending/running/failed queue depth
- oldest pending age
- last dirty event
- last analyzed
- last worker success/error
- analyzer/worker run counts

Work table:

- work item ID
- space/domain/index
- target node
- action
- status
- attempts
- last error category/message
- timestamps

Actions:

- retry work item
- cancel work item
- analyze dirty work
- process dirty work
- backfill semantic index

### APIs

Existing:

- `AdminSemanticMaintenanceService.GetSemanticMaintenanceStatus`
- `ListSemanticMaintenanceWork`
- `RetrySemanticMaintenanceWork`
- `CancelSemanticMaintenanceWork`
- `AnalyzeSemanticDirtyWork`
- `ProcessSemanticDirtyWork`
- `BackfillSemanticIndex`

### Acceptance

- Operators can see queue/degraded state.
- Retry/cancel use confirmations and show results.

---

## Workstream 6: Inference dependency and health views

### Problem

Inference resources are interdependent, but current tables are independent.

### Features

For semantic/inference debugging, show relationships:

```text
Semantic index
→ endpoint
→ model
→ capability
→ credential grant
→ credential
→ policy
→ vector store
```

Enhance inference catalog with:

- endpoint detail drawer
- model detail drawer
- vector store detail drawer
- capability detail drawer
- metadata/config JSON viewer
- linked resources

Health checks:

- endpoint enabled
- endpoint operation supports embeddings/chat
- model exists
- capability exists/enabled
- vector store enabled
- credential grant exists/not expired
- policy allows use

### APIs

Existing inference APIs are mostly available:

- list endpoints/models/vector stores/capabilities
- list credentials/grants/policies
- set enabled/status APIs

### Acceptance

- Capabilities show endpoint/model keys, not just IDs.
- Detail drawer exposes metadata/config and linked resources.

---

## Workstream 7: Copy/export diagnostic reports

### Problem

Operators need evidence for issue tracking and handoff.

### Features

Add `Copy report` and later `Export JSON` to:

- connection diagnostics
- user detail
- troubleshoot results
- space diagnostics
- semantic maintenance
- inference detail drawers

Report format:

```markdown
# Mycel Admin Diagnostic Report
Generated: ...
Cluster: ...
Operator: ...

## Subject
...

## Checks
- PASS ...
- WARN ...
- FAIL ...

## Evidence
...

## Suggested actions
...
```

### Acceptance

- Reports are deterministic and redact secrets.
- Copy report works from first diagnostic workflows.

---

## Workstream 8: Local operator activity log

### Problem

Until server-side audit logs exist, local operator actions should be visible for debugging.

### Features

Local-only log entries for:

- login/logout
- imports
- user mutations
- session revocations
- backups triggered/deleted
- endpoint/capability/vector store toggles
- semantic maintenance actions

UI:

```text
Operator activity
timestamp | operator | action | target | result
```

Actions:

- copy log
- export JSON
- clear local log

### Acceptance

- Mutating service calls append local log entries.
- Log does not store passwords, tokens, or secrets.

---

## Workstream 9: Safe action impact summaries

### Problem

Operators need to understand blast radius before mutating cluster resources.

### Features

Before risky actions, show impact summaries.

Examples:

- Disable user
  - active sessions
  - owned spaces
  - revoke sessions setting

- Delete semantic index
  - purge vectors?
  - credential grants to delete
  - policies to delete

- Disable endpoint
  - affected capabilities
  - affected semantic indexes
  - affected credential grants

- Delete backup
  - backup ID/path/archive format/size

### Acceptance

- All destructive actions use app dialogs, not native confirms.
- Dialogs include resource IDs and consequences.

---

## Workstream 10: Admin API proposals

Some operator/debug goals need backend support.

### Proposed APIs

#### Effective access diagnostics

```text
ExplainEffectiveAccess(user_id, space_id, domain_id)
```

Returns:

- roles
- capabilities
- grants considered
- missing capabilities

#### Semantic search diagnostics

```text
ExplainSemanticSearch(user_id, space_id, domain_id, semantic_index_id, query)
```

Returns ordered checks:

- user active
- user access
- space/domain active
- index active
- endpoint/model/capability valid
- credential grant valid
- policy allows
- vectors available
- maintenance healthy

#### Cluster health

```text
GetClusterHealth()
GetDaemonInfo()
```

Returns daemon version, uptime, storage status, warnings.

#### Audit logs

```text
ListAuditEvents(filter)
```

Authoritative server-side audit trail.

#### Impact analysis

```text
ExplainResourceImpact(resource_type, resource_id, planned_action)
```

Returns affected resources before mutations.

---

## Suggested implementation order

1. Connection diagnostics and error display.
2. User detail page with sessions.
3. Space detail semantic index listing.
4. Semantic maintenance dashboard.
5. Troubleshoot workflow v1.
6. Diagnostic report copy/export.
7. Inference relationship/detail drawers.
8. Safe action impact summaries.
9. Local operator activity log.
10. Draft backend API proposals into Mycel API docs.

## Validation standard

Each implementation slice should pass:

```bash
npm test -- --runInBand
npm run build
PATH="$HOME/.cargo/bin:$PATH" cargo check --manifest-path src-tauri/Cargo.toml
```
