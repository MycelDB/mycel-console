# Unified Principal Identity Migration Implementation Plan

## Objective

Update `mycel-console` for the unified mycel identity model:

```text
principal + role bindings + capability grants + scoped authorization
```

The app must work with the current `mycel-api` and `mycel-rust-sdk` unified principal/auth branches, where:

- authentication is served by `mycel.common.v1.AuthService`
- identity management is served by `mycel.admin.v1.AdminPrincipalService`
- users/operators are not separate identity stores or public admin services
- system administration is represented by principal roles/capabilities

Each phase should leave the app in a testable state. Prefer small compatibility shims where needed so the frontend can be migrated incrementally.

## Current State

`mycel-console` is on branch:

```text
unified_principal_identity
```

The frontend test suite currently passes:

```bash
npm test -- --runInBand
```

But the Tauri/Rust backend does not compile against the updated Rust SDK:

```bash
cd src-tauri
cargo check --locked
```

Known blocker classes:

- stale admin user API usage in `src-tauri/src/commands/users.rs`
- stale operator identity field in `src-tauri/src/commands/auth.rs`
- stale `owner_user_id` space ownership field in `src-tauri/src/commands/spaces.rs`
- structured query proto initializer drift in `src-tauri/src/commands/client_query.rs`
- frontend terminology/types still model separate users/operators instead of principals

## Non-Goals

- Do not reintroduce `AdminUserService`, `AdminOperatorService`, admin auth, or client auth APIs.
- Do not add compatibility with old daemon identity stores.
- Do not redesign role/capability administration beyond the minimal UI foundations called out here.
- Do not rename every user-facing label in one risky change if a smaller compatibility tranche keeps the app functional.

---

## Phase 1: Unblock Tauri Compile With Principal-Backed Compatibility DTOs

### Goal

Make `src-tauri` compile against the unified API while preserving the existing frontend command names and DTO shapes as a temporary compatibility layer.

### Tasks

#### Auth command compatibility

Update:

```text
src-tauri/src/commands/auth.rs
src-tauri/src/state.rs
```

Replace use of SDK `operator_id` with `principal_id`:

```rust
operator.operator_id -> operator.principal_id
```

Short-term compatibility options:

1. Keep `OperatorSession.operator_id` serialized as `operatorId`, but populate it with `principal_id`; or
2. Add `principal_id` while keeping `operator_id` deprecated for frontend compatibility.

Preferred transitional DTO:

```rust
pub struct OperatorSession {
    pub addr: String,
    pub principal_id: String,
    pub operator_id: String, // deprecated alias during frontend migration
    pub username: String,
}
```

Also update logout to call unified logout before clearing state when possible:

```rust
session._client.logout_principal(None).await
```

#### User command compatibility over AdminPrincipalService

Update:

```text
src-tauri/src/commands/users.rs
```

Replace deleted user/admin session protos with principal/common auth protos:

```rust
AdminClient.users                    -> AdminClient.principals
ListUsersRequest                     -> ListPrincipalsRequest
GetUserRequest { user_id }           -> GetPrincipalRequest { principal_id }
CreateUserRequest                    -> CreatePrincipalRequest
DisableUserRequest                   -> DisablePrincipalRequest
EnableUserRequest                    -> EnablePrincipalRequest
DeleteUserRequest                    -> DeletePrincipalRequest
SetUserPasswordRequest               -> SetPrincipalPasswordRequest
ListUserSessionsRequest              -> ListPrincipalSessionsRequest
RevokeUserSessionRequest             -> RevokePrincipalSessionRequest
RevokeUserSessionsRequest            -> RevokePrincipalSessionsRequest
User                                 -> Principal
AdminAuthSessionSummary              -> common.v1.AuthSessionSummary
```

For this phase, continue returning existing frontend DTO names:

```rust
UserInfo { user_id, username, state, ... }
```

but populate:

```rust
user_id = principal.principal_id
state = principal.state
```

Map state strings directly from the new enum for now, even if they become `PRINCIPAL_STATE_*` before frontend changes.

Create users as human principals:

