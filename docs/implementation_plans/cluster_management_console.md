# Cluster Management Console Design

## Status

Design proposal for adding clustering operations to the Mycel Admin app.

## Goals

Provide an operator-focused UI for:

- viewing local cluster status
- viewing topology/peers
- viewing membership/admission state
- adding a node and generating a node-specific one-time join token
- inspecting node details
- preparing for future heartbeat, replication, and security features

## Non-goals for first UI milestone

- leader election UI
- replication controls
- mTLS credential rotation
- node removal/draining workflows
- cluster-wide consensus status
- automatic daemon process launch from UI

## Information architecture

Add a new top-level sidebar section:

```text
Cluster
```

Subpages:

```text
Cluster Overview
Peers / Topology
Membership
Node Detail
```

A compact first implementation may combine these into one route:

```text
/cluster
```

with tabs:

```text
Overview | Peers | Membership
```

## Feature 1: Cluster overview dashboard

### Purpose

Summarize the daemon's current clustering state.

### Data

From `mycel cluster status` equivalent API:

- cluster ID
- cluster name
- cluster mode: `standalone` / `clustered`
- local node ID
- local node name
- local node state
- peer counts:
  - total
  - active
  - unreachable
- membership counts later:
  - pending
  - active
  - removed/rejected

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Cluster                                                      │
│ dev-cluster                                                  │
├───────────────────────┬───────────────────────┬──────────────┤
│ Mode                  │ Local Node            │ Peers        │
│ CLUSTERED             │ node-a                │ 2 total      │
│                       │ node_f602...          │ 1 active     │
├───────────────────────┴───────────────────────┴──────────────┤
│ Cluster ID                                                    │
│ cluster_511e0540-05a6-4235-a2cc-4096755104a9                  │
├───────────────────────────────────────────────────────────────┤
│ Warnings                                                       │
│ ✓ All discovered peers share the local cluster ID              │
└───────────────────────────────────────────────────────────────┘
```

### Empty/standalone state

```text
┌──────────────────────────────────────────────────────────────┐
│ Cluster                                                      │
│ Standalone daemon                                            │
├──────────────────────────────────────────────────────────────┤
│ This daemon is not currently participating in cluster mode.   │
│ Start with cluster bootstrap or join settings to cluster it.  │
└──────────────────────────────────────────────────────────────┘
```

## Feature 2: Peer/topology view

### Purpose

Show operational topology: self and currently known/discovered peers.

Topology answers:

> Who does this node currently know about or see?

### Data

For each peer:

- node name
- node ID
- backend advertise address
- state: `self`, `active`, `unreachable`
- source: `self`, `discovered`
- cluster ID/name
- last seen

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Peers                                                        │
├────────┬────────┬────────────────┬────────────┬──────────────┤
│ State  │ Name   │ Backend Addr   │ Source     │ Last Seen    │
├────────┼────────┼────────────────┼────────────┼──────────────┤
│ self   │ node-a │ 127.0.0.1:9093 │ self       │ just now     │
│ active │ node-b │ 127.0.0.1:9094 │ discovered │ 2 min ago    │
└────────┴────────┴────────────────┴────────────┴──────────────┘
```

Expanded row:

```text
Node ID:     node_61ec5f4a-f2b4-4f73-b750-22f94de36255
Cluster ID:  cluster_511e0540-05a6-4235-a2cc-4096755104a9
Cluster:     dev-cluster
```

### Warnings

Show inline warnings if:

- peer cluster ID differs from local cluster ID
- peer has no node ID
- peer has stale `last_seen_at`
- peer state is `unreachable`

## Feature 3: Membership view

### Purpose

Show authoritative admission state.

Membership answers:

> Who is allowed to belong to this cluster?

### Data

From future membership API:

- node name
- node ID, if joined
- state: `pending`, `active`, `rejected`, `removed`
- backend advertise address
- role
- bootstrap flag
- token expiration for pending nodes
- token consumed/revoked metadata
- joined at
- updated at

