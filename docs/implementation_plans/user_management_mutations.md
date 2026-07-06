# User Management Mutations Implementation Plan

## Objective

Extend the read-only user-management section with safe operator actions:

- create user
- disable user
- enable user
- delete user
- optionally set/reset password

These operations are privileged and potentially destructive, so the UI must make state changes explicit and confirm destructive actions.

## Prerequisite

Complete `docs/implementation_plans/user_management_readonly.md` first.

## Phase 1: Mutation Types and Service Methods

### Goal

Define frontend contracts for user mutation operations.

### Tasks

Extend `src/types/users.ts`:

```ts
export type CreateUserInput = {
  username: string
  password?: string
  disabled?: boolean
}

export type DisableUserInput = {
  userId: string
  reason?: string
  revokeSessions: boolean
}

export type DeleteUserInput = {
  userId: string
  revokeSessions: boolean
}

export type SetUserPasswordInput = {
  userId: string
  password: string
  revokeSessions: boolean
}
```

Add service methods in `src/services/adminService.ts`:

```ts
createUser(input): Promise<UserInfo>
disableUser(input): Promise<UserInfo>
enableUser(userId): Promise<UserInfo>
deleteUser(input): Promise<UserInfo>
setUserPassword(input): Promise<UserInfo>
```

### Validation

```bash
npm run build
```

### Testable State

Frontend mutation API contracts compile but are not yet wired to UI.

---

## Phase 2: Rust Mutation Commands

### Goal

Expose admin user mutation gRPC calls through Tauri.

### Tasks

Extend:

```text
src-tauri/src/commands/users.rs
```

Add commands:

```rust
admin_create_user(input) -> Result<UserInfo, String>
admin_disable_user(input) -> Result<UserInfo, String>
admin_enable_user(user_id) -> Result<UserInfo, String>
admin_delete_user(input) -> Result<UserInfo, String>
admin_set_user_password(input) -> Result<UserInfo, String>
```

Behavior:

- Require authenticated admin session.
- Validate required inputs before calling gRPC.
- Map returned proto `User` into the shared `UserInfo` DTO.
- Preserve backend error messages.

### Validation

```bash
cd src-tauri
PATH="$HOME/.cargo/bin:$PATH" cargo fmt -- --check
PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

Rust mutation commands compile and can be manually invoked from the frontend later.

---

## Phase 3: Create User UI

### Goal

Add user creation flow with a modal/dialog.

### Tasks

Create:

```text
src/features/users/components/CreateUserModal.tsx
```

Fields:

- username
- initial password
- create disabled checkbox

Behavior:

- `Create user` button opens modal.
- Submit calls `createUser`.
- On success:
  - close modal
  - refresh user list
  - optionally show a success message
- On failure:
  - show `ErrorBox` inside modal

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Operators can create users with a live backend. UI behavior is testable with injected services.

---

## Phase 4: Disable/Enable User UI

### Goal

Add safe state-transition actions for users.

### Tasks

- In `UserTable`, show actions based on state:
  - active user: Disable
  - disabled user: Enable
- Add `DisableUserDialog` or inline confirmation.
- Disable dialog fields:
  - reason
  - revoke sessions checkbox
- Enable should be a direct action or small confirmation.
- Refresh row/list after success.

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Operators can disable and enable users, with explicit confirmation for disabling.

---

## Phase 5: Delete User UI

### Goal

Add destructive delete action with strong confirmation.

### Tasks

Create:

```text
src/features/users/components/DeleteUserDialog.tsx
```

Behavior:

- Delete action opens confirmation dialog.
- Dialog displays username and user ID.
- Require explicit confirmation, preferably typing the username.
- Include `revoke sessions` checkbox defaulting to true.
- On success, refresh list.
- Show backend errors in dialog.

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Operators can delete users only through an explicit confirmation flow.

---

## Phase 6: Set Password UI

### Goal

Allow operators to set or reset a user's password.

### Tasks

Create:

```text
src/features/users/components/SetUserPasswordDialog.tsx
```

Fields:

- new password
- confirm password
- revoke sessions checkbox

Behavior:

- Validate non-empty password.
- Validate confirmation matches.
- Call `setUserPassword`.
- On success close dialog and show success message.

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Operators can reset user passwords with basic client-side validation.

---

## Phase 7: Mutation Tests and Polish

### Goal

Cover mutation flows and improve operational usability.

### Tasks

Add tests for:

- create user validation and success
- create user backend error
- disable user confirmation
- enable user action
- delete confirmation prevents accidental delete
- set password confirmation mismatch
- list refresh after mutation success

Polish:

- disable buttons while requests are in flight
- show row-level or page-level operation errors
- use consistent destructive styling
- ensure keyboard accessibility for dialogs

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

User management supports core operator mutations with frontend coverage and safe destructive flows.

## Out of Scope

- Bulk user operations.
- User session browsing/revocation.
- Role/capability assignment, which belongs to operator management or access-control features.
- Server-side audit trail UI.
