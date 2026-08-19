# Inference Setup and Automation Profiles UI

## Goal

Extend the `mycel-console` Inference area from catalog inspection into an operator workflow for making installed inference catalog resources usable by graph automations.

The Console should guide a permitted operator from:

```text
installed model endpoint/model/capability
  -> credential
  -> credential grant
  -> inference policy
  -> inference profile
  -> graph automation profile selection
```

The daemon/API remains authoritative for all authorization and policy enforcement. Console capability gates are UX hints only.

## Non-goals

- Do not store or display raw provider API keys in frontend state longer than necessary for a submit action.
- Do not show existing secret material after provisioning.
- Do not add product pricing, credits, billing, or chargeback UX.
- Do not embed provider credentials in graph automation definitions.
- Do not make Console-side validation authoritative.

## Current state

The Inference page currently supports:

- catalog package import
- endpoint/model/vector-store/capability listing
- row-level `View` detail drawers
- `Import history` as the last tab

Missing UI:

- inference profiles
- credentials
- credential grants
- inference policies
- policy decisions / usage views
- guided provider setup
- automation create/edit profile selection

## Proposed tab structure

```text
Capabilities | Models | Endpoints | Profiles | Credentials | Grants | Policies | Usage | Import history
```

Default tab: `Capabilities`.

`Import package JSON` remains a top-level action because packages are install-time deployment units, not the primary operating model.

## Capability gates

Read UX should be shown when the principal has the relevant read capability. Mutating actions should be hidden/disabled unless the current principal appears to have the matching manage capability.

Required capabilities:

| UX | Capability hint |
|---|---|
| Catalog tabs | `inference.catalog.read` |
| Import package JSON | `inference.catalog.manage` |
| Profiles list/select | `inference.profile.read` |
| Create/edit/delete profiles | `inference.profile.manage` |
| Credentials list | `inference.credential.read` |
| Create/rotate/disable credentials | `inference.credential.manage` |
| Grants | `inference.grant.manage` |
| Policies | `inference.policy.manage` |
| Usage / audit | `inference.audit.read` |
| Create graph automations | `automation.manage` |

If self-access discovery is unavailable, the UI should show read-only affordances where safe and surface daemon errors from attempted actions.

## User flows

### 1. Configure provider CTA

On `Endpoints` and `Capabilities`, detect likely incomplete setup states:

- endpoint exists, but no credentials for that endpoint
- credentials exist, but no matching grant for selected space/domain/operation
- grant exists, but no allow/restrict policy
- policy exists, but no automation-purpose profile

Show a contextual callout:

```text
OpenAI is installed, but no automation inference profile is configured.
[Configure OpenAI]
```

### 2. Configure OpenAI wizard

A first implementation can be provider-specific for OpenAI-compatible endpoints, while the underlying components remain generic.

Wizard steps:

1. **Endpoint**
   - select endpoint, defaulting to `openai` when present
   - display connector type, endpoint URL, auth modes, operations, privacy class

2. **Credential**
   - credential key, default `openai-default`
   - display name
   - owner type: `system`, `space`, or `principal`
   - owner ID when required
   - auth type, default `api_key`
   - secret input mode:
     - pasted API key secret value
     - pasted secret if backend supports encrypted/inline secret storage
   - never echo the secret after submit

3. **Grant**
   - space selector
   - optional domain selector
   - operation: `chat`, `summarize`, `classify`
   - usage mode: `automation`
   - endpoint/model/capability constraint selection
   - allow background use toggle
   - optional grantee/on-behalf-of principal selectors

4. **Policy**
   - action: `allow` or `restrict`
   - scope: same space/domain
   - operation and usage mode
   - allowed privacy classes
   - optional max input/output token ceilings
   - reason

5. **Profile**
   - key, e.g. `summarize-page`
   - display name
   - purpose: `automation`
   - operation: `chat`, `summarize`, or `classify`
   - domain restrictions
   - capability/endpoint/model refs
   - default parameters:
     - response format: `text`, `json`, `json_object`
     - temperature
     - max input tokens
     - max output tokens
   - enabled toggle

6. **Review and test**
   - summarize resources to create
   - run a resolve/check action if API support exists
   - optional tiny test prompt if API support exists and policy permits

### 3. Automation create integration

In the Space detail `Automations` tab:

- Show `Create automation` when `automation.manage` is present.
- In the automation form, the LLM selector should be `Inference profile`, not raw model/API-key fields.
- Filter profile options by:
  - current space
  - current domain where possible
  - `purpose=automation`
  - operation compatible with the automation template
  - enabled profiles by default

Empty state:

```text
No automation inference profiles are configured for this domain.
[Configure provider] [Create profile]
```

Automation JSON should continue to reference:

```json
"inference": {
  "operation": "chat",
  "profile": "summarize-page"
}
```

## Required Tauri commands

Add commands in `src-tauri/src/commands/inference.rs` and register in `src-tauri/src/lib.rs`.

### Profiles

```text
admin_list_inference_profiles
admin_get_inference_profile
admin_create_inference_profile
admin_set_inference_profile_enabled
admin_delete_inference_profile
```

### Credentials

```text
admin_list_inference_credentials
admin_create_inference_credential
admin_rotate_inference_credential
admin_set_inference_credential_enabled_or_status
admin_delete_inference_credential
```