Never display token hash.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ Membership                                      [+ Add Node] │
├─────────┬────────┬──────────────┬──────────────┬─────────────┤
│ State   │ Name   │ Node ID      │ Backend Addr │ Joined/TTL  │
├─────────┼────────┼──────────────┼──────────────┼─────────────┤
│ active  │ node-a │ node_f602... │ 127...:9093  │ bootstrap   │
│ active  │ node-b │ node_61ec... │ 127...:9094  │ 5 min ago   │
│ pending │ node-c │ —            │ —            │ expires 28m │
└─────────┴────────┴──────────────┴──────────────┴─────────────┘
```

Pending row actions:

```text
[Rotate Token] [Revoke] [Remove]
```

Active row actions, future:

```text
[View] [Drain] [Remove]
```

## Feature 4: Add node modal

### Purpose

Create a pending member and generate a one-time node-specific join token.

### Flow

1. Operator clicks **Add Node**.
2. Enters node name.
3. Admin app calls cluster admission endpoint.
4. Backend creates pending membership and returns token once.
5. UI displays token and startup instructions.

### Wireframe: input

```text
┌─────────────────────────────────────────────┐
│ Add Cluster Node                            │
├─────────────────────────────────────────────┤
│ Node name                                   │
│ [ node-c                                  ] │
│                                             │
│ Token TTL                                  │
│ [ 30 minutes                             ] │
│                                             │
│ [Cancel]                         [Create]  │
└─────────────────────────────────────────────┘
```

### Wireframe: token result

```text
┌──────────────────────────────────────────────────────────────┐
│ Node token created                                           │
├──────────────────────────────────────────────────────────────┤
│ Node node-c was added as pending.                            │
│                                                              │
│ Join token                                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ mycel_join_v1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx   │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Copy token]                                                 │
│                                                              │
│ Start command                                                │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ MYCELD_CLUSTER_SEED_PEERS=127.0.0.1:9093 \              │ │
│ │ MYCELD_CLUSTER_JOIN_TOKEN_FILE=/path/to/node-c.join \   │ │
│ │ ./scripts/startClusterNode.sh node-c                    │ │
│ └──────────────────────────────────────────────────────────┘ │
│ [Copy command]                                               │
│                                                              │
│ Warning: this token is shown once. Store it securely.         │
│                                                              │
│ [Done]                                                       │
└──────────────────────────────────────────────────────────────┘
```

## Feature 5: Node detail page

### Purpose

Inspect one node's topology and membership status.

### Wireframe

```text
┌──────────────────────────────────────────────────────────────┐
│ node-b                                                       │
│ active                                                       │
├──────────────────────────────────────────────────────────────┤
│ Node ID                 node_61ec5f4a...                    │
│ Cluster ID              cluster_511e0540...                 │
│ Backend address         127.0.0.1:9094                      │
│ Source                  discovered                          │
│ Last seen               2026-07-15 16:12:59                 │
│ Joined at               2026-07-15 16:12:59                 │
│ Public key fingerprint  not enforced yet                    │
└──────────────────────────────────────────────────────────────┘
```

## Feature 6: Future cluster event log

Eventually show:

- pending node created
- token rotated
- token revoked
- node joined
- node became unreachable
- node recovered
- node removed

Wireframe:

```text
┌──────────────────────────────────────────────────────────────┐
│ Cluster Events                                               │
├──────────────┬──────────────┬────────────────────────────────┤
│ Time         │ Type         │ Message                        │
├──────────────┼──────────────┼────────────────────────────────┤
│ 16:12:59     │ node_joined  │ node-b joined dev-cluster      │
│ 16:10:00     │ token_issued │ token issued for node-b        │
└──────────────┴──────────────┴────────────────────────────────┘
```

## API needs

Current available/near-available backend operations:

- `GetClusterView` for `mycel cluster status`
- `AddClusterNode` for pending node token creation

Recommended admin app-facing API shape:

```ts
type ClusterStatus = {
  node: {
    nodeId: string
    nodeName?: string
    state: 'standalone' | 'clustered' | 'failed' | 'stopped'
    admitted?: boolean
    bootstrap?: boolean
  }
  cluster: {
    clusterId: string
    clusterName?: string
    mode: 'standalone' | 'clustered'
  }
  peers: ClusterPeer[]
}

type ClusterPeer = {
  nodeId?: string
  nodeName?: string
  clusterId?: string
  clusterName?: string
  backendAdvertiseAddr: string
  state: 'self' | 'active' | 'unreachable'
  source: 'self' | 'discovered'
  lastSeenAt?: string
}

type AddClusterNodeResult = {
  nodeName: string
  state: 'pending'
  token?: string
  tokenId: string
  expiresAt: string
}
```

## Recommended implementation stages

### Stage 1: read-only cluster status

- Add Tauri command to fetch cluster status.
- Add admin service method.
- Add Cluster page with overview + peers table.
- Add sidebar item.
- Add tests for rendering clustered and standalone states.

### Stage 2: add node modal

- Add Tauri command for `AddClusterNode`.
- Add modal and token result view.
- Add copy-to-clipboard behavior.
- Add tests for token display and command rendering.

### Stage 3: membership table

- Add membership list API when backend supports it.
- Display pending and active members separately from topology peers.

### Stage 4: node detail and future actions

- Add node detail route/panel.
- Add token rotation/revoke when backend supports it.
- Add remove/drain actions later.

## UX rules

- Never display token hashes.
- Plaintext join token is shown only immediately after creation.
- Distinguish topology from membership.
- Show warnings for cluster ID mismatches.
- Show `standalone` as a valid, non-error state.
- Treat unsecured transport as a development-stage warning if cluster management actions are exposed.

## Security notes

Current backend cluster APIs are internal and currently development-stage. Before production UI exposure:

- move operator actions behind authenticated admin APIs
- require operator authorization
- enforce mTLS or persistent node credentials for node identity
- audit node admission actions
