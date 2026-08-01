import { invoke } from "@tauri-apps/api/core";
import {
  applyInferencePackage,
  connectionDiagnostics,
  createSpace,
  deleteBackup,
  getBackupPolicy,
  getBackupStatus,
  getClusterHealth,
  getClusterRuntimeStatus,
  getClusterStatus,
  getGraphConsistencyReport,
  getLocalGraphConsistency,
  getLocalGraphForensicExport,
  getSpace,
  getUser,
  listBackups,
  listDomains,
  listInferencePackages,
  listModelEndpointCapabilities,
  listModelEndpoints,
  cancelSemanticMaintenanceWork,
  getSemanticMaintenanceStatus,
  listSemanticMaintenanceWork,
  retrySemanticMaintenanceWork,
  listModels,
  listRaftGroups,
  listSemanticIndexes,
  listUserSessions,
  listVectorStores,
  revokeUserSession,
  revokeUserSessions,
  triggerBackup,
  updateBackupPolicy,
} from "./adminService";
import type { BackupPolicyInfo } from "../types/backups";

jest.mock("@tauri-apps/api/core", () => ({
  invoke: jest.fn(),
}));

const invokeMock = jest.mocked(invoke);

beforeEach(() => {
  invokeMock.mockReset();
});

const policy: BackupPolicyInfo = {
  enabled: true,
  backupDir: "/data/mycel/backups",
  intervalSeconds: 3600,
  retentionCount: 10,
  includeLogs: true,
  quiesceDrainTimeoutSeconds: 30,
  backupTimeoutSeconds: 600,
  retryAfterSeconds: 300,
  statusHistoryLimit: 25,
  allowReadsDuringBackup: true,
  scheduleKind: "interval",
  timeOfDay: "02:00",
  timezone: "UTC",
  weekdays: [],
  runMissed: true,
  archiveFormat: "BACKUP_ARCHIVE_FORMAT_TAR_ZST",
};

test("connectionDiagnostics invokes diagnostics command", async () => {
  const response = { addr: "127.0.0.1:19091", checks: [] };
  const input = { addr: "127.0.0.1:19091", username: "admin", password: "secret" };
  invokeMock.mockResolvedValue(response);

  await expect(connectionDiagnostics(input)).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_connection_diagnostics", { input });
});

test("getBackupPolicy invokes backup policy command", async () => {
  invokeMock.mockResolvedValue(policy);

  await expect(getBackupPolicy()).resolves.toEqual(policy);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_backup_policy");
});

test("updateBackupPolicy sends policy input", async () => {
  invokeMock.mockResolvedValue({ ...policy, enabled: false });

  await expect(updateBackupPolicy(policy)).resolves.toMatchObject({ enabled: false });

  expect(invokeMock).toHaveBeenCalledWith("admin_update_backup_policy", { input: policy });
});

test("getBackupStatus invokes backup status command", async () => {
  const status = {
    status: {
      backupId: "backup-1",
      state: "succeeded",
      startedAt: "2026-07-06T20:00:00Z",
      completedAt: "2026-07-06T20:00:10Z",
      archivePath: "/data/mycel/backups/backup-1.tar.zst",
      manifestPath: "/data/mycel/backups/backup-1.json",
      error: "",
      participants: [],
      lastSuccessAt: "2026-07-06T20:00:10Z",
      nextRunAt: "2026-07-06T21:00:00Z",
    },
    quiesce: { participants: [] },
  };
  invokeMock.mockResolvedValue(status);

  await expect(getBackupStatus()).resolves.toEqual(status);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_backup_status");
});

test("cluster status preserves readiness diagnostics", async () => {
  const response = {
    node: { nodeId: "node-a", state: "clustered" },
    cluster: { clusterId: "cluster-a", mode: "clustered" },
    peers: [],
    readiness: {
      clientReady: true,
      metadataApplied: true,
      metadataValidated: true,
      partitionGroupsStarted: true,
      authoritativeClusterId: "cluster-a",
      localClusterId: "cluster-a",
      expectedMemberCount: 3,
      readinessBlockers: [],
    },
  };
  invokeMock.mockResolvedValue(response);

  await expect(getClusterStatus()).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_cluster_status");
});

test("cluster health preserves readiness blockers", async () => {
  const response = {
    status: "degraded",
    warnings: ["metadata not applied"],
    activeMembers: 2,
    pendingMembers: 1,
    unreachablePeers: 0,
    readiness: {
      clientReady: false,
      metadataApplied: false,
      metadataValidated: false,
      partitionGroupsStarted: false,
      expectedMemberCount: 3,
      readinessBlockers: ["system raft metadata has not been applied"],
    },
  };
  invokeMock.mockResolvedValue(response);

  await expect(getClusterHealth()).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_cluster_health");
});

