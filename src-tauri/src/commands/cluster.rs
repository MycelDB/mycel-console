use tauri::State;
use tonic::Request;

use crate::state::AppState;
use mycel_sdk::proto::admin::v1::{
    ClusterEngine, ClusterMember, ClusterMemberState, ClusterMode, ClusterNodeState, ClusterPeer,
    ClusterPeerSource, ClusterPeerState, ClusterReadiness, GetClusterHealthRequest,
    GetClusterRuntimeStatusRequest, GetClusterStatusRequest, GetGraphConsistencyReportRequest,
    GetLocalGraphConsistencyRequest, GetLocalGraphForensicExportRequest, GraphConsistencyReplica,
    GraphConsistencyStatus, GraphConsistencyWarning, GraphConsistencyWarningSeverity,
    GraphForensicEntity, GraphForensicExportManifest, ListClusterMembersRequest,
    ListRaftGroupsRequest, LocalGraphConsistencyStats, LookupSpaceRouteRequest, RaftGroupHealth,
    RaftGroupKind, RaftGroupStatus, RaftReadDiagnostics, RaftTransportDiagnostics,
    RaftTransportTargetDiagnostics,
};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterStatusInfo {
    pub node: ClusterNodeInfo,
    pub cluster: ClusterInfo,
    pub peers: Vec<ClusterPeerInfo>,
    pub readiness: Option<ClusterReadinessInfo>,
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
    pub readiness: Option<ClusterReadinessInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClusterReadinessInfo {
    pub client_ready: bool,
    pub metadata_applied: bool,
    pub metadata_validated: bool,
    pub partition_groups_started: bool,
    pub authoritative_cluster_id: Option<String>,
    pub local_cluster_id: Option<String>,
    pub expected_member_count: i32,
    pub readiness_blockers: Vec<String>,
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
    pub raft_transport: Option<RaftTransportDiagnosticsInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaftTransportDiagnosticsInfo {
    pub send_attempts: u64,
    pub send_failures: u64,
    pub auth_failures: u64,
    pub missing_sender_failures: u64,
    pub last_error_at: Option<String>,
    pub last_error: Option<String>,
    pub last_failure_reason: Option<String>,
    pub last_group_id: Option<String>,
    pub last_source_node_id: Option<u64>,
    pub last_target_node_id: Option<u64>,
    pub last_message_type: Option<String>,
    pub targets: Vec<RaftTransportTargetDiagnosticsInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaftTransportTargetDiagnosticsInfo {
    pub group_id: Option<String>,
    pub target_node_id: Option<u64>,
    pub send_attempts: u64,
    pub send_failures: u64,
    pub auth_failures: u64,
    pub missing_sender_failures: u64,
    pub last_error_at: Option<String>,
    pub last_error: Option<String>,
    pub last_failure_reason: Option<String>,
    pub last_message_type: Option<String>,
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
    pub last_index: u64,
    pub snapshot_index: u64,
    pub health_reason: Option<String>,
    pub read_diagnostics: Option<RaftReadDiagnosticsInfo>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RaftReadDiagnosticsInfo {
    pub read_index_attempts: u64,
    pub read_index_successes: u64,
    pub read_index_failures: u64,
    pub read_index_timeouts: u64,
    pub read_index_no_leader: u64,
    pub read_index_not_leader: u64,
    pub apply_wait_failures: u64,
    pub last_failure_at: Option<String>,
    pub last_failure_reason: Option<String>,
    pub last_read_index: Option<u64>,
    pub last_applied_wait_index: Option<u64>,
    pub last_applied_wait_success: Option<u64>,
    pub last_applied_wait_millis: i64,
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

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphConsistencyInput {
    pub space_id: String,
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalGraphConsistencyResponseInfo {
    pub stats: Option<LocalGraphConsistencyStatsInfo>,
    pub raft_group: Option<RaftGroupStatusInfo>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphConsistencyReportInfo {
    pub status: String,
    pub space_id: String,
    pub domain_id: String,
    pub partition_id: u32,
    pub local_node_id: Option<u64>,
    pub leader_node_id: Option<u64>,
    pub expected_replica_node_ids: Vec<u64>,
    pub raft_group: Option<RaftGroupStatusInfo>,
    pub replicas: Vec<GraphConsistencyReplicaInfo>,
    pub warnings: Vec<GraphConsistencyWarningInfo>,
    pub comparison_basis: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphConsistencyReplicaInfo {
    pub raft_node_id: Option<u64>,
    pub node_id: Option<String>,
    pub node_name: Option<String>,
    pub backend_addr: Option<String>,
    pub local: bool,
    pub reachable: bool,
    pub stats: Option<LocalGraphConsistencyStatsInfo>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphConsistencyWarningInfo {
    pub code: Option<String>,
    pub severity: String,
    pub raft_node_id: Option<u64>,
    pub message: String,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalGraphConsistencyStatsInfo {
    pub space_id: String,
    pub domain_id: String,
    pub partition_id: u32,
    pub revision: u64,
    pub node_count: u64,
    pub edge_count: u64,
    pub node_checksum: Option<String>,
    pub edge_checksum: Option<String>,
    pub graph_checksum: Option<String>,
    pub checksum_algorithm: Option<String>,
    pub collected_at: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphForensicExportInput {
    pub space_id: String,
    pub domain_id: String,
    pub page_size: Option<u32>,
    pub page_token: Option<String>,
    pub source_label: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphForensicExportResponseInfo {
    pub manifest: Option<GraphForensicExportManifestInfo>,
    pub stats: Option<LocalGraphConsistencyStatsInfo>,
    pub nodes: Vec<GraphForensicEntityInfo>,
    pub edges: Vec<GraphForensicEntityInfo>,
    pub next_page_token: Option<String>,
    pub truncated: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphForensicExportManifestInfo {
    pub report_id: Option<String>,
    pub source_node_id: Option<String>,
    pub source_node_name: Option<String>,
    pub source_cluster_id: Option<String>,
    pub source_label: Option<String>,
    pub collected_at: Option<String>,
    pub mycel_version: Option<String>,
    pub image_tag: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphForensicEntityInfo {
    pub id: String,
    pub checksum: Option<String>,
    pub canonical_json: String,
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
        readiness: response.readiness.map(readiness_info),
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
        readiness: response.readiness.map(readiness_info),
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
        raft_transport: response.raft_transport.map(raft_transport_info),
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
pub async fn admin_get_local_graph_consistency(
    input: GraphConsistencyInput,
    state: State<'_, AppState>,
) -> Result<LocalGraphConsistencyResponseInfo, String> {
    let input = validate_graph_consistency_input(input)?;
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_local_graph_consistency(Request::new(GetLocalGraphConsistencyRequest {
            space_id: input.space_id,
            domain_id: input.domain_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(LocalGraphConsistencyResponseInfo {
        stats: response.stats.map(local_graph_consistency_stats_info),
        raft_group: response.raft_group.map(raft_group_info),
        warnings: response.warnings,
    })
}

#[tauri::command]
pub async fn admin_get_graph_consistency_report(
    input: GraphConsistencyInput,
    state: State<'_, AppState>,
) -> Result<GraphConsistencyReportInfo, String> {
    let input = validate_graph_consistency_input(input)?;
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_graph_consistency_report(Request::new(GetGraphConsistencyReportRequest {
            space_id: input.space_id,
            domain_id: input.domain_id,
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(GraphConsistencyReportInfo {
        status: graph_consistency_status(response.status),
        space_id: response.space_id,
        domain_id: response.domain_id,
        partition_id: response.partition_id,
        local_node_id: nonzero_u64(response.local_node_id),
        leader_node_id: nonzero_u64(response.leader_node_id),
        expected_replica_node_ids: response.expected_replica_node_ids,
        raft_group: response.raft_group.map(raft_group_info),
        replicas: response
            .replicas
            .into_iter()
            .map(graph_consistency_replica_info)
            .collect(),
        warnings: response
            .warnings
            .into_iter()
            .map(graph_consistency_warning_info)
            .collect(),
        comparison_basis: optional(response.comparison_basis),
    })
}

#[tauri::command]
pub async fn admin_get_local_graph_forensic_export(
    input: GraphForensicExportInput,
    state: State<'_, AppState>,
) -> Result<GraphForensicExportResponseInfo, String> {
    let input = validate_graph_forensic_export_input(input)?;
    let mut client = cluster_client(&state).await?;
    let response = client
        .get_local_graph_forensic_export(Request::new(GetLocalGraphForensicExportRequest {
            space_id: input.space_id,
            domain_id: input.domain_id,
            page_size: input.page_size.unwrap_or(100),
            page_token: input.page_token.unwrap_or_default(),
            source_label: input.source_label.unwrap_or_default(),
        }))
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    Ok(GraphForensicExportResponseInfo {
        manifest: response.manifest.map(graph_forensic_export_manifest_info),
        stats: response.stats.map(local_graph_consistency_stats_info),
        nodes: response
            .nodes
            .into_iter()
            .map(graph_forensic_entity_info)
            .collect(),
        edges: response
            .edges
            .into_iter()
            .map(graph_forensic_entity_info)
            .collect(),
        next_page_token: optional(response.next_page_token),
        truncated: response.truncated,
        warnings: response.warnings,
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
        last_index: group.last_index,
        snapshot_index: group.snapshot_index,
        health_reason: optional(group.health_reason),
        read_diagnostics: group.read_diagnostics.map(raft_read_diagnostics_info),
    }
}

fn readiness_info(readiness: ClusterReadiness) -> ClusterReadinessInfo {
    ClusterReadinessInfo {
        client_ready: readiness.client_ready,
        metadata_applied: readiness.metadata_applied,
        metadata_validated: readiness.metadata_validated,
        partition_groups_started: readiness.partition_groups_started,
        authoritative_cluster_id: optional(readiness.authoritative_cluster_id),
        local_cluster_id: optional(readiness.local_cluster_id),
        expected_member_count: readiness.expected_member_count,
        readiness_blockers: readiness.readiness_blockers,
    }
}

fn raft_transport_info(diagnostics: RaftTransportDiagnostics) -> RaftTransportDiagnosticsInfo {
    RaftTransportDiagnosticsInfo {
        send_attempts: diagnostics.send_attempts,
        send_failures: diagnostics.send_failures,
        auth_failures: diagnostics.auth_failures,
        missing_sender_failures: diagnostics.missing_sender_failures,
        last_error_at: optional(diagnostics.last_error_at),
        last_error: optional(diagnostics.last_error),
        last_failure_reason: optional(diagnostics.last_failure_reason),
        last_group_id: optional(diagnostics.last_group_id),
        last_source_node_id: nonzero_u64(diagnostics.last_source_node_id),
        last_target_node_id: nonzero_u64(diagnostics.last_target_node_id),
        last_message_type: optional(diagnostics.last_message_type),
        targets: diagnostics
            .targets
            .into_iter()
            .map(raft_transport_target_info)
            .collect(),
    }
}

fn raft_transport_target_info(
    diagnostics: RaftTransportTargetDiagnostics,
) -> RaftTransportTargetDiagnosticsInfo {
    RaftTransportTargetDiagnosticsInfo {
        group_id: optional(diagnostics.group_id),
        target_node_id: nonzero_u64(diagnostics.target_node_id),
        send_attempts: diagnostics.send_attempts,
        send_failures: diagnostics.send_failures,
        auth_failures: diagnostics.auth_failures,
        missing_sender_failures: diagnostics.missing_sender_failures,
        last_error_at: optional(diagnostics.last_error_at),
        last_error: optional(diagnostics.last_error),
        last_failure_reason: optional(diagnostics.last_failure_reason),
        last_message_type: optional(diagnostics.last_message_type),
    }
}

fn raft_read_diagnostics_info(diagnostics: RaftReadDiagnostics) -> RaftReadDiagnosticsInfo {
    RaftReadDiagnosticsInfo {
        read_index_attempts: diagnostics.read_index_attempts,
        read_index_successes: diagnostics.read_index_successes,
        read_index_failures: diagnostics.read_index_failures,
        read_index_timeouts: diagnostics.read_index_timeouts,
        read_index_no_leader: diagnostics.read_index_no_leader,
        read_index_not_leader: diagnostics.read_index_not_leader,
        apply_wait_failures: diagnostics.apply_wait_failures,
        last_failure_at: optional(diagnostics.last_failure_at),
        last_failure_reason: optional(diagnostics.last_failure_reason),
        last_read_index: nonzero_u64(diagnostics.last_read_index),
        last_applied_wait_index: nonzero_u64(diagnostics.last_applied_wait_index),
        last_applied_wait_success: nonzero_u64(diagnostics.last_applied_wait_success),
        last_applied_wait_millis: diagnostics.last_applied_wait_millis,
    }
}

fn validate_graph_consistency_input(
    input: GraphConsistencyInput,
) -> Result<GraphConsistencyInput, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    Ok(GraphConsistencyInput {
        space_id,
        domain_id,
    })
}

fn local_graph_consistency_stats_info(
    stats: LocalGraphConsistencyStats,
) -> LocalGraphConsistencyStatsInfo {
    LocalGraphConsistencyStatsInfo {
        space_id: stats.space_id,
        domain_id: stats.domain_id,
        partition_id: stats.partition_id,
        revision: stats.revision,
        node_count: stats.node_count,
        edge_count: stats.edge_count,
        node_checksum: optional(stats.node_checksum),
        edge_checksum: optional(stats.edge_checksum),
        graph_checksum: optional(stats.graph_checksum),
        checksum_algorithm: optional(stats.checksum_algorithm),
        collected_at: optional(stats.collected_at),
        source: optional(stats.source),
    }
}

fn graph_consistency_replica_info(replica: GraphConsistencyReplica) -> GraphConsistencyReplicaInfo {
    GraphConsistencyReplicaInfo {
        raft_node_id: nonzero_u64(replica.raft_node_id),
        node_id: optional(replica.node_id),
        node_name: optional(replica.node_name),
        backend_addr: optional(replica.backend_addr),
        local: replica.local,
        reachable: replica.reachable,
        stats: replica.stats.map(local_graph_consistency_stats_info),
        error: optional(replica.error),
    }
}

fn graph_consistency_warning_info(warning: GraphConsistencyWarning) -> GraphConsistencyWarningInfo {
    GraphConsistencyWarningInfo {
        code: optional(warning.code),
        severity: graph_consistency_warning_severity(warning.severity),
        raft_node_id: nonzero_u64(warning.raft_node_id),
        message: warning.message,
    }
}

fn graph_consistency_status(value: i32) -> String {
    match GraphConsistencyStatus::try_from(value).unwrap_or(GraphConsistencyStatus::Unspecified) {
        GraphConsistencyStatus::Consistent => "consistent",
        GraphConsistencyStatus::Lagging => "lagging",
        GraphConsistencyStatus::Divergent => "divergent",
        GraphConsistencyStatus::Degraded => "degraded",
        GraphConsistencyStatus::Unknown => "unknown",
        GraphConsistencyStatus::Unspecified => "unspecified",
    }
    .to_string()
}

fn graph_consistency_warning_severity(value: i32) -> String {
    match GraphConsistencyWarningSeverity::try_from(value)
        .unwrap_or(GraphConsistencyWarningSeverity::Unspecified)
    {
        GraphConsistencyWarningSeverity::Info => "info",
        GraphConsistencyWarningSeverity::Warning => "warning",
        GraphConsistencyWarningSeverity::Critical => "critical",
        GraphConsistencyWarningSeverity::Unspecified => "unspecified",
    }
    .to_string()
}

fn validate_graph_forensic_export_input(
    input: GraphForensicExportInput,
) -> Result<GraphForensicExportInput, String> {
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();
    if space_id.is_empty() || domain_id.is_empty() {
        return Err("Space ID and domain ID are required".to_string());
    }
    Ok(GraphForensicExportInput {
        space_id,
        domain_id,
        page_size: input.page_size,
        page_token: input.page_token.map(|value| value.trim().to_string()),
        source_label: input.source_label.map(|value| value.trim().to_string()),
    })
}

fn graph_forensic_export_manifest_info(
    manifest: GraphForensicExportManifest,
) -> GraphForensicExportManifestInfo {
    GraphForensicExportManifestInfo {
        report_id: optional(manifest.report_id),
        source_node_id: optional(manifest.source_node_id),
        source_node_name: optional(manifest.source_node_name),
        source_cluster_id: optional(manifest.source_cluster_id),
        source_label: optional(manifest.source_label),
        collected_at: optional(manifest.collected_at),
        mycel_version: optional(manifest.mycel_version),
        image_tag: optional(manifest.image_tag),
    }
}

fn graph_forensic_entity_info(entity: GraphForensicEntity) -> GraphForensicEntityInfo {
    GraphForensicEntityInfo {
        id: entity.id,
        checksum: optional(entity.checksum),
        canonical_json: entity.canonical_json,
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
        ClusterEngine::Unspecified => "static",
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn readiness_mapping_preserves_fail_closed_fields() {
        let info = readiness_info(ClusterReadiness {
            client_ready: false,
            metadata_applied: true,
            metadata_validated: false,
            partition_groups_started: false,
            authoritative_cluster_id: "cluster-a".to_string(),
            local_cluster_id: "cluster-b".to_string(),
            expected_member_count: 3,
            readiness_blockers: vec!["metadata not validated".to_string()],
        });

        assert!(!info.client_ready);
        assert!(info.metadata_applied);
        assert!(!info.metadata_validated);
        assert!(!info.partition_groups_started);
        assert_eq!(info.authoritative_cluster_id.as_deref(), Some("cluster-a"));
        assert_eq!(info.local_cluster_id.as_deref(), Some("cluster-b"));
        assert_eq!(info.expected_member_count, 3);
        assert_eq!(info.readiness_blockers, vec!["metadata not validated"]);
    }

    #[test]
    fn raft_transport_mapping_preserves_failure_diagnostics() {
        let info = raft_transport_info(RaftTransportDiagnostics {
            send_attempts: 10,
            send_failures: 2,
            auth_failures: 1,
            missing_sender_failures: 1,
            last_error_at: "2026-07-20T10:00:00Z".to_string(),
            last_error: "permission denied".to_string(),
            last_failure_reason: "auth".to_string(),
            last_group_id: "system".to_string(),
            last_source_node_id: 1,
            last_target_node_id: 2,
            last_message_type: "MsgApp".to_string(),
            targets: vec![RaftTransportTargetDiagnostics {
                group_id: "system".to_string(),
                target_node_id: 2,
                send_attempts: 5,
                send_failures: 1,
                auth_failures: 1,
                missing_sender_failures: 0,
                last_error_at: "2026-07-20T10:00:00Z".to_string(),
                last_error: "permission denied".to_string(),
                last_failure_reason: "auth".to_string(),
                last_message_type: "MsgApp".to_string(),
            }],
        });

        assert_eq!(info.send_attempts, 10);
        assert_eq!(info.send_failures, 2);
        assert_eq!(info.auth_failures, 1);
        assert_eq!(info.missing_sender_failures, 1);
        assert_eq!(info.last_group_id.as_deref(), Some("system"));
        assert_eq!(info.last_source_node_id, Some(1));
        assert_eq!(info.last_target_node_id, Some(2));
        assert_eq!(info.targets.len(), 1);
        assert_eq!(info.targets[0].target_node_id, Some(2));
        assert_eq!(info.targets[0].auth_failures, 1);
    }

    #[test]
    fn raft_group_mapping_preserves_read_and_snapshot_diagnostics() {
        let info = raft_group_info(RaftGroupStatus {
            group_id: "partition-7".to_string(),
            kind: RaftGroupKind::Partition as i32,
            partition_id: 7,
            local_node_id: 1,
            leader_node_id: 2,
            preferred_leader_node_id: 2,
            replica_node_ids: vec![1, 2, 3],
            health: RaftGroupHealth::Healthy as i32,
            term: 4,
            commit_index: 100,
            applied_index: 99,
            apply_lag: 1,
            last_index: 101,
            snapshot_index: 50,
            health_reason: "ok".to_string(),
            read_diagnostics: Some(RaftReadDiagnostics {
                read_index_attempts: 8,
                read_index_successes: 7,
                read_index_failures: 1,
                read_index_timeouts: 1,
                read_index_no_leader: 0,
                read_index_not_leader: 0,
                apply_wait_failures: 0,
                last_failure_at: "2026-07-20T10:00:00Z".to_string(),
                last_failure_reason: "timeout".to_string(),
                last_read_index: 100,
                last_applied_wait_index: 99,
                last_applied_wait_success: 99,
                last_applied_wait_millis: 12,
            }),
        });

        assert_eq!(info.partition_id, Some(7));
        assert_eq!(info.last_index, 101);
        assert_eq!(info.snapshot_index, 50);
        assert_eq!(info.health_reason.as_deref(), Some("ok"));
        let read = info.read_diagnostics.expect("read diagnostics");
        assert_eq!(read.read_index_attempts, 8);
        assert_eq!(read.read_index_failures, 1);
        assert_eq!(read.last_failure_reason.as_deref(), Some("timeout"));
        assert_eq!(read.last_read_index, Some(100));
        assert_eq!(read.last_applied_wait_index, Some(99));
        assert_eq!(read.last_applied_wait_success, Some(99));
        assert_eq!(read.last_applied_wait_millis, 12);
    }

    #[test]
    fn graph_consistency_mapping_preserves_status_replica_and_warning_fields() {
        assert_eq!(
            graph_consistency_status(GraphConsistencyStatus::Consistent as i32),
            "consistent"
        );
        assert_eq!(
            graph_consistency_status(GraphConsistencyStatus::Lagging as i32),
            "lagging"
        );
        assert_eq!(
            graph_consistency_status(GraphConsistencyStatus::Divergent as i32),
            "divergent"
        );
        assert_eq!(
            graph_consistency_status(GraphConsistencyStatus::Degraded as i32),
            "degraded"
        );
        assert_eq!(
            graph_consistency_status(GraphConsistencyStatus::Unknown as i32),
            "unknown"
        );
        assert_eq!(
            graph_consistency_warning_severity(GraphConsistencyWarningSeverity::Info as i32),
            "info"
        );
        assert_eq!(
            graph_consistency_warning_severity(GraphConsistencyWarningSeverity::Warning as i32),
            "warning"
        );
        assert_eq!(
            graph_consistency_warning_severity(GraphConsistencyWarningSeverity::Critical as i32),
            "critical"
        );

        let stats = local_graph_consistency_stats_info(LocalGraphConsistencyStats {
            space_id: "sp_main".to_string(),
            domain_id: "dom_default".to_string(),
            partition_id: 7,
            revision: 42,
            node_count: 10,
            edge_count: 9,
            node_checksum: "nodes".to_string(),
            edge_checksum: "edges".to_string(),
            graph_checksum: "graph".to_string(),
            checksum_algorithm: "sha256".to_string(),
            collected_at: "2026-07-20T10:00:00Z".to_string(),
            source: "local".to_string(),
        });
        assert_eq!(stats.partition_id, 7);
        assert_eq!(stats.graph_checksum.as_deref(), Some("graph"));

        let replica = graph_consistency_replica_info(GraphConsistencyReplica {
            raft_node_id: 2,
            node_id: "node-b".to_string(),
            node_name: "node-b".to_string(),
            backend_addr: "node-b:9091".to_string(),
            local: false,
            reachable: false,
            stats: None,
            error: "unreachable".to_string(),
        });
        assert_eq!(replica.raft_node_id, Some(2));
        assert!(!replica.reachable);
        assert_eq!(replica.error.as_deref(), Some("unreachable"));

        let warning = graph_consistency_warning_info(GraphConsistencyWarning {
            code: "CHECKSUM_MISMATCH".to_string(),
            severity: GraphConsistencyWarningSeverity::Critical as i32,
            raft_node_id: 2,
            message: "replica checksum differs".to_string(),
        });
        assert_eq!(warning.code.as_deref(), Some("CHECKSUM_MISMATCH"));
        assert_eq!(warning.severity, "critical");
        assert_eq!(warning.raft_node_id, Some(2));
    }

    #[test]
    fn graph_forensic_export_mapping_preserves_manifest_and_entities() {
        let manifest = graph_forensic_export_manifest_info(GraphForensicExportManifest {
            report_id: "report-1".to_string(),
            source_node_id: "node-a".to_string(),
            source_node_name: "node-a".to_string(),
            source_cluster_id: "cluster-a".to_string(),
            source_label: "admin-ui".to_string(),
            collected_at: "2026-07-20T10:00:00Z".to_string(),
            mycel_version: "0.4.0".to_string(),
            image_tag: "local".to_string(),
        });
        assert_eq!(manifest.report_id.as_deref(), Some("report-1"));
        assert_eq!(manifest.source_label.as_deref(), Some("admin-ui"));

        let entity = graph_forensic_entity_info(GraphForensicEntity {
            id: "node-1".to_string(),
            checksum: "checksum".to_string(),
            canonical_json: "{}".to_string(),
        });
        assert_eq!(entity.id, "node-1");
        assert_eq!(entity.checksum.as_deref(), Some("checksum"));
        assert_eq!(entity.canonical_json, "{}");
    }
}
