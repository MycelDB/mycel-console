# App Shell and Dashboard Implementation Plan

## Objective

Introduce the authenticated operator-console structure for `mycel-console`: a persistent shell with sidebar/header navigation and a dashboard landing page.

This feature establishes the application structure that later admin sections, such as user management, will plug into.

## Phase 1: Add Routing and Shell Skeleton

### Goal

Add authenticated routing without changing the login behavior.

### Tasks

- Add `react-router-dom`.
- Create layout components:

```text
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Header.tsx
```

- Create dashboard feature folder:

```text
src/features/dashboard/pages/DashboardPage.tsx
```

- Refactor `App.tsx`:
  - unauthenticated state still renders `LoginPage`
  - authenticated state renders `BrowserRouter` + `AppShell`
  - `/` redirects to `/dashboard`
  - `/dashboard` renders `DashboardPage`

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Login still works as before. After login, the operator sees the new shell and dashboard placeholder.

---

## Phase 2: Navigation Structure

### Goal

Add the first version of sidebar navigation for the console.

### Tasks

- Add navigation entries:
  - Dashboard
  - Users
  - Spaces
  - Domains
  - Operators
  - Semantic
  - Maintenance
  - Inference
  - Settings
- Highlight active nav item based on current route.
- Add placeholder pages for not-yet-implemented sections, or route them to a simple `ComingSoonPage`.
- Keep `/users` available for the next feature.

### Validation

```bash
npm run build
```

Manual check:

- login
- click each nav item
- confirm the active state updates

### Testable State

Operators can navigate across all planned sections, even though most are placeholders.

---

## Phase 3: Header and Session Controls

### Goal

Move session information and logout out of the placeholder page and into the persistent shell header.

### Tasks

- Header displays:
  - cluster address
  - signed-in operator username
  - logout button
- Logout calls the existing `admin_logout` service.
- App returns to login after logout.
- Remove logout/session UI from the dashboard placeholder.

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

### Testable State

Authenticated shell consistently shows cluster/operator context and can logout from any section.

---

## Phase 4: Dashboard Cards

### Goal

Turn the dashboard into a useful first landing page without requiring new backend APIs.

### Tasks

Create:

```text
src/features/dashboard/components/ClusterSummaryCard.tsx
src/features/dashboard/components/AlarmList.tsx
src/features/dashboard/components/ShortcutGrid.tsx
```

Initial content:

- Cluster summary:
  - cluster address
  - operator username
  - connection state: Connected
- Alarms:
  - placeholder empty state: `No alarms available yet`
- Shortcuts:
  - Manage users
  - View spaces
  - Operators
  - Maintenance

### Validation

```bash
npm run build
```

### Testable State

Dashboard provides useful operator orientation and links into app sections.

---

## Phase 5: Shell Tests

### Goal

Add frontend tests for shell behavior.

### Tasks

- Add tests for:
  - dashboard route renders after authenticated state
  - sidebar nav links render
  - active route styling or accessible current marker
  - logout callback is invoked from header
- Prefer tests around small components (`Sidebar`, `Header`) rather than full Tauri integration.

### Validation

```bash
npm test -- --runInBand
npm run build
```

### Testable State

Shell and dashboard structure is covered by fast frontend tests.

## Out of Scope

- Real cluster health API.
- Real alarms.
- Dashboard metrics beyond current authenticated session details.
- Persistent saved layout preferences.
