# Space Management Mutations Implementation Plan

## Objective

Extend the Spaces section with safe space lifecycle actions.

Supported by current Admin API:

- create space
- delete space

## Phase 1: Mutation Types and Service Methods

### Tasks

Extend `src/types/spaces.ts`:

```ts
export type CreateSpaceInput = {
  name: string
  ownerUserId?: string
  ownerUsername?: string
  defaultDomainKey?: string
  defaultDomainName?: string
}

export type CreateSpaceResponse = {
  space: SpaceInfo
  defaultDomainId: string
}

export type DeleteSpaceInput = {
  spaceId: string
}
```

Add service methods:

```ts
createSpace(input: CreateSpaceInput): Promise<CreateSpaceResponse>
deleteSpace(input: DeleteSpaceInput): Promise<void>
```

### Validation

```bash
npm run build
```

---

## Phase 2: Rust Mutation Commands

### Tasks

Extend:

```text
src-tauri/src/commands/spaces.rs
```

Add commands:

```rust
admin_create_space
admin_delete_space
```

Behavior:

- require authenticated admin session
- validate required name for create
- validate space ID for delete
- call `AdminSpaceService.CreateSpace` / `DeleteSpace`
- return mapped DTOs

### Validation

```bash
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```

---

## Phase 3: Create Space UI

### Tasks

Create:

```text
src/features/spaces/components/CreateSpaceModal.tsx
```

Fields:

- space name
- owner username or owner user ID
- default domain key
- default domain name

Behavior:

- validate name
- submit create command
- close on success
- refresh spaces list
- show backend errors

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 4: Delete Space UI

### Tasks

Create:

```text
src/features/spaces/components/DeleteSpaceDialog.tsx
```

Behavior:

- destructive confirmation dialog
- show space name and ID
- require typing the space name
- call delete command
- remove row or refresh list on success

### Validation

```bash
npm test -- --runInBand
npm run build
```

---

## Phase 5: Tests and Polish

### Tasks

Add tests for:

- create validation
- create success and refresh
- create backend error
- delete confirmation guard
- delete success
- delete backend error
- loading states

Polish:

- disable mutation buttons while in flight
- ensure keyboard accessibility for dialogs
- make destructive styling consistent with user management

### Validation

```bash
npm test -- --runInBand
npm run build
cd src-tauri && PATH="$HOME/.cargo/bin:$PATH" cargo check
```
