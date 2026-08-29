import { Fragment, useEffect, useMemo, useState } from "react";
import {
  getClusterHealth,
  getClusterRuntimeStatus,
  getClusterSpaceDistribution,
  getClusterStatus,
  getGraphConsistencyReport,
  getLocalGraphConsistency,
  getLocalGraphForensicExport,
  listActivityEvents,
  listClusterMembers,
  listRaftGroups,
  lookupSpaceRoute,
} from "../../../services/adminService";
import type { ActivityEventInfo } from "../../../types/activity";
import type {
  ClusterHealthInfo,
  ClusterPeerInfo,
  ClusterRuntimeStatusInfo,
  ClusterSpaceDistributionInfo,
  ClusterStatusInfo,
  GraphConsistencyReport,
  GraphForensicExportResponse,
  ListClusterMembersResponse,
  ListRaftGroupsResponse,
  LocalGraphConsistencyResponse,
  LocalGraphConsistencyStatsInfo,
  LookupSpaceRouteResult,
  RaftGroupStatusInfo,
  RaftTransportTargetDiagnosticsInfo,
} from "../../../types/cluster";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  formatEnumLabel,
  Input,
  ResourceIdText,
  Tabs,
  Text,
  TextLink,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import { ClusterEventLog } from "../components/ClusterEventLog";
import { SpaceDistributionCard } from "../components/SpaceDistributionCard";

function badgeClass(value: string) {
  switch (value) {
    case "clustered":
    case "active":
    case "self":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "standalone":
      return `bg-slate-200 ${themeClasses.text.parts.strongLight} dark:bg-slate-800 ${themeClasses.text.parts.darkStrong}`;
    case "pass":
    case "ready":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "unreachable":
    case "failed":
    case "fail":
    case "blocked":
    case "no_leader":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "warning":
    case "lagging":
    case "degraded":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "divergent":
    case "critical":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "consistent":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    default:
      return "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(value)}`}
      title={value}
    >
      {formatEnumLabel(value)}
    </span>
  );
}

function CountStatusBadge({
  label,
  status,
  value,
}: {
  label: string;
  status: string;
  value: number;
}) {
  const accessibleLabel = `${label}: ${value} (${formatEnumLabel(status)})`;
  return (
    <span
      aria-label={accessibleLabel}
      className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-semibold tabular-nums ${badgeClass(status)}`}
      title={accessibleLabel}
    >
      {value}
    </span>
  );
}

function CheckBadge({ ok }: { ok: boolean }) {
  return <StatusBadge value={ok ? "pass" : "fail"} />;
}

function HelpIcon({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        aria-label={`${label}: ${description}`}
        className={`ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 ${themeClasses.surface.elevated} text-[10px] font-bold ${themeClasses.text.parts.subtleLight} dark:border-slate-700 ${themeClasses.text.parts.darkSecondary}`}
        role="img"
        tabIndex={0}
      >
        ?
      </span>
      <span
        className={`pointer-events-none absolute left-0 top-5 z-20 hidden w-72 rounded-md border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-3 text-left text-xs normal-case tracking-normal ${themeClasses.text.parts.bodyLight} shadow-lg group-hover:block group-focus-within:block dark:border-slate-700 ${themeClasses.text.parts.darkStrong}`}
        role="tooltip"
      >
        <span
          className={`block font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {label}
        </span>
        <span className="mt-1 block">{description}</span>
      </span>
    </span>
  );
}

