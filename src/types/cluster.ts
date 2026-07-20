export type ClusterNodeState = "standalone" | "clustered" | "failed" | "stopped" | string;
export type ClusterMode = "standalone" | "clustered" | string;
export type ClusterPeerState = "self" | "active" | "unreachable" | string;
export type ClusterPeerSource = "self" | "discovered" | string;
export type ClusterEngine = "raft" | "unspecified" | string;
export type RaftGroupKind = "system" | "partition" | "unspecified" | string;
export type RaftGroupHealth = "healthy" | "no_leader" | "unknown" | "unspecified" | string;

export type ClusterRuntimeStatusInfo = {
  engine: ClusterEngine;
  clusterName?: string;
  raftNodeCount: number;
  raftPartitionCount: number;
  raftReplicaFactor: number;
  localRaftNodeId: number;
  raftNodeAddrs: string[];
  raftGroupCount: number;
  raftGroupsWithLeader: number;
};

export type RaftGroupStatusInfo = {
  groupId: string;
  kind: RaftGroupKind;
  partitionId?: number;
  localNodeId: number;
  leaderNodeId?: number;
  preferredLeaderNodeId?: number;
  replicaNodeIds: number[];
  health: RaftGroupHealth;
  term: number;
  commitIndex: number;
  appliedIndex: number;
  applyLag: number;
};

export type ListRaftGroupsResponse = {
  groups: RaftGroupStatusInfo[];
};

export type LookupSpaceRouteInput = {
  spaceId: string;
};

export type LookupSpaceRouteResult = {
  spaceId: string;
  partitionId: number;
  leaderNodeId?: number;
  replicaNodeIds: number[];
};

export type ClusterPeerInfo = {
  nodeId?: string;
  nodeName?: string;
  clusterId?: string;
  clusterName?: string;
  backendAdvertiseAddr: string;
  state: ClusterPeerState;
  source: ClusterPeerSource;
  lastSeenAt?: string;
};

export type ClusterMemberInfo = {
  nodeName: string;
  nodeId?: string;
  state: "pending" | "active" | "rejected" | "removed" | string;
  backendAdvertiseAddr?: string;
  clusterBootstrap?: boolean;
  nodePublicKeyFingerprint?: string;
  tokenId?: string;
  tokenExpiresAt?: string;
  tokenConsumedAt?: string;
  tokenRevokedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  joinedAt?: string;
};

export type ListClusterMembersResponse = {
  clusterId: string;
  clusterName?: string;
  members: ClusterMemberInfo[];
};

export type ClusterHealthInfo = {
  status: string;
  warnings: string[];
  activeMembers: number;
  pendingMembers: number;
  unreachablePeers: number;
};

export type ClusterStatusInfo = {
  node: {
    nodeId: string;
    nodeName?: string;
    state: ClusterNodeState;
    admitted?: boolean;
    bootstrap?: boolean;
  };
  cluster: {
    clusterId: string;
    clusterName?: string;
    mode: ClusterMode;
  };
  peers: ClusterPeerInfo[];
};
