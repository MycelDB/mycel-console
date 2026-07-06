# Domain Management Mutations Implementation Plan

## Objective

Extend the Domains section with domain lifecycle actions.

## Important API Note

The current operator-facing Admin Domain API only exposes:

- `ListDomains`
- `GetDomain`

Domain mutations currently exist on the client API:

- `DomainService.CreateDomain`
- `DomainService.UpdateDomain`
- `DomainService.DeleteDomain`

Before implementing domain mutations in `mycel-admin`, choose one of these approaches:

1. Add operator-facing domain mutation RPCs to `mycel/admin/v1/domain.proto`.
2. Allow the admin app's Rust backend to create a client-scoped `Client` for domain mutations using appropriate credentials/capabilities.

Recommended: add Admin Domain mutation RPCs so the operator console remains admin-API-first.

## Phase 1: API Decision and Proto Support

### Tasks

Choose and implement the API approach.

Recommended admin proto additions:

```proto
rpc CreateDomain(AdminCreateDomainRequest) returns (AdminCreateDomainResponse);
rpc UpdateDomain(AdminUpdateDomainRequest) returns (AdminUpdateDomainResponse);
rpc DeleteDomain(AdminDeleteDomainRequest) returns (AdminDeleteDomainResponse);
```

Regenerate/update Rust SDK support after proto changes.

### Validation

```bash
cd ../mycel-rust-sdk && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 2: Mutation Types and Service Methods

### Tasks

Extend `src/types/domains.ts`:

```ts
export type CreateDomainInput = {
  spaceId: string
  name: string
  description?: string
  key: string
}

export type UpdateDomainInput = {
  spaceId: string
  domainId: string
  name?: string
  description?: string
}

export type DeleteDomainInput = {
  spaceId: string
  domainId: string
}
```

Add service methods:

```ts
createDomain(input): Promise<DomainInfo>
updateDomain(input): Promise<DomainInfo>
deleteDomain(input): Promise<void>
```

### Validation

```bash
npm run build
```

---

## Phase 3: Rust Mutation Commands

### Tasks

Extend:

```text
src-tauri/src/commands/domains.rs
```

Add commands:

```rust
admin_create_domain
admin_update_domain
admin_delete_domain
```

Behavior:

- require authenticated admin session
- validate `spaceId`
- validate required domain fields
- call chosen mutation API
- return mapped DTOs

### Validation

```bash
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 4: Create Domain UI

### Tasks

Create:

```text
src/features/domains/components/CreateDomainModal.tsx
```

Fields:

- selected space
- key
- name
- description

Behavior:

- validate space/key/name
- submit create command
- close and refresh on success
- show backend errors

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 5: Update Domain UI

### Tasks

Create:

```text
src/features/domains/components/EditDomainModal.tsx
```

Fields:

- name
- description

Behavior:

- disable edit for default/system domains if API disallows it
- submit update command
- update row on success
- show backend errors

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 6: Delete Domain UI

### Tasks

Create:

```text
src/features/domains/components/DeleteDomainDialog.tsx
```

Behavior:

- destructive confirmation dialog
- show domain key/name/id and space ID
- require typing domain key
- prevent delete for default domains
- call delete command
- remove row or refresh on success

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 7: Tests and Polish

### Tasks

Add tests for:

- create validation/success/error
- edit validation/success/error
- delete confirmation guard
- default domain delete prevention
- list refresh after create/delete
- row replacement after edit

Polish:

- clearly badge default/system domains
- disable invalid actions with visible explanation
- maintain selected space after mutations

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```
