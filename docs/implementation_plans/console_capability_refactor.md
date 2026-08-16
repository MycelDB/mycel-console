# Console Capability Refactor Implementation Plan

## Objective

Refactor `mycel-console` toward the future `mycel-console` model without renaming the application yet.

The app should become a principal-oriented console for a mycel environment. The authenticated principal sees features according to daemon-enforced capabilities, role bindings, and scoped access, instead of the frontend assuming an administrator-only audience.

This is an internal structure and UX refactor first. The package name, app name, repository name, binary naming, and release identity remain `mycel-console` until a later explicit rename tranche.

## Design Doc Decision

A separate design doc is not required before starting this refactor because the architecture follows the already-approved unified principal identity model:

```text
principal + role bindings + capability grants + scoped authorization
```

This implementation plan records the needed UI information architecture and role/feature mapping. Create a separate design doc only if the work expands into new daemon authorization semantics, new public API contracts, or a formal product positioning change for `mycel-console`.

## Context

The daemon has moved from split user/admin identity toward a unified principal model. In that model:

- a principal can authenticate;
- admin/operator rights are capabilities or role outcomes;
- service principals are non-login actors with narrowed capabilities;
- APIs remain authoritative for authorization;
- clients should not infer authority from legacy `isAdmin` style checks.

`mycel-console` currently presents itself as an operator/console. That is still acceptable for the current release name, but the internal structure should stop assuming that every authenticated principal is a full administrator.

## Goals

- Introduce a capability-aware feature registry and navigation model.
- Make pages/features visible according to principal capabilities and scoped access.
- Distinguish general environment features from privileged administration and operations features.
- Prepare terminology and source structure for a medium-term rename to `mycel-console`.
- Keep the app functional and testable after each phase.
- Keep the daemon/API as the source of authorization truth.

## Non-Goals

- Do not rename the repository, Tauri product name, bundle identifiers, npm package, or release artifacts in this plan.
- Do not weaken daemon-side authorization or rely on frontend checks for security.
- Do not invent product billing, subscription, credit, or pricing concepts.
- Do not add Knot PKM-specific concepts.
- Do not require all role-management UI to be complete before navigation can become capability-aware.
- Do not remove existing admin/operator pages solely because the future name will be `mycel-console`.

## Terminology

Use internally where safe:

- **console**: the application shell and feature framework.
- **principal**: authenticated human or service identity.
- **role**: a named capability bundle, not an authority primitive.
- **capability**: the daemon-authoritative permission checked by APIs.
- **scope**: the resource boundary for a capability, such as system, space, domain, inference profile, or subsystem.

Keep user-facing `mycel-console` branding until the rename tranche.

## Role and Feature Model

Roles are UI and documentation labels for capability bundles. The frontend should gate by capabilities and scoped access, not hardcoded role names.

| Role label | Feature posture |
| --- | --- |
| Basic principal | Login/logout, own session/profile, accessible dashboard cards, accessible spaces. |
| Space user | Space/domain read access, graph/query tools, permitted automation runs, permitted profile use. |
| Space maintainer | Space/domain configuration, schema/index management, semantic index configuration, automation authoring in scoped spaces. |
| Automation author/operator | Create/update/run automations, inspect automation runs, view related decisions/usage when permitted. |
| Inference admin | Inference packages, endpoints, models, capabilities, vector stores, credentials, grants, policies, profiles, decisions, usage telemetry. |
| Access admin | Principals, role bindings, capability grants, service principal visibility. |
| System operator | Cluster, raft, subsystem health, backup/quiesce/runtime operations, diagnostics. |
| Auditor/read-only operator | Read-only status, audit, inference decisions, usage telemetry, cluster/backup status. |

## Feature Areas

