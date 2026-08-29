import type {
  ClusterPeerInfo,
  ClusterRuntimeStatusInfo,
  RaftGroupStatusInfo,
  RaftTransportTargetDiagnosticsInfo,
} from "../../../types/cluster";
import {
  formatClusterTime,
  groupHasReadFailures,
  groupReadFailureCount,
  lastTransportReason,
  matchesRaftGroupStatusFilter,
  raftNodeLabel,
  topologyResponsibility,
  transportFailureCount,
  transportStatus,
  transportTargetsForGroup,
} from "./clusterDisplay";

const readDiagnostics = {
  readIndexFailures: 1,
  readIndexTimeouts: 2,
  readIndexNoLeader: 3,
  readIndexNotLeader: 4,
  applyWaitFailures: 5,
};

function group(
  overrides: Partial<RaftGroupStatusInfo> = {},
): RaftGroupStatusInfo {
  return {
    groupId: "space:1",
    health: "healthy",
    leaderNodeId: 1,
    applyLag: 0,
    snapshotIndex: 0,
    readDiagnostics,
    ...overrides,
  } as RaftGroupStatusInfo;
}

function target(overrides: Partial<RaftTransportTargetDiagnosticsInfo> = {}) {
  return {
    groupId: "space:1",
    sendFailures: 0,
    authFailures: 0,
    missingSenderFailures: 0,
    lastError: "",
    lastFailureReason: "",
    ...overrides,
  } as RaftTransportTargetDiagnosticsInfo;
}

test("formats times and raft node labels", () => {
  expect(formatClusterTime()).toBe("—");
  expect(formatClusterTime("not-a-date")).toBe("not-a-date");
  expect(formatClusterTime("2026-01-02T03:04:05Z")).toContain("2026");

  const runtime = {
    raftNodeAddrs: ["node-a:9091", "node-b:9091"],
  } as ClusterRuntimeStatusInfo;
  expect(raftNodeLabel(undefined, runtime)).toBe("—");
  expect(raftNodeLabel(2, runtime)).toBe("2 (node-b:9091)");
  expect(raftNodeLabel(3, runtime)).toBe("3");
});

test("classifies topology responsibilities", () => {
  expect(topologyResponsibility({ state: "self" } as ClusterPeerInfo)).toBe(
    "local node",
  );
  expect(topologyResponsibility({ state: "active" } as ClusterPeerInfo)).toBe(
    "raft peer",
  );
  expect(topologyResponsibility({ state: "pending" } as ClusterPeerInfo)).toBe(
    "unknown",
  );
});

test("summarizes read failures and raft group filters", () => {
  expect(groupHasReadFailures(group())).toBe(true);
  expect(groupReadFailureCount(group())).toBe(15);
  expect(
    matchesRaftGroupStatusFilter(group({ health: "degraded" }), "unhealthy"),
  ).toBe(true);
  expect(
    matchesRaftGroupStatusFilter(group({ leaderNodeId: 0 }), "no_leader"),
  ).toBe(true);
  expect(matchesRaftGroupStatusFilter(group({ applyLag: 1 }), "lagging")).toBe(
    true,
  );
  expect(
    matchesRaftGroupStatusFilter(group({ snapshotIndex: 10 }), "has_snapshot"),
  ).toBe(true);
});

test("summarizes transport targets", () => {
  const targets = [
    target(),
    target({
      groupId: "system:1",
      sendFailures: 2,
      lastFailureReason: "timeout",
    }),
    target({ authFailures: 1 }),
  ];
  const runtime = { raftTransport: { targets } } as ClusterRuntimeStatusInfo;

  expect(transportTargetsForGroup("space:1", runtime)).toHaveLength(2);
  expect(transportFailureCount(targets)).toBe(3);
  expect(transportStatus([target()])).toBe("pass");
  expect(transportStatus([target({ sendFailures: 1 })])).toBe("warning");
  expect(transportStatus([target({ authFailures: 1 })])).toBe("fail");
  expect(lastTransportReason(targets)).toBe("timeout");
});
