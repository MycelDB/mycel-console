# Raft Reliability Console Implementation Plan

## Status

Phase 0 complete on `mycel-admin/raft_improvements`; phases 1–7 planned.

This plan updates `mycel-admin` for the current `mycel/develop` and `mycel-api/develop` raft reliability work. The goal is an operator-focused, read-only-first console for cluster readiness, raft health, read consistency diagnostics, graph consistency evidence, forensic export, and snapshot/compaction visibility.

## Context

Current backend/API branches:

- `mycel/develop`: raft reliability hardening, Phase D/E/F/G, and initial Phase B2 subsystem snapshot recovery.
- `mycel-api/develop`: additive cluster/read/consistency proto fields and RPCs.

Current local dev cluster:

- K3d cluster: `knotbase-dev`
- Namespace: `knotbase-dev`
- Image: `myceldb/mycel:k3s-local-1110cb8`
- Admin login: `admin` / `admin-password`
- Daemon address: `127.0.0.1:9091`

## Goals

1. Surface the new raft readiness model clearly in the admin UI.
2. Expose raft group, transport, read-index, and snapshot diagnostics.
3. Add graph consistency and forensic evidence tools.
4. Keep Phase G boundaries explicit: diagnostics and export are read-only; no repair/merge/rebalance actions.
5. Keep Phase B2 boundaries explicit: snapshot visibility only; no force-compaction or force-snapshot UI yet.
6. Update tests and Tauri command mappings for the latest API shape.

## Non-goals

- Do not add automatic repair, merge, delete, overwrite, or rebalance actions.
- Do not add force snapshot/force compaction buttons.
- Do not expose backend auth tokens or secret material.
- Do not move daemon API adapters; this is an admin UI/Tauri integration plan only.

## Phase 0 — SDK/API sync

Status: Complete.

### Tasks

- [x] Update `mycel-rust-sdk` from `mycel-api/develop` so the Tauri backend can access the latest admin cluster proto fields/RPCs.
- [x] Confirm `mycel-admin/src-tauri/Cargo.toml` continues to use the local SDK path:
  - `../../mycel-rust-sdk/crates/mycel-sdk`
- [x] Add default `read_options: None` values required by the latest graph/query protos.
- [x] Run:
  ```sh
  cd mycel-rust-sdk && MYCEL_API_ROOT="$PWD/../mycel-api" make test
  cd ../mycel-admin/src-tauri && cargo check
  cd .. && npm test -- --runInBand --watch=false
  ```

### Acceptance

- Tauri can compile against the latest cluster proto messages.
- No generated public API changes are committed outside the selected SDK repo unless explicitly intended.

## Phase 1 — Expand Tauri cluster DTOs and commands

Status: Complete.

### Files

- `src-tauri/src/commands/cluster.rs`
- `src-tauri/src/lib.rs`
- `src/types/cluster.ts`
- `src/services/adminService.ts`
- `src/services/adminService.test.ts`

### Tasks

Add DTO mappings for existing RPC responses that currently drop fields:

#### Cluster readiness

- [x] Map `ClusterReadiness` from:
  - `GetClusterStatusResponse.readiness`
  - `GetClusterHealthResponse.readiness`

Expose:

- [x] `clientReady`
- [x] `metadataApplied`
- [x] `metadataValidated`
- [x] `partitionGroupsStarted`
- [x] `authoritativeClusterId`
- [x] `localClusterId`
- [x] `expectedMemberCount`
- [x] `readinessBlockers`

#### Raft transport diagnostics

- [x] Map `GetClusterRuntimeStatusResponse.raft_transport`:
  - global send attempts/failures
  - auth failures
  - missing sender failures
  - last error timestamp
  - last error text
  - last failure reason
  - last group ID
  - last source/target raft node IDs
  - last message type
  - per-target diagnostics

#### Raft group diagnostics

- [x] Extend `RaftGroupStatusInfo` with:
  - `lastIndex`
  - `snapshotIndex`
  - `healthReason`
  - `readDiagnostics`

Read diagnostics should include:

- [x] `readIndexAttempts`
- [x] `readIndexSuccesses`
- [x] `readIndexFailures`
- [x] `readIndexTimeouts`
- [x] `readIndexNoLeader`
- [x] `readIndexNotLeader`
- [x] `applyWaitFailures`
- [x] `lastFailureAt`
- [x] `lastFailureReason`
- [x] `lastReadIndex`
- [x] `lastAppliedWaitIndex`
- [x] `lastAppliedWaitSuccess`
- [x] `lastAppliedWaitMillis`

### Acceptance

- [x] Existing cluster page still loads against the updated type shapes.
- [x] Unit tests assert the new service/Tauri type shapes.
- [x] `cargo check` and `npm test` pass.

