# Inference Catalog UI

## Goal

Expand `/inference` from package import/history into an operator-facing read-only catalog for installed inference resources.

The page should let operators verify that an imported inference package installed all expected definitions:

- packages
- model endpoints
- models
- vector stores
- model endpoint capabilities

## Current implementation

### Packages

The existing Packages tab remains the default tab. Operators can:

- list package install records
- import package JSON
- review one-time import summary counts
- jump from import summary to relevant catalog tabs

Package imports accept package JSON using the same snake_case fields as the CLI examples:

- `model_endpoints`
- `models`
- `vector_stores`
- `model_endpoint_capabilities`

The Tauri command also accepts camelCase aliases for frontend compatibility.

### Catalog tabs

`/inference` now has tabs:

- Packages
- Endpoints
- Models
- Vector stores
- Capabilities

Only the active catalog tab is loaded.

### Backend Tauri commands

Implemented in:

```text
src-tauri/src/commands/inference.rs
```

Commands:

```text
admin_list_inference_packages
admin_apply_inference_package
admin_list_model_endpoints
admin_list_models
admin_list_vector_stores
admin_list_model_endpoint_capabilities
```

Registered in:

```text
src-tauri/src/lib.rs
```

### Frontend services/types

Implemented in:

```text
src/types/inference.ts
src/services/adminService.ts
```

Service methods:

```ts
listInferencePackages(input?)
applyInferencePackage(input)
listModelEndpoints(input?)
listModels(input?)
listVectorStores(input?)
listModelEndpointCapabilities(input?)
```

### UI components

Implemented in:

```text
src/features/inference/pages/InferencePage.tsx
src/features/inference/components/InferencePackageTable.tsx
src/features/inference/components/ModelEndpointTable.tsx
src/features/inference/components/InferenceModelTable.tsx
src/features/inference/components/VectorStoreTable.tsx
src/features/inference/components/ModelEndpointCapabilityTable.tsx
src/features/inference/components/ImportInferencePackageModal.tsx
src/features/inference/components/ImportInferencePackageSummaryDialog.tsx
```

Tables currently display:

#### Endpoints

- Status
- Key
- Name
- Connector
- Operations
- Privacy
- Endpoint URL

#### Models

- Key
- Operation
- Model name
- Dimensions
- Vector space
- Connector types
- Modality

#### Vector stores

- Status
- Key
- Name
- Type
- Privacy

#### Capabilities

- Status
- Endpoint ID
- Model ID
- Operation
- Override

## Validation

Latest validation passed:

```text
30 test suites passed
117 tests passed
npm run build passed
cargo check passed
```

Run:

```bash
npm test -- --runInBand
npm run build
PATH="$HOME/.cargo/bin:$PATH" cargo check --manifest-path src-tauri/Cargo.toml
```

## Known limitations

- Catalog tabs currently load the first page with `pageSize: 100`.
- Per-tab filters and pagination are not yet wired in the page.
- Capabilities currently show endpoint/model IDs; a later phase should resolve/display endpoint and model keys.
- Metadata/config JSON is available through DTOs but not yet shown in detail drawers.
- Credentials, grants, policies, and enable/disable actions are deferred.

## Recommended next phases

1. Add filters and pagination per catalog tab.
2. Add detail drawers for metadata/config and linked resource context.
3. Resolve capability endpoint/model IDs to human-readable keys.
4. Add credentials, grants, and policies tabs.
5. Add safe enable/disable actions with in-app confirmation dialogs.
