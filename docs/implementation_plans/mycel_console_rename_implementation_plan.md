# `mycel-admin` to `mycel-console` Rename Implementation Plan

## Status

Phases 0-4 are complete on branch `admin_rename`. This plan covers the rename from the former release identity `mycel-admin` to the console identity `mycel-console`.

The app now uses `Mycel Console` / `mycel-console` for user-facing branding, package metadata, Tauri product metadata, selected source identifiers, and active documentation. Repository rename/release operations remain Phase 5 work.

Phase 0 confirmed:

- `mycel` is on `admin_rename` with a clean working tree.
- `mycel-admin` is on `admin_rename`.
- The rename inventory was refreshed with:

  ```sh
  rg "mycel-admin|Mycel Admin|admin console|Admin Console" mycel mycel-admin \
    --glob '!**/node_modules/**' \
    --glob '!**/target/**' \
    --glob '!**/.git/**'
  ```

Phase 1 is complete:

- User-facing branding now uses `Mycel Console` through `src/features/console/branding.ts`.
- Browser document title is `Mycel Console`.
- Active source copy that described the app as an admin console now uses console wording.
- Backup trigger reasons now identify `Mycel Console`.
- Tauri/package release metadata was intentionally left for Phase 2.
- The technical query-console client name was intentionally left for Phase 3.

Phase 1 validation passed:

```sh
npm test -- --runInBand --watch=false \
  src/features/console/branding.test.ts \
  src/features/backups/pages/BackupsPage.test.tsx \
  src/components/layout/AppShell.test.tsx \
  src/features/auth/components/LoginForm.test.tsx \
  src/features/auth/pages/LoginPage.test.tsx
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
cd .. && git diff --check
```

Phase 2 is complete:

- npm package identity is now `mycel-console` in `package.json` and `package-lock.json`.
- Tauri product name/window title are now `Mycel Console`.
- Tauri version was aligned to `0.6.0`.
- Tauri bundle identifier is now `com.myceldb.console`, making the renamed console a distinct desktop app identity.
- Rust package name is now `mycel-console`.
- Rust lib target is now `mycel_console_lib`, and `src-tauri/src/main.rs` calls that target.
- `src-tauri/Cargo.lock` was refreshed by `cargo check`.
- The technical query-console client name was intentionally left for Phase 3.

Phase 2 lock refresh commands:

```sh
npm install --package-lock-only --ignore-scripts
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

Phase 3 is complete:

- Tauri command identifiers with `admin_` prefixes remain unchanged because they map to daemon admin APIs or internal command surfaces rather than product identity.
- Frontend `adminService.ts` remains unchanged for the same reason.
- Query-console SDK client name changed from `mycel-admin-query-console` to `mycel-console-query-console`.
- Mycel CLI user-backup client labels changed from `mycel-admin-user-backup` to `mycel-console-user-backup`.
- Product-scoped local storage keys changed from `mycel_admin_theme` and `mycelAdmin.gql.alwaysConfirmWrite` to `mycel_console_theme` and `mycelConsole.gql.alwaysConfirmWrite`.

Phase 4 is complete:

- Active `mycel-admin/docs` references now use `mycel-console`, `Mycel Console`, and console wording.
- Active `mycel/docs` references now use `mycel-console`, `Mycel Console`, and console wording.
- Historical references remain in this implementation plan where they describe the former identity, branch context, or repository path before Phase 5.

Phase 5 local release-operations preparation is complete:

- No `.github` workflow, README, changelog, Dockerfile, or release automation file exists in the console repository today, so there were no local CI/release files to rename.
- `mycel` GQL roadmap feature labels now say `Mycel Console` instead of `Admin console` for console-specific GQL features.
- The GitHub repository rename remains an external cutover step: rename `MycelDB/mycel-admin` to `MycelDB/mycel-console`, then update local clones/remotes.
- Recommended local remote update after the GitHub rename:

  ```sh
  git -C /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-admin remote set-url origin https://github.com/MycelDB/mycel-console.git
  ```

- Recommended local directory rename after the GitHub rename and after this branch is merged or otherwise coordinated:

  ```sh
  cd /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb
  mv mycel-admin mycel-console
  ```

- Release notes for the rename should state:
  - `mycel-admin` is now `mycel-console` / `Mycel Console`.
  - Desktop bundle identifier changed to `com.myceldb.console`; this may appear as a distinct desktop app from older `mycel-admin` installs.
  - Tauri command names and daemon admin APIs still use `admin` where that is a technical API/subsystem concept.

## Goals

- Rename the user-facing and release identity from `mycel-admin` to `mycel-console`.
- Preserve the capability-oriented console direction already present in the UI architecture.
- Keep mycel standalone and generic; avoid application-specific concepts in the console name or docs.
- Keep daemon/API authorization authoritative; frontend capability gates remain UX hints only.
- Make the rename reviewable, reversible, and easy to validate.

## Non-goals

- Do not convert Tauri to a web-only React deployment in this tranche.
- Do not change daemon authorization or capability semantics.
- Do not change generated protobuf artifacts by hand.
- Do not introduce compatibility/migration machinery for historical local admin state unless a release requirement is identified.
- Do not rename unrelated mycel APIs or subsystem packages just because they mention admin as an authorization concept.

## Current reference inventory

Initial repository scan found `mycel-admin` references in:

- `mycel-admin`:
  - package metadata: `package.json`, `package-lock.json`;
  - Tauri metadata: `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, Tauri config/product metadata;
  - branding seam: `src/features/console/branding.ts` and tests;
  - docs and implementation plans under `docs/`;
  - user-facing fallback text in selected pages/components.
