# Inference Grant Dynamic Selects Implementation Plan

## Goal

Make inference credential grant creation usable without copy/pasting IDs. The Grants tab should guide the user through selecting a space, domain, model, endpoint, operations, and credential using dynamic dropdowns and checkboxes while keeping daemon/API authorization authoritative.

## UX Principles

- Display human-readable names/keys first.
- Use IDs internally for API calls and keep them available in details/tooltips.
- Resolve available choices from catalog resources already provisioned in mycel.
- Keep advanced ID entry available for edge cases, but collapse it by default.
- Never display credential secret material or raw API keys.

## Proposed Grant Form

### 1. Scope section

Fields:
- `Space` searchable dropdown
  - label: space name
  - subtext: space ID
- `Domain` dropdown filtered by selected space
  - label: domain name/key
  - subtext: domain ID
  - disabled until a space is selected
- `Include descendants` checkbox
- Collapsed `Advanced scope` section:
  - semantic index ID
  - node ID

### 2. Model and endpoint section

Fields:
- `Model` searchable dropdown
  - label: model key
  - subtext: operation, modality, dimensions/context tokens if available
- `Endpoint` dropdown filtered by selected model capabilities
  - label: endpoint key/name
  - subtext: endpoint status/privacy/network
  - disabled until model is selected
- `Operations` checkbox group filtered by selected model + endpoint capabilities
  - default checked: enabled available capabilities
  - disabled unavailable operations shown only if helpful
  - each operation chip/checkbox should expose capability ID in tooltip/details

### 3. Credential section

Fields:
- `Credential` dropdown filtered by selected endpoint
  - label: credential key/display name
  - subtext: owner type, status, default marker
  - disabled until endpoint is selected
- Only show active credentials by default.
- `Include inactive credentials` optional checkbox.

### 4. Grant options section

Fields:
- `Allow automation/background use` checkbox, default true
- `Default grant` checkbox
- `Priority` number field
- optional expiration date/time
- optional grantee principal IDs, collapsed advanced section
- optional on-behalf-of principal IDs, collapsed advanced section

### 5. Review section

Before submit, show a compact summary:

```text
Grant credential openai-default for space Research / domain Main.
Endpoint openai, model openai/gpt-5.6-mini.
Operations chat, summarize, classify.
Background/automation use allowed.
```

Submit calls existing `createInferenceCredentialGrant` using IDs/refs from selected resources.

## Data Dependencies

Load on Grants tab mount or as needed:

- Spaces: `listSpaces({ pageSize: 100 })`
- Domains: `listDomains({ spaceId, pageSize: 100, includeSystem: false })`
- Models: `listModels({ pageSize: 100 })`
- Endpoints: `listModelEndpoints({ pageSize: 100, includeDisabled: true })`
- Capabilities: `listModelEndpointCapabilities({ pageSize: 100, includeDisabled: true })`
- Credentials: `listInferenceCredentials({ pageSize: 100, includeInactive })`

Derived indexes:

- `capabilitiesByModelId`
- `capabilitiesByEndpointId`
- `capabilitiesByModelAndEndpoint`
- `endpointsById`
- `modelsById`
- `credentialsByEndpointId`

## Filtering Rules

1. Selecting a model filters endpoints to endpoints that have at least one capability for that model.
2. Selecting an endpoint filters operations to capabilities matching `(modelId, endpointId)`.
3. Selecting an endpoint filters credentials to credentials whose `modelEndpointId` matches the selected endpoint.
4. If there is exactly one enabled endpoint or credential after filtering, auto-select it.
5. If no credential exists for the endpoint, show a callout linking/switching to credential creation.

## Component Plan

Add components under:

```text
src/features/inference/components/
```

Suggested components:

- `GrantCreatePanel.tsx`
- `ResourceSelect.tsx`
- `OperationCheckboxGroup.tsx`
- `GrantReviewSummary.tsx`

Or keep as local components inside `InferencePage.tsx` for a first pass, then extract after behavior stabilizes.

## Type/Service Additions

Current services mostly exist after the setup work. Add or reuse:

- `listSpaces`
- `listDomains`
- `listModels`
- `listModelEndpoints`
- `listModelEndpointCapabilities`
- `listInferenceCredentials`
- `createInferenceCredentialGrant`

If `InferencePage` does not currently inject `listSpacesService` and `listDomainsService`, add props for testability.

## Implementation Phases

### Phase 1 — Read/select data wiring

- Add Grants tab loaders for spaces, models, endpoints, capabilities, and credentials.
- Load domains only after space selection.
- Build in-memory lookup maps.
- Keep existing manual grant form available behind an `Advanced` toggle during transition.

### Phase 2 — Scope selectors

- Replace free-text `spaceId`/`domainId` fields in grant creation with dropdowns.
- Use selected `spaceId`/`domainId` in `CreateCredentialGrantInput.scope`.
- Add empty/loading/error states.

### Phase 3 — Model/endpoint/operation selectors

- Add model dropdown.
- Filter endpoint dropdown by selected model capabilities.
- Add operation checkboxes from matching capabilities.
- Default to all enabled matching operations.

### Phase 4 — Credential selector

- Filter credentials by selected endpoint.
- Show credential status/default owner information.
- Prevent submission without an active credential unless advanced mode explicitly overrides.

### Phase 5 — Review and submit

- Add review summary.
- Submit `CreateCredentialGrantInput` with:
  - `spaceId`
  - `credentialId` or credential key/ref
  - `scope.spaceId`
  - `scope.domainId`
  - selected operations
  - selected `modelEndpointId`
  - selected `modelId`
  - grant options
- Refresh grants table after success.

### Phase 6 — Tests

Add tests for:

- Selecting a space loads filtered domains.
- Selecting a model filters endpoints.
- Selecting model+endpoint shows operation checkboxes.
- Selecting endpoint filters credentials.
- Submit sends expected `CreateCredentialGrantInput` with IDs/refs.
- No credential state prompts user to create credential.
- Existing grants table still renders and refreshes.

## Acceptance Criteria

- User can create a credential grant without manually copying space/domain/model/endpoint IDs.
- Normal form uses keys/names for display.
- API payload still uses stable IDs/refs.
- Credential secrets are never displayed.
- Existing advanced/manual path remains available for uncommon cases.
- Tests and build pass:

```sh
npx tsc --noEmit
npm test -- --runInBand
npm run build
cd src-tauri && MYCEL_API_ROOT=/Users/martinbeauvais/Projects/knotbase/Knotbase/myceldb/mycel-api cargo check
```
