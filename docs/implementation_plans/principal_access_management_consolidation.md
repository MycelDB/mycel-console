# Principal-Centered Access Management Implementation Plan

Status: implemented in mycel Console. Note: the first graph automation author helper grants the scoped `automation.admin` role, which expands to the needed automation/inference-profile capabilities, because the current public AdminPrincipal capability grant API is enum-based and does not yet expose string-valued automation/inference capability grants.

## Goal

Remove the standalone **Access Management** navigation area from mycel Console and make role/capability management part of the **Principals** workflow.

Target admin workflow:

```text
Principals → locate Alice → open Alice → Roles & capabilities tab → grant/revoke roles/capabilities
```

This avoids two competing places for principal access state and keeps identity and authorization management attached to the actor being managed.

## Decisions

- **Principals** is the primary UI surface for identity and access editing.
- Remove **Access Management** from the main sidebar/navigation.
- Reuse/refactor the current read-only Access Management data fetching where useful, but present it inside a principal detail tab.
- Daemon/API authorization remains authoritative; frontend gates are UX only.
- Initial editing can be principal-scoped; no cross-principal matrix editor is required.
- Prefer explicit grants/revokes with confirmation and audit reason fields.
- Use **View** for row detail actions, consistent with current Console preference.
- Keep mycel standalone terminology; avoid app/domain-specific concepts.

## Proposed Information Architecture

```text
Principals
  ├─ Principal list
  └─ Principal detail
       ├─ Overview
       ├─ Roles & capabilities
       ├─ Sessions
       └─ Audit/activity later
```

Main sidebar:

```text
Dashboard
Spaces
Principals
Inference
Backups
Cluster
Account
```

Remove:

```text
Access Management
```

## Principal Detail Wireframe

```text
Alice
alice · prn_abc123 · human · active

[ Back to principals ] [ Refresh ]

Tabs:
[ Overview ] [ Roles & capabilities ] [ Sessions ]
```

### Roles & capabilities tab

```text
Roles & capabilities
Daemon authorization is authoritative. Console only edits grants through admin APIs.

┌───────────────────┬────────────────────┬────────────────────┐
│ Effective roles   │ Effective caps      │ Direct grants       │
│ 2                 │ 14                  │ 5                   │
└───────────────────┴────────────────────┴────────────────────┘

Effective roles
[ space.owner ] [ automation.admin ]

Effective capabilities
[ space.read ] [ graph.read ] [ automation.read ] [ automation.manage ]
[ automation.run ] [ inference.profile.read ] ...
```

## Role Grants Section

```text
Role grants                                      [ + Grant role ]

┌──────────────────────┬───────────────┬─────────────────────────┬──────────┐
│ Role                 │ Scope         │ Reason                  │ Actions  │
├──────────────────────┼───────────────┼─────────────────────────┼──────────┤
│ automation.admin     │ Space: Notes  │ author graph workflows  │ Revoke   │
│ space.owner          │ Space: Notes  │ owner                   │ Revoke   │
└──────────────────────┴───────────────┴─────────────────────────┴──────────┘
```

### Grant role flow

Use a dedicated form panel or modal:

```text
Grant role to Alice

Role
[ automation.admin                         v ]

Scope
( ) System-wide
(•) Space
    [ Notes                                v ]
( ) Domain
    Space  [ Notes                         v ]
    Domain [ Research                      v ]

Reason
[ Allow Alice to manage graph automations in Notes ]

[ Cancel ] [ Grant role ]
```

## Capability Grants Section

```text
Capability grants                                  [ + Grant capability ]

┌────────────────────────────┬───────────────┬────────────────────┬─────────┐
│ Capability                 │ Scope         │ Reason             │ Actions │
├────────────────────────────┼───────────────┼────────────────────┼─────────┤
│ automation.manage          │ Space: Notes  │ automation author  │ Revoke  │
│ automation.run             │ Space: Notes  │ automation author  │ Revoke  │
│ inference.profile.read     │ Space: Notes  │ select profiles    │ Revoke  │
└────────────────────────────┴───────────────┴────────────────────┴─────────┘
```

### Grant capability flow

```text
Grant capability to Alice

Capability
[ automation.manage                       v ]

Scope
( ) System-wide
(•) Space
    [ Notes                                v ]
( ) Domain
    Space  [ Notes                         v ]
    Domain [ Research                      v ]

Reason
[ Allow Alice to create and edit graph automations ]

[ Cancel ] [ Grant capability ]
```

## Recommended Bundle Helper

Add a guided helper for common bundles. First bundle:

```text
Graph automation author bundle

This will grant:
  ✓ automation.read
  ✓ automation.manage
  ✓ automation.run
  ✓ inference.profile.read

Scope
[ Notes space v ]

Reason
[ Allow Alice to manage graph automations in Notes ]

[ Cancel ] [ Apply bundle ]
```

Expected behavior:

- Creates individual capability grants.
- If a capability is already effectively present in the selected scope, show it as already satisfied and avoid duplicate direct grants where possible.
- Show created grant count and any skipped capabilities after submission.

## Revoke Flow

Use confirmation, never one-click destructive access changes.

