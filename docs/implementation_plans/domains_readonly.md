# Domains Read-Only Implementation Plan

## Objective

Add a read-only Domains section that lets operators inspect domains inside spaces.

Domains are space-scoped, so the UI should make space selection explicit.

## Phase 1: Types and Service Shape

### Tasks

Create:

```text
src/types/domains.ts
```

Define:

```ts
export type DomainInfo = {
  spaceId: string
  domainId: string
  key: string
  name: string
  description?: string
  state?: string
  default: boolean
  system: boolean
}

export type ListDomainsInput = {
  spaceId: string
  pageSize?: number
  pageToken?: string
  includeSystem?: boolean
}

export type ListDomainsResponse = {
  domains: DomainInfo[]
  nextPageToken: string
}
```

Add service method:

```ts
listDomains(input: ListDomainsInput): Promise<ListDomainsResponse>
```

### Validation

```bash
npm run build
```

---

## Phase 2: Rust Tauri Command

### Tasks

Create or extend:

```text
src-tauri/src/commands/domains.rs
```

Register:

```rust
admin_list_domains
```

Behavior:

- require authenticated admin session
- require `spaceId`
- call `AdminDomainService.ListDomains`
- map proto `Domain` into `DomainInfo`
- return `nextPageToken`

### Validation

```bash
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 3: Domains Page Skeleton

### Tasks

Create:

```text
src/features/domains/pages/DomainsPage.tsx
src/features/domains/components/DomainTable.tsx
src/features/domains/components/DomainFilters.tsx
src/features/domains/components/DomainStateBadge.tsx
```

Update `/domains` route to render `DomainsPage`.

Initial states:

- no space selected
- loading
- error
- empty
- table with rows

### Validation

```bash
npm run build
```

---

## Phase 4: Space Selection

### Tasks

Domains need a selected space. Reuse `listSpaces` from the Spaces feature.

- Load spaces for a space selector.
- Select first space by default if available.
- Allow operators to switch spaces.
- Reload domains when selected space changes.

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 5: Data Loading and Pagination

### Tasks

- Load domains for selected space with `pageSize: 100`.
- Add Refresh.
- Add Load more.
- Show backend errors in `ErrorBox`.

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 6: Filters

### Tasks

- Filter by key/name.
- Filter by state if available.
- Include system toggle that affects backend request.
- Show default/system badges.

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 7: Tests

### Tasks

Add tests for:

- no-space state
- space selector
- domain rows
- default/system badges
- loading/error/empty states
- filtering
- include system request flag
- refresh/pagination

Suggested files:

```text
src/features/domains/components/DomainTable.test.tsx
src/features/domains/components/DomainFilters.test.tsx
src/features/domains/pages/DomainsPage.test.tsx
```

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```