## Phase 2 — Readiness and runtime overview UI

Status: Complete.

### Files

- `src/features/cluster/pages/ClusterPage.tsx`
- `src/features/cluster/pages/ClusterPage.test.tsx`
- optional components under `src/features/cluster/components/`

### Tasks

Add a readiness panel to the Cluster page:

- [x] Large status indicator:
  - `Client ready`
  - `Not client ready`
- [x] Show readiness subchecks:
  - metadata applied
  - metadata validated
  - partition groups started
  - local cluster ID matches authoritative cluster ID
  - expected member count
- [x] Render readiness blockers as high-priority operator warnings.
- [x] Distinguish explicitly between:
  - port open / daemon reachable
  - cluster-safe client readiness

Enhance runtime overview:

- [x] show local raft node ID and address
- [x] show node count, partition count, replica factor
- [x] show raft groups with leaders / total groups
- [x] show cluster name and cluster ID

### Acceptance

- [x] A healthy raft cluster shows all readiness checks passing.
- [x] A blocked readiness response displays blockers prominently.
- [x] Tests cover both healthy and blocked readiness states.

## Phase 3 — Raft transport and group diagnostics UI

Status: Complete.

### Files

- `src/features/cluster/pages/ClusterPage.tsx`
- `src/features/cluster/pages/NodeDetailPage.tsx`
- `src/features/cluster/pages/ClusterPage.test.tsx`
- `src/features/cluster/pages/NodeDetailPage.test.tsx`

### Tasks

#### Transport diagnostics panel

Add a panel showing:

- [x] send attempts/failures
- [x] auth failures
- [x] missing sender failures
- [x] last error/reason
- [x] last group/source/target/message type
- [x] per-target diagnostics table

Flag as critical:

- [x] any auth failures
- [x] missing sender failures
- [x] recent last error

#### Raft groups table improvements

Add columns/filters for:

- [x] health / health reason
- [x] leader
- [x] replicas
- [x] term
- [x] commit index
- [x] applied index
- [x] apply lag
- [x] last index
- [x] snapshot index
- [x] read-index failures/timeouts/no-leader/not-leader
- [x] last read failure reason

Add filters:

- [x] all
- [x] unhealthy
- [x] no leader
- [x] lagging
- [x] read failures
- [x] has snapshot

### Acceptance

- [x] Operators can identify no-leader groups, lagging apply indexes, and read-index failures without using CLI.
- [x] Snapshot index is visible but no mutation actions exist.
- [x] Tests cover filter behavior and diagnostic rendering.

## Phase 4 — Graph consistency report UI

Status: Complete.

### Files

- `src-tauri/src/commands/cluster.rs`
- `src/types/cluster.ts`
- `src/services/adminService.ts`
- `src/features/cluster/pages/ClusterPage.tsx` or new `ConsistencyPage.tsx`
- tests for service and page behavior

### API/RPCs

Add Tauri commands and service wrappers for:

- [x] `GetLocalGraphConsistency`
- [x] `GetGraphConsistencyReport`

### UI

Add a `Consistency` tab or card with inputs:

- [x] `spaceId`
- [x] `domainId`

Actions:

- [x] `Run local check`
- [x] `Run cluster report`

Render local stats:

- [x] revision
- [x] node count
- [x] edge count
- [x] node checksum
- [x] edge checksum
- [x] graph checksum
- [x] checksum algorithm
- [x] collected at
- [x] source
- [x] raft group status
- [x] warnings

Render cluster report:

- [x] status: `consistent`, `lagging`, `divergent`, `degraded`, `unknown`
- [x] partition ID
- [x] local node ID
- [x] leader node ID
- [x] expected replicas
- [x] comparison basis
- [x] per-replica reachability/stats/errors
- [x] warnings with severity

### Safety copy

Display explicitly:

> Consistency reports are read-only latest-state evidence. They do not repair, merge, delete, overwrite, or rebalance data.

### Acceptance

- [x] UI can request local and cluster consistency reports for operator-supplied space/domain IDs.
- [x] Divergent/degraded statuses have visual severity classes.
- [x] Tests cover service wrappers, UI diagnostic rendering, report status mapping, and warning severity mapping.

## Phase 5 — Forensic export UI

Status: Complete.

### API/RPCs

Add Tauri command and service wrapper for:

- [x] `GetLocalGraphForensicExport`

### UI

Add export controls:

- [x] `spaceId`
- [x] `domainId`
- [x] `sourceLabel`
- [x] `pageSize`
- [x] `pageToken`

Render:

- [x] manifest
- [x] stats
- [x] node count in page
- [x] edge count in page
- [x] `nextPageToken`
- [x] `truncated`
- [x] warnings

Add buttons:

- [x] copy JSON to clipboard
- [x] save/download JSON file where practical in Tauri
- [x] fetch next page using `nextPageToken`

### Safety copy

Display explicitly:

> Forensic export is read-only and page-bounded. If truncated, collect every page before drawing repair conclusions. Use manual repair workflows outside this UI.

### Acceptance

- [x] Export result can be saved/copied for use with CLI diff tooling.
- [x] Truncated responses clearly warn that evidence is incomplete.
- [x] No repair actions are available.

## Phase 6 — Snapshot and compaction guidance

Status: Complete.

### Tasks

Add an operator guidance panel near raft group diagnostics:

- [x] Show groups with nonzero `snapshotIndex`.
- [x] Explain that automatic production compaction is currently off/conservative.
- [x] Explain that B2 initial subsystem snapshots exist, but forced snapshot-only recovery remains a release-gate/soak concern.
- [x] Link/copy relevant CLI commands:
  ```sh
  mycel cluster raft-groups
  make test-cluster-soak
  ```

### Do not add

- force snapshot
- force compaction
- repair divergent PVCs

### Acceptance

- [x] UI accurately reflects B2 boundaries and does not overclaim production compaction readiness.

## Phase 7 — Integration validation with live cluster

Status: Complete for automated validation and live backend/API validation. Interactive Tauri UI click-through remains operator/manual because this agent cannot visually inspect the desktop app.

### Manual validation

With local K3s cluster running:

```text
Address:  127.0.0.1:9091
Username: admin
Password: admin-password
```

Run:

```sh
cd mycel-admin
npm run tauri dev
```

Manual/live checks:

1. [x] Admin login succeeds via live cluster CLI/API.
2. [x] Cluster backend APIs respond; UI build is valid.
3. [x] Readiness is client-ready.
4. [x] Runtime shows 3 nodes, 16 partitions, replica factor 3.
5. [x] Raft groups API shows system + partition groups.
6. [x] Transport/read diagnostics show no raft read failures in live output.
7. [x] Space route/partition ownership was exercised by creating a validation space and routing writes to its partition leader.
8. [x] Consistency report works for validation space/domain.
9. [x] Forensic export works for validation space/domain.
10. [ ] Interactive Tauri desktop click-through: login, visually inspect pages, and confirm copy/download buttons. Run locally with `npm run tauri dev`.

### Automated validation

Run:

```sh
cd mycel-admin
npm test -- --runInBand --watch=false
npm run build
cd src-tauri
cargo check
cargo test
cd ../../mycel-rust-sdk
make test
```

Live backend validation run:

```sh
cd mycel
go run ./cmd/mycel --daemon-addr 127.0.0.1:9091 -u admin -p admin-password cluster health
go run ./cmd/mycel --daemon-addr 127.0.0.1:9091 -u admin -p admin-password cluster raft-groups
go run ./cmd/mycel --daemon-addr 127.0.0.1:9091 -u admin -p admin-password cluster consistency --space-id <space> --domain-id <domain>
go run ./cmd/mycel --daemon-addr 127.0.0.1:9091 -u admin -p admin-password cluster consistency-report --space-id <space> --domain-id <domain>
go run ./cmd/mycel --daemon-addr 127.0.0.1:9091 -u admin -p admin-password --output json cluster forensic-export --space-id <space> --domain-id <domain> --page-size 10 --source-label phase7-ui-validation
```

## Suggested implementation order

1. Update Rust SDK/proto support.
2. Expand Tauri DTOs/types for readiness, transport, raft read diagnostics.
3. Update existing Cluster page to display those fields.
4. Add graph consistency service/Tauri commands and UI.
5. Add forensic export service/Tauri commands and UI.
6. Add snapshot/compaction guidance panel.
7. Run unit tests, `cargo check`, and manual live-cluster validation.

## Risk register

| Risk | Mitigation |
| --- | --- |
| UI overclaims repair/compaction capabilities. | Use explicit read-only safety copy; no repair/force-compaction buttons. |
| Rust SDK lags mycel-api proto changes. | Regenerate/update SDK first and gate with `cargo check`. |
| Large forensic exports overload UI. | Keep page-size controls and page-token workflow; show truncation/incomplete evidence warnings. |
| Operator confuses local consistency with cluster consistency. | Separate local check and cluster report sections with distinct labels and explanations. |
| Sensitive internode/auth details leak. | Never display backend auth tokens; transport diagnostics expose failure counts/reasons only. |
| Read-index diagnostics are too technical. | Show summary badges plus expandable raw details. |