```text
Revoke grant?

Principal: Alice
Grant: automation.manage
Scope: Space Notes

Reason
[ No longer managing graph automations ]

[ Cancel ] [ Revoke grant ]
```

## Implementation Phases

### Phase 1 — Inventory current principal/access UI and services

- Identify current routes/navigation entries for:
  - Principals/users list
  - Principal/user detail
  - Access Management page
- Inventory existing service functions:
  - `getPrincipal`
  - `listPrincipals`
  - `listPrincipalRoles`
  - `listPrincipalCapabilities`
  - grant/revoke role service support, if present
  - grant/revoke capability service support, if present
- Inventory Tauri command support for role/capability mutation.
- Identify current tests that mention Access Management navigation.

### Phase 2 — Add principal detail tab structure

- Add tab state/routing to principal detail page:
  - Overview
  - Roles & capabilities
  - Sessions, if already supported; otherwise placeholder/follow-up
- Move or extract read-only access rendering from `AccessPage` into reusable components:
  - `EffectiveAccessSummary`
  - `RoleGrantTable`
  - `CapabilityGrantTable`
  - `ScopeLabel`
- Keep initial behavior read-only during this phase.

### Phase 3 — Remove standalone Access Management from navigation

- Remove Access Management from sidebar/main navigation registry.
- Keep old route temporarily redirected to Principals or Principal detail if needed:

```text
/access          → /principals
/access/:id      → /principals/:id?tab=access
```

- Update navigation tests and app shell tests.

### Phase 4 — Add grant/revoke service wiring

If missing, add Console service/Tauri support for admin APIs:

- `grantPrincipalRole(principalId, role, scope, reason)`
- `revokePrincipalRole(principalId, roleGrantId, reason)`
- `grantPrincipalCapability(principalId, capability, scope, reason)`
- `revokePrincipalCapability(principalId, capabilityGrantId, reason)`

Do not change public protobuf unless required. If public API scope fields already exist, use them.

### Phase 5 — Add role grant UI

- Add **Grant role** button to Roles & capabilities tab.
- Use dropdown role choices:
  - `space.owner` / `space.admin` / `space.editor` / `space.viewer` if supported
  - `automation.admin`
  - `inference.admin`
  - `semantic.admin`
  - `identity.admin`
  - `system.admin`
  - other daemon-supported roles
- Add scope selector:
  - System-wide
  - Space dropdown
  - Domain dropdown filtered by selected space
- Add required/optional reason text.
- Add revoke confirmation.

### Phase 6 — Add capability grant UI

- Add **Grant capability** button.
- Use dropdown capability choices grouped by subsystem:
  - Space/domain
  - Graph/query/blob/metadata
  - Inference
  - Automation
  - Identity/admin
  - Backup/cluster
- Add the same scope selector.
- Add reason text.
- Add revoke confirmation.

### Phase 7 — Add recommended bundles

- Add **Apply graph automation author bundle** helper.
- First bundle grants:
  - `automation.read`
  - `automation.manage`
  - `automation.run`
  - `inference.profile.read`
- Scope should default to space scope.
- Domain scope can be supported later if daemon checks are domain-scoped for automations.

### Phase 8 — Polish and guardrails

- Show disabled/missing mutation controls if current admin lacks `identity.grant.manage`.
- Warn for system-wide grants:

```text
System-wide grants apply across all spaces. Prefer scoped grants when possible.
```

- Keep effective access clearly separate from direct grants:
  - Effective roles/caps may come from roles, inherited grants, or system grants.
  - Direct grant tables show only revocable grants returned by the API.
- Show post-submit success and reload effective access.

### Phase 9 — Tests

Add/update tests for:

- Access Management no longer appears in sidebar/navigation.
- Principals list still works.
- Principal detail includes Roles & capabilities tab.
- Roles & capabilities tab loads effective roles/capabilities and direct grants.
- Grant role form sends selected role, scope, and reason.
- Revoke role confirmation sends grant ID and reason.
- Grant capability form sends selected capability, scope, and reason.
- Revoke capability confirmation sends grant ID and reason.
- Graph automation author bundle creates the expected capability grants.
- Mutation controls are hidden/disabled when current principal lacks grant-management capability.

## Acceptance Criteria

- Admins can manage roles and capabilities from a principal detail page.
- Standalone Access Management is removed from primary navigation.
- Existing read-only access information is preserved under Principal detail.
- Grant and revoke operations require explicit actions and support audit reasons.
- Space/domain scope uses dropdowns, not raw text IDs.
- Graph automation author setup for a user can be done from Principal detail without CLI.
- Daemon/API remains authoritative; Console does not infer authorization beyond UX hints.
- Tests/build pass:

```sh
cd mycel-console
npx tsc --noEmit
npm test -- --runInBand
npm run build
cd src-tauri && MYCEL_API_ROOT=../../mycel-api cargo check
```

## Follow-ups

- Add access audit/event history once daemon audit APIs expose enough detail.
- Add a cross-principal reporting page only if operators need compliance/export views; do not call it Access Management unless it edits access.
- Consider CLI parity for scoped role/capability grants if current CLI only supports system-scoped grants.