| Feature area | Suggested route group | Required posture |
| --- | --- | --- |
| Authentication/session | `/login`, shell header | Any authenticating principal. |
| Dashboard | `/dashboard` | Capability-filtered cards. |
| Principal self-service | `/me` or account menu | Current principal/session details. |
| Spaces | `/spaces` | List/read only accessible spaces unless system list permission exists. |
| Domains/schema | space detail routes | Space/domain scoped capabilities. |
| Query/graph tools | `/query`, space detail routes | Client graph/query capabilities scoped to a space/domain. |
| Automations | `/automations` or space detail tabs | Automation capabilities and space/domain scope. |
| Inference profiles | `/inference/profiles` or space detail tabs | Profile read/use/write capabilities by scope. |
| Inference catalog | `/inference/catalog` | Catalog read/write capabilities. |
| Credentials/grants/policies | `/inference/credentials`, `/inference/policies` | Sensitive inference admin capabilities. |
| Decisions/usage/audit | `/inference/decisions`, `/inference/usage`, `/audit` | Read-only audit/telemetry capabilities. |
| Principal/access management | `/access`, `/principals` | Principal/role/capability management capabilities. |
| Cluster/runtime/backup | `/cluster`, `/backup`, `/runtime` | System operator capabilities. |
| Diagnostics | `/diagnostics` | Operator/support capabilities. |

## Proposed Source Structure

Keep existing feature folders, but introduce console-level primitives:

```text
src/features/console/
  capabilities.ts
  featureRegistry.ts
  navigation.ts
  roles.ts
  CapabilityGate.tsx
  FeatureUnavailable.tsx
```

Move toward this broader feature map over time:

```text
src/features/auth
src/features/dashboard
src/features/principals
src/features/access
src/features/spaces
src/features/schema
src/features/query
src/features/automation
src/features/inference
src/features/backup
src/features/cluster
src/features/runtime
src/features/audit
src/features/diagnostics
```

Existing folders may remain during migration. Avoid broad file moves unless a phase needs them.

## Capability Registry Shape

Suggested frontend model:

```ts
export type CapabilityRequirement = {
  capability: string
  scope?: 'system' | 'space' | 'domain' | 'resource'
  optional?: boolean
}

export type ConsoleFeature = {
  id: string
  label: string
  route: string
  navGroup: 'environment' | 'data' | 'automation' | 'inference' | 'administration' | 'operations'
  requirements: CapabilityRequirement[]
  fallback?: 'hide' | 'disabled' | 'readonly'
}
```

The registry controls navigation and dashboard visibility. API calls still handle final allow/deny.

## Phase CC1 — Inventory Current Features and Capability Assumptions

Status: completed as a documentation-only inventory. No runtime behavior changed.

### Goal

Document what the current app exposes and where it assumes a full administrator/operator principal.

### Tasks

- Inventory current routes, sidebar entries, dashboard cards, Tauri commands, and frontend service methods.
- Map each route/command to one of:
  - general authenticated principal;
  - space/domain scoped feature;
  - access administration;
  - inference administration;
  - system operations;
  - diagnostics/audit.
- Identify pages that should become read-only when mutation capabilities are absent.
- Identify frontend labels that still imply split user/admin identity.

### Acceptance

- Inventory exists in this plan or a small companion checklist.
- No runtime behavior changes are required in this phase.

### Validation

This phase was documentation-only. Full test/build validation is deferred to CC2 when code is introduced.

## CC1 Inventory Findings

### Current shell and route inventory

Current shell state:

- `src/App.tsx` restores `admin_whoami`, shows `LoginPage` for unauthenticated state, and renders `AppShell` for any restored authenticated principal.
- `src/components/layout/Sidebar.tsx` uses hardcoded navigation and does not inspect principal capabilities.
- `src/components/layout/Header.tsx` shows cluster address and principal username, but no roles/capabilities.
- `src/components/layout/AppShell.tsx` owns the route table and has no route-level capability gates.

