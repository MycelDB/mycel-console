# User Management Read-Only Implementation Plan

## Objective

Add the first functional user-management section: list users from the Mycel admin gRPC API and provide client-side filters.

This phase is read-only. Mutating operations such as create, disable, enable, and delete are handled in a separate plan.

## Phase 1: Types and Service Shape

### Goal

Define frontend user-management types and service methods without UI integration.

### Tasks

Create:

```text
src/types/users.ts
```

Add types:

```ts
export type UserState = 'USER_STATE_UNSPECIFIED' | 'USER_STATE_ACTIVE' | 'USER_STATE_DISABLED' | 'USER_STATE_DELETED'

export type UserInfo = {
  userId: string
  username: string
  state: UserState | string
}

export type ListUsersInput = {
  pageSize?: number
  pageToken?: string
  includeDisabled?: boolean
  includeDeleted?: boolean
}

export type ListUsersResponse = {
  users: UserInfo[]
  nextPageToken: string
}
```

Add to `src/services/adminService.ts`:

```ts
listUsers(input: ListUsersInput): Promise<ListUsersResponse>
```

This initially calls Tauri command:

```text
admin_list_users
```

### Validation

```bash
npm run build
```

### Testable State

Frontend compiles with user service contracts in place.

---

## Phase 2: Rust Command

### Goal

Expose `AdminUserService.ListUsers` through Tauri.

### Tasks

Create:

```text
src-tauri/src/commands/users.rs
```

Register it in:

```text
src-tauri/src/commands/mod.rs
src-tauri/src/lib.rs
```

Implement:

```rust
admin_list_users(input: ListUsersInput) -> Result<ListUsersResponse, String>
```

Behavior:

- Require an authenticated admin session.
- Use the existing `AdminClient` stored in `AppState`.
- Call `session.client.users.list_users(...)`.
- Map proto users into frontend-safe DTOs.

### Validation

```bash
cd src-tauri
PATH="$HOME/.cargo/bin:$PATH" cargo fmt -- --check
PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

The Rust backend compiles and exposes the user-list command.

---

## Phase 3: Users Page Skeleton

### Goal

Add `/users` page to the app shell and render static read-only UI states.

### Tasks

Create:

```text
src/features/users/pages/UsersPage.tsx
src/features/users/components/UserTable.tsx
src/features/users/components/UserFilters.tsx
src/features/users/components/UserStateBadge.tsx
```

Route `/users` to `UsersPage` in the authenticated shell.

Initial page states:

- loading
- error
- empty
- table with supplied users

### Validation

```bash
npm run build
```

### Testable State

Navigating to `/users` shows a user-management page shell with testable UI states.

---

## Phase 4: Data Loading

### Goal

Connect `UsersPage` to the real `listUsers` frontend service.

### Tasks

- On page load, call `listUsers({ pageSize: 100 })`.
- Add Refresh button.
- Render:
  - username
  - user ID
  - state badge
- Show backend errors in `ErrorBox`.
- Add simple pagination if `nextPageToken` is present:
  - initial implementation can use `Load more`

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

Manual check requires a running Mycel daemon.

### Testable State

With a live backend, operators can see users. Without a backend, frontend tests can still verify UI behavior through injected services.

---

## Phase 5: Client-Side Filters

### Goal

Add practical filtering for operator usability.

### Tasks

Filters:

- username search text
- state filter:
  - all
  - active
  - disabled
  - deleted
- include disabled checkbox
- include deleted checkbox

Behavior:

- `includeDisabled` and `includeDeleted` affect the backend request.
- username/state filters can be client-side for the currently loaded result set.
- Refresh reloads using current include flags.

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Operators can filter the visible user list and reload from the backend with inclusion flags.

---

## Phase 6: Read-Only Tests

### Goal

Add test coverage for user listing and filters.

### Tasks

Tests:

```text
src/features/users/components/UserTable.test.tsx
src/features/users/components/UserFilters.test.tsx
src/features/users/pages/UsersPage.test.tsx
```

Cover:

- loading state
- error state
- empty state
- table rows render
- username filter
- state filter
- refresh invokes list service
- include disabled/deleted values passed to service

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Read-only user management is covered by frontend tests and is ready for mutation features.

## Out of Scope

- Creating users.
- Disabling/enabling users.
- Deleting users.
- Setting passwords.
- User auth-session management.
- Server-side search beyond list pagination.