```rust
CreatePrincipalRequest {
    username,
    password,
    r#type: PrincipalType::Human as i32,
    login_enabled: true,
    disabled,
    ..Default::default()
}
```

#### Space owner field

Update:

```text
src-tauri/src/commands/spaces.rs
```

Replace:

```rust
owner_user_id
```

with:

```rust
owner_principal_id
```

Compatibility option: keep the TypeScript-facing input as `ownerUserId` during Phase 1, but map it internally to `owner_principal_id` and adjust validation text to “owner principal”.

#### Query proto initializer drift

Update:

```text
src-tauri/src/commands/client_query.rs
```

Add new proto fields:

```rust
GraphQuery {
    max_nodes: 0,
    max_edges: 0,
    ...
}

NodePattern {
    node_ids: vec![],
    ...
}
```

### Validation

```bash
cd src-tauri
cargo fmt -- --check
cargo check --locked
```

Then from repo root:

```bash
npm test -- --runInBand
npm run build
```

### Testable State

The app compiles and existing frontend tests pass, but UI labels/routes may still say “users” and “operators”.

---

## Phase 2: Rename Shared Frontend Identity Types to Principals

### Goal

Move frontend data contracts from user/operator vocabulary to principal vocabulary while preserving temporary aliases where useful.

### Tasks

Update or replace:

```text
src/types/auth.ts
src/types/users.ts
```

Target auth DTO:

```ts
export type PrincipalSession = {
  addr: string;
  principalId: string;
  username: string;
};
```

Transitional alias:

```ts
export type OperatorSession = PrincipalSession & {
  operatorId?: string;
};
```

Target principal DTO:

```ts
export type PrincipalInfo = {
  principalId: string;
  username: string;
  displayName?: string;
  email?: string;
  type?: string;
  state: string;
  loginEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
};
```

Rename service types:

```text
UserInfo                  -> PrincipalInfo
ListUsersInput            -> ListPrincipalsInput
ListUsersResponse         -> ListPrincipalsResponse
CreateUserInput           -> CreatePrincipalInput
DisableUserInput          -> DisablePrincipalInput
DeleteUserInput           -> DeletePrincipalInput
SetUserPasswordInput      -> SetPrincipalPasswordInput
ListUserSessionsInput     -> ListPrincipalSessionsInput
UserSessionInfo           -> PrincipalSessionInfo
```

Temporary compatibility exports may be retained during this phase:

```ts
export type UserInfo = PrincipalInfo;
```

### Validation

```bash
npm run build
npm test -- --runInBand
```

### Testable State

Frontend compiles with principal-oriented types. Existing route names may still be `/users`.

---

## Phase 3: Rename Tauri Commands and Frontend Services

### Goal

Expose principal-named service methods while keeping old user-named commands only as deprecated wrappers if needed.

### Tasks

Update:

```text
src/services/adminService.ts
src-tauri/src/commands/users.rs
src-tauri/src/lib.rs
```

Add principal command names:

```text
admin_list_principals
admin_get_principal
admin_create_principal
admin_disable_principal
admin_enable_principal
admin_delete_principal
admin_set_principal_password
admin_list_principal_sessions
admin_revoke_principal_session
admin_revoke_principal_sessions
```

Add frontend service methods:

```ts
listPrincipals(input): Promise<ListPrincipalsResponse>
getPrincipal(principalId): Promise<PrincipalInfo>
createPrincipal(input): Promise<PrincipalInfo>
disablePrincipal(input): Promise<PrincipalInfo>
enablePrincipal(principalId): Promise<PrincipalInfo>
deletePrincipal(input): Promise<PrincipalInfo>
setPrincipalPassword(input): Promise<PrincipalInfo>
listPrincipalSessions(input): Promise<ListPrincipalSessionsResponse>
revokePrincipalSession(input): Promise<void>
revokePrincipalSessions(principalId): Promise<RevokePrincipalSessionsResponse>
```

If retaining wrappers for a short time, implement them as simple calls to principal commands/services and mark them deprecated in comments.

### Validation

```bash
cd src-tauri
cargo fmt -- --check
cargo check --locked

cd ..
npm run build
npm test -- --runInBand
```

