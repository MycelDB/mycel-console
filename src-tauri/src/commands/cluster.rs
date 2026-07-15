use tauri::State;
use tonic::client::Grpc;
use tonic::codegen::http::uri::PathAndQuery;
use tonic::transport::Endpoint;
use tonic::Request;

use crate::state::AppState;

#[derive(Clone, PartialEq, ::prost::Message)]
struct GetClusterViewRequest {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
    #[prost(string, tag = "2")]
    requester_node_id: String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct GetClusterViewResponse {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
    #[prost(message, optional, tag = "2")]
    cluster_view: Option<ClusterView>,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct ClusterView {
    #[prost(int32, tag = "1")]
    version: i32,
    #[prost(enumeration = "ClusterMode", tag = "2")]
    mode: i32,
    #[prost(enumeration = "NodeLifecycleState", tag = "3")]
    local_state: i32,
    #[prost(message, optional, tag = "4")]
    local_identity: Option<NodeIdentity>,
    #[prost(message, repeated, tag = "5")]
    peers: Vec<Peer>,
    #[prost(string, tag = "6")]
    updated_at: String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct NodeIdentity {
    #[prost(int32, tag = "1")]
    version: i32,
    #[prost(string, tag = "2")]
    node_id: String,
    #[prost(string, tag = "3")]
    node_name: String,
    #[prost(string, tag = "4")]
    cluster_id: String,
    #[prost(string, tag = "5")]
    cluster_name: String,
    #[prost(string, tag = "6")]
    backend_advertise_addr: String,
    #[prost(string, tag = "7")]
    created_at: String,
    #[prost(string, tag = "8")]
    updated_at: String,
    #[prost(bool, tag = "9")]
    cluster_admitted: bool,
    #[prost(bool, tag = "10")]
    cluster_bootstrap: bool,
    #[prost(string, tag = "11")]
    node_public_key_fingerprint: String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct Peer {
    #[prost(string, tag = "1")]
    node_id: String,
    #[prost(string, tag = "2")]
    node_name: String,
    #[prost(string, tag = "3")]
    cluster_id: String,
    #[prost(string, tag = "4")]
    cluster_name: String,
    #[prost(string, tag = "5")]
    backend_advertise_addr: String,
    #[prost(enumeration = "PeerMembershipState", tag = "6")]
    state: i32,
    #[prost(enumeration = "PeerSource", tag = "7")]
    source: i32,
    #[prost(string, tag = "8")]
    last_seen_at: String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct AddClusterNodeRequest {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
    #[prost(string, tag = "2")]
    node_name: String,
    #[prost(int64, tag = "3")]
    token_ttl_seconds: i64,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct AddClusterNodeResponse {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
    #[prost(string, tag = "2")]
    node_name: String,
    #[prost(string, tag = "3")]
    state: String,
    #[prost(string, tag = "4")]
    token: String,
    #[prost(string, tag = "5")]
    token_id: String,
    #[prost(string, tag = "6")]
    expires_at: String,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct ListClusterMembersRequest {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct ListClusterMembersResponseProto {
    #[prost(enumeration = "ClusterProtocolVersion", tag = "1")]
    protocol_version: i32,
    #[prost(string, tag = "2")]
    cluster_id: String,
    #[prost(string, tag = "3")]
    cluster_name: String,
    #[prost(message, repeated, tag = "4")]
    members: Vec<ClusterMember>,
}

#[derive(Clone, PartialEq, ::prost::Message)]
struct ClusterMember {
    #[prost(string, tag = "1")]
    node_name: String,
    #[prost(string, tag = "2")]
    node_id: String,
    #[prost(string, tag = "3")]
    state: String,
    #[prost(string, tag = "4")]
    backend_advertise_addr: String,
    #[prost(string, tag = "5")]
    role: String,
    #[prost(bool, tag = "6")]
    cluster_bootstrap: bool,
    #[prost(string, tag = "7")]
    node_public_key_fingerprint: String,
    #[prost(string, tag = "8")]
    token_id: String,
    #[prost(string, tag = "9")]
    token_expires_at: String,
    #[prost(string, tag = "10")]
    token_consumed_at: String,
    #[prost(string, tag = "11")]
    token_revoked_at: String,
    #[prost(string, tag = "12")]
    created_at: String,
    #[prost(string, tag = "13")]
    updated_at: String,
    #[prost(string, tag = "14")]
    joined_at: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ::prost::Enumeration)]
#[repr(i32)]
enum ClusterProtocolVersion {
    Unspecified = 0,
    V1 = 1,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ::prost::Enumeration)]
#[repr(i32)]
enum NodeLifecycleState {
    Unspecified = 0,
    Initializing = 1,
    Standalone = 2,
    Clustered = 3,
    Discovering = 4,
    Active = 5,
    Degraded = 6,
    Stopped = 7,
    Failed = 8,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ::prost::Enumeration)]
#[repr(i32)]
enum ClusterMode {
    Unspecified = 0,
    Standalone = 1,
    Clustered = 2,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ::prost::Enumeration)]
#[repr(i32)]
enum PeerMembershipState {
    Unspecified = 0,
    SelfNode = 1,
    Seed = 2,
    Active = 3,
    Unreachable = 4,
    Pending = 5,
    Rejected = 6,
    Removed = 7,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, ::prost::Enumeration)]
#[repr(i32)]
enum PeerSource {
    Unspecified = 0,
    SelfSource = 1,
    Seed = 2,
    Discovered = 3,
    Manual = 4,
}

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

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddClusterNodeInput {
    pub node_name: String,
    pub token_ttl_seconds: Option<i64>,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddClusterNodeResult {
    pub node_name: String,
    pub state: String,
    pub token: Option<String>,
    pub token_id: String,
    pub expires_at: String,
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
    pub role: Option<String>,
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
    let addr = {
        let guard = state.admin.read().await;
        guard
            .as_ref()
            .map(|session| session.addr.clone())
            .ok_or_else(|| "Not logged in".to_string())?
    };
    let endpoint = Endpoint::from_shared(endpoint_addr(&addr)).map_err(|err| err.to_string())?;
    let channel = endpoint.connect().await.map_err(|err| err.to_string())?;
    let mut grpc = Grpc::new(channel);
    let path = PathAndQuery::from_static(
        "/mycel.cluster.v1.ClusterBackendService/GetClusterView",
    );
    let codec = tonic::codec::ProstCodec::default();
    let response: GetClusterViewResponse = grpc
        .unary(
            Request::new(GetClusterViewRequest {
                protocol_version: ClusterProtocolVersion::V1 as i32,
                requester_node_id: String::new(),
            }),
            path,
            codec,
        )
        .await
        .map_err(|err| err.to_string())?
        .into_inner();
    let view = response
        .cluster_view
        .ok_or_else(|| "Cluster status response missing cluster view".to_string())?;
    Ok(cluster_status_from_view(view))
}

#[tauri::command]
pub async fn admin_add_cluster_node(
    input: AddClusterNodeInput,
    state: State<'_, AppState>,
) -> Result<AddClusterNodeResult, String> {
    let node_name = input.node_name.trim().to_string();
    if node_name.is_empty() {
        return Err("Node name is required".to_string());
    }
    let addr = {
        let guard = state.admin.read().await;
        guard
            .as_ref()
            .map(|session| session.addr.clone())
            .ok_or_else(|| "Not logged in".to_string())?
    };
    let endpoint = Endpoint::from_shared(endpoint_addr(&addr)).map_err(|err| err.to_string())?;
    let channel = endpoint.connect().await.map_err(|err| err.to_string())?;
    let mut grpc = Grpc::new(channel);
    let path = PathAndQuery::from_static(
        "/mycel.cluster.v1.ClusterBackendService/AddClusterNode",
    );
    let codec = tonic::codec::ProstCodec::default();
    let response: AddClusterNodeResponse = grpc
        .unary(
            Request::new(AddClusterNodeRequest {
                protocol_version: ClusterProtocolVersion::V1 as i32,
                node_name,
                token_ttl_seconds: input.token_ttl_seconds.unwrap_or(30 * 60),
            }),
            path,
            codec,
        )
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(AddClusterNodeResult {
        node_name: response.node_name,
        state: response.state,
        token: optional(response.token),
        token_id: response.token_id,
        expires_at: response.expires_at,
    })
}

#[tauri::command]
pub async fn admin_list_cluster_members(
    state: State<'_, AppState>,
) -> Result<ListClusterMembersResponse, String> {
    let addr = {
        let guard = state.admin.read().await;
        guard
            .as_ref()
            .map(|session| session.addr.clone())
            .ok_or_else(|| "Not logged in".to_string())?
    };
    let endpoint = Endpoint::from_shared(endpoint_addr(&addr)).map_err(|err| err.to_string())?;
    let channel = endpoint.connect().await.map_err(|err| err.to_string())?;
    let mut grpc = Grpc::new(channel);
    let path = PathAndQuery::from_static(
        "/mycel.cluster.v1.ClusterBackendService/ListClusterMembers",
    );
    let codec = tonic::codec::ProstCodec::default();
    let response: ListClusterMembersResponseProto = grpc
        .unary(
            Request::new(ListClusterMembersRequest {
                protocol_version: ClusterProtocolVersion::V1 as i32,
            }),
            path,
            codec,
        )
        .await
        .map_err(|err| err.to_string())?
        .into_inner();

    Ok(ListClusterMembersResponse {
        cluster_id: response.cluster_id,
        cluster_name: optional(response.cluster_name),
        members: response.members.into_iter().map(member_info).collect(),
    })
}

fn endpoint_addr(addr: &str) -> String {
    if addr.starts_with("http://") || addr.starts_with("https://") {
        addr.to_string()
    } else {
        format!("http://{addr}")
    }
}

fn cluster_status_from_view(view: ClusterView) -> ClusterStatusInfo {
    let identity = view.local_identity.unwrap_or_default();
    ClusterStatusInfo {
        node: ClusterNodeInfo {
            node_id: identity.node_id.clone(),
            node_name: optional(identity.node_name.clone()),
            state: node_state(view.local_state),
            admitted: identity.cluster_admitted,
            bootstrap: identity.cluster_bootstrap,
        },
        cluster: ClusterInfo {
            cluster_id: identity.cluster_id,
            cluster_name: optional(identity.cluster_name),
            mode: cluster_mode(view.mode),
        },
        peers: view
            .peers
            .into_iter()
            .map(|peer| ClusterPeerInfo {
                node_id: optional(peer.node_id),
                node_name: optional(peer.node_name),
                cluster_id: optional(peer.cluster_id),
                cluster_name: optional(peer.cluster_name),
                backend_advertise_addr: peer.backend_advertise_addr,
                state: peer_state(peer.state),
                source: peer_source(peer.source),
                last_seen_at: optional(peer.last_seen_at),
            })
            .collect(),
    }
}

fn member_info(member: ClusterMember) -> ClusterMemberInfo {
    ClusterMemberInfo {
        node_name: member.node_name,
        node_id: optional(member.node_id),
        state: member.state,
        backend_advertise_addr: optional(member.backend_advertise_addr),
        role: optional(member.role),
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

fn optional(value: String) -> Option<String> {
    if value.trim().is_empty() { None } else { Some(value) }
}

fn node_state(value: i32) -> String {
    match NodeLifecycleState::try_from(value).unwrap_or(NodeLifecycleState::Unspecified) {
        NodeLifecycleState::Initializing => "initializing",
        NodeLifecycleState::Standalone => "standalone",
        NodeLifecycleState::Clustered => "clustered",
        NodeLifecycleState::Discovering => "discovering",
        NodeLifecycleState::Active => "active",
        NodeLifecycleState::Degraded => "degraded",
        NodeLifecycleState::Stopped => "stopped",
        NodeLifecycleState::Failed => "failed",
        NodeLifecycleState::Unspecified => "unspecified",
    }.to_string()
}

fn cluster_mode(value: i32) -> String {
    match ClusterMode::try_from(value).unwrap_or(ClusterMode::Unspecified) {
        ClusterMode::Standalone => "standalone",
        ClusterMode::Clustered => "clustered",
        ClusterMode::Unspecified => "unspecified",
    }.to_string()
}

fn peer_state(value: i32) -> String {
    match PeerMembershipState::try_from(value).unwrap_or(PeerMembershipState::Unspecified) {
        PeerMembershipState::SelfNode => "self",
        PeerMembershipState::Seed => "seed",
        PeerMembershipState::Active => "active",
        PeerMembershipState::Unreachable => "unreachable",
        PeerMembershipState::Pending => "pending",
        PeerMembershipState::Rejected => "rejected",
        PeerMembershipState::Removed => "removed",
        PeerMembershipState::Unspecified => "unspecified",
    }.to_string()
}

fn peer_source(value: i32) -> String {
    match PeerSource::try_from(value).unwrap_or(PeerSource::Unspecified) {
        PeerSource::SelfSource => "self",
        PeerSource::Seed => "seed",
        PeerSource::Discovered => "discovered",
        PeerSource::Manual => "manual",
        PeerSource::Unspecified => "unspecified",
    }.to_string()
}