test("cluster runtime preserves raft transport diagnostics", async () => {
  const response = {
    engine: "raft",
    clusterName: "dev",
    raftNodeCount: 3,
    raftPartitionCount: 16,
    raftReplicaFactor: 3,
    localRaftNodeId: 1,
    raftNodeAddrs: ["a:9091", "b:9091"],
    raftGroupCount: 17,
    raftGroupsWithLeader: 16,
    raftTransport: {
      sendAttempts: 20,
      sendFailures: 1,
      authFailures: 0,
      missingSenderFailures: 1,
      lastErrorAt: "2026-07-20T10:00:00Z",
      lastFailureReason: "missing_sender",
      lastGroupId: "partition-3",
      lastSourceNodeId: 1,
      lastTargetNodeId: 2,
      lastMessageType: "MsgApp",
      targets: [{ groupId: "partition-3", targetNodeId: 2, sendAttempts: 10, sendFailures: 1, authFailures: 0, missingSenderFailures: 1 }],
    },
  };
  invokeMock.mockResolvedValue(response);

  await expect(getClusterRuntimeStatus()).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_cluster_runtime_status");
});

test("raft groups preserve read diagnostics", async () => {
  const response = {
    groups: [{
      groupId: "partition-3",
      kind: "partition",
      partitionId: 3,
      localNodeId: 1,
      leaderNodeId: 1,
      replicaNodeIds: [1, 2, 3],
      health: "healthy",
      term: 4,
      commitIndex: 100,
      appliedIndex: 99,
      applyLag: 1,
      lastIndex: 101,
      snapshotIndex: 50,
      healthReason: "ok",
      readDiagnostics: {
        readIndexAttempts: 8,
        readIndexSuccesses: 7,
        readIndexFailures: 1,
        readIndexTimeouts: 1,
        readIndexNoLeader: 0,
        readIndexNotLeader: 0,
        applyWaitFailures: 0,
        lastFailureReason: "timeout",
        lastReadIndex: 100,
        lastAppliedWaitIndex: 99,
        lastAppliedWaitSuccess: 99,
        lastAppliedWaitMillis: 12,
      },
    }],
  };
  invokeMock.mockResolvedValue(response);

  await expect(listRaftGroups()).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_raft_groups");
});

test("local graph consistency sends space and domain input", async () => {
  const input = { spaceId: "sp_main", domainId: "dom_default" };
  const response = { stats: { spaceId: "sp_main", domainId: "dom_default", partitionId: 1 }, warnings: [] };
  invokeMock.mockResolvedValue(response);

  await expect(getLocalGraphConsistency(input)).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_local_graph_consistency", { input });
});

test("graph consistency report sends space and domain input", async () => {
  const input = { spaceId: "sp_main", domainId: "dom_default" };
  const response = { status: "consistent", spaceId: "sp_main", domainId: "dom_default", replicas: [], warnings: [] };
  invokeMock.mockResolvedValue(response);

  await expect(getGraphConsistencyReport(input)).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_graph_consistency_report", { input });
});

test("local graph forensic export sends pagination input", async () => {
  const input = { spaceId: "sp_main", domainId: "dom_default", pageSize: 50, pageToken: "next", sourceLabel: "admin-ui" };
  const response = { nodes: [], edges: [], truncated: false, warnings: [] };
  invokeMock.mockResolvedValue(response);

  await expect(getLocalGraphForensicExport(input)).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_local_graph_forensic_export", { input });
});

