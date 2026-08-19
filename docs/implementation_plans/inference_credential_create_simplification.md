# Inference Credential Create Simplification Implementation Plan

## Goal

Simplify mycel Console credential creation to only ask for fields the operator should decide today:

1. Credential key
2. Endpoint dropdown
3. API key
4. Make default checkbox

Remove speculative/advanced create fields from the Console surface. If ownership/auth variants are needed later, re-add them with a concrete use case.

## Decisions

- Console credential create is for system-owned API-key credentials only.
- Endpoint must be selected from catalog data, not typed manually.
- API key is pasted once, sent to daemon, cleared after submit, and never displayed again.
- Display name is not collected. Use credential key as display name if the API still has a display-name field.
- Console create defaults:
  - `ownerType = "system"`
  - `ownerId = "system"`
  - `authType = "api_key"`
  - `displayName = key`
- `Make default` remains visible as a checkbox, checked by default.
- Daemon/API authorization remains authoritative.

## User-Facing Form

Credentials tab create panel:

```text
Credential key  [ openai-default        ]
Endpoint        [ openai / OpenAI     v ]
API key         [ ••••••••••••••••••••  ]
☑ Make default

[Create credential]
```

### Field behavior

#### Credential key

- Required.
- Text input.
- Suggested default: `openai-default` only if endpoint is OpenAI or current catalog convention supports it; otherwise blank or endpoint-derived.

#### Endpoint

- Required.
- Dropdown populated from `listModelEndpoints({ pageSize: 500, includeDisabled: true })`.
- Display endpoint key/name first.
- Use endpoint ID internally where available.
- Disabled endpoints can either:
  - be hidden from the create dropdown, or
  - shown with a disabled marker.
- Recommended first cut: show enabled endpoints only, with a small note if none exist.

#### API key

- Required.
- Password input.
- Do not log, echo, store in React-visible detail state beyond form state, or include in detail drawers.
- Clear after successful create.

#### Make default

- Checkbox.
- Default checked.
- Sent as `isDefault`.

## Removed Console Create Fields

Remove these from the visible credential create form:

- Display name
- Owner type
- Owner ID
- Auth type

Do not move them to a collapsed “advanced” section for this first cut.

## Type/Service Shape

### Frontend draft state

Replace current credential form state with:

```ts
type CredentialDraft = {
  key: string;
  modelEndpointId: string;
  secretValue: string;
  isDefault: boolean;
};
```

If backend/Tauri still accepts endpoint key as fallback, keep only endpoint ID from the dropdown for normal Console create.

### Submit payload

Build `CreateCredentialInput` like:

```ts
{
  key: draft.key,
  displayName: draft.key,
  modelEndpointId: draft.modelEndpointId,
  ownerType: "system",
  ownerId: "system",
  authType: "api_key",
  secretValue: draft.secretValue,
  isDefault: draft.isDefault,
}
```

If a follow-up removes unused public API fields, update the payload to only send the simplified request fields.

## Implementation Phases

### Phase 1 — Endpoint data wiring

- On Credentials tab load, also load model endpoints:

```ts
listModelEndpoints({ pageSize: 500, includeDisabled: true })
```

- Store endpoints in existing endpoint state or credentials-specific endpoint state.
- Filter to enabled endpoints for dropdown choices.
- Add empty/error states:
  - “No endpoints available. Import an inference package first.”

### Phase 2 — Simplify credential draft state

- Replace credential form state with `CredentialDraft`.
- Remove display name, owner type, owner ID, and auth type from form state.
- Preserve `isDefault`, defaulting to `true`.

### Phase 3 — Replace form UI

- Remove free-text model endpoint input.
- Add endpoint dropdown.
- Remove display name/owner/auth inputs.
- Keep password API key input.
- Add visible Make default checkbox.
- Disable submit until:
  - key is non-empty
  - endpoint selected
  - API key non-empty

### Phase 4 — Submit mapping

- Submit the simplified draft to existing service with daemon-owned defaults.
- Prefer `modelEndpointId` over endpoint key.
- Set `displayName` equal to `key` only as API compatibility glue.
- Clear `secretValue` after success.
- Keep the error handling that preserves Tauri/string daemon errors.

### Phase 5 — OpenAI wizard alignment

- Ensure OpenAI wizard does not reintroduce display name/owner/auth fields.
- It may keep credential key and API key.
- Endpoint can remain fixed to OpenAI if the wizard is specifically OpenAI, but it should resolve/send the OpenAI endpoint ID/key from catalog where practical.

### Phase 6 — Tests

Add/update tests for:

- Credentials tab loads endpoint dropdown data.
- Credential create form only exposes:
  - Credential key
  - Endpoint
  - API key
  - Make default
- Form does not expose:
  - Display name
  - Owner type
  - Owner ID
  - Auth type
- Submit sends daemon-owned defaults plus selected endpoint ID.
- API key field is cleared after success.
- Submit disabled until required fields are present.
- No endpoint state prompts user to import/apply an inference package.

## Acceptance Criteria

- Console credential creation no longer asks for unused/speculative metadata.
- User can create a credential with only key, endpoint, API key, and Make default.
- Endpoint is selected via dropdown using catalog data.
- API key is never displayed after submission.
- Created credential remains system-owned and API-key based.
- Existing credential list still shows safe metadata including key suffix.
- Tests/build pass:

```sh
cd mycel-console
npx tsc --noEmit
npm test -- --runInBand
npm run build
cd src-tauri && MYCEL_API_ROOT=../../mycel-api cargo check
```

## Follow-up Option

After this Console simplification is stable, consider simplifying the public create credential API to remove create-time owner/auth/display-name fields too. That should start in:

```text
mycel-api/api/proto/mycel/admin/v1/inference.proto
```

Only do this if we want the gRPC API itself to enforce system-owned API-key credentials for the first cut.
