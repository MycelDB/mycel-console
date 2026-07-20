# Raft Cluster Management Console

## Status

Implemented migration plan for the Raft-aware `mycel-admin` cluster view.

This supersedes the earlier static-primary cluster console design for active UI work. The old static-primary backend can still exist during the transition, but `mycel-admin` no longer exposes static-primary mutation actions.

## Goals

Provide a read-only operator UI for the refactored Raft clustering model:

- identify the active clustering engine
- show Raft runtime configuration
- show system and partition Raft group status
- show group leaders, replicas, term, commit/applied indexes, and apply lag
- show per-node Raft responsibilities
- show space-to-partition route lookup
- show space detail Raft placement
- avoid exposing obsolete static-primary controls

## Current limitations

- Raft mode remains experimental in `myceld`.
- Raft membership changes are not supported yet.
- No UI actions exist for leader transfer, add/remove node, rebalance, or Raft snapshot operations.
- Diagnostics are read-only checks derived from current runtime/group status.
- Static cluster status APIs remain available for read-only legacy context.

## New admin APIs

The cluster view uses these read-only admin RPCs:

- `GetClusterRuntimeStatus`
- `ListRaftGroups`
- `LookupSpaceRoute`

### `GetClusterRuntimeStatus`

Returns:

- cluster engine: `static` or `raft`
- cluster name
- Raft node count
- partition count
- replica factor
- local Raft node ID
- configured Raft node addresses
- total Raft group count
- groups with known leaders

### `ListRaftGroups`

Returns one row per local Raft group:

- group ID
- kind: `system` or `partition`
- partition ID, when applicable
- local node ID
- leader node ID
- preferred leader node ID
- replica node IDs
- health
- term
- commit index
- applied index
- apply lag

### `LookupSpaceRoute`

Maps a canonical `space_id` UUID to:

- partition ID
- leader node ID
- replica node IDs

## Cluster page behavior

Route:

```text
/cluster
```

### General tab

In all modes:

- cluster status
- local node summary
- peer count
- member count
- cluster ID

In Raft mode, additionally:

- engine card with `raft` and `experimental` badge
- local Raft node ID
- Raft node count
- partition count
- replica factor
- groups with leader
- system group leader
- partition leader count
- configured node address map
- read-only Raft diagnostics
- space route lookup

In static mode, legacy read-only health/primary/replication cards may still render.

### Raft groups tab

In Raft mode, the old topology tab is relabeled:

```text
Raft groups
```

Columns:

- health
- group
- kind / partition
- leader
- term
- commit
- applied
- lag
- preferred leader
- replicas

The table supports filtering by:

- group ID
- kind
- partition ID
- leader node ID

### Membership tab

Shows the read-only membership table, plus a notice:

```text
Static primary operations such as add/remove node, switchover, promotion,
and follower resync are no longer exposed in mycel-admin. Raft membership
changes are not available yet.
```

Removed from the UI:

- Add Node
- Remove node
- Rename node
- Switch primary
- Promote local primary
- Resync node
- Recent resync operations

### Events tab

Still uses the existing derived event view from membership/topology snapshots. This should eventually be replaced by a durable Raft-aware event/diagnostics stream.

## Node detail page behavior

Route:

```text
/cluster/nodes/:nodeKey
```

In Raft mode, node detail displays a Raft responsibilities panel:

- inferred Raft node ID
- system role: leader / replica / unknown
- partition leader count
- partition replica count
- total groups led
- short list of groups led

Node ID inference currently uses:

1. numeric route key, or
2. node name/backend address matched against configured Raft node addresses

## Space detail page behavior

Route:

```text
/spaces/:spaceId
```

The General tab includes a Raft placement card:

- partition ID
- leader node
- replicas

If route lookup fails, the card shows:

```text
Route unavailable or static engine
```

## Files changed in this migration

Backend/API:

- `mycel-api/api/proto/mycel/admin/v1/cluster.proto`
- `mycel/internal/daemon/api/admin/cluster_service.go`
- `mycel/internal/daemon/api/admin/cluster_service_test.go`
- `mycel/internal/daemon/server/server.go`
- `mycel/internal/daemon/app/app.go`
- `mycel/internal/clustering/consensus/group.go`
- `mycel/internal/clustering/consensus/multigroup.go`

Admin app:

- `mycel-admin/src-tauri/src/commands/cluster.rs`
- `mycel-admin/src-tauri/src/lib.rs`
- `mycel-admin/src/services/adminService.ts`
- `mycel-admin/src/types/cluster.ts`
- `mycel-admin/src/features/cluster/pages/ClusterPage.tsx`
- `mycel-admin/src/features/cluster/pages/ClusterPage.test.tsx`
- `mycel-admin/src/features/cluster/pages/NodeDetailPage.tsx`
- `mycel-admin/src/features/cluster/pages/NodeDetailPage.test.tsx`
- `mycel-admin/src/features/spaces/pages/SpaceDetailPage.tsx`
- `mycel-admin/src/features/spaces/pages/SpaceDetailPage.test.tsx`

## Validation

Backend:

```bash
cd mycel
go test ./internal/...
```

Admin app:

```bash
cd mycel-admin
cargo check --manifest-path src-tauri/Cargo.toml
npm test -- --runInBand ClusterPage.test.tsx NodeDetailPage.test.tsx SpaceDetailPage.test.tsx
npm run build
```

## Remaining work

- Remove/deprecate old static-primary backend RPCs after server-side static removal is scheduled.
- Replace legacy membership store display with Raft-native node status once membership changes are implemented.
- Add real Raft diagnostics RPCs for mutation checks and multi-node validation.
- Add leader transfer/rebalance UI only after backend support exists.
- Add durable Raft event stream or health history.
