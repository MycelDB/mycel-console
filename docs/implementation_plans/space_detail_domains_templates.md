# Space Detail, Domains, and Templates

## Goal

Make spaces the entry point for space-scoped resources. Operators should open a space detail page to inspect full space properties, domains, and template availability/status.

## Current implementation

### Routing

- `/spaces` renders the spaces list.
- `/spaces/:spaceId` renders the space detail page.
- Space names in the spaces table link to their detail route.

### Space properties

The Tauri backend exposes:

- `admin_get_space(space_id)`
- `admin_list_spaces(input)`

`admin_get_space` maps the Admin Space API response to a frontend DTO containing:

- `spaceId`
- `name`
- `owner`
- `state`
- `createTime`
- `updateTime`
- `callerAccess`
- `templateUsage`

Frontend service:

- `getSpace(spaceId)`

### Space-scoped domains

The Tauri backend exposes:

- `admin_list_domains(input)`

Domain listing is scoped by `spaceId` and supports:

- `pageSize`
- `pageToken`
- `includeSystem`

The space detail page renders a Domains section with:

- Name
- Key
- Domain ID
- Flags (`default`, `system`)
- Include system domains toggle
- Load more pagination
- independent domain loading/error state

Frontend service:

- `listDomains(input)`

### Templates

Templates are confirmed to be space-scoped in the client API:

- `mycel.client.v1.TemplateService.ListTemplates(space_id)`

However, the operator-facing Admin API currently has no `AdminTemplateService`. Because this app is operator/admin login only, the admin console does not create a user-scoped client session as a workaround.

The space detail page therefore renders a Templates section explaining the API status and reserving the space for a future admin-safe template endpoint.

## Files

### Backend

- `src-tauri/src/commands/spaces.rs`
- `src-tauri/src/commands/domains.rs`
- `src-tauri/src/commands/mod.rs`
- `src-tauri/src/lib.rs`

### Frontend types/services

- `src/types/spaces.ts`
- `src/types/domains.ts`
- `src/types/templates.ts`
- `src/services/adminService.ts`

### UI

- `src/features/spaces/components/SpaceTable.tsx`
- `src/features/spaces/pages/SpacesPage.tsx`
- `src/features/spaces/pages/SpaceDetailPage.tsx`
- `src/components/layout/AppShell.tsx`

### Tests

- `src/features/spaces/components/SpaceTable.test.tsx`
- `src/features/spaces/pages/SpacesPage.test.tsx`
- `src/features/spaces/pages/SpaceDetailPage.test.tsx`
- `src/components/layout/AppShell.test.tsx`
- `src/services/adminService.test.ts`

## Validation

Run:

```bash
npm test -- --runInBand
npm run build
PATH="$HOME/.cargo/bin:$PATH" cargo check --manifest-path src-tauri/Cargo.toml
```

Latest phase validation passed with all frontend tests, build, and Rust cargo check.

## Future work

When Admin API support is available, add one of:

- `AdminTemplateService.ListTemplates`, or
- a clearly operator-authorized template listing method on an existing Admin service.

Then wire it to:

- `src-tauri/src/commands/templates.rs`
- `src/types/templates.ts`
- `src/services/adminService.ts`
- `TemplateSection` in `SpaceDetailPage.tsx`