### Grants

```text
admin_list_inference_credential_grants
admin_create_inference_credential_grant
admin_revoke_inference_credential_grant
```

### Policies

```text
admin_list_inference_policies
admin_create_inference_policy
admin_revoke_inference_policy
```

### Usage / decisions

```text
admin_list_inference_usage_events
admin_summarize_inference_usage
admin_list_inference_policy_decisions
```

### Optional readiness helpers

If not already available at API level, consider adding backend support for:

```text
ResolveInferenceProfile
TestInferenceProfile
```

These should fail closed, avoid leaking secret material, and return diagnostics suitable for setup troubleshooting.

## Frontend types/services

Extend:

```text
src/types/inference.ts
src/services/adminService.ts
```

Add DTOs for:

- `InferenceProfileInfo`
- `InferenceCredentialInfo`
- `CredentialGrantInfo`
- `InferencePolicyInfo`
- `PolicyDecisionInfo`
- `InferenceUsageEventInfo`
- create/update/revoke inputs
- setup wizard draft state

Keep frontend field names camelCase; Tauri command DTOs should map to protobuf/snake_case fields.

## UI components

Add components under:

```text
src/features/inference/components/
```

Suggested components:

- `InferenceProfileTable`
- `InferenceCredentialTable`
- `InferenceGrantTable`
- `InferencePolicyTable`
- `InferenceUsageTable`
- `ConfigureProviderWizard`
- `CredentialSecretInput`
- `InferenceProfileForm`
- `InferenceGrantForm`
- `InferencePolicyForm`
- `InferenceSetupStatusCallout`

Integrate profile selection into:

```text
src/features/spaces/pages/SpaceDetailPage.tsx
```

or a new automation form component once create/edit automation UI is introduced.

## Security and secret handling UX

- Existing credentials show secret source/fingerprint only, never secret value.
- Pasted secrets should clear from React state after submit or cancel.
- Error messages should preserve daemon status details but not expose submitted secret values.
- Disable browser/autocomplete for secret fields where possible.
- Provision API keys through the daemon-backed credential flow; do not store secret material in packages.

## Implementation phases

### Phase 1: Read-only resource tabs

- Add Profiles/Credentials/Grants/Policies/Usage tabs.
- Add list Tauri commands and frontend services.
- Render tables with row-level `View` actions.
- Add empty states explaining next actions.

Validation:

```sh
npm test -- --runInBand
npm run build
cd src-tauri && MYCEL_API_ROOT=.../mycel-api cargo check
```

### Phase 2: Profile management

- Add create/edit/enable/disable/delete profile UX.
- Add profile form validation for required fields.
- Add profile selector component reusable by automation forms.

Acceptance:

- Operator can create `summarize-page` for a space/domain.
- Automation create flow can select it.

### Phase 3: Credential and grant management

- Add credential create/rotate/disable UX.
- Add credential grant create/revoke UX.
- Add secret-safe display and tests.

Acceptance:

- Operator can provision an OpenAI API key for endpoint `openai`.
- Operator can grant automation usage to a space/domain.

### Phase 4: Policy management

- Add allow/restrict/deny policy forms.
- Add privacy and token ceiling controls.
- Surface policy decisions/errors in setup diagnostics.

Acceptance:

- Operator can allow `automation` usage for `chat` in a domain.
- Deny/restrict states are visible and explainable.

### Phase 5: Configure OpenAI wizard

- Compose phases 2-4 into a guided flow.
- Preselect endpoint/model/capability from installed OpenAI package.
- Show final review and copyable automation profile ref.

Acceptance:

- Starting from an installed OpenAI catalog package, operator can produce a usable automation profile without leaving the Console.

### Phase 6: Automation create/edit integration

- Add `Create automation` button in Space detail Automations tab for `automation.manage`.
- Add automation form with profile selector.
- Add validate-before-create behavior using existing automation validation API.
- Add create/update/delete support if daemon APIs are available and wired.

Acceptance:

- Principal with `automation.manage` sees Create automation.
- Automation definition stores profile refs only.
- Daemon rejects unauthorized or invalid creates.

## Test plan

### Unit/component tests

- Capability gates hide/disable mutating actions.
- Tables render rows and row-level `View` actions.
- Secret input clears after submit/cancel.
- Empty states link to setup actions.
- Profile selector filters automation-purpose profiles.
- Wizard builds correct request DTOs.

### Tauri compile checks

```sh
cd src-tauri
MYCEL_API_ROOT=/path/to/mycel-api cargo check
```

### End-to-end manual smoke

1. Apply OpenAI chat package.
2. Open Inference page; confirm OpenAI capabilities appear.
3. Configure OpenAI via wizard using a pasted API key.
4. Confirm credential/grant/policy/profile rows appear.
5. Create a disabled automation referencing the profile.
6. Enable automation.
7. Trigger matching graph change.
8. Confirm invocation/run detail and usage event are visible.

## Open questions

- Should profile creation be allowed from the automation form, or only linked to the Inference setup wizard?
- Should Console support pasted encrypted secrets in v1, or environment references only?
- Do we need a daemon `ResolveInferenceProfile` dry-run endpoint before the wizard ships?
- Should `Usage` be part of Inference page now, or deferred to an Audit/Operations area?
