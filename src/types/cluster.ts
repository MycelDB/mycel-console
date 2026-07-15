export type ClusterNodeState = "standalone" | "clustered" | "failed" | "stopped" | string;
export type ClusterMode = "standalone" | "clustered" | string;
export type ClusterPeerState = "self" | "active" | "unreachable" | string;
export type ClusterPeerSource = "self" | "discovered" | string;

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

export type AddClusterNodeInput = {
  nodeName: string;
  tokenTtlSeconds?: number;
};

export type AddClusterNodeResult = {
  nodeName: string;
  state: "pending" | string;
  token?: string;
  tokenId: string;
  expiresAt: string;
};

export type ClusterMemberInfo = {
  nodeName: string;
  nodeId?: string;
  state: "pending" | "active" | "rejected" | "removed" | string;
  backendAdvertiseAddr?: string;
  role?: string;
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
