export type ClusterNodeState = "standalone" | "clustered" | "failed" | "stopped" | string;
export type ClusterMode = "standalone" | "clustered" | string;
export type ClusterPeerState = "self" | "active" | "unreachable" | string;
export type ClusterPeerSource = "self" | "discovered" | string;
export type ClusterEngine = "raft" | "static" | "unspecified" | string;
export type RaftGroupKind = "system" | "partition" | "unspecified" | string;
export type RaftGroupHealth = "healthy" | "no_leader" | "unknown" | "unspecified" | string;

export type ClusterReadinessInfo = {
  clientReady: boolean;
  metadataApplied: boolean;
  metadataValidated: boolean;
  partitionGroupsStarted: boolean;
  authoritativeClusterId?: string;
  localClusterId?: string;
  expectedMemberCount: number;
  readinessBlockers: string[];
};

export type RaftTransportTargetDiagnosticsInfo = {
  groupId?: string;
  targetNodeId?: number;
  sendAttempts: number;
  sendFailures: number;
  authFailures: number;
  missingSenderFailures: number;
  lastErrorAt?: string;
  lastError?: string;
  lastFailureReason?: string;
  lastMessageType?: string;
};

export type RaftTransportDiagnosticsInfo = {
  sendAttempts: number;
  sendFailures: number;
  authFailures: number;
  missingSenderFailures: number;
  lastErrorAt?: string;
  lastError?: string;
  lastFailureReason?: string;
  lastGroupId?: string;
  lastSourceNodeId?: number;
  lastTargetNodeId?: number;
  lastMessageType?: string;
  targets: RaftTransportTargetDiagnosticsInfo[];
};

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
  raftTransport?: RaftTransportDiagnosticsInfo;
};

export type RaftReadDiagnosticsInfo = {
  readIndexAttempts: number;
  readIndexSuccesses: number;
  readIndexFailures: number;
  readIndexTimeouts: number;
  readIndexNoLeader: number;
  readIndexNotLeader: number;
  applyWaitFailures: number;
  lastFailureAt?: string;
  lastFailureReason?: string;
  lastReadIndex?: number;
  lastAppliedWaitIndex?: number;
  lastAppliedWaitSuccess?: number;
  lastAppliedWaitMillis: number;
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
  lastIndex: number;
  snapshotIndex: number;
  healthReason?: string;
  readDiagnostics?: RaftReadDiagnosticsInfo;
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

export type SpacePartitionDistributionInfo = {
  partitionId: number;
  spaceCount: number;
};

export type SpaceNodeDistributionInfo = {
  nodeId: number;
  label: string;
  leaderSpaceCount: number;
  replicaSpaceCount: number;
};

export type ClusterSpaceDistributionInfo = {
  totalSpaces: number;
  routedSpaces: number;
  unavailableRoutes: number;
  partitionsUsed: number;
  partitionCount: number;
  maxPartitionSpaces: number;
  minPartitionSpaces: number;
  skewRatio: number;
  partitions: SpacePartitionDistributionInfo[];
  nodes: SpaceNodeDistributionInfo[];
};

export type GraphConsistencyInput = {
  spaceId: string;
  domainId: string;
};

export type GraphConsistencyStatus = "consistent" | "lagging" | "divergent" | "degraded" | "unknown" | "unspecified" | string;
export type GraphConsistencyWarningSeverity = "info" | "warning" | "critical" | "unspecified" | string;

export type LocalGraphConsistencyStatsInfo = {
  spaceId: string;
  domainId: string;
  partitionId: number;
  revision: number;
  nodeCount: number;
  edgeCount: number;
  nodeChecksum?: string;
  edgeChecksum?: string;
  graphChecksum?: string;
  checksumAlgorithm?: string;
  collectedAt?: string;
  source?: string;
};

export type LocalGraphConsistencyResponse = {
  stats?: LocalGraphConsistencyStatsInfo;
  raftGroup?: RaftGroupStatusInfo;
  warnings: string[];
};

export type GraphConsistencyReplicaInfo = {
  raftNodeId?: number;
  nodeId?: string;
  nodeName?: string;
  backendAddr?: string;
  local: boolean;
  reachable: boolean;
  stats?: LocalGraphConsistencyStatsInfo;
  error?: string;
};

export type GraphConsistencyWarningInfo = {
  code?: string;
  severity: GraphConsistencyWarningSeverity;
  raftNodeId?: number;
  message: string;
};

export type GraphConsistencyReport = {
  status: GraphConsistencyStatus;
  spaceId: string;
  domainId: string;
  partitionId: number;
  localNodeId?: number;
  leaderNodeId?: number;
  expectedReplicaNodeIds: number[];
  raftGroup?: RaftGroupStatusInfo;
  replicas: GraphConsistencyReplicaInfo[];
  warnings: GraphConsistencyWarningInfo[];
  comparisonBasis?: string;
};

export type GraphForensicExportInput = {
  spaceId: string;
  domainId: string;
  pageSize?: number;
  pageToken?: string;
  sourceLabel?: string;
};

export type GraphForensicExportManifestInfo = {
  reportId?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  sourceClusterId?: string;
  sourceLabel?: string;
  collectedAt?: string;
  mycelVersion?: string;
  imageTag?: string;
};

export type GraphForensicEntityInfo = {
  id: string;
  checksum?: string;
  canonicalJson: string;
};

export type GraphForensicExportResponse = {
  manifest?: GraphForensicExportManifestInfo;
  stats?: LocalGraphConsistencyStatsInfo;
  nodes: GraphForensicEntityInfo[];
  edges: GraphForensicEntityInfo[];
  nextPageToken?: string;
  truncated: boolean;
  warnings: string[];
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
  readiness?: ClusterReadinessInfo;
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
  readiness?: ClusterReadinessInfo;
};
