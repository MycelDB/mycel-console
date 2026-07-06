# Spaces Read-Only Implementation Plan

## Objective

Add a read-only Spaces section that lets operators inspect Mycel spaces from the Admin API.

This feature should follow the same frontend/Rust/Tauri shape established by user management.

## Phase 1: Types and Service Shape

### Tasks

Create:

```text
src/types/spaces.ts
```

Define:

```ts
export type SpaceInfo = {
  spaceId: string
  name: string
  state?: string
}

export type ListSpacesInput = {
  pageSize?: number
  pageToken?: string
  includeArchived?: boolean
}

export type ListSpacesResponse = {
  spaces: SpaceInfo[]
  nextPageToken: string
}
```

Add service method:

```ts
listSpaces(input?: ListSpacesInput): Promise<ListSpacesResponse>
```

### Validation

```bash
npm run build
```

---

## Phase 2: Rust Tauri Command

### Tasks

Create:

```text
src-tauri/src/commands/spaces.rs
```

Register:

```rust
admin_list_spaces
```

Behavior:

- require authenticated admin session
- call `AdminSpaceService.ListSpaces`
- map proto `Space` into `SpaceInfo`
- return `nextPageToken`

### Validation

```bash
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 3: Spaces Page Skeleton

### Tasks

Create:

```text
src/features/spaces/pages/SpacesPage.tsx
src/features/spaces/components/SpaceTable.tsx
src/features/spaces/components/SpaceFilters.tsx
src/features/spaces/components/SpaceStateBadge.tsx
```

Update `/spaces` route to render `SpacesPage`.

Initial UI states:

- loading
- error
- empty
- table with rows

### Validation

```bash
npm run build
```

---

## Phase 4: Data Loading and Pagination

### Tasks

- Load spaces on mount with `pageSize: 100`.
- Add Refresh.
- Add Load more when `nextPageToken` is present.
- Show backend errors in `ErrorBox`.

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 5: Filters

### Tasks

- Add name search.
- Add include archived toggle that affects backend requests.
- Add loaded-result count.

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 6: Tests

### Tasks

Add tests for:

- table rendering
- empty state
- loading state
- error state
- name filtering
- include archived request flag
- refresh
- pagination

Suggested files:

```text
src/features/spaces/components/SpaceTable.test.tsx
src/features/spaces/components/SpaceFilters.test.tsx
src/features/spaces/pages/SpacesPage.test.tsx
```

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```
