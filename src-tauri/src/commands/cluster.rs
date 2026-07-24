use tauri::State;
use tonic::Request;

use crate::state::AppState;
use mycel_sdk::proto::admin::v1::{
    ClusterEngine, ClusterMember, ClusterMemberState, ClusterMode, ClusterNodeState, ClusterPeer,
    ClusterPeerSource, ClusterPeerState, GetClusterHealthRequest, GetClusterRuntimeStatusRequest,
    GetClusterStatusRequest, ListClusterMembersRequest, ListRaftGroupsRequest,
    LookupSpaceRouteRequest, RaftGroupHealth, RaftGroupKind, RaftGroupStatus,
};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterStatusInfo {
    pub node: ClusterNodeInfo,
    pub cluster: ClusterInfo,
    pub peers: Vec<ClusterPeerInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterNodeInfo {
    pub node_id: String,
    pub node_name: Option<String>,
    pub state: String,
    pub admitted: bool,
    pub bootstrap: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterInfo {
    pub cluster_id: String,
    pub cluster_name: Option<String>,
    pub mode: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterPeerInfo {
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub cluster_id: Option<String>,
    pub cluster_name: Option<String>,
    pub backend_advertise_addr: String,
    pub state: String,
    pub source: String,
    pub last_seen_at: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterHealthInfo {
    pub status: String,
    pub warnings: Vec<String>,
    pub active_members: i32,
    pub pending_members: i32,
    pub unreachable_peers: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterRuntimeStatusInfo {
    pub engine: String,
    pub cluster_name: Option<String>,
    pub raft_node_count: u32,
    pub raft_partition_count: u32,
    pub raft_replica_factor: u32,
    pub local_raft_node_id: u64,
    pub raft_node_addrs: Vec<String>,
    pub raft_group_count: i32,
    pub raft_groups_with_leader: i32,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaftGroupStatusInfo {
    pub group_id: String,
    pub kind: String,
    pub partition_id: Option<u32>,
    pub local_node_id: u64,
    pub leader_node_id: Option<u64>,
    pub preferred_leader_node_id: Option<u64>,
    pub replica_node_ids: Vec<u64>,
    pub health: String,
    pub term: u64,
    pub commit_index: u64,
    pub applied_index: u64,
    pub apply_lag: u64,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListRaftGroupsResponseInfo {
    pub groups: Vec<RaftGroupStatusInfo>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LookupSpaceRouteInput {
    pub space_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LookupSpaceRouteResult {
    pub space_id: String,
    pub partition_id: u32,
    pub leader_node_id: Option<u64>,
    pub replica_node_ids: Vec<u64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListClusterMembersResponse {
    pub cluster_id: String,
    pub cluster_name: Option<String>,
    pub members: Vec<ClusterMemberInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterMemberInfo {
    pub node_name: String,
    pub node_id: Option<String>,
    pub state: String,
    pub backend_advertise_addr: Option<String>,
    pub cluster_bootstrap: bool,
    pub node_public_key_fingerprint: Option<String>,
    pub token_id: Option<String>,
    pub token_expires_at: Option<String>,
    pub token_consumed_at: Option<String>,
    pub token_revoked_at: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub joined_at: Option<String>,
}

#[tauri::command]
pub async fn admin_get_cluster_status(
    state: State<'_, AppState>,
) -> Result<ClusterStatusInfo, String> {
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_cluster_status(Request::new(GetClusterStatusRequest {}))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let node = response.node.unwrap_or_default();
    let cluster = response.cluster.unwrap_or_default();
    Ok(ClusterStatusInfo {
        node: ClusterNodeInfo {
            node_id: node.node_id,
            node_name: optional(node.node_name),
            state: node_state(node.state),
            admitted: node.admitted,
            bootstrap: node.bootstrap,
        },
        cluster: ClusterInfo {
            cluster_id: cluster.cluster_id,
            cluster_name: optional(cluster.cluster_name),
            mode: cluster_mode(cluster.mode),
        },
        peers: response.peers.into_iter().map(peer_info).collect(),
    })
}

#[tauri::command]
pub async fn admin_get_cluster_health(
    state: State<'_, AppState>,
) -> Result<ClusterHealthInfo, String> {
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_cluster_health(Request::new(GetClusterHealthRequest {}))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ClusterHealthInfo {
        status: response.status,
        warnings: response.warnings,
        active_members: response.active_members,
        pending_members: response.pending_members,
        unreachable_peers: response.unreachable_peers,
    })
}

#[tauri::command]
pub async fn admin_get_cluster_runtime_status(
    state: State<'_, AppState>,
) -> Result<ClusterRuntimeStatusInfo, String> {
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_cluster_runtime_status(Request::new(GetClusterRuntimeStatusRequest {}))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ClusterRuntimeStatusInfo {
        engine: cluster_engine(response.engine),
        cluster_name: optional(response.cluster_name),
        raft_node_count: response.raft_node_count,
        raft_partition_count: response.raft_partition_count,
        raft_replica_factor: response.raft_replica_factor,
        local_raft_node_id: response.local_raft_node_id,
        raft_node_addrs: response.raft_node_addrs,
        raft_group_count: response.raft_group_count,
        raft_groups_with_leader: response.raft_groups_with_leader,
    })
}

#[tauri::command]
pub async fn admin_list_raft_groups(
    state: State<'_, AppState>,
) -> Result<ListRaftGroupsResponseInfo, String> {
    let mut client = cluster_client(&state).await?;
    let response = client
        .list_raft_groups(Request::new(ListRaftGroupsRequest {}))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(ListRaftGroupsResponseInfo {
        groups: response.groups.into_iter().map(raft_group_info).collect(),
    })
}

#[tauri::command]
pub async fn admin_lookup_space_route(
    input: LookupSpaceRouteInput,
    state: State<'_, AppState>,
) -> Result<LookupSpaceRouteResult, String> {
    let space_id = input.space_id.trim().to_string();
    if space_id.is_empty() {
        return Err("Space ID is required".to_string());
    }
    let mut client = cluster_client(&state).await?;
    let response = client
        .lookup_space_route(Request::new(LookupSpaceRouteRequest { space_id }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(LookupSpaceRouteResult {
        space_id: response.space_id,
        partition_id: response.partition_id,
        leader_node_id: nonzero_u64(response.leader_node_id),
        replica_node_ids: response.replica_node_ids,
    })
}

#[tauri::command]
pub async fn admin_list_cluster_members(
    state: State<'_, AppState>,
) -> Result<ListClusterMembersResponse, String> {
    let mut client = cluster_client(&state).await?;
    let response = client
        .list_cluster_members(Request::new(ListClusterMembersRequest {}))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListClusterMembersResponse {
        cluster_id: response.cluster_id,
        cluster_name: optional(response.cluster_name),
        members: response.members.into_iter().map(member_info).collect(),
    })
}

async fn cluster_client(
    state: &State<'_, AppState>,
) -> Result<
    mycel_sdk::proto::admin::v1::admin_cluster_service_client::AdminClusterServiceClient<
        mycel_sdk::admin::AuthenticatedService,
    >,
    String,
> {
    let guard = state.admin.read().await;
    let session = guard.as_ref().ok_or_else(|| "Not logged in".to_string())?;
    Ok(session._client.cluster.clone())
}

fn peer_info(peer: ClusterPeer) -> ClusterPeerInfo {
    ClusterPeerInfo {
        node_id: optional(peer.node_id),
        node_name: optional(peer.node_name),
        cluster_id: optional(peer.cluster_id),
        cluster_name: optional(peer.cluster_name),
        backend_advertise_addr: peer.backend_advertise_addr,
        state: peer_state(peer.state),
        source: peer_source(peer.source),
        last_seen_at: optional(peer.last_seen_at),
    }
}

fn member_info(member: ClusterMember) -> ClusterMemberInfo {
    ClusterMemberInfo {
        node_name: member.node_name,
        node_id: optional(member.node_id),
        state: member_state(member.state),
        backend_advertise_addr: optional(member.backend_advertise_addr),
        cluster_bootstrap: member.cluster_bootstrap,
        node_public_key_fingerprint: optional(member.node_public_key_fingerprint),
        token_id: optional(member.token_id),
        token_expires_at: optional(member.token_expires_at),
        token_consumed_at: optional(member.token_consumed_at),
        token_revoked_at: optional(member.token_revoked_at),
        created_at: optional(member.created_at),
        updated_at: optional(member.updated_at),
        joined_at: optional(member.joined_at),
    }
}

fn raft_group_info(group: RaftGroupStatus) -> RaftGroupStatusInfo {
    let partition_id = if RaftGroupKind::try_from(group.kind).unwrap_or(RaftGroupKind::Unspecified)
        == RaftGroupKind::Partition
    {
        Some(group.partition_id)
    } else {
        None
    };
    RaftGroupStatusInfo {
        group_id: group.group_id,
        kind: raft_group_kind(group.kind),
        partition_id,
        local_node_id: group.local_node_id,
        leader_node_id: nonzero_u64(group.leader_node_id),
        preferred_leader_node_id: nonzero_u64(group.preferred_leader_node_id),
        replica_node_ids: group.replica_node_ids,
        health: raft_group_health(group.health),
        term: group.term,
        commit_index: group.commit_index,
        applied_index: group.applied_index,
        apply_lag: group.apply_lag,
    }
}

fn nonzero_u64(value: u64) -> Option<u64> {
    if value == 0 {
        None
    } else {
        Some(value)
    }
}

fn optional(value: String) -> Option<String> {
    if value.trim().is_empty() {
        None
    } else {
        Some(value)
    }
}

fn cluster_engine(value: i32) -> String {
    match ClusterEngine::try_from(value).unwrap_or(ClusterEngine::Unspecified) {
        ClusterEngine::Raft => "raft",
        ClusterEngine::Unspecified => "unspecified",
    }
    .to_string()
}

fn raft_group_kind(value: i32) -> String {
    match RaftGroupKind::try_from(value).unwrap_or(RaftGroupKind::Unspecified) {
        RaftGroupKind::System => "system",
        RaftGroupKind::Partition => "partition",
        RaftGroupKind::Unspecified => "unspecified",
    }
    .to_string()
}

fn raft_group_health(value: i32) -> String {
    match RaftGroupHealth::try_from(value).unwrap_or(RaftGroupHealth::Unspecified) {
        RaftGroupHealth::Unknown => "unknown",
        RaftGroupHealth::Healthy => "healthy",
        RaftGroupHealth::NoLeader => "no_leader",
        RaftGroupHealth::Unspecified => "unspecified",
    }
    .to_string()
}

fn node_state(value: i32) -> String {
    match ClusterNodeState::try_from(value).unwrap_or(ClusterNodeState::Unspecified) {
        ClusterNodeState::Initializing => "initializing",
        ClusterNodeState::Standalone => "standalone",
        ClusterNodeState::Clustered => "clustered",
        ClusterNodeState::Discovering => "discovering",
        ClusterNodeState::Active => "active",
        ClusterNodeState::Degraded => "degraded",
        ClusterNodeState::Stopped => "stopped",
        ClusterNodeState::Failed => "failed",
        ClusterNodeState::Unspecified => "unspecified",
    }
    .to_string()
}

fn cluster_mode(value: i32) -> String {
    match ClusterMode::try_from(value).unwrap_or(ClusterMode::Unspecified) {
        ClusterMode::Standalone => "standalone",
        ClusterMode::Clustered => "clustered",
        ClusterMode::Unspecified => "unspecified",
    }
    .to_string()
}

fn peer_state(value: i32) -> String {
    match ClusterPeerState::try_from(value).unwrap_or(ClusterPeerState::Unspecified) {
        ClusterPeerState::Self_ => "self",
        ClusterPeerState::Seed => "seed",
        ClusterPeerState::Active => "active",
        ClusterPeerState::Unreachable => "unreachable",
        ClusterPeerState::Pending => "pending",
        ClusterPeerState::Rejected => "rejected",
        ClusterPeerState::Removed => "removed",
        ClusterPeerState::Unspecified => "unspecified",
    }
    .to_string()
}

fn peer_source(value: i32) -> String {
    match ClusterPeerSource::try_from(value).unwrap_or(ClusterPeerSource::Unspecified) {
        ClusterPeerSource::Self_ => "self",
        ClusterPeerSource::Seed => "seed",
        ClusterPeerSource::Discovered => "discovered",
        ClusterPeerSource::Manual => "manual",
        ClusterPeerSource::Unspecified => "unspecified",
    }
    .to_string()
}

fn member_state(value: i32) -> String {
    match ClusterMemberState::try_from(value).unwrap_or(ClusterMemberState::Unspecified) {
        ClusterMemberState::Pending => "pending",
        ClusterMemberState::Active => "active",
        ClusterMemberState::Rejected => "rejected",
        ClusterMemberState::Removed => "removed",
        ClusterMemberState::Unspecified => "unspecified",
    }
    .to_string()
}