| Route | Current page/component | Sidebar entry | Category | Future capability posture |
| --- | --- | --- | --- | --- |
| `/dashboard` | `DashboardPage` | Dashboard | general authenticated principal + operations summaries | Always visible after login, but cards/shortcuts should be capability-filtered. |
| `/principals` | `UsersPage` | Principals | access administration | Read requires principal list/read capability; create/disable/enable/delete/password actions require separate mutation capabilities. |
| `/principals/:principalId` | `UserDetailPage` | via links | access administration + audit | Read principal/session/owned-space details; session revoke actions require session mutation capability. Future self-view should allow current principal without full access-admin rights. |
| `/principals/:principalId/access` | `AccessPage` | via links | access administration | Requires access/role/capability read; future grant/revoke actions should be separately gated. |
| `/access` | `AccessPage` | Admin access | access administration | Same as above; route label implies admin-only and should eventually become capability-aware access management. |
| `/operators` | redirect to `/access` | none | compatibility alias | Legacy operator terminology; keep alias until rename/cleanup tranche. |
| `/spaces` | `SpacesPage` | Spaces | environment + space administration | Should list accessible spaces for ordinary principals; create space is a mutation gate. |
| `/spaces/:spaceId` | `SpaceDetailPage` | via links | mixed space/domain/query/semantic/automation/diagnostics | Needs per-tab/per-action gates; read-only space users should still have useful general/domain/query views. |
| `/backups` | `BackupsPage` | Backups | system operations | Read backup status/list requires backup read/operator capability; policy update, trigger, and delete require mutation capabilities. |
| `/cluster` | `ClusterPage` | Cluster | system operations + diagnostics | Mostly read-only operator diagnostics; should be visible to system operators/auditors. |
| `/cluster/nodes/:nodeKey` | `NodeDetailPage` | via links | system operations + diagnostics | Read-only cluster diagnostics; capability-gate by cluster/diagnostic read. |
| `/inference` | `InferencePage` | Inference | inference administration | Catalog read can be read-only; package import requires catalog/package mutation capability. Future profile/credential/policy tabs need finer gates. |
| `/maintenance` | `MaintenancePage` | Maintenance | operations placeholder | Should gate by maintenance/operator capabilities once implemented. |
| `/semantic` | `ComingSoonPage` | Semantic | semantic/inference placeholder | Existing label is stale after standalone inference cleanup; likely fold into space semantic tabs and inference profile/catalog areas. |
| `/settings` | `ComingSoonPage` | Settings | local console settings | Local app preferences should be available to any authenticated principal; cluster connection changes may be local-only. |
| `*` | redirect to `/dashboard` | none | fallback | No capability implications. |

### Current dashboard and navigation assumptions

Hardcoded sidebar entries:

```text
Dashboard, Principals, Spaces, Backups, Cluster, Admin access, Semantic, Maintenance, Inference, Settings
```

Hardcoded dashboard shortcuts:

```text
Manage principals, View spaces, Admin access, Maintenance
```

Findings:

- Navigation currently assumes an operator/admin audience because every authenticated principal sees every route link.
- Dashboard shortcuts mix general environment features (`View spaces`) with access-admin and operations features.
- `Admin access` is the most explicit admin-only label; it should become an access-management feature label that is hidden/disabled without access capabilities.
- `Semantic` is a placeholder and should not become a top-level current-system concept unless it is reframed around semantic indexes/search; active inference operations belong under `Inference` or space detail tabs.

### Current Tauri command and service inventory

| Command/service group | Frontend methods | Category | Read/mutation split for future gates |
| --- | --- | --- | --- |
| Auth/session | `login`, `connectionDiagnostics`, `whoAmI`, `logout` | general authenticated principal | Login/logout/whoami are general. Diagnostics may be shown pre-login and post-login with safe detail levels. |
| Client query identity/query execution | `clientQueryLogin`, `clientQueryLogout`, `executeGraphQuery`, `executeGql`, `executeGqlScript` | space/domain scoped data feature | Query execution must use client graph/query capabilities for the selected space/domain; read-write GQL needs explicit mutation/commit gate. |
| Cluster diagnostics | `getClusterStatus`, `getClusterRuntimeStatus`, `listRaftGroups`, `lookupSpaceRoute`, `getClusterHealth`, `listClusterMembers` | system operations + diagnostics | Read-only; gate by cluster/status/diagnostic read. |
| Graph consistency/forensics | `getLocalGraphConsistency`, `getGraphConsistencyReport`, `getLocalGraphForensicExport` | diagnostics/audit | Read/export diagnostics; gate by diagnostic/forensic read/export capability. |
| Principal management | `listPrincipals`, `getPrincipal`, `createPrincipal`, `disablePrincipal`, `enablePrincipal`, `deletePrincipal`, `setPrincipalPassword` | access administration | Read/list/get separated from lifecycle/password mutations. |
| Principal roles/capabilities/sessions | `listPrincipalRoles`, `listPrincipalCapabilities`, `listPrincipalSessions`, `revokePrincipalSession`, `revokePrincipalSessions` | access administration + audit | Roles/capabilities/session list are read; revoke is mutation. Self-session view/revoke may become a general principal path. |
| Spaces | `listSpaces`, `getSpace`, `createSpace` | environment + space administration | List/get should support scoped accessible spaces; create is mutation/system or tenant-admin gate. |
| Domains/schema | `listDomains`, `getDomainSchema`, `deleteDomainSchema` | space/domain scoped schema feature | List/get read by space/domain capability; schema delete is mutation gate. |
| Automations | `listAutomations`, `getAutomation`, `enableAutomation`, `disableAutomation`, `listAutomationInvocations`, `getAutomationRun` | automation + space/domain scoped feature | List/get/runs read by automation read; enable/disable mutation gate. Create/update are not currently exposed here. |
| Semantic indexes | `listSemanticIndexes` | space/domain semantic feature | Read gate by semantic/index read or space maintainer role. |
| Semantic maintenance | `getSemanticMaintenanceStatus`, `listSemanticMaintenanceWork`, `analyzeSemanticDirtyWork`, `processSemanticDirtyWork`, `backfillSemanticIndex`, `retrySemanticMaintenanceWork`, `cancelSemanticMaintenanceWork` | operations + space-scoped maintenance | Status/list are read; analyze/process/backfill/retry/cancel are maintenance mutations. |
| Backups | `getBackupPolicy`, `updateBackupPolicy`, `getBackupStatus`, `listBackups`, `triggerBackup`, `deleteBackup` | system operations | Policy/status/list read gates; update/trigger/delete mutation gates. |
| Inference catalog | `listInferencePackages`, `listModelEndpoints`, `listModels`, `listVectorStores`, `listModelEndpointCapabilities`, `applyInferencePackage` | inference administration | Catalog list read gates; package import/apply mutation gate. Future credentials/grants/policies/profiles need separate sensitive gates. |