### Testable State

Both old and new service paths work, or the app has fully moved to principal service paths with passing tests.

---

## Phase 4: Migrate UI Routes and Copy

### Goal

Make the visible console reflect the unified model.

### Tasks

Rename or replace feature modules:

```text
src/features/users        -> src/features/principals
src/types/users.ts        -> src/types/principals.ts
```

Route strategy:

- Preferred canonical routes:

```text
/principals
/principals/:principalId
```

- Optional temporary redirects:

```text
/users -> /principals
/users/:userId -> /principals/:principalId
```

Update labels/copy:

```text
Operator username         -> Principal username
operator credentials      -> principal credentials
Manage users              -> Manage principals
Create user               -> Create principal
Disable user              -> Disable principal
User ID                   -> Principal ID
User sessions             -> Principal sessions
```

Use “human principal” where the UI intentionally creates login-capable people.

Update dashboard shortcuts:

- “Manage principals” for identity management
- Reframe “Operators” as “Admin access” or “Roles & capabilities”

### Validation

```bash
npm run build
npm test -- --runInBand
```

### Testable State

The UI no longer presents users/operators as separate identity models.

---

## Phase 5: Add Admin Roles/Capabilities Foundations

### Goal

Introduce the UI foundation for system management as principal role/capability assignments rather than separate operators.

### Tasks

Create a focused “Access” or “Roles & capabilities” surface. Initial scope can be read-only if mutation APIs are not ready in the app.

Candidate route:

```text
/access
/principals/:principalId/access
```

Initial fields to display when available from `AdminPrincipalService`:

- system roles
- space-scoped roles/grants
- explicit capabilities
- login enabled/disabled
- principal state

Update `/operators`:

- remove if unused; or
- redirect to `/access`; or
- reframe as “Admin-capable principals” filtered by system role/capability.

### Validation

```bash
npm run build
npm test -- --runInBand
```

### Testable State

Operators are represented as principals with admin access, not separate identity records.

---

## Phase 6: Cleanup Deprecated Compatibility Names

### Goal

Remove temporary user/operator compatibility aliases once frontend and backend are fully migrated.

### Tasks

Remove deprecated names from Rust DTOs and TypeScript types:

```text
operator_id
OperatorSession
user_id
UserInfo
USER_STATE_*
admin_*_user command wrappers
```

Search targets:

```bash
rg "operatorId|operator_id|OperatorSession|users|Users|userId|user_id|UserInfo|USER_STATE|AdminUser|AdminOperator|ownerUserId|owner_user_id"
```

Expected remaining uses should be either historical docs/tests explicitly marked as historical, or none.

### Validation

```bash
cd src-tauri
cargo fmt -- --check
cargo check --locked

cd ..
npm run build
npm test -- --runInBand
```

### Testable State

The app only exposes principal/common-auth identity terminology and compiles against current mycel API/SDK branches.

---

## Phase 7: CI Guardrails

### Goal

Prevent future frontend-only green builds when the Tauri backend is broken.

### Tasks

Update CI/workflows to run:

```bash
npm ci
npm run build
npm test -- --runInBand
cd src-tauri && cargo check --locked
```

If runtime cost is a concern, add the Rust check at least to PR validation for branches that touch:

```text
src-tauri/**
../mycel-api/**
../mycel-rust-sdk/**
```

### Validation

Trigger the workflow or run the same commands locally.

### Testable State

A stale API/SDK change breaks CI before merge.

---

## Final Acceptance Criteria

- `mycel-console/src-tauri` compiles with the unified `mycel-rust-sdk` branch.
- Frontend tests pass.
- Frontend build passes.
- Admin login uses common principal auth through the SDK.
- Identity management uses `AdminPrincipalService`.
- Space creation uses `owner_principal_id`.
- Query console compiles with current structured query protos.
- UI no longer presents operators/users as separate storage species.
- Any remaining “user” wording is deliberate and means “human principal”, not a separate API/service.

## Full Validation Command Set

```bash
cd /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-console
npm test -- --runInBand
npm run build
cd src-tauri
cargo fmt -- --check
cargo check --locked
```