const readinessHelp = {
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

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function raftNodeLabel(
  nodeId: number | undefined,
  runtime: ClusterRuntimeStatusInfo | null,
) {
  if (!nodeId) return "—";
  const addr = runtime?.raftNodeAddrs[nodeId - 1];
  return addr ? `${nodeId} (${addr})` : String(nodeId);
}

function topologyResponsibility(peer: ClusterPeerInfo) {
  if (peer.state === "self") return "local node";
  if (peer.state === "active") return "raft peer";
  return "unknown";
}

function groupHasReadFailures(group: RaftGroupStatusInfo) {
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

function groupReadFailureCount(group: RaftGroupStatusInfo) {
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

function transportTargetsForGroup(
  groupId: string,
  runtime: ClusterRuntimeStatusInfo | null,
) {
  return (
    runtime?.raftTransport?.targets.filter(
      (target) => target.groupId === groupId,
    ) || []
  );
}

function transportFailureCount(targets: RaftTransportTargetDiagnosticsInfo[]) {
  return targets.reduce(
    (sum, target) =>
      sum +
      target.sendFailures +
      target.authFailures +
      target.missingSenderFailures,
    0,
  );
}

function transportStatus(targets: RaftTransportTargetDiagnosticsInfo[]) {
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

function lastTransportReason(targets: RaftTransportTargetDiagnosticsInfo[]) {
  return (
    targets.find((target) => target.lastFailureReason || target.lastError)
      ?.lastFailureReason || "—"
  );
}

function matchesRaftGroupStatusFilter(
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

function StatsGrid({ stats }: { stats: LocalGraphConsistencyStatsInfo }) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-4">
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Revision
        </span>
        <div className="font-semibold">{stats.revision}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Nodes</span>
        <div className="font-semibold">{stats.nodeCount}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Edges</span>
        <div className="font-semibold">{stats.edgeCount}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Partition
        </span>
        <div className="font-semibold">{stats.partitionId}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Graph checksum
        </span>
        <div>
          <ResourceIdText value={stats.graphChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Node checksum
        </span>
        <div>
          <ResourceIdText value={stats.nodeChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Edge checksum
        </span>
        <div>
          <ResourceIdText value={stats.edgeChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Algorithm
        </span>
        <div className="font-semibold">
          {formatEnumLabel(stats.checksumAlgorithm)}
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Collected at
        </span>
        <div className="font-semibold">{formatTime(stats.collectedAt)}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Source</span>
        <div className="font-semibold">{formatEnumLabel(stats.source)}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Space</span>
        <div>
          <ResourceIdText value={stats.spaceId} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Domain</span>
        <div>
          <ResourceIdText value={stats.domainId} />
        </div>
      </div>
    </div>
  );
}

function forensicExportJson(exportResult: GraphForensicExportResponse | null) {
  return exportResult ? JSON.stringify(exportResult, null, 2) : "";
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

function downloadJson(filename: string, value: string) {
  const blob = new Blob([value], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClusterPage() {
  const [status, setStatus] = useState<ClusterStatusInfo | null>(null);
  const [membership, setMembership] =
    useState<ListClusterMembersResponse | null>(null);
  const [health, setHealth] = useState<ClusterHealthInfo | null>(null);
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [raftGroups, setRaftGroups] = useState<ListRaftGroupsResponse>({
    groups: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [clusterActivityEvents, setClusterActivityEvents] = useState<
    ActivityEventInfo[]
  >([]);
  const [clusterActivityError, setClusterActivityError] = useState("");
  const [spaceDistribution, setSpaceDistribution] =
    useState<ClusterSpaceDistributionInfo | null>(null);
  const [spaceDistributionError, setSpaceDistributionError] = useState("");
  const [raftGroupFilter, setRaftGroupFilter] = useState("");
  const [raftGroupStatusFilter, setRaftGroupStatusFilter] = useState("all");
  const [expandedRaftGroups, setExpandedRaftGroups] = useState<string[]>([]);
  const [routeSpaceId, setRouteSpaceId] = useState("");
  const [routeResult, setRouteResult] = useState<LookupSpaceRouteResult | null>(
    null,
  );
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [clusterCommandMessage, setClusterCommandMessage] = useState("");
  const [consistencySpaceId, setConsistencySpaceId] = useState("");
  const [consistencyDomainId, setConsistencyDomainId] = useState("");
  const [localConsistency, setLocalConsistency] =
    useState<LocalGraphConsistencyResponse | null>(null);
  const [clusterConsistency, setClusterConsistency] =
    useState<GraphConsistencyReport | null>(null);
  const [consistencyError, setConsistencyError] = useState("");
  const [consistencyLoading, setConsistencyLoading] = useState<
    "local" | "cluster" | "forensic" | ""
  >("");
  const [forensicSourceLabel, setForensicSourceLabel] = useState("admin-ui");
  const [forensicPageSize, setForensicPageSize] = useState(100);
  const [forensicPageToken, setForensicPageToken] = useState("");
  const [forensicExport, setForensicExport] =
    useState<GraphForensicExportResponse | null>(null);
  const [forensicMessage, setForensicMessage] = useState("");
  const [activeTab, setActiveTab] = useState<
    "general" | "topology" | "consistency" | "events"
  >("general");
  async function load() {
    setError("");
    setLoading(true);
    try {
      setMembershipError("");
      setClusterActivityError("");
      setSpaceDistributionError("");
      const clusterRuntime = await getClusterRuntimeStatus().catch(() => null);
      const clusterStatus = await getClusterStatus();
      const members = await listClusterMembers().catch((err) => {
        setMembershipError(
          err instanceof Error ? err.message : "Membership is unavailable",
        );
        return null;
      });
      const isRuntimeRaft = clusterRuntime?.engine === "raft";
      const clusterHealth = await getClusterHealth().catch(() => null);
      const activity = await listActivityEvents({
        pageSize: 50,
        categories: ["cluster"],
      }).catch((err) => {
        setClusterActivityError(
          err instanceof Error
            ? err.message
            : "Cluster activity is unavailable",
        );
        return { events: [], nextPageToken: "" };
      });
      const groups = isRuntimeRaft
        ? await listRaftGroups().catch(() => ({ groups: [] }))
        : { groups: [] };
      const distribution =
        isRuntimeRaft && clusterRuntime
          ? await getClusterSpaceDistribution(clusterRuntime).catch((err) => {
              setSpaceDistributionError(
                err instanceof Error
                  ? err.message
                  : "Space distribution is unavailable",
              );
              return null;
            })
          : null;
      setRuntime(clusterRuntime);
      setRaftGroups(groups);
      setStatus(clusterStatus);
      setMembership(members);
      setHealth(clusterHealth);
      setClusterActivityEvents(activity.events);
      setSpaceDistribution(distribution);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load cluster status",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const isRaft = runtime?.engine === "raft";
  const readiness = status?.readiness || health?.readiness;
  const clusterIdsMatch = Boolean(
    readiness?.authoritativeClusterId &&
    readiness?.localClusterId &&
    readiness.authoritativeClusterId === readiness.localClusterId,
  );
  const systemGroup = raftGroups.groups.find(
    (group) => group.kind === "system",
  );
  const partitionGroups = raftGroups.groups.filter(
    (group) => group.kind === "partition",
  );
  const partitionLeaders = partitionGroups.filter(
    (group) => group.leaderNodeId,
  ).length;
  const snapshotGroups = raftGroups.groups.filter(
    (group) => group.snapshotIndex > 0,
  );
  const filteredRaftGroups = raftGroups.groups.filter((group) => {
    const filter = raftGroupFilter.trim().toLowerCase();
    const matchesText =
      !filter ||
      group.groupId.toLowerCase().includes(filter) ||
      group.kind.toLowerCase().includes(filter) ||
      group.health.toLowerCase().includes(filter) ||
      String(group.partitionId ?? "").includes(filter) ||
      String(group.leaderNodeId ?? "").includes(filter) ||
      (group.healthReason || "").toLowerCase().includes(filter);
    return (
      matchesText && matchesRaftGroupStatusFilter(group, raftGroupStatusFilter)
    );
  });
  const raftTransport = runtime?.raftTransport;
  const raftTransportCritical = Boolean(
    raftTransport &&
    (raftTransport.authFailures > 0 || raftTransport.missingSenderFailures > 0),
  );
  const raftTransportWarn = Boolean(
    raftTransport &&
    !raftTransportCritical &&
    (raftTransport.sendFailures > 0 || raftTransport.lastError),
  );
  const knownRaftGroupIds = new Set(
    raftGroups.groups.map((group) => group.groupId),
  );
  const unmatchedTransportTargets =
    raftTransport?.targets.filter(
      (target) => !target.groupId || !knownRaftGroupIds.has(target.groupId),
    ) || [];
  const snapshotGuidanceCommands =
    "mycel cluster raft-groups\nmake test-cluster-soak";
  const raftDiagnostics = isRaft
    ? [
        {
          label: "System group has leader",
          ok: Boolean(systemGroup?.leaderNodeId),
          detail: systemGroup?.leaderNodeId
            ? `leader ${systemGroup.leaderNodeId}`
            : "no leader",
        },
        {
          label: "All partitions have leaders",
          ok: Boolean(
            runtime && partitionLeaders === runtime.raftPartitionCount,
          ),
          detail: `${partitionLeaders}/${runtime?.raftPartitionCount || 0}`,
        },
        {
          label: "Replica factor configured",
          ok: Boolean(
            runtime &&
            runtime.raftReplicaFactor > 0 &&
            runtime.raftReplicaFactor <= runtime.raftNodeCount,
          ),
          detail: `${runtime?.raftReplicaFactor || 0}/${runtime?.raftNodeCount || 0}`,
        },
        {
          label: "Raft node address map complete",
          ok: Boolean(
            runtime && runtime.raftNodeAddrs.length === runtime.raftNodeCount,
          ),
          detail: `${runtime?.raftNodeAddrs.length || 0}/${runtime?.raftNodeCount || 0}`,
        },
      ]
    : [];

  function toggleRaftGroupDetails(groupId: string) {
    setExpandedRaftGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  async function runRouteLookup() {
    const spaceId = routeSpaceId.trim();
    if (!spaceId) {
      setRouteError("Space ID is required");
      return;
    }
    setRouteError("");
    setRouteResult(null);
    setRouteLoading(true);
    try {
      setRouteResult(await lookupSpaceRoute({ spaceId }));
    } catch (err) {
      setRouteError(err instanceof Error ? err.message : String(err));
    } finally {
      setRouteLoading(false);
    }
  }

  async function runLocalConsistency() {
    const spaceId = consistencySpaceId.trim();
    const domainId = consistencyDomainId.trim();
    if (!spaceId || !domainId) {
      setConsistencyError("Space ID and domain ID are required");
      return;
    }
    setConsistencyError("");
    setConsistencyLoading("local");
    try {
      setLocalConsistency(
        await getLocalGraphConsistency({ spaceId, domainId }),
      );
    } catch (err) {
      setConsistencyError(err instanceof Error ? err.message : String(err));
    } finally {
      setConsistencyLoading("");
    }
  }

  async function runClusterConsistency() {
    const spaceId = consistencySpaceId.trim();
    const domainId = consistencyDomainId.trim();
    if (!spaceId || !domainId) {
      setConsistencyError("Space ID and domain ID are required");
      return;
    }
    setConsistencyError("");
    setConsistencyLoading("cluster");
    try {
      setClusterConsistency(
        await getGraphConsistencyReport({ spaceId, domainId }),
      );
    } catch (err) {
      setConsistencyError(err instanceof Error ? err.message : String(err));
    } finally {
      setConsistencyLoading("");
    }
  }

  async function runForensicExport(pageToken = forensicPageToken.trim()) {
    const spaceId = consistencySpaceId.trim();
    const domainId = consistencyDomainId.trim();
    if (!spaceId || !domainId) {
      setConsistencyError("Space ID and domain ID are required");
      return;
    }
    setConsistencyError("");
    setForensicMessage("");
    setConsistencyLoading("forensic");
    try {
      const result = await getLocalGraphForensicExport({
        spaceId,
        domainId,
        pageSize: forensicPageSize,
        pageToken,
        sourceLabel: forensicSourceLabel.trim(),
      });
      setForensicExport(result);
      setForensicPageToken(pageToken);
    } catch (err) {
      setConsistencyError(err instanceof Error ? err.message : String(err));
    } finally {
      setConsistencyLoading("");
    }
  }

  const warnings = useMemo(() => {
    if (!status) return [];
    const items = status.peers
      .filter(
        (peer) => peer.clusterId && peer.clusterId !== status.cluster.clusterId,
      )
      .map(
        (peer) =>
          `${peer.nodeName || peer.backendAdvertiseAddr} reports a different cluster ID`,
      );
    for (const peer of status.peers) {
      if (!peer.nodeId)
        items.push(
          `${peer.nodeName || peer.backendAdvertiseAddr} has no node ID`,
        );
      if (peer.state === "unreachable")
        items.push(
          `${peer.nodeName || peer.backendAdvertiseAddr} is unreachable`,
        );
    }
    if (!status.node.admitted && status.cluster.mode === "clustered") {
      items.push(
        "Local node is not admitted; membership operations are disabled.",
      );
    }
    return items;
  }, [status]);

  if (loading && !status) {
    return <Text intent="muted">Loading cluster status…</Text>;
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Cluster"
        badge={
          status?.cluster.clusterId ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">
              <ResourceIdText value={status.cluster.clusterId} />
            </span>
          ) : null
        }
        description="Inspect cluster engine, Raft status, local node identity, and known peers."
        actions={
          <Button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        }
      />

      {error && <Alert>{error}</Alert>}
      {status && (
        <>
          {status.cluster.mode === "standalone" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <Text className="font-semibold">Standalone daemon</Text>
              <Text size="sm" intent="muted" className="mt-1">
                This daemon is not currently participating in cluster mode.
                Start with bootstrap or join settings to cluster it.
              </Text>
            </div>
          )}

          <Tabs
            ariaLabel="Cluster sections"
            tabs={[
              { id: "general", label: "General" },
              { id: "topology", label: isRaft ? "Raft groups" : "Topology" },
              { id: "consistency", label: "Consistency" },
              { id: "events", label: "Events" },
            ]}
            active={activeTab}
            onChange={setActiveTab}
          />

          {activeTab === "general" && (
            <div className="space-y-6" role="tabpanel" aria-label="General">
              {readiness && (
                <div
                  className={[
                    "rounded-lg border px-4 py-3 shadow-sm",
                    readiness.clientReady
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text
                        size="xs"
                        intent="subtle"
                        className="uppercase tracking-wide"
                      >
                        Client readiness
                        <HelpIcon
                          label="Client readiness"
                          description={readinessHelp.clientReady}
                        />
                      </Text>
                      <Text className="mt-1 font-semibold">
                        {readiness.clientReady
                          ? "Client ready"
                          : "Not client ready"}
                      </Text>
                      <Text size="xs" intent="muted" className="mt-1">
                        Daemon reachability only means the admin port is open;
                        readiness says whether clients should trust this daemon.
                      </Text>
                    </div>
                    <StatusBadge
                      value={readiness.clientReady ? "ready" : "blocked"}
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      Metadata applied
                      <HelpIcon
                        label="Metadata applied"
                        description={readinessHelp.metadataApplied}
                      />
                      <CheckBadge ok={readiness.metadataApplied} />
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      Metadata validated
                      <HelpIcon
                        label="Metadata validated"
                        description={readinessHelp.metadataValidated}
                      />
                      <CheckBadge ok={readiness.metadataValidated} />
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      Partition groups started
                      <HelpIcon
                        label="Partition groups started"
                        description={readinessHelp.partitionGroupsStarted}
                      />
                      <CheckBadge ok={readiness.partitionGroupsStarted} />
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      Cluster ID match
                      <HelpIcon
                        label="Cluster ID match"
                        description={readinessHelp.clusterIdMatch}
                      />
                      <CheckBadge ok={clusterIdsMatch} />
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-2.5 py-1 dark:border-slate-800 dark:bg-slate-950/40">
                      Expected members
                      <HelpIcon
                        label="Expected members"
                        description={readinessHelp.expectedMembers}
                      />
                      <span className="font-semibold">
                        {readiness.expectedMemberCount || "—"}
                      </span>
                    </span>
                  </div>
                  {(readiness.readinessBlockers.length > 0 ||
                    readiness.localClusterId ||
                    readiness.authoritativeClusterId) && (
                    <details className="mt-3 text-xs">
                      <summary
                        className={`cursor-pointer ${themeClasses.text.parts.subtleLight} ${themeClasses.text.hover.primary} ${themeClasses.text.parts.darkMuted}`}
                      >
                        Readiness details
                      </summary>
                      <div className="mt-3 rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                        <div className="grid gap-2 md:grid-cols-3">
                          <div>
                            <span
                              className={`${themeClasses.text.parts.mutedLight}`}
                            >
                              Local cluster ID
                            </span>
                            <div>
                              <ResourceIdText
                                value={readiness.localClusterId}
                              />
                            </div>
                          </div>
                          <div>
                            <span
                              className={`${themeClasses.text.parts.mutedLight}`}
                            >
                              Authoritative cluster ID
                            </span>
                            <div>
                              <ResourceIdText
                                value={readiness.authoritativeClusterId}
                              />
                            </div>
                          </div>
                          <div>
                            <span
                              className={`${themeClasses.text.parts.mutedLight}`}
                            >
                              Expected members
                            </span>
                            <div className="font-semibold">
                              {readiness.expectedMemberCount || "—"}
                            </div>
                          </div>
                        </div>
                        {readiness.readinessBlockers.length > 0 && (
                          <div className="mt-3">
                            <Text
                              size="xs"
                              className="font-semibold text-rose-900 dark:text-rose-100"
                            >
                              Readiness blockers
                            </Text>
                            <ul className="mt-1 list-disc pl-5 text-rose-800 dark:text-rose-200">
                              {readiness.readinessBlockers.map((blocker) => (
                                <li key={blocker}>{blocker}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {isRaft && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div
                    className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                  >
                    <Text
                      size="sm"
                      intent="subtle"
                      className="uppercase tracking-wide"
                    >
                      System group
                    </Text>
                    <Text className="mt-2 font-semibold">
                      Leader {raftNodeLabel(systemGroup?.leaderNodeId, runtime)}
                    </Text>
                    <Text size="sm" intent="muted">
                      {systemGroup?.health || "unknown"}
                    </Text>
                  </div>
                  <div
                    className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                  >
                    <Text
                      size="sm"
                      intent="subtle"
                      className="uppercase tracking-wide"
                    >
                      Partition leaders
                    </Text>
                    <Text className="mt-2 text-2xl font-semibold">
                      {partitionLeaders}/
                      {runtime?.raftPartitionCount || partitionGroups.length}
                    </Text>
                    <Text size="sm" intent="muted">
                      space-scoped data groups
                    </Text>
                  </div>
                  <div
                    className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                  >
                    <Text
                      size="sm"
                      intent="subtle"
                      className="uppercase tracking-wide"
                    >
                      Raft replicas
                    </Text>
                    <Text className="mt-2 font-semibold">
                      {runtime?.raftNodeAddrs.join(", ") || "—"}
                    </Text>
                    <Text size="sm" intent="muted">
                      configured node address map
                    </Text>
                  </div>
                </div>
              )}

              {isRaft && (
                <div
                  className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                >
                  <Text className="font-semibold">Raft diagnostics</Text>
                  <Text size="sm" intent="muted" className="mt-1">
                    Read-only checks derived from current runtime and group
                    status.
                  </Text>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {raftDiagnostics.map((check) => (
                      <div
                        key={check.label}
                        className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800"
                      >
                        <div>
                          <Text className="font-medium">{check.label}</Text>
                          <Text size="xs" intent="muted">
                            {check.detail}
                          </Text>
                        </div>
                        <StatusBadge value={check.ok ? "pass" : "fail"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isRaft && (
                <div
                  className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text className="font-semibold">
                        Snapshot and compaction guidance
                      </Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        Read-only visibility for raft snapshot indexes and
                        current production compaction boundaries.
                      </Text>
                    </div>
                    <StatusBadge value="read-only" />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Groups with snapshots
                      </span>
                      <div className="font-semibold">
                        {snapshotGroups.length}/{raftGroups.groups.length}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Highest snapshot index
                      </span>
                      <div className="font-semibold">
                        {snapshotGroups.reduce(
                          (max, group) => Math.max(max, group.snapshotIndex),
                          0,
                        ) || "—"}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Compaction mode
                      </span>
                      <div className="font-semibold">off / conservative</div>
                    </div>
                  </div>
                  {snapshotGroups.length > 0 ? (
                    <div
                      className={`mt-3 text-sm ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkSecondary}`}
                    >
                      Snapshot indexes observed:{" "}
                      {snapshotGroups
                        .slice(0, 8)
                        .map(
                          (group) => `${group.groupId}@${group.snapshotIndex}`,
                        )
                        .join(", ")}
                      {snapshotGroups.length > 8 ? " …" : ""}
                    </div>
                  ) : (
                    <Text size="sm" intent="muted" className="mt-3">
                      No raft groups currently report a nonzero snapshot index.
                    </Text>
                  )}
                  <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    Automatic production raft compaction remains
                    off/conservative. Initial Phase B2 subsystem snapshots
                    exist, but forced snapshot-only recovery and production
                    auto-compaction still require snapshot-install,
                    atomic-restore, release-gate, and soak validation.
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <pre
                      className={`rounded-md bg-slate-950 px-3 py-2 text-xs ${themeClasses.text.parts.inverseSoft}`}
                    >
                      {snapshotGuidanceCommands}
                    </pre>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        void copyText(snapshotGuidanceCommands)
                          .then(() =>
                            setClusterCommandMessage(
                              "Snapshot guidance commands copied",
                            ),
                          )
                          .catch((err) =>
                            setClusterCommandMessage(
                              err instanceof Error ? err.message : String(err),
                            ),
                          )
                      }
                    >
                      Copy commands
                    </Button>
                    {clusterCommandMessage && (
                      <Text size="sm" intent="muted">
                        {clusterCommandMessage}
                      </Text>
                    )}
                  </div>
                </div>
              )}

              {isRaft && (
                <div
                  className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                >
                  <Text className="font-semibold">Space route lookup</Text>
                  <Text size="sm" intent="muted" className="mt-1">
                    Resolve a canonical space ID to its Raft partition and
                    leader.
                  </Text>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      fit="auto"
                      aria-label="space id route lookup"
                      className="min-w-80 font-mono text-sm"
                      placeholder="space UUID"
                      value={routeSpaceId}
                      onChange={(event) => setRouteSpaceId(event.target.value)}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => void runRouteLookup()}
                      disabled={routeLoading}
                    >
                      {routeLoading ? "Looking up…" : "Lookup route"}
                    </Button>
                  </div>
                  {routeError && (
                    <Text
                      size="sm"
                      className="mt-2 text-rose-600 dark:text-rose-300"
                    >
                      {routeError}
                    </Text>
                  )}
                  {routeResult && (
                    <div className="mt-3 grid gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 md:grid-cols-4">
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Partition
                        </span>
                        <div className="font-semibold">
                          {routeResult.partitionId}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Leader
                        </span>
                        <div className="font-semibold">
                          {raftNodeLabel(routeResult.leaderNodeId, runtime)}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Replicas
                        </span>
                        <div className="font-semibold">
                          {routeResult.replicaNodeIds
                            .map((id) => raftNodeLabel(id, runtime))
                            .join(", ") || "—"}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Space
                        </span>
                        <div className="break-all font-mono text-xs">
                          {routeResult.spaceId}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                  <Text className="font-semibold text-amber-900 dark:text-amber-100">
                    Warnings
                  </Text>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                    {warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {membershipError && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                  <Text className="font-semibold text-amber-900 dark:text-amber-100">
                    Membership unavailable
                  </Text>
                  <Text
                    size="sm"
                    className="mt-1 text-amber-800 dark:text-amber-200"
                  >
                    {membershipError}
                  </Text>
                </div>
              )}
            </div>
          )}

          {activeTab === "consistency" && (
            <div className="space-y-6" role="tabpanel" aria-label="Consistency">
              <div
                className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
              >
                <Text className="font-semibold">
                  Graph consistency diagnostics
                </Text>
                <Text size="sm" intent="muted" className="mt-1">
                  Consistency reports are read-only latest-state evidence. They
                  do not repair, merge, delete, overwrite, or rebalance data.
                </Text>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Input
                    fit="auto"
                    aria-label="consistency space id"
                    className="min-w-72 font-mono text-sm"
                    placeholder="space ID"
                    value={consistencySpaceId}
                    onChange={(event) =>
                      setConsistencySpaceId(event.target.value)
                    }
                  />
                  <Input
                    fit="auto"
                    aria-label="consistency domain id"
                    className="min-w-72 font-mono text-sm"
                    placeholder="domain ID"
                    value={consistencyDomainId}
                    onChange={(event) =>
                      setConsistencyDomainId(event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runLocalConsistency()}
                    disabled={Boolean(consistencyLoading)}
                  >
                    {consistencyLoading === "local"
                      ? "Checking…"
                      : "Run local check"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runClusterConsistency()}
                    disabled={Boolean(consistencyLoading)}
                  >
                    {consistencyLoading === "cluster"
                      ? "Collecting…"
                      : "Run cluster report"}
                  </Button>
                </div>
                {consistencyError && (
                  <Text
                    size="sm"
                    className="mt-2 text-rose-600 dark:text-rose-300"
                  >
                    {consistencyError}
                  </Text>
                )}
              </div>

              {localConsistency && (
                <div
                  className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text className="font-semibold">
                        Local latest-state check
                      </Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        One daemon only; not cluster-wide proof.
                      </Text>
                    </div>
                    {localConsistency.raftGroup && (
                      <StatusBadge value={localConsistency.raftGroup.health} />
                    )}
                  </div>
                  {localConsistency.stats ? (
                    <div className="mt-4">
                      <StatsGrid stats={localConsistency.stats} />
                    </div>
                  ) : (
                    <Text intent="muted" className="mt-3">
                      No local stats returned.
                    </Text>
                  )}
                  {localConsistency.raftGroup && (
                    <Text size="sm" intent="muted" className="mt-3">
                      Raft group {localConsistency.raftGroup.groupId}; leader{" "}
                      {raftNodeLabel(
                        localConsistency.raftGroup.leaderNodeId,
                        runtime,
                      )}
                      ; applied {localConsistency.raftGroup.appliedIndex};
                      commit {localConsistency.raftGroup.commitIndex}
                    </Text>
                  )}
                  {localConsistency.warnings.length > 0 && (
                    <ul className="mt-3 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                      {localConsistency.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {clusterConsistency && (
                <div
                  className={`space-y-4 rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text className="font-semibold">
                        Cluster consistency report
                      </Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        Status compares latest-state checksums from expected
                        Raft replicas.
                      </Text>
                    </div>
                    <StatusBadge value={clusterConsistency.status} />
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-5">
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Partition
                      </span>
                      <div className="font-semibold">
                        {clusterConsistency.partitionId}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Local node
                      </span>
                      <div className="font-semibold">
                        {raftNodeLabel(clusterConsistency.localNodeId, runtime)}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Leader
                      </span>
                      <div className="font-semibold">
                        {raftNodeLabel(
                          clusterConsistency.leaderNodeId,
                          runtime,
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Expected replicas
                      </span>
                      <div className="font-semibold">
                        {clusterConsistency.expectedReplicaNodeIds
                          .map((id) => raftNodeLabel(id, runtime))
                          .join(", ") || "—"}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Comparison basis
                      </span>
                      <div className="font-semibold">
                        {clusterConsistency.comparisonBasis || "—"}
                      </div>
                    </div>
                  </div>
                  {clusterConsistency.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                      <Text className="font-semibold text-amber-900 dark:text-amber-100">
                        Warnings
                      </Text>
                      <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                        {clusterConsistency.warnings.map((warning) => (
                          <li
                            key={`${warning.code || warning.message}-${warning.raftNodeId || "cluster"}`}
                          >
                            <StatusBadge value={warning.severity} />{" "}
                            <span className="ml-2">
                              {warning.code ? `${warning.code}: ` : ""}
                              {warning.message}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                      <thead
                        className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-900/80 ${themeClasses.text.parts.darkMuted}`}
                      >
                        <tr>
                          <TableHead className="px-3 py-2">Replica</TableHead>
                          <TableHead className="px-3 py-2">Reachable</TableHead>
                          <TableHead className="px-3 py-2">Revision</TableHead>
                          <TableHead className="px-3 py-2">Nodes</TableHead>
                          <TableHead className="px-3 py-2">Edges</TableHead>
                          <TableHead className="px-3 py-2">
                            Graph checksum
                          </TableHead>
                          <TableHead className="px-3 py-2">Error</TableHead>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {clusterConsistency.replicas.map((replica) => (
                          <tr
                            key={`${replica.raftNodeId || replica.nodeId || replica.backendAddr || "replica"}`}
                          >
                            <td className="px-3 py-2">
                              {raftNodeLabel(replica.raftNodeId, runtime)}
                              {replica.local ? " (local)" : ""}
                              <div
                                className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                              >
                                {replica.nodeName ||
                                  replica.backendAddr ||
                                  replica.nodeId ||
                                  "—"}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <StatusBadge
                                value={replica.reachable ? "pass" : "fail"}
                              />
                            </td>
                            <td className="px-3 py-2">
                              {replica.stats?.revision ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              {replica.stats?.nodeCount ?? "—"}
                            </td>
                            <td className="px-3 py-2">
                              {replica.stats?.edgeCount ?? "—"}
                            </td>
                            <td className="px-3 py-2 break-all font-mono text-xs">
                              {replica.stats?.graphChecksum || "—"}
                            </td>
                            <td className="px-3 py-2 break-all font-mono text-xs">
                              {replica.error || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div
                className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
              >
                <Text className="font-semibold">Local forensic export</Text>
                <Text size="sm" intent="muted" className="mt-1">
                  Forensic export is read-only and page-bounded. If truncated,
                  collect every page before drawing repair conclusions. Use
                  manual repair workflows outside this UI.
                </Text>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Input
                    fit="auto"
                    aria-label="forensic source label"
                    className="text-sm"
                    placeholder="source label"
                    value={forensicSourceLabel}
                    onChange={(event) =>
                      setForensicSourceLabel(event.target.value)
                    }
                  />
                  <Input
                    fit="auto"
                    aria-label="forensic page size"
                    className="w-32 text-sm"
                    min={1}
                    type="number"
                    value={forensicPageSize}
                    onChange={(event) =>
                      setForensicPageSize(Number(event.target.value) || 100)
                    }
                  />
                  <Input
                    fit="auto"
                    aria-label="forensic page token"
                    className="min-w-72 font-mono text-sm"
                    placeholder="page token"
                    value={forensicPageToken}
                    onChange={(event) =>
                      setForensicPageToken(event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void runForensicExport()}
                    disabled={Boolean(consistencyLoading)}
                  >
                    {consistencyLoading === "forensic"
                      ? "Exporting…"
                      : "Run forensic export"}
                  </Button>
                </div>
                {forensicMessage && (
                  <Text
                    size="sm"
                    className="mt-2 text-emerald-700 dark:text-emerald-300"
                  >
                    {forensicMessage}
                  </Text>
                )}
                {forensicExport && (
                  <div className="mt-4 space-y-4">
                    {forensicExport.truncated && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                        Export response is truncated. Collect every page before
                        drawing conclusions.
                      </div>
                    )}
                    <div className="grid gap-3 text-sm md:grid-cols-5">
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Report
                        </span>
                        <div>
                          <ResourceIdText
                            value={forensicExport.manifest?.reportId}
                          />
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Source node
                        </span>
                        <div className="font-semibold">
                          {forensicExport.manifest?.sourceNodeName ||
                            forensicExport.manifest?.sourceNodeId ||
                            "—"}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Collected
                        </span>
                        <div className="font-semibold">
                          {formatTime(forensicExport.manifest?.collectedAt)}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Nodes in page
                        </span>
                        <div className="font-semibold">
                          {forensicExport.nodes.length}
                        </div>
                      </div>
                      <div>
                        <span
                          className={`${themeClasses.text.parts.mutedLight}`}
                        >
                          Edges in page
                        </span>
                        <div className="font-semibold">
                          {forensicExport.edges.length}
                        </div>
                      </div>
                    </div>
                    {forensicExport.stats && (
                      <StatsGrid stats={forensicExport.stats} />
                    )}
                    {forensicExport.warnings.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                        {forensicExport.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          void copyText(forensicExportJson(forensicExport))
                            .then(() =>
                              setForensicMessage(
                                "Forensic JSON copied to clipboard",
                              ),
                            )
                            .catch((err) =>
                              setConsistencyError(
                                err instanceof Error
                                  ? err.message
                                  : String(err),
                              ),
                            )
                        }
                      >
                        Copy JSON
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() =>
                          downloadJson(
                            `${forensicExport.manifest?.reportId || "graph-forensic-export"}.json`,
                            forensicExportJson(forensicExport),
                          )
                        }
                      >
                        Download JSON
                      </Button>
                      {forensicExport.nextPageToken && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            void runForensicExport(forensicExport.nextPageToken)
                          }
                        >
                          Fetch next page
                        </Button>
                      )}
                    </div>
                    <Text size="sm" intent="muted">
                      Next page token:{" "}
                      <ResourceIdText value={forensicExport.nextPageToken} />
                    </Text>
                    <pre
                      className={`max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs ${themeClasses.text.parts.inverseSoft}`}
                    >
                      {forensicExportJson(forensicExport)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <ClusterEventLog
              events={clusterActivityEvents}
              error={clusterActivityError}
              loading={loading}
            />
          )}

          {activeTab === "topology" && isRaft && (
            <div className="space-y-4" role="tabpanel" aria-label="Raft groups">
              <SpaceDistributionCard
                distribution={spaceDistribution}
                error={spaceDistributionError}
                loading={loading}
              />

              {raftTransport && (
                <div
                  className={[
                    `rounded-lg border ${themeClasses.surface.elevated} p-4`,
                    raftTransportCritical
                      ? "border-rose-300 dark:border-rose-800"
                      : raftTransportWarn
                        ? "border-amber-300 dark:border-amber-800"
                        : "border-slate-200 dark:border-slate-800",
                  ].join(" ")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text className="font-semibold">
                        Raft transport summary
                      </Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        Internode message delivery counters are joined into raft
                        group rows below. Auth and missing-sender failures are
                        critical because they can prevent replication.
                      </Text>
                    </div>
                    <StatusBadge
                      value={
                        raftTransportCritical
                          ? "fail"
                          : raftTransportWarn
                            ? "warning"
                            : "pass"
                      }
                    />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Send attempts
                      </span>
                      <div className="font-semibold">
                        {raftTransport.sendAttempts}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Send failures
                      </span>
                      <div className="font-semibold">
                        {raftTransport.sendFailures}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Auth failures
                      </span>
                      <div className="font-semibold">
                        {raftTransport.authFailures}
                      </div>
                    </div>
                    <div>
                      <span className={`${themeClasses.text.parts.mutedLight}`}>
                        Missing sender failures
                      </span>
                      <div className="font-semibold">
                        {raftTransport.missingSenderFailures}
                      </div>
                    </div>
                  </div>
                  {(raftTransport.lastError ||
                    raftTransport.lastFailureReason ||
                    raftTransport.lastErrorAt) && (
                    <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <Text className="font-medium">
                        Last transport failure
                      </Text>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            Reason
                          </span>
                          <div className="font-semibold">
                            {raftTransport.lastFailureReason || "—"}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            Group
                          </span>
                          <div>
                            <ResourceIdText value={raftTransport.lastGroupId} />
                          </div>
                        </div>
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            Message
                          </span>
                          <div className="font-semibold">
                            {formatEnumLabel(raftTransport.lastMessageType)}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            Source → target
                          </span>
                          <div className="font-semibold">
                            <ResourceIdText
                              value={
                                raftTransport.lastSourceNodeId === undefined
                                  ? undefined
                                  : String(raftTransport.lastSourceNodeId)
                              }
                            />{" "}
                            →{" "}
                            <ResourceIdText
                              value={
                                raftTransport.lastTargetNodeId === undefined
                                  ? undefined
                                  : String(raftTransport.lastTargetNodeId)
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            At
                          </span>
                          <div className="font-semibold">
                            {formatTime(raftTransport.lastErrorAt)}
                          </div>
                        </div>
                        <div>
                          <span
                            className={`${themeClasses.text.parts.mutedLight}`}
                          >
                            Error
                          </span>
                          <div className="break-all font-mono text-xs">
                            {raftTransport.lastError || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {unmatchedTransportTargets.length > 0 && (
                    <Text size="sm" intent="muted" className="mt-3">
                      {unmatchedTransportTargets.length} transport target(s) are
                      not associated with a currently listed group.
                    </Text>
                  )}
                </div>
              )}

              <div
                className={`overflow-hidden rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated}`}
              >
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text className="font-semibold">Raft groups</Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        System metadata and space partitions with leader, lag,
                        read-index, and per-group transport diagnostics.
                      </Text>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <select
                        aria-label="raft group status filter"
                        className={`rounded border border-slate-300 ${themeClasses.surface.input} px-3 py-2 text-sm dark:border-slate-700`}
                        value={raftGroupStatusFilter}
                        onChange={(event) =>
                          setRaftGroupStatusFilter(event.target.value)
                        }
                      >
                        <option value="all">All</option>
                        <option value="unhealthy">Unhealthy</option>
                        <option value="no_leader">No leader</option>
                        <option value="lagging">Lagging</option>
                        <option value="read_failures">Read failures</option>
                        <option value="has_snapshot">Has snapshot</option>
                      </select>
                      <Input
                        fit="auto"
                        aria-label="filter raft groups"
                        className="text-sm"
                        placeholder="Filter groups…"
                        value={raftGroupFilter}
                        onChange={(event) =>
                          setRaftGroupFilter(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead
                      className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-900/80 ${themeClasses.text.parts.darkMuted}`}
                    >
                      <tr>
                        <TableHead className="px-4 py-3">Health</TableHead>
                        <TableHead className="px-4 py-3">Group</TableHead>
                        <TableHead className="px-4 py-3">Kind</TableHead>
                        <TableHead className="px-4 py-3">Leader</TableHead>
                        <TableHead className="px-4 py-3">Replicas</TableHead>
                        <TableHead className="px-4 py-3">Lag</TableHead>
                        <TableHead className="px-4 py-3">
                          Read failures
                        </TableHead>
                        <TableHead className="px-4 py-3">Transport</TableHead>
                        <TableHead className="px-4 py-3">
                          Last transport reason
                        </TableHead>
                        <TableHead className="px-4 py-3">Details</TableHead>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredRaftGroups.map((group) => {
                        const transportTargets = transportTargetsForGroup(
                          group.groupId,
                          runtime,
                        );
                        const transportFailures =
                          transportFailureCount(transportTargets);
                        const expanded = expandedRaftGroups.includes(
                          group.groupId,
                        );
                        return (
                          <Fragment key={group.groupId}>
                            <tr
                              className={
                                expanded
                                  ? "bg-slate-50/70 dark:bg-slate-950/60"
                                  : undefined
                              }
                            >
                              <td className="px-4 py-3">
                                <StatusBadge value={group.health} />
                              </td>
                              <td className="px-4 py-3 font-mono">
                                {group.groupId}
                                <div
                                  className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight}`}
                                >
                                  {group.healthReason || "ok"}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {formatEnumLabel(group.kind)}
                                {group.partitionId !== undefined
                                  ? ` ${group.partitionId}`
                                  : ""}
                              </td>
                              <td className="px-4 py-3">
                                {raftNodeLabel(group.leaderNodeId, runtime)}
                              </td>
                              <td className="px-4 py-3">
                                {group.replicaNodeIds
                                  .map((id) => raftNodeLabel(id, runtime))
                                  .join(", ") || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <CountStatusBadge
                                  label="Apply lag"
                                  status={
                                    group.applyLag > 0 ? "lagging" : "pass"
                                  }
                                  value={group.applyLag || 0}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <CountStatusBadge
                                  label="Read failures"
                                  status={
                                    groupHasReadFailures(group)
                                      ? "fail"
                                      : "pass"
                                  }
                                  value={groupReadFailureCount(group)}
                                />
                              </td>
                              <td className="px-4 py-3">
                                <CountStatusBadge
                                  label="Transport failures"
                                  status={transportStatus(transportTargets)}
                                  value={transportFailures}
                                />
                              </td>
                              <td className="px-4 py-3">
                                {lastTransportReason(transportTargets)}
                              </td>
                              <td className="px-4 py-3">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    toggleRaftGroupDetails(group.groupId)
                                  }
                                  aria-expanded={expanded}
                                  aria-controls={`raft-group-details-${group.groupId}`}
                                >
                                  {expanded ? "Hide" : "Expand"}
                                </Button>
                              </td>
                            </tr>
                            {expanded && (
                              <tr
                                id={`raft-group-details-${group.groupId}`}
                                className="bg-slate-50/70 dark:bg-slate-950/60"
                              >
                                <td colSpan={10} className="p-0">
                                  <div className="space-y-3 border-t border-slate-200 px-4 py-3 text-xs dark:border-slate-800">
                                    <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Term
                                        </span>
                                        <div className="font-semibold">
                                          {group.term || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Commit
                                        </span>
                                        <div className="font-semibold">
                                          {group.commitIndex || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Applied
                                        </span>
                                        <div className="font-semibold">
                                          {group.appliedIndex || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Last
                                        </span>
                                        <div className="font-semibold">
                                          {group.lastIndex || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Snapshot
                                        </span>
                                        <div className="font-semibold">
                                          {group.snapshotIndex || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Preferred leader
                                        </span>
                                        <div className="font-semibold">
                                          {raftNodeLabel(
                                            group.preferredLeaderNodeId,
                                            runtime,
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Local node
                                        </span>
                                        <div className="font-semibold">
                                          {raftNodeLabel(
                                            group.localNodeId,
                                            runtime,
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <span
                                          className={`${themeClasses.text.parts.mutedLight}`}
                                        >
                                          Reason
                                        </span>
                                        <div className="font-semibold">
                                          {group.healthReason || "—"}
                                        </div>
                                      </div>
                                    </div>

                                    {group.readDiagnostics && (
                                      <div>
                                        <Text
                                          size="xs"
                                          className={`font-semibold uppercase tracking-wide ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkSecondary}`}
                                        >
                                          Read-index diagnostics
                                        </Text>
                                        <div className="mt-2 grid gap-3 md:grid-cols-4 lg:grid-cols-8">
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Attempts
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexAttempts
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Successes
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexSuccesses
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Failures
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexFailures
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Timeouts
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexTimeouts
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              No leader
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexNoLeader
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Not leader
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .readIndexNotLeader
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Apply wait failures
                                            </span>
                                            <div className="font-semibold">
                                              {
                                                group.readDiagnostics
                                                  .applyWaitFailures
                                              }
                                            </div>
                                          </div>
                                          <div>
                                            <span
                                              className={`${themeClasses.text.parts.mutedLight}`}
                                            >
                                              Apply wait ms
                                            </span>
                                            <div className="font-semibold">
                                              {group.readDiagnostics
                                                .lastAppliedWaitMillis || "—"}
                                            </div>
                                          </div>
                                        </div>
                                        {(group.readDiagnostics
                                          .lastFailureReason ||
                                          group.readDiagnostics
                                            .lastFailureAt) && (
                                          <Text
                                            size="xs"
                                            intent="muted"
                                            className="mt-2"
                                          >
                                            Last read failure:{" "}
                                            {group.readDiagnostics
                                              .lastFailureReason ||
                                              "unknown"}{" "}
                                            at{" "}
                                            {formatTime(
                                              group.readDiagnostics
                                                .lastFailureAt,
                                            )}
                                          </Text>
                                        )}
                                      </div>
                                    )}

                                    <div>
                                      <Text
                                        size="xs"
                                        className={`font-semibold uppercase tracking-wide ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkSecondary}`}
                                      >
                                        Transport targets
                                      </Text>
                                      {transportTargets.length > 0 ? (
                                        <div className="mt-2 overflow-x-auto">
                                          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                                            <thead
                                              className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-950 ${themeClasses.text.parts.darkMuted}`}
                                            >
                                              <tr>
                                                <TableHead className="px-3 py-2">
                                                  Target
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Attempts
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Failures
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Auth
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Missing sender
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Last reason
                                                </TableHead>
                                                <TableHead className="px-3 py-2">
                                                  Last error
                                                </TableHead>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                              {transportTargets.map(
                                                (target, index) => (
                                                  <tr
                                                    key={`${target.groupId || "group"}-${target.targetNodeId || index}`}
                                                  >
                                                    <td className="px-3 py-2">
                                                      {raftNodeLabel(
                                                        target.targetNodeId,
                                                        runtime,
                                                      )}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {target.sendAttempts}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {target.sendFailures}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {target.authFailures}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {
                                                        target.missingSenderFailures
                                                      }
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      {target.lastFailureReason ||
                                                        "—"}
                                                    </td>
                                                    <td className="px-3 py-2 break-all font-mono text-xs">
                                                      {target.lastError || "—"}
                                                    </td>
                                                  </tr>
                                                ),
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      ) : (
                                        <Text
                                          size="xs"
                                          intent="muted"
                                          className="mt-2"
                                        >
                                          No per-target transport counters are
                                          recorded for this group.
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                      {filteredRaftGroups.length === 0 && (
                        <tr>
                          <td
                            colSpan={10}
                            className={`px-4 py-8 text-center ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                          >
                            No raft groups match the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "topology" && !isRaft && (
            <div
              className={`overflow-hidden rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated}`}
              role="tabpanel"
              aria-label="Topology"
            >
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <Text className="font-semibold">Peers / topology</Text>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead
                    className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-900/80 ${themeClasses.text.parts.darkMuted}`}
                  >
                    <tr>
                      <TableHead className="px-4 py-3">State</TableHead>
                      <TableHead className="px-4 py-3">
                        Responsibility
                      </TableHead>
                      <TableHead className="px-4 py-3">Name</TableHead>
                      <TableHead className="px-4 py-3">
                        Backend address
                      </TableHead>
                      <TableHead className="px-4 py-3">Source</TableHead>
                      <TableHead className="px-4 py-3">Last seen</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {status.peers.map((peer) => {
                      const nodeKey = encodeURIComponent(
                        peer.nodeId ||
                          peer.nodeName ||
                          peer.backendAdvertiseAddr,
                      );
                      return (
                        <tr
                          key={`${peer.nodeId || peer.backendAdvertiseAddr}-${peer.state}`}
                        >
                          <td className="px-4 py-3">
                            <StatusBadge value={peer.state} />
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge value={topologyResponsibility(peer)} />
                          </td>
                          <td className="px-4 py-3">
                            <TextLink to={`/cluster/nodes/${nodeKey}`}>
                              {peer.nodeName || "View node"}
                            </TextLink>
                            <div>
                              <ResourceIdText value={peer.nodeId} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <ResourceIdText value={peer.backendAdvertiseAddr} />
                          </td>
                          <td className="px-4 py-3">
                            {formatEnumLabel(peer.source)}
                          </td>
                          <td className="px-4 py-3">
                            {formatTime(peer.lastSeenAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