- `mycel`:
  - design/implementation docs that refer to the current admin app;
  - CLI/user backup references where the phrase describes existing release tooling;
  - roadmap/query docs that mention admin console behavior.

No `mycel-admin` references were found in the current scans of:

- `mycel-api`;
- `mycel-go-sdk`;
- `mycel-rust-sdk`;
- `mycel-bench`.

Branches created for this work:

- `mycel/admin_rename`;
- `mycel-admin/admin_rename`.

## Rename policy

Use three categories for every reference:

1. **Current release identity**: keep `mycel-admin` when documenting historical releases, existing package names, or compatibility notes before the rename is shipped.
2. **Future/user-facing product identity**: change to `mycel-console` or `Mycel Console` for UI copy, docs, release artifacts, package names, and deployment instructions once the rename tranche is active.
3. **Technical admin concepts**: keep `admin` where it means an admin API, admin authorization surface, admin role/capability, or daemon admin subsystem rather than the app name.

## Implementation phases

### Phase 0: Preflight and branch hygiene

1. Confirm both repos are on `admin_rename`:

   ```sh
   git -C mycel branch --show-current
   git -C mycel-admin branch --show-current
   ```

2. Confirm clean working trees before edits:

   ```sh
   git -C mycel status --short
   git -C mycel-admin status --short
   ```

3. Refresh inventory:

   ```sh
   rg "mycel-admin|Mycel Admin|admin console|Admin Console" mycel mycel-admin \
     --glob '!**/node_modules/**' \
     --glob '!**/target/**' \
     --glob '!**/.git/**'
   ```

### Phase 1: User-facing branding seam

1. Update `src/features/console/branding.ts` to expose the new display name:
   - display name: `Mycel Console`;
   - technical/release package name: decide whether to switch immediately to `mycel-console` or keep a transitional value.
2. Update branding tests.
3. Update UI copy that clearly refers to the application name:
   - login page title/subtitle;
   - shell/header/sidebar labels;
   - dashboard and placeholder copy;
   - error/help text that says `mycel-admin` as a product name.
4. Keep capability and principal-management terminology unchanged unless it is product branding.

### Phase 2: Package and Tauri identity

1. Update npm package metadata:
   - `package.json` name from `mycel-admin` to `mycel-console`;
   - regenerate/update `package-lock.json` normally via npm.
2. Update Tauri/Rust metadata:
   - `src-tauri/Cargo.toml` package name if desired;
   - `src-tauri/Cargo.lock` through cargo, not manual broad edits;
   - Tauri product name/window title/config;
   - bundle identifiers only after deciding whether existing desktop installs should be treated as a new app identity.