### Current page action gates needed

Pages that should support read-only mode:

- `UsersPage`: list/filter principals can be read-only; create/disable/enable/delete/password controls require mutation gates.
- `UserDetailPage`: identity, sessions, owned spaces, diagnostic guidance can be read-only; revoke session controls require mutation gates. A self-service variant should be allowed for the current principal.
- `AccessPage`: role/capability lists can be read-only; future grant/revoke actions require access-admin mutation gates.
- `SpacesPage`: list/filter/get space can be read-only; create space requires mutation gate.
- `SpaceDetailPage`: general/domains/schema/query/semantic/automation/maintenance tabs need independent gates; read-write query and maintenance actions are the highest-risk current mutations.
- `BackupsPage`: status/list can be read-only; policy update, backup trigger, and delete require system-operator mutation gates.
- `InferencePage`: catalog tabs can be read-only; package import requires inference catalog mutation gate.
- `ClusterPage` and `NodeDetailPage`: currently read-only diagnostics and can be auditor/operator visible.

### Current terminology drift

Labels and paths that still reflect older admin/user framing:

- Application branding remains `Mycel Console` by design for now.
- Route/folder/component names use `users` while UI copy now mostly says `principal`; keep compatibility until a file/folder rename phase.
- `Admin access` implies admin-only; future label should be `Access` or `Access management`.
- Tauri commands use `admin_*` prefixes because they target Admin API surfaces. This can remain until the product rename/API split is explicitly planned.
- `Semantic` top-level nav is a placeholder and no longer represents the standalone inference architecture well.
- `client query identity` in `SpaceDetailPage` is conceptually correct but should be explained as a scoped data identity, not a second user/admin security model.

### CC1 follow-up requirements for CC2–CC4

- Build a feature registry that can represent both route-level and action-level requirements.
- Include fallback behavior per feature: hide, disabled, or readonly.
- Keep permissive defaults until current-principal capability discovery is wired, so existing operators are not locked out.
- Make dashboard shortcuts use the same registry as sidebar navigation.
- Treat `SpaceDetailPage` as the main mixed-scope page requiring tab/action gates, not a single capability gate.
- Treat frontend gates as UX only; every Tauri/backend/API call must still surface permission-denied responses.

## Phase CC2 — Add Console Capability Primitives

Status: implemented. Added console capability primitives, a current feature registry, navigation grouping helpers, role bundle metadata, `CapabilityGate`, `FeatureUnavailable`, and focused tests. These primitives are not wired into the live shell yet, so visible app behavior remains unchanged.

Validation passed:

```bash
npm test -- --runInBand --watch=false src/features/console
npm test -- --runInBand --watch=false
npm run build
```

### Goal

Introduce shared frontend primitives without changing the visible app behavior.

### Tasks

Create:

```text
src/features/console/capabilities.ts
src/features/console/featureRegistry.ts
src/features/console/navigation.ts
src/features/console/CapabilityGate.tsx
src/features/console/FeatureUnavailable.tsx
```