test("listBackups sends pagination input", async () => {
  const response = { backups: [], nextPageToken: "next" };
  invokeMock.mockResolvedValue(response);

  await expect(listBackups({ pageSize: 20, pageToken: "cursor" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_backups", {
    input: { pageSize: 20, pageToken: "cursor" },
  });
});

test("triggerBackup sends optional reason", async () => {
  const response = { status: null, backup: null };
  invokeMock.mockResolvedValue(response);

  await expect(triggerBackup({ reason: "manual test" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_trigger_backup", {
    input: { reason: "manual test" },
  });
});

test("deleteBackup sends backup id", async () => {
  const response = { backupId: "backup-1" };
  invokeMock.mockResolvedValue(response);

  await expect(deleteBackup("backup-1")).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_delete_backup", { backupId: "backup-1" });
});

test("getUser sends user id", async () => {
  const response = { userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" };
  invokeMock.mockResolvedValue(response);

  await expect(getUser("usr_alice")).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_user", { userId: "usr_alice" });
});

test("listUserSessions sends user scoped input", async () => {
  const response = { sessions: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listUserSessions({ userId: "usr_alice", includeInactive: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_user_sessions", {
    input: { userId: "usr_alice", includeInactive: true },
  });
});

test("revokeUserSession sends session input", async () => {
  invokeMock.mockResolvedValue(undefined);

  await expect(revokeUserSession({ userId: "usr_alice", authSessionId: "sess_1" })).resolves.toBeUndefined();

  expect(invokeMock).toHaveBeenCalledWith("admin_revoke_user_session", {
    input: { userId: "usr_alice", authSessionId: "sess_1" },
  });
});

test("revokeUserSessions sends user id", async () => {
  const response = { revokedCount: 2 };
  invokeMock.mockResolvedValue(response);

  await expect(revokeUserSessions("usr_alice")).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_revoke_user_sessions", { userId: "usr_alice" });
});

test("getSpace sends space id", async () => {
  const response = { spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" };
  invokeMock.mockResolvedValue(response);

  await expect(getSpace("sp_main")).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_space", { spaceId: "sp_main" });
});

test("createSpace sends create input", async () => {
  const response = { space: { spaceId: "sp_main", name: "Main" }, defaultDomainId: "dom_default" };
  invokeMock.mockResolvedValue(response);

  await expect(createSpace({ name: "Main", ownerUsername: "martin", defaultDomainKey: "default", defaultDomainName: "Default" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_create_space", {
    input: { name: "Main", ownerUsername: "martin", defaultDomainKey: "default", defaultDomainName: "Default" },
  });
});

test("listDomains sends space scoped input", async () => {
  const response = { domains: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listDomains({ spaceId: "sp_main", includeSystem: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_domains", {
    input: { spaceId: "sp_main", includeSystem: true },
  });
});

test("getSemanticMaintenanceStatus sends space input", async () => {
  const response = { enabled: true, degraded: false };
  invokeMock.mockResolvedValue(response);

  await expect(getSemanticMaintenanceStatus({ spaceId: "sp_main" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_get_semantic_maintenance_status", {
    input: { spaceId: "sp_main" },
  });
});

test("retrySemanticMaintenanceWork sends action input", async () => {
  const response = { workItemId: "work_1" };
  invokeMock.mockResolvedValue(response);
  await expect(retrySemanticMaintenanceWork({ spaceId: "sp_main", workItemId: "work_1" })).resolves.toEqual(response);
  expect(invokeMock).toHaveBeenCalledWith("admin_retry_semantic_maintenance_work", { input: { spaceId: "sp_main", workItemId: "work_1" } });
});

test("cancelSemanticMaintenanceWork sends action input", async () => {
  const response = { workItemId: "work_1" };
  invokeMock.mockResolvedValue(response);
  await expect(cancelSemanticMaintenanceWork({ spaceId: "sp_main", workItemId: "work_1" })).resolves.toEqual(response);
  expect(invokeMock).toHaveBeenCalledWith("admin_cancel_semantic_maintenance_work", { input: { spaceId: "sp_main", workItemId: "work_1" } });
});

test("listSemanticMaintenanceWork sends filter input", async () => {
  const response = { items: [] };
  invokeMock.mockResolvedValue(response);

  await expect(listSemanticMaintenanceWork({ spaceId: "sp_main", status: "failed_retryable", limit: 20 })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_semantic_maintenance_work", {
    input: { spaceId: "sp_main", status: "failed_retryable", limit: 20 },
  });
});

test("listSemanticIndexes sends space scoped input", async () => {
  const response = { indexes: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listSemanticIndexes({ spaceId: "sp_main", includeDisabled: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_semantic_indexes", {
    input: { spaceId: "sp_main", includeDisabled: true },
  });
});

test("listInferencePackages sends pagination input", async () => {
  const response = { packages: [], nextPageToken: "next" };
  invokeMock.mockResolvedValue(response);

  await expect(listInferencePackages({ pageSize: 25, pageToken: "cursor" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_inference_packages", {
    input: { pageSize: 25, pageToken: "cursor" },
  });
});

test("listModelEndpoints sends include disabled input", async () => {
  const response = { modelEndpoints: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listModelEndpoints({ includeDisabled: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_model_endpoints", {
    input: { includeDisabled: true },
  });
});

test("listModels sends operation filter", async () => {
  const response = { models: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listModels({ operation: "embeddings" })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_models", {
    input: { operation: "embeddings" },
  });
});

test("listVectorStores sends include disabled input", async () => {
  const response = { vectorStores: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listVectorStores({ includeDisabled: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_vector_stores", {
    input: { includeDisabled: true },
  });
});

test("listModelEndpointCapabilities sends filters", async () => {
  const response = { modelEndpointCapabilities: [], nextPageToken: "" };
  invokeMock.mockResolvedValue(response);

  await expect(listModelEndpointCapabilities({ operation: "embeddings", includeDisabled: true })).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_list_model_endpoint_capabilities", {
    input: { operation: "embeddings", includeDisabled: true },
  });
});

test("applyInferencePackage sends package document", async () => {
  const input = {
    name: "standard-openai-chat",
    version: "2026-06",
    source: "standard-openai-chat.json",
    model_endpoints: [{ key: "openai", enabled: true }],
    models: [{ key: "openai/gpt-4o", operation: "chat" }],
    vector_stores: [{ key: "mycel-file", enabled: true }],
    model_endpoint_capabilities: [{ model_endpoint: "openai", model: "openai/gpt-4o", operation: "chat" }],
  };
  const response = {
    package: { inferencePackageId: "pkg-1", name: input.name, version: input.version, source: input.source, checksum: "", definitionCounts: {}, installedAt: "", installedBy: "admin" },
    modelEndpointCount: 1,
    modelCount: 1,
    vectorStoreCount: 1,
    capabilityCount: 1,
  };
  invokeMock.mockResolvedValue(response);

  await expect(applyInferencePackage(input)).resolves.toEqual(response);

  expect(invokeMock).toHaveBeenCalledWith("admin_apply_inference_package", { input });
});