3. Verify whether binary names, app bundle names, and installer artifact names change as expected.

### Phase 3: Source and command naming decisions

1. Keep Rust command names such as `admin_login` unless there is a strong reason to rename the command surface. They are internal Tauri command identifiers and are not user-facing release identity.
2. Keep daemon admin API names unchanged. `admin` is still a valid subsystem/API concept.
3. Avoid package/folder moves unless they produce clear value. The existing `features/console` namespace is already aligned with the future name.
4. If any command identifiers are renamed, add a single focused tranche with frontend and Rust changes plus tests.

### Phase 4: Documentation updates

1. In `mycel-admin`, update current app docs and implementation plans to use `mycel-console`/`Mycel Console` for future-facing prose.
2. Preserve historical references to `mycel-admin` where they describe already released artifacts.
3. In `mycel`, update docs that refer to the current UI as a product name:
   - design docs;
   - implementation plans;
   - roadmap references;
   - operations procedures.
4. Keep `admin` when it refers to admin services, admin APIs, capabilities, principals, or authorization concepts.
5. Update quick-start commands and paths only if the repository/package path is renamed in the same tranche.

### Phase 5: Repository and release operations

Status: local preparation complete. The actual GitHub repository rename is an external cutover step and was not executed from this branch.

1. Rename the GitHub repository from `MycelDB/mycel-admin` to `MycelDB/mycel-console` when release coordination approves the cutover.
2. After the GitHub rename, update local remotes:

   ```sh
   git -C /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-admin remote set-url origin https://github.com/MycelDB/mycel-console.git
   ```

3. After the branch is merged/coordinated, optionally rename the local checkout directory:

   ```sh
   cd /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb
   mv mycel-admin mycel-console
   ```

4. There are currently no console-repo `.github` workflows, badges, release scripts, changelog, Dockerfile, or README files to update locally.
5. Release notes must explicitly state:
   - `mycel-admin` has been renamed to `mycel-console` / `Mycel Console`.
   - the Tauri bundle identifier changed from `com.myceldb.admin` to `com.myceldb.console`;
   - `admin` remains in daemon APIs and some internal command names where it is a technical API/subsystem concept.
6. Transitional artifact aliases are not implemented in this branch. Add them later only if the release process requires one-release compatibility artifact names.

### Phase 6: Optional web-console groundwork

Not part of the rename, but the new name should not block future web deployment.

1. Keep frontend service access behind a transport boundary where practical.
2. Do not remove Tauri until a gateway/BFF or browser-compatible daemon API exists.
3. Avoid naming that assumes desktop-only distribution.

## Validation

### `mycel-admin`

```sh
cd /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-admin
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
cd .. && git diff --check
```

Manual validation:

- Tauri app window title and app menu show expected name.
- Login page and shell use `Mycel Console`.
- Capability-gated navigation still behaves as before.
- Graph query console still executes read/write GQL as the current principal.

### `mycel`

```sh
cd /Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel
make docs-check
git diff --check
```

Run broader Go tests only if source code changes beyond docs are included:

```sh
go test ./internal/query/gql/... ./internal/daemon/api/client ./internal/cli/cmd -count=1
```

## Acceptance criteria

- User-facing app identity is consistently `Mycel Console` / `mycel-console` in active docs and UI.
- Historical release references to `mycel-admin` remain accurate.
- Admin API/subsystem terminology remains unchanged where technically correct.
- Tauri package/build metadata is coherent and builds successfully.
- All tests/build checks listed above pass.
- No generated protobuf files are hand-edited.
- The rename is committed separately from unrelated query, graph, or authorization work.

## Open decisions

1. Should the GitHub repository be renamed in the first rename tranche, or should the repo remain `mycel-admin` for one release while the app displays `Mycel Console`?
2. Should the Tauri bundle identifier change immediately, creating a distinct desktop app identity?
3. Should release artifacts provide transitional aliases from `mycel-admin` to `mycel-console` for one release?
4. Should internal Tauri command names keep the `admin_` prefix permanently because they map to admin/backend operations, or should they eventually move to `console_` names?
5. Should the npm package name change before or at the same time as the repository rename?