Add tests for:

- capability matching;
- optional requirements;
- feature visibility fallback;
- nav grouping order.

Use permissive defaults initially so current admin behavior remains unchanged until capability data is wired.

### Acceptance

- Existing routes and pages still render for authenticated sessions.
- New console primitives are covered by frontend tests.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
```

## Phase CC3 — Surface Current Principal and Capability Summary

Status: implemented. Added a best-effort console principal context loader that uses current principal roles/capabilities APIs, maps access scopes into console capability scopes, models complete/partial/unknown capability states, and surfaces the loaded access summary in the shell header. Route/navigation behavior remains unchanged.

Validation passed:

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

Note: `cargo check` without `MYCEL_API_ROOT` can fail when the local Rust SDK build script sees stale or missing vendored inference protobuf services. Use an absolute `MYCEL_API_ROOT` for this workspace.

### Goal

Make authenticated principal context available to the shell.

### Tasks

- Extend auth/session state to expose current principal ID, display name/username where available, roles, and capability summaries.
- Prefer a daemon/API-backed `whoami` or current-session response if available.
- If complete capability discovery is not yet available, model the result as partial:

```ts
type PrincipalCapabilityState =
  | { kind: 'complete'; capabilities: CapabilityGrantSummary[] }
  | { kind: 'partial'; roles: string[]; warnings: string[] }
  | { kind: 'unknown'; warnings: string[] }
```

- Render unknown/partial state explicitly in diagnostics rather than silently granting UI affordances.

### Acceptance

- Header/account menu can show principal-oriented identity.
- Capability state is available to navigation code.
- Unknown capability state has safe UI behavior.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

## Phase CC4 — Capability-Aware Navigation and Dashboard

Status: implemented. Sidebar navigation and dashboard shortcuts now render from the console feature registry. Complete capability discovery filters features; partial/unknown/loading capability states intentionally use a permissive wildcard state so existing operators are not locked out while capability discovery matures. Feature tests cover filtering and deterministic navigation grouping.

Validation passed:

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Goal

Replace hardcoded admin navigation assumptions with registry-driven navigation.

### Tasks

- Define registry entries for current features:
  - dashboard;
  - spaces;
  - access/principals;
  - inference;
  - cluster;
  - backup/operations pages that exist;
  - diagnostics pages that exist.
- Update `Sidebar` to render features by registry and principal capability state.
- Update dashboard shortcut cards to use the same registry.
- For partial capability discovery, prefer showing current admin pages as before with a warning only when necessary, to avoid locking out existing operators.

### Acceptance

- Sidebar/dashboard are registry-driven.
- Tests verify visible/hidden/disabled behavior for representative capability sets.
- Existing full-operator login still sees current admin features.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
```

## Phase CC5 — Split General Principal Pages from Privileged Admin Pages

Status: implemented. Added a general `/me` account page for the current authenticated principal, linked it from the header, added it to the console feature registry/navigation, and kept existing principal/access admin routes intact. Access navigation/copy now starts moving from `Admin access` toward `Access management` while the app remains branded as `mycel-console`.

Validation passed:

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Goal

Make the app structure reflect both environment users and operators.

### Tasks

- Add a general account/principal page or account panel for the current principal.
- Reclassify spaces as an environment feature, not purely an admin feature.
- Ensure space detail pages can support read-only scoped access.
- Start moving labels from `Users` toward `Principals`/`Access` where aligned with the daemon API.
- Keep old route aliases where needed to avoid breaking current tests/bookmarks.

### Acceptance

