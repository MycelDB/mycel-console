# Login/Logout Design

## Goal

Implement operator login/logout for the Mycel Admin desktop app using the Tauri + React + Rust SDK architecture.

The login feature must authenticate a Mycel operator against the Mycel admin gRPC API and transition the UI from an unauthenticated login screen to an authenticated admin shell.

## Architecture

```text
React UI
  -> src/services/adminService.ts
    -> Tauri invoke("admin_login" / "admin_logout" / "admin_whoami")
      -> Rust Tauri command
        -> mycel-sdk AdminClient
          -> Mycel admin gRPC API
```

The browser/React side never talks directly to gRPC. It calls typed Tauri commands. The Rust side owns the gRPC connection, token handling, and SDK client state.

## Frontend Structure

The UI will follow the existing `knot_pkm_client` conventions:

```text
src/
  App.tsx
  components/
    typography/
      Button.tsx
      ErrorBox.tsx
      Form.tsx
      H2.tsx
      Input.tsx
      Label.tsx
      Main.tsx
      Text.tsx
      index.ts
      themeClasses.ts
  features/
    auth/
      components/
        LoginForm.tsx
      pages/
        LoginPage.tsx
  services/
    adminService.ts
  types/
    auth.ts
```

`LoginForm` is presentational and receives:

- `loading`
- `error`
- `onSubmit(input)`

`LoginPage` owns form submission state and calls `adminService.login()`.

`App.tsx` owns global authenticated state and decides whether to render:

- unauthenticated routes: `LoginPage`
- authenticated routes: initial admin shell/dashboard placeholder

## Login Input

Because this is an admin/operator desktop app, login requires cluster connection details in addition to credentials.

Initial input:

```ts
type LoginInput = {
  addr: string
  username: string
  password: string
}
```

Default address should be:

```text
127.0.0.1:9091
```

TLS settings will be added later. The first implementation should keep the form small and testable.

## Rust Command Design

Tauri commands will live under:

```text
src-tauri/src/commands/
  mod.rs
  auth.rs
```

Initial commands:

```rust
admin_login(input: LoginInput) -> Result<LoginResponse, String>
admin_logout() -> Result<(), String>
admin_whoami() -> Result<OperatorSession, String>
```

`admin_login` will:

1. Build `mycel_sdk::Config` using `addr`, `username`, and `password`.
2. Call `mycel_sdk::dial_admin(config).await`.
3. Use the returned `AdminClient` to identify the operator via `who_am_i()`.
4. Store the authenticated admin client in Tauri managed application state.
5. Return session details to the frontend.

## Tauri State

Rust should own the authenticated SDK client. The frontend should not persist access tokens directly.

Suggested state:

```rust
pub struct AppState {
    admin: tokio::sync::RwLock<Option<AdminSession>>,
}

pub struct AdminSession {
    addr: String,
    operator_id: String,
    username: String,
    client: mycel_sdk::AdminClient,
}
```

This lets future commands use the existing authenticated gRPC client without re-login.

## Logout Design

Logout will initially be local-only:

1. Clear the Rust-managed `AdminSession`.
2. Clear frontend session state.
3. Return the user to the login page.

If the admin API later exposes operator session revocation/logout, the Rust command can call it before clearing local state.

## Session Restore

Initial implementation will not restore sessions across app restarts.

Rationale:

- Simpler and safer for an admin app.
- Avoids storing privileged operator tokens before a secure credential-storage design exists.
- Leaves room for later integration with OS keychain/secure storage.

On app startup, frontend calls `admin_whoami()`:

- if Rust state has an active session, render authenticated shell
- otherwise render login page

Since initial state is in-memory only, app startup normally shows login.

## Error Handling

Rust commands return `Result<T, String>` for the first implementation.

Frontend displays errors through `ErrorBox` in `LoginForm`.

Common errors:

- missing address
- missing username/password
- gRPC connection failure
- invalid credentials
- unavailable Mycel daemon

Later, command errors can become structured objects with error codes.

## Security Notes

- Password is sent from React to Rust only through Tauri IPC.
- Password is not stored in frontend state after submission completes.
- Access token remains inside the Rust SDK token source.
- No token is written to localStorage/sessionStorage in the initial implementation.
- Persistent session restore must use secure OS storage, not plain localStorage.

## Future Extensions

- TLS/mTLS login options.
- Saved cluster profiles.
- Secure token/keychain persistence.
- Explicit server-side operator logout if supported by the API.
- Session expiration detection and re-login handling.
- Role/capability-aware navigation after login.
