# Login/Logout Implementation Plan

## Objective

Add a testable operator login/logout feature to `mycel-admin` using the existing Tauri + React + Tailwind skeleton and the Rust `mycel-sdk`.

The work should proceed in phases. Each phase should leave the project buildable and testable.

## Phase 1: Frontend Structure and Shared UI Components

### Goal

Refactor the current one-file skeleton toward the established `knot_pkm_client` structure without changing app behavior beyond replacing the raw Hello World markup with reusable components.

### Tasks

- Create `src/components/typography/`.
- Add basic reusable components:
  - `Button`
  - `ErrorBox`
  - `Form`
  - `H2`
  - `Input`
  - `Label`
  - `Main`
  - `Text`
  - `index.ts`
  - `themeClasses.ts`
- Rename or align global CSS to the project convention if needed.
- Keep `App.tsx` rendering the centered Hello World screen using the new typography components.

### Validation

Run:

```bash
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

The app still displays Hello World, but the UI foundation is ready for feature work.

---

## Phase 2: Static Login UI

### Goal

Add the login page and form as presentational React components without connecting to Tauri/Rust yet.

### Tasks

- Create:

```text
src/features/auth/components/LoginForm.tsx
src/features/auth/pages/LoginPage.tsx
src/types/auth.ts
```

- Define frontend types:

```ts
export type LoginInput = {
  addr: string
  username: string
  password: string
}

export type OperatorSession = {
  addr: string
  operatorId: string
  username: string
}
```

- `LoginForm` fields:
  - cluster gRPC address
  - username
  - password
- Default address:

```text
127.0.0.1:9091
```

- `LoginPage` should accept an injectable `loginService` prop for tests.
- Temporarily wire `App.tsx` to render `LoginPage` and transition to a placeholder authenticated view on successful mock login.

### Validation

Run:

```bash
npm run build
```

If test tooling has been added by this phase, also run:

```bash
npm test
```

### Testable State

The user can fill and submit a login form. A mocked/injected login success moves the app to an authenticated placeholder.

---

## Phase 3: Frontend Unit Tests

### Goal

Add test coverage following `knot_pkm_client` conventions.

### Tasks

- Add test dependencies:
  - `jest`
  - `jest-environment-jsdom`
  - `ts-jest`
  - `@testing-library/react`
  - `@testing-library/user-event`
  - `@testing-library/jest-dom`
  - `identity-obj-proxy` if CSS module mocking is needed
- Add:

```text
jest.config.cjs
src/test/setupTests.ts
```

- Add tests:

```text
src/features/auth/components/LoginForm.test.tsx
src/features/auth/pages/LoginPage.test.tsx
```

- Test that:
  - address, username, and password are submitted
  - errors render
  - loading state disables submit
  - successful login calls `onLoginSuccess`

### Validation

Run:

```bash
npm test
npm run build
```

### Testable State

Login UI behavior is covered without requiring a running Mycel daemon.

---

## Phase 4: Rust Tauri Auth Commands and State

### Goal

Add Rust-side commands for login/logout/session inspection, backed by `mycel-sdk`.

### Tasks

- Create:

```text
src-tauri/src/commands/mod.rs
src-tauri/src/commands/auth.rs
src-tauri/src/state.rs
```

- Add Tauri managed state:

```rust
AppState {
  admin: RwLock<Option<AdminSession>>,
}
```

- Implement commands:

```rust
admin_login(input: LoginInput) -> Result<OperatorSession, String>
admin_logout() -> Result<(), String>
admin_whoami() -> Result<Option<OperatorSession>, String>
```

- `admin_login` should use:

```rust
mycel_sdk::dial_admin(mycel_sdk::Config { ... }).await
```

- Store the authenticated `AdminClient` in state.
- Register commands in `src-tauri/src/lib.rs`.

### Validation

Run:

```bash
cd src-tauri
PATH="$HOME/.cargo/bin:$PATH" cargo fmt -- --check
PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

Rust compiles with real Tauri commands. The commands can be manually exercised from the frontend service in the next phase.

---

## Phase 5: Frontend Service Integration

### Goal

Connect the login page to Tauri commands through a service layer.

### Tasks

- Create:

```text
src/services/adminService.ts
```

- Implement:

```ts
login(input: LoginInput): Promise<OperatorSession>
logout(): Promise<void>
whoAmI(): Promise<OperatorSession | null>
```

- Use:

```ts
import { invoke } from '@tauri-apps/api/core'
```

- Update `LoginPage` default service to call `adminService.login`.
- Update `App.tsx`:
  - on startup call `whoAmI()`
  - show login when unauthenticated
  - show authenticated placeholder when logged in
  - provide logout button in the authenticated placeholder

### Validation

Run:

```bash
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

Manual check:

```bash
PATH="$HOME/.cargo/bin:$PATH" npm run tauri dev
```

### Testable State

The desktop app can authenticate against a running Mycel daemon using operator credentials and then logout locally.

---

## Phase 6: End-to-End Manual Verification and Polish

### Goal

Confirm the feature behaves properly in realistic scenarios and polish user feedback.

### Tasks

- Verify invalid credentials show a useful error.
- Verify unavailable daemon shows a useful connection error.
- Verify logout returns to login.
- Verify app restart returns to login because sessions are in-memory only.
- Adjust copy and loading states.
- Ensure password field is cleared after failed or successful login where appropriate.

### Validation

Run full local checks:

```bash
npm test
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo fmt -- --check
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

Manual verification with a running Mycel daemon:

```bash
PATH="$HOME/.cargo/bin:$PATH" npm run tauri dev
```

### Testable State

Login/logout is functional, locally tested, manually verified, and ready for review.

---

## Out of Scope for First Login Feature

- Persistent session restore.
- Secure OS keychain storage.
- TLS/mTLS UI configuration.
- Saved cluster profiles.
- Role/capability-gated navigation.
- Full admin dashboard beyond a placeholder authenticated shell.

These should be added after the basic login/logout flow is stable.