- A non-admin-shaped principal can have a meaningful console surface: dashboard, account, accessible spaces.
- Admin/operator-only pages remain gated separately.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
```

## Phase CC6 — Feature-Level Read-Only and Mutation Gates

Status: completed for current high-risk mutation surfaces. Added action-level capability checks while preserving readable page content when read access exists. Frontend gates remain UX hints only; daemon/API authorization is authoritative.

### Goal

Within visible pages, hide or disable actions the principal cannot perform.

### Tasks

- Added action gates around destructive and privileged actions:
  - space creation;
  - principal create/disable/enable/delete/password changes;
  - principal session revoke actions;
  - inference package import;
  - backup policy save, manual trigger, and backup delete;
  - semantic maintenance analyze/process/retry/cancel/backfill;
  - automation enable/disable toggles;
  - graph query read-write mode.
- Preserved read-only page access where read capabilities exist but mutation capabilities do not.
- Split frontend `backup.read` from `backup.manage` and `semantic.search` from `semantic.manage` so read/search grants no longer satisfy mutation gates.
- Unknown/partial/loading capability discovery remains intentionally permissive through the existing live-state helper.
- Complete capability context is augmented with daemon role-bundle capabilities as a temporary UX bridge for capabilities not yet represented by the enum-based access API.

### Acceptance

- Read-only users do not see or cannot trigger mutation affordances.
- API-denied errors are still handled even if frontend gating was wrong or stale.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

## Phase CC7 — Role Bundle Documentation and Admin UX

Status: completed. Added operator-facing role bundle metadata, a role bundle guide on the Account page, matched current roles to explanatory bundle labels, and kept daemon capabilities as the explicit authority.

### Goal

Document role bundles as operator-facing presets without making the frontend depend on role names for security.

### Tasks

- Added a role/capability help panel on `/me` describing typical bundles:
  - Basic principal;
  - Space user;
  - Space maintainer;
  - Automation author/operator;
  - Inference admin;
  - Access admin;
  - System operator;
  - Auditor/read-only operator.
- Displayed current role labels beside effective capabilities and matched them to explanatory bundle labels.
- Made clear that daemon capabilities and scopes are authoritative.

### Acceptance

- Operators can understand why a feature is visible or unavailable.
- Role labels are treated as explanatory metadata, not authorization checks.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
```

## Phase CC8 — Prepare Rename Seam for `mycel-console`

Status: completed as a rename seam only. Current release identity remains `mycel-console`; source UI branding is isolated and a future rename checklist exists at `docs/implementation_plans/mycel_console_rename_checklist.md`.

### Goal

Make a future rename mostly mechanical.

### Tasks

- Continued using `console` in new internal component/type names where safe.
- Isolated source UI branding strings in `src/features/console/branding.ts`.
- Added a rename checklist for the later tranche covering:
  - repository/package name;
  - Tauri product name and bundle identifiers;
  - binary names;
  - docs paths;
  - CI workflow names;
  - release artifacts;
  - screenshots and user-facing copy.
- Did not execute the rename in this phase.

### Acceptance

- Future rename has a clear checklist.
- Current app still ships as `mycel-console`.

### Validation

```bash
npm test -- --runInBand --watch=false
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api PATH="$HOME/.cargo/bin:$PATH" cargo check
```

## Cross-Repository Considerations

### mycel

May need read-only capability discovery or current-principal introspection improvements if current APIs do not expose enough information for good UX.

### mycel-api

Only needed if capability discovery/current-principal APIs are insufficient. Do not add UI-only authorization concepts.

### mycel-rust-sdk

Regenerate or add helper methods only if `mycel-api` changes.

### mycel-console

Primary implementation target for this plan.

## Testing Matrix

| Area | Required tests |
| --- | --- |
| Capability matching | exact capability, missing capability, optional requirement, scoped requirement where modeled |
| Navigation | feature hidden/disabled/visible by capability set |
| Dashboard | cards follow same registry as sidebar |
| Page actions | mutation buttons hidden/disabled for read-only principals |
| Auth context | full, partial, and unknown capability states |
| Error handling | daemon permission-denied remains visible and actionable |
| Build | frontend build and Tauri cargo check |

## Open Questions

1. What daemon API should be the canonical source for effective capability discovery?
2. Should the app show disabled features with explanations, or hide unauthorized features by default?
3. Should space-scoped capability checks be evaluated globally for navigation, or lazily inside selected spaces?
4. How much self-service should a basic principal have initially?
5. Should role-bundle management be part of this refactor or a later access-admin feature plan?
6. Remove or narrow the temporary role-derived frontend capability bridge once the access API exposes all effective capabilities as stable strings or enums.
7. Centralize canonical role alias mapping if the display mapping and role-derived capability bridge start to drift.

## Suggested Initial Implementation Order

1. CC1 inventory.
2. CC2 capability primitives.
3. CC4 registry-driven navigation with permissive current behavior.
4. CC3 current-principal capability state once API shape is confirmed.
5. CC6 action-level gates.
6. CC5 general principal/environment pages.
7. CC7 role-bundle docs/UX.
8. CC8 rename seam.
