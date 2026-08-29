import type {
  ClusterPeerInfo,
  ClusterRuntimeStatusInfo,
  RaftGroupStatusInfo,
  RaftTransportTargetDiagnosticsInfo,
} from "../../../types/cluster";

export const readinessHelp = {
  clientReady:
    "Overall safe-to-serve signal. Possible values: ready means this daemon can serve client traffic; blocked means raft metadata or partition groups are not ready, even if the admin port is reachable.",
  metadataApplied:
    "Whether committed system Raft metadata has been applied locally. Possible values: pass means applied; fail means the daemon is still waiting and should fail closed for client traffic.",
  metadataValidated:
    "Whether the applied system Raft metadata matches local expectations such as cluster identity and placement. Possible values: pass means validated; fail means the node must not trust local fallback metadata.",
  partitionGroupsStarted:
    "Whether all expected partition Raft groups have started locally. Possible values: pass means partitions are running; fail means one or more groups are not started yet.",
  clusterIdMatch:
    "Whether local cluster ID equals the authoritative cluster ID from system Raft metadata. Possible values: pass means they match; fail means identity mismatch or one value is unavailable.",
  expectedMembers:
    "Expected member count from authoritative cluster metadata. Possible values: a positive number in raft mode, or blank when metadata has not supplied it.",
};

export function formatClusterTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function raftNodeLabel(
  nodeId: number | undefined,
  runtime: ClusterRuntimeStatusInfo | null,
) {
  if (!nodeId) return "—";
  const addr = runtime?.raftNodeAddrs[nodeId - 1];
  return addr ? `${nodeId} (${addr})` : String(nodeId);
}

export function topologyResponsibility(peer: ClusterPeerInfo) {
  if (peer.state === "self") return "local node";
  if (peer.state === "active") return "raft peer";
  return "unknown";
}

export function groupHasReadFailures(group: RaftGroupStatusInfo) {
  const read = group.readDiagnostics;
  return Boolean(
    read &&
    (read.readIndexFailures > 0 ||
      read.readIndexTimeouts > 0 ||
      read.readIndexNoLeader > 0 ||
      read.readIndexNotLeader > 0 ||
      read.applyWaitFailures > 0),
  );
}

export function groupReadFailureCount(group: RaftGroupStatusInfo) {
  const read = group.readDiagnostics;
  if (!read) return 0;
  return (
    read.readIndexFailures +
    read.readIndexTimeouts +
    read.readIndexNoLeader +
    read.readIndexNotLeader +
    read.applyWaitFailures
  );
}

export function transportTargetsForGroup(
  groupId: string,
  runtime: ClusterRuntimeStatusInfo | null,
) {
  return (
    runtime?.raftTransport?.targets.filter(
      (target) => target.groupId === groupId,
    ) || []
  );
}

export function transportFailureCount(
  targets: RaftTransportTargetDiagnosticsInfo[],
) {
  return targets.reduce(
    (sum, target) =>
      sum +
      target.sendFailures +
      target.authFailures +
      target.missingSenderFailures,
    0,
  );
}

export function transportStatus(targets: RaftTransportTargetDiagnosticsInfo[]) {
  if (
    targets.some(
      (target) => target.authFailures > 0 || target.missingSenderFailures > 0,
    )
  )
    return "fail";
  if (
    targets.some(
      (target) =>
        target.sendFailures > 0 || target.lastError || target.lastFailureReason,
    )
  )
    return "warning";
  return "pass";
}

export function lastTransportReason(
  targets: RaftTransportTargetDiagnosticsInfo[],
) {
  return (
    targets.find((target) => target.lastFailureReason || target.lastError)
      ?.lastFailureReason || "—"
  );
}

export function matchesRaftGroupStatusFilter(
  group: RaftGroupStatusInfo,
  filter: string,
) {
  switch (filter) {
    case "unhealthy":
      return group.health !== "healthy";
    case "no_leader":
      return !group.leaderNodeId || group.health === "no_leader";
    case "lagging":
      return group.applyLag > 0;
    case "read_failures":
      return groupHasReadFailures(group);
    case "has_snapshot":
      return group.snapshotIndex > 0;
    default:
      return true;
  }
}
