import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClusterHealth, getClusterRuntimeStatus, getClusterStatus, getGraphConsistencyReport, getLocalGraphConsistency, getLocalGraphForensicExport, listClusterMembers, listRaftGroups, lookupSpaceRoute } from "../../../services/adminService";
import type { ClusterHealthInfo, ClusterPeerInfo, ClusterRuntimeStatusInfo, ClusterStatusInfo, GraphConsistencyReport, GraphForensicExportResponse, ListClusterMembersResponse, ListRaftGroupsResponse, LocalGraphConsistencyResponse, LocalGraphConsistencyStatsInfo, LookupSpaceRouteResult, RaftGroupStatusInfo } from "../../../types/cluster";
import { Button, Alert, H2, Text } from "../../../components/typography";
import { ClusterEventLog, clusterEventsFromState } from "../components/ClusterEventLog";

function badgeClass(value: string) {
  switch (value) {
    case "clustered":
    case "active":
    case "self":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "standalone":
      return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
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
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(value)}`}>{value}</span>;
}

function CheckBadge({ ok }: { ok: boolean }) {
  return <StatusBadge value={ok ? "pass" : "fail"} />;
}

function HelpIcon({ label, description }: { label: string; description: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        aria-label={`${label}: ${description}`}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        role="img"
        tabIndex={0}
      >
        ?
      </span>
      <span className="pointer-events-none absolute left-0 top-5 z-20 hidden w-72 rounded-md border border-slate-200 bg-white p-3 text-left text-xs normal-case tracking-normal text-slate-700 shadow-lg group-hover:block group-focus-within:block dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" role="tooltip">
        <span className="block font-semibold text-slate-900 dark:text-slate-100">{label}</span>
        <span className="mt-1 block">{description}</span>
      </span>
    </span>
  );
}

const readinessHelp = {
  clientReady: "Overall safe-to-serve signal. Possible values: ready means this daemon can serve client traffic; blocked means raft metadata or partition groups are not ready, even if the admin port is reachable.",
  metadataApplied: "Whether committed system Raft metadata has been applied locally. Possible values: pass means applied; fail means the daemon is still waiting and should fail closed for client traffic.",
  metadataValidated: "Whether the applied system Raft metadata matches local expectations such as cluster identity and placement. Possible values: pass means validated; fail means the node must not trust local fallback metadata.",
  partitionGroupsStarted: "Whether all expected partition Raft groups have started locally. Possible values: pass means partitions are running; fail means one or more groups are not started yet.",
  clusterIdMatch: "Whether local cluster ID equals the authoritative cluster ID from system Raft metadata. Possible values: pass means they match; fail means identity mismatch or one value is unavailable.",
  expectedMembers: "Expected member count from authoritative cluster metadata. Possible values: a positive number in raft mode, or blank when metadata has not supplied it.",
};

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function countPeers(peers: ClusterPeerInfo[], state: string) {
  return peers.filter((peer) => peer.state === state).length;
}

function countMembers(membership: ListClusterMembersResponse | null, state: string) {
  return membership?.members.filter((member) => member.state === state).length || 0;
}

function raftNodeLabel(nodeId: number | undefined, runtime: ClusterRuntimeStatusInfo | null) {
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
  return Boolean(read && (
    read.readIndexFailures > 0
    || read.readIndexTimeouts > 0
    || read.readIndexNoLeader > 0
    || read.readIndexNotLeader > 0
    || read.applyWaitFailures > 0
  ));
}

function groupReadFailureCount(group: RaftGroupStatusInfo) {
  const read = group.readDiagnostics;
  if (!read) return 0;
  return read.readIndexFailures
    + read.readIndexTimeouts
    + read.readIndexNoLeader
    + read.readIndexNotLeader
    + read.applyWaitFailures;
}

function matchesRaftGroupStatusFilter(group: RaftGroupStatusInfo, filter: string) {
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
      <div><span className="text-slate-500">Revision</span><div className="font-semibold">{stats.revision}</div></div>
      <div><span className="text-slate-500">Nodes</span><div className="font-semibold">{stats.nodeCount}</div></div>
      <div><span className="text-slate-500">Edges</span><div className="font-semibold">{stats.edgeCount}</div></div>
      <div><span className="text-slate-500">Partition</span><div className="font-semibold">{stats.partitionId}</div></div>
      <div><span className="text-slate-500">Graph checksum</span><div className="break-all font-mono text-xs">{stats.graphChecksum || "—"}</div></div>
      <div><span className="text-slate-500">Node checksum</span><div className="break-all font-mono text-xs">{stats.nodeChecksum || "—"}</div></div>
      <div><span className="text-slate-500">Edge checksum</span><div className="break-all font-mono text-xs">{stats.edgeChecksum || "—"}</div></div>
      <div><span className="text-slate-500">Algorithm</span><div className="font-semibold">{stats.checksumAlgorithm || "—"}</div></div>
      <div><span className="text-slate-500">Collected at</span><div className="font-semibold">{formatTime(stats.collectedAt)}</div></div>
      <div><span className="text-slate-500">Source</span><div className="font-semibold">{stats.source || "—"}</div></div>
      <div><span className="text-slate-500">Space</span><div className="break-all font-mono text-xs">{stats.spaceId}</div></div>
      <div><span className="text-slate-500">Domain</span><div className="break-all font-mono text-xs">{stats.domainId}</div></div>
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
  const [membership, setMembership] = useState<ListClusterMembersResponse | null>(null);
  const [health, setHealth] = useState<ClusterHealthInfo | null>(null);
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [raftGroups, setRaftGroups] = useState<ListRaftGroupsResponse>({ groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [raftGroupFilter, setRaftGroupFilter] = useState("");
  const [raftGroupStatusFilter, setRaftGroupStatusFilter] = useState("all");
  const [routeSpaceId, setRouteSpaceId] = useState("");
  const [routeResult, setRouteResult] = useState<LookupSpaceRouteResult | null>(null);
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [clusterCommandMessage, setClusterCommandMessage] = useState("");
  const [consistencySpaceId, setConsistencySpaceId] = useState("");
  const [consistencyDomainId, setConsistencyDomainId] = useState("");
  const [localConsistency, setLocalConsistency] = useState<LocalGraphConsistencyResponse | null>(null);
  const [clusterConsistency, setClusterConsistency] = useState<GraphConsistencyReport | null>(null);
  const [consistencyError, setConsistencyError] = useState("");
  const [consistencyLoading, setConsistencyLoading] = useState<"local" | "cluster" | "forensic" | "">("");
  const [forensicSourceLabel, setForensicSourceLabel] = useState("admin-ui");
  const [forensicPageSize, setForensicPageSize] = useState(100);
  const [forensicPageToken, setForensicPageToken] = useState("");
  const [forensicExport, setForensicExport] = useState<GraphForensicExportResponse | null>(null);
  const [forensicMessage, setForensicMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "topology" | "consistency" | "events">("general");
  async function load() {
    setError("");
    setLoading(true);
    try {
      setMembershipError("");
      const clusterRuntime = await getClusterRuntimeStatus().catch(() => null);
      const clusterStatus = await getClusterStatus();
      const members = await listClusterMembers().catch((err) => {
        setMembershipError(err instanceof Error ? err.message : "Membership is unavailable");
        return null;
      });
      const isRuntimeRaft = clusterRuntime?.engine === "raft";
      const clusterHealth = await getClusterHealth().catch(() => null);
      const groups = isRuntimeRaft ? await listRaftGroups().catch(() => ({ groups: [] })) : { groups: [] };
      setRuntime(clusterRuntime);
      setRaftGroups(groups);
      setStatus(clusterStatus);
      setMembership(members);
      setHealth(clusterHealth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cluster status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const events = useMemo(
    () => clusterEventsFromState(membership?.members || [], status?.peers || []),
    [membership, status],
  );

  const isRaft = runtime?.engine === "raft";
  const readiness = status?.readiness || health?.readiness;
  const clusterIdsMatch = Boolean(
    readiness?.authoritativeClusterId
      && readiness?.localClusterId
      && readiness.authoritativeClusterId === readiness.localClusterId,
  );
  const systemGroup = raftGroups.groups.find((group) => group.kind === "system");
  const partitionGroups = raftGroups.groups.filter((group) => group.kind === "partition");
  const partitionLeaders = partitionGroups.filter((group) => group.leaderNodeId).length;
  const snapshotGroups = raftGroups.groups.filter((group) => group.snapshotIndex > 0);
  const filteredRaftGroups = raftGroups.groups.filter((group) => {
    const filter = raftGroupFilter.trim().toLowerCase();
    const matchesText = !filter
      || group.groupId.toLowerCase().includes(filter)
      || group.kind.toLowerCase().includes(filter)
      || group.health.toLowerCase().includes(filter)
      || String(group.partitionId ?? "").includes(filter)
      || String(group.leaderNodeId ?? "").includes(filter)
      || (group.healthReason || "").toLowerCase().includes(filter);
    return matchesText && matchesRaftGroupStatusFilter(group, raftGroupStatusFilter);
  });
  const raftTransport = runtime?.raftTransport;
  const raftTransportCritical = Boolean(raftTransport && (raftTransport.authFailures > 0 || raftTransport.missingSenderFailures > 0));
  const raftTransportWarn = Boolean(raftTransport && !raftTransportCritical && (raftTransport.sendFailures > 0 || raftTransport.lastError));
  const snapshotGuidanceCommands = "mycel cluster raft-groups\nmake test-cluster-soak";
  const raftDiagnostics = isRaft ? [
    { label: "System group has leader", ok: Boolean(systemGroup?.leaderNodeId), detail: systemGroup?.leaderNodeId ? `leader ${systemGroup.leaderNodeId}` : "no leader" },
    { label: "All partitions have leaders", ok: Boolean(runtime && partitionLeaders === runtime.raftPartitionCount), detail: `${partitionLeaders}/${runtime?.raftPartitionCount || 0}` },
    { label: "Replica factor configured", ok: Boolean(runtime && runtime.raftReplicaFactor > 0 && runtime.raftReplicaFactor <= runtime.raftNodeCount), detail: `${runtime?.raftReplicaFactor || 0}/${runtime?.raftNodeCount || 0}` },
    { label: "Raft node address map complete", ok: Boolean(runtime && runtime.raftNodeAddrs.length === runtime.raftNodeCount), detail: `${runtime?.raftNodeAddrs.length || 0}/${runtime?.raftNodeCount || 0}` },
  ] : [];
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
      setLocalConsistency(await getLocalGraphConsistency({ spaceId, domainId }));
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
      setClusterConsistency(await getGraphConsistencyReport({ spaceId, domainId }));
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
      .filter((peer) => peer.clusterId && peer.clusterId !== status.cluster.clusterId)
      .map((peer) => `${peer.nodeName || peer.backendAdvertiseAddr} reports a different cluster ID`);
    for (const peer of status.peers) {
      if (!peer.nodeId) items.push(`${peer.nodeName || peer.backendAdvertiseAddr} has no node ID`);
      if (peer.state === "unreachable") items.push(`${peer.nodeName || peer.backendAdvertiseAddr} is unreachable`);
    }
    if (!status.node.admitted && status.cluster.mode === "clustered") {
      items.push("Local node is not admitted; membership operations are disabled.");
    }
    return items;
  }, [status]);

  if (loading && !status) {
    return <Text intent="muted">Loading cluster status…</Text>;
  }

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <H2>Cluster{status?.cluster.clusterId ? ` (${status.cluster.clusterId})` : ""}</H2>
          <Text intent="muted">Inspect cluster engine, Raft status, local node identity, and known peers.</Text>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {status && (
        <>
          {status.cluster.mode === "standalone" && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              <Text className="font-semibold">Standalone daemon</Text>
              <Text size="sm" intent="muted" className="mt-1">This daemon is not currently participating in cluster mode. Start with bootstrap or join settings to cluster it.</Text>
            </div>
          )}

          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Cluster sections">
              {[
                ["general", "General"],
                ["topology", isRaft ? "Raft groups" : "Topology"],
                ["consistency", "Consistency"],
                ["events", "Events"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={[
                    "rounded-t-md px-4 py-2 text-sm font-medium transition",
                    activeTab === tab
                      ? "border border-b-white border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  ].join(" ")}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "general" && (
            <div className="space-y-6" role="tabpanel" aria-label="General">
              {readiness && (
                <div className={[
                  "rounded-lg border p-4 shadow-sm",
                  readiness.clientReady
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                    : "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30",
                ].join(" ")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text size="sm" intent="subtle" className="uppercase tracking-wide">
                        Client readiness
                        <HelpIcon label="Client readiness" description={readinessHelp.clientReady} />
                      </Text>
                      <Text className="mt-1 text-lg font-semibold">{readiness.clientReady ? "Client ready" : "Not client ready"}</Text>
                      <Text size="sm" intent="muted" className="mt-1">
                        Daemon reachability only means the admin port is open. Client readiness requires committed system Raft metadata and started partition groups.
                      </Text>
                    </div>
                    <StatusBadge value={readiness.clientReady ? "ready" : "blocked"} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
                    <div className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><span className="text-slate-500">Metadata applied<HelpIcon label="Metadata applied" description={readinessHelp.metadataApplied} /></span><div className="mt-2"><CheckBadge ok={readiness.metadataApplied} /></div></div>
                    <div className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><span className="text-slate-500">Metadata validated<HelpIcon label="Metadata validated" description={readinessHelp.metadataValidated} /></span><div className="mt-2"><CheckBadge ok={readiness.metadataValidated} /></div></div>
                    <div className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><span className="text-slate-500">Partition groups started<HelpIcon label="Partition groups started" description={readinessHelp.partitionGroupsStarted} /></span><div className="mt-2"><CheckBadge ok={readiness.partitionGroupsStarted} /></div></div>
                    <div className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><span className="text-slate-500">Cluster ID match<HelpIcon label="Cluster ID match" description={readinessHelp.clusterIdMatch} /></span><div className="mt-2"><CheckBadge ok={clusterIdsMatch} /></div><div className="mt-2 break-all font-mono text-xs text-slate-500">local {readiness.localClusterId || "—"}<br />auth {readiness.authoritativeClusterId || "—"}</div></div>
                    <div className="rounded-md border border-slate-200 bg-white/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"><span className="text-slate-500">Expected members<HelpIcon label="Expected members" description={readinessHelp.expectedMembers} /></span><div className="mt-2 text-lg font-semibold">{readiness.expectedMemberCount || "—"}</div></div>
                  </div>
                  {readiness.readinessBlockers.length > 0 && (
                    <div className="mt-4 rounded-md border border-rose-300 bg-rose-100 p-3 dark:border-rose-800 dark:bg-rose-950/60">
                      <Text className="font-semibold text-rose-900 dark:text-rose-100">Readiness blockers</Text>
                      <ul className="mt-2 list-disc pl-5 text-sm text-rose-800 dark:text-rose-200">
                        {readiness.readinessBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {runtime && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900 dark:bg-sky-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text size="sm" intent="subtle" className="uppercase tracking-wide">Runtime overview</Text>
                      <Text className="mt-1 font-semibold">Cluster engine</Text>
                      <div className="mt-2"><StatusBadge value={runtime.engine} /></div>
                    </div>
                    <Text size="sm" intent="muted">{runtime.clusterName || status.cluster.clusterName || "Unnamed cluster"}</Text>
                  </div>
                  {isRaft && (
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-6">
                      <div><span className="text-slate-500">Local Raft node</span><div className="font-semibold">{raftNodeLabel(runtime.localRaftNodeId, runtime)}</div></div>
                      <div><span className="text-slate-500">Nodes</span><div className="font-semibold">{runtime.raftNodeCount}</div></div>
                      <div><span className="text-slate-500">Partitions</span><div className="font-semibold">{runtime.raftPartitionCount}</div></div>
                      <div><span className="text-slate-500">Replica factor</span><div className="font-semibold">{runtime.raftReplicaFactor}</div></div>
                      <div><span className="text-slate-500">Groups with leader</span><div className="font-semibold">{runtime.raftGroupsWithLeader}/{runtime.raftGroupCount}</div></div>
                      <div><span className="text-slate-500">Cluster ID</span><div className="break-all font-mono text-xs font-semibold">{status.cluster.clusterId || "—"}</div></div>
                    </div>
                  )}
                </div>
              )}

              {isRaft && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Text size="sm" intent="subtle" className="uppercase tracking-wide">System group</Text>
                    <Text className="mt-2 font-semibold">Leader {raftNodeLabel(systemGroup?.leaderNodeId, runtime)}</Text>
                    <Text size="sm" intent="muted">{systemGroup?.health || "unknown"}</Text>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Text size="sm" intent="subtle" className="uppercase tracking-wide">Partition leaders</Text>
                    <Text className="mt-2 text-2xl font-semibold">{partitionLeaders}/{runtime?.raftPartitionCount || partitionGroups.length}</Text>
                    <Text size="sm" intent="muted">space-scoped data groups</Text>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <Text size="sm" intent="subtle" className="uppercase tracking-wide">Raft replicas</Text>
                    <Text className="mt-2 font-semibold">{runtime?.raftNodeAddrs.join(", ") || "—"}</Text>
                    <Text size="sm" intent="muted">configured node address map</Text>
                  </div>
                </div>
              )}

              {isRaft && raftTransport && (
                <div className={[
                  "rounded-lg border bg-white p-4 shadow-sm dark:bg-slate-900",
                  raftTransportCritical
                    ? "border-rose-300 dark:border-rose-800"
                    : raftTransportWarn
                      ? "border-amber-300 dark:border-amber-800"
                      : "border-slate-200 dark:border-slate-800",
                ].join(" ")}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text className="font-semibold">Raft transport diagnostics</Text>
                      <Text size="sm" intent="muted" className="mt-1">Internode Raft message delivery counters. Auth and missing-sender failures are critical because they can prevent replication.</Text>
                    </div>
                    <StatusBadge value={raftTransportCritical ? "fail" : raftTransportWarn ? "warning" : "pass"} />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                    <div><span className="text-slate-500">Send attempts</span><div className="font-semibold">{raftTransport.sendAttempts}</div></div>
                    <div><span className="text-slate-500">Send failures</span><div className="font-semibold">{raftTransport.sendFailures}</div></div>
                    <div><span className="text-slate-500">Auth failures</span><div className="font-semibold">{raftTransport.authFailures}</div></div>
                    <div><span className="text-slate-500">Missing sender failures</span><div className="font-semibold">{raftTransport.missingSenderFailures}</div></div>
                  </div>
                  {(raftTransport.lastError || raftTransport.lastFailureReason || raftTransport.lastErrorAt) && (
                    <div className="mt-4 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                      <Text className="font-medium">Last transport failure</Text>
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <div><span className="text-slate-500">Reason</span><div className="font-semibold">{raftTransport.lastFailureReason || "—"}</div></div>
                        <div><span className="text-slate-500">Group</span><div className="break-all font-mono text-xs">{raftTransport.lastGroupId || "—"}</div></div>
                        <div><span className="text-slate-500">Message</span><div className="font-semibold">{raftTransport.lastMessageType || "—"}</div></div>
                        <div><span className="text-slate-500">Source → target</span><div className="font-semibold">{raftTransport.lastSourceNodeId || "—"} → {raftTransport.lastTargetNodeId || "—"}</div></div>
                        <div><span className="text-slate-500">At</span><div className="font-semibold">{formatTime(raftTransport.lastErrorAt)}</div></div>
                        <div><span className="text-slate-500">Error</span><div className="break-all font-mono text-xs">{raftTransport.lastError || "—"}</div></div>
                      </div>
                    </div>
                  )}
                  {raftTransport.targets.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"><tr><th className="px-3 py-2">Target</th><th className="px-3 py-2">Group</th><th className="px-3 py-2">Attempts</th><th className="px-3 py-2">Failures</th><th className="px-3 py-2">Auth</th><th className="px-3 py-2">Missing sender</th><th className="px-3 py-2">Last reason</th></tr></thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {raftTransport.targets.map((target, index) => (
                            <tr key={`${target.groupId || "group"}-${target.targetNodeId || index}`}>
                              <td className="px-3 py-2">{raftNodeLabel(target.targetNodeId, runtime)}</td>
                              <td className="px-3 py-2 font-mono">{target.groupId || "—"}</td>
                              <td className="px-3 py-2">{target.sendAttempts}</td>
                              <td className="px-3 py-2">{target.sendFailures}</td>
                              <td className="px-3 py-2">{target.authFailures}</td>
                              <td className="px-3 py-2">{target.missingSenderFailures}</td>
                              <td className="px-3 py-2">{target.lastFailureReason || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {isRaft && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-semibold">Raft diagnostics</Text>
                  <Text size="sm" intent="muted" className="mt-1">Read-only checks derived from current runtime and group status.</Text>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {raftDiagnostics.map((check) => (
                      <div key={check.label} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800">
                        <div><Text className="font-medium">{check.label}</Text><Text size="xs" intent="muted">{check.detail}</Text></div>
                        <StatusBadge value={check.ok ? "pass" : "fail"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isRaft && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Text className="font-semibold">Snapshot and compaction guidance</Text>
                      <Text size="sm" intent="muted" className="mt-1">Read-only visibility for raft snapshot indexes and current production compaction boundaries.</Text>
                    </div>
                    <StatusBadge value="read-only" />
                  </div>
                  <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                    <div><span className="text-slate-500">Groups with snapshots</span><div className="font-semibold">{snapshotGroups.length}/{raftGroups.groups.length}</div></div>
                    <div><span className="text-slate-500">Highest snapshot index</span><div className="font-semibold">{snapshotGroups.reduce((max, group) => Math.max(max, group.snapshotIndex), 0) || "—"}</div></div>
                    <div><span className="text-slate-500">Compaction mode</span><div className="font-semibold">off / conservative</div></div>
                  </div>
                  {snapshotGroups.length > 0 ? (
                    <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      Snapshot indexes observed: {snapshotGroups.slice(0, 8).map((group) => `${group.groupId}@${group.snapshotIndex}`).join(", ")}{snapshotGroups.length > 8 ? " …" : ""}
                    </div>
                  ) : (
                    <Text size="sm" intent="muted" className="mt-3">No raft groups currently report a nonzero snapshot index.</Text>
                  )}
                  <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    Automatic production raft compaction remains off/conservative. Initial Phase B2 subsystem snapshots exist, but forced snapshot-only recovery and production auto-compaction still require snapshot-install, atomic-restore, release-gate, and soak validation.
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <pre className="rounded-md bg-slate-950 px-3 py-2 text-xs text-slate-100">{snapshotGuidanceCommands}</pre>
                    <Button type="button" variant="secondary" onClick={() => void copyText(snapshotGuidanceCommands).then(() => setClusterCommandMessage("Snapshot guidance commands copied")).catch((err) => setClusterCommandMessage(err instanceof Error ? err.message : String(err)))}>Copy commands</Button>
                    {clusterCommandMessage && <Text size="sm" intent="muted">{clusterCommandMessage}</Text>}
                  </div>
                </div>
              )}

              {isRaft && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text className="font-semibold">Space route lookup</Text>
                  <Text size="sm" intent="muted" className="mt-1">Resolve a canonical space ID to its Raft partition and leader.</Text>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input aria-label="space id route lookup" className="min-w-80 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950" placeholder="space UUID" value={routeSpaceId} onChange={(event) => setRouteSpaceId(event.target.value)} />
                    <Button type="button" variant="secondary" onClick={() => void runRouteLookup()} disabled={routeLoading}>{routeLoading ? "Looking up…" : "Lookup route"}</Button>
                  </div>
                  {routeError && <Text size="sm" className="mt-2 text-rose-600 dark:text-rose-300">{routeError}</Text>}
                  {routeResult && (
                    <div className="mt-3 grid gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-800 md:grid-cols-4">
                      <div><span className="text-slate-500">Partition</span><div className="font-semibold">{routeResult.partitionId}</div></div>
                      <div><span className="text-slate-500">Leader</span><div className="font-semibold">{raftNodeLabel(routeResult.leaderNodeId, runtime)}</div></div>
                      <div><span className="text-slate-500">Replicas</span><div className="font-semibold">{routeResult.replicaNodeIds.map((id) => raftNodeLabel(id, runtime)).join(", ") || "—"}</div></div>
                      <div><span className="text-slate-500">Space</span><div className="break-all font-mono text-xs">{routeResult.spaceId}</div></div>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text size="sm" intent="subtle" className="uppercase tracking-wide">Mode</Text>
                  <div className="mt-3"><StatusBadge value={status.cluster.mode} /></div>
                  <Text size="sm" intent="muted" className="mt-3">{status.cluster.clusterName || "Unnamed cluster"}</Text>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text size="sm" intent="subtle" className="uppercase tracking-wide">Local node</Text>
                  <Text className="mt-2 font-semibold">{status.node.nodeName || status.node.nodeId}</Text>
                  <div className="mt-2 flex flex-wrap gap-2"><StatusBadge value={status.node.state} /></div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text size="sm" intent="subtle" className="uppercase tracking-wide">Peers</Text>
                  <Text className="mt-2 text-2xl font-semibold">{status.peers.length}</Text>
                  <Text size="sm" intent="muted">{countPeers(status.peers, "active")} active · {countPeers(status.peers, "unreachable")} unreachable</Text>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text size="sm" intent="subtle" className="uppercase tracking-wide">Members</Text>
                  <Text className="mt-2 text-2xl font-semibold">{membership?.members.length || 0}</Text>
                  <Text size="sm" intent="muted">{countMembers(membership, "active")} active · {countMembers(membership, "pending")} pending</Text>
                </div>
              </div>

              {warnings.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                  <Text className="font-semibold text-amber-900 dark:text-amber-100">Warnings</Text>
                  <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                    {warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                </div>
              )}

              {membershipError && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
                  <Text className="font-semibold text-amber-900 dark:text-amber-100">Membership unavailable</Text>
                  <Text size="sm" className="mt-1 text-amber-800 dark:text-amber-200">{membershipError}</Text>
                </div>
              )}
            </div>
          )}

          {activeTab === "consistency" && (
            <div className="space-y-6" role="tabpanel" aria-label="Consistency">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Text className="font-semibold">Graph consistency diagnostics</Text>
                <Text size="sm" intent="muted" className="mt-1">Consistency reports are read-only latest-state evidence. They do not repair, merge, delete, overwrite, or rebalance data.</Text>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input aria-label="consistency space id" className="min-w-72 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950" placeholder="space ID" value={consistencySpaceId} onChange={(event) => setConsistencySpaceId(event.target.value)} />
                  <input aria-label="consistency domain id" className="min-w-72 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950" placeholder="domain ID" value={consistencyDomainId} onChange={(event) => setConsistencyDomainId(event.target.value)} />
                  <Button type="button" variant="secondary" onClick={() => void runLocalConsistency()} disabled={Boolean(consistencyLoading)}>{consistencyLoading === "local" ? "Checking…" : "Run local check"}</Button>
                  <Button type="button" variant="secondary" onClick={() => void runClusterConsistency()} disabled={Boolean(consistencyLoading)}>{consistencyLoading === "cluster" ? "Collecting…" : "Run cluster report"}</Button>
                </div>
                {consistencyError && <Text size="sm" className="mt-2 text-rose-600 dark:text-rose-300">{consistencyError}</Text>}
              </div>

              {localConsistency && (
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><Text className="font-semibold">Local latest-state check</Text><Text size="sm" intent="muted" className="mt-1">One daemon only; not cluster-wide proof.</Text></div>
                    {localConsistency.raftGroup && <StatusBadge value={localConsistency.raftGroup.health} />}
                  </div>
                  {localConsistency.stats ? <div className="mt-4"><StatsGrid stats={localConsistency.stats} /></div> : <Text intent="muted" className="mt-3">No local stats returned.</Text>}
                  {localConsistency.raftGroup && <Text size="sm" intent="muted" className="mt-3">Raft group {localConsistency.raftGroup.groupId}; leader {raftNodeLabel(localConsistency.raftGroup.leaderNodeId, runtime)}; applied {localConsistency.raftGroup.appliedIndex}; commit {localConsistency.raftGroup.commitIndex}</Text>}
                  {localConsistency.warnings.length > 0 && <ul className="mt-3 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">{localConsistency.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                </div>
              )}

              {clusterConsistency && (
                <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><Text className="font-semibold">Cluster consistency report</Text><Text size="sm" intent="muted" className="mt-1">Status compares latest-state checksums from expected Raft replicas.</Text></div>
                    <StatusBadge value={clusterConsistency.status} />
                  </div>
                  <div className="grid gap-3 text-sm md:grid-cols-5">
                    <div><span className="text-slate-500">Partition</span><div className="font-semibold">{clusterConsistency.partitionId}</div></div>
                    <div><span className="text-slate-500">Local node</span><div className="font-semibold">{raftNodeLabel(clusterConsistency.localNodeId, runtime)}</div></div>
                    <div><span className="text-slate-500">Leader</span><div className="font-semibold">{raftNodeLabel(clusterConsistency.leaderNodeId, runtime)}</div></div>
                    <div><span className="text-slate-500">Expected replicas</span><div className="font-semibold">{clusterConsistency.expectedReplicaNodeIds.map((id) => raftNodeLabel(id, runtime)).join(", ") || "—"}</div></div>
                    <div><span className="text-slate-500">Comparison basis</span><div className="font-semibold">{clusterConsistency.comparisonBasis || "—"}</div></div>
                  </div>
                  {clusterConsistency.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
                      <Text className="font-semibold text-amber-900 dark:text-amber-100">Warnings</Text>
                      <ul className="mt-2 list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">
                        {clusterConsistency.warnings.map((warning) => <li key={`${warning.code || warning.message}-${warning.raftNodeId || "cluster"}`}><StatusBadge value={warning.severity} /> <span className="ml-2">{warning.code ? `${warning.code}: ` : ""}{warning.message}</span></li>)}
                      </ul>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                      <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400"><tr><th className="px-3 py-2">Replica</th><th className="px-3 py-2">Reachable</th><th className="px-3 py-2">Revision</th><th className="px-3 py-2">Nodes</th><th className="px-3 py-2">Edges</th><th className="px-3 py-2">Graph checksum</th><th className="px-3 py-2">Error</th></tr></thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {clusterConsistency.replicas.map((replica) => (
                          <tr key={`${replica.raftNodeId || replica.nodeId || replica.backendAddr || "replica"}`}>
                            <td className="px-3 py-2">{raftNodeLabel(replica.raftNodeId, runtime)}{replica.local ? " (local)" : ""}<div className="text-xs text-slate-500">{replica.nodeName || replica.backendAddr || replica.nodeId || "—"}</div></td>
                            <td className="px-3 py-2"><StatusBadge value={replica.reachable ? "pass" : "fail"} /></td>
                            <td className="px-3 py-2">{replica.stats?.revision ?? "—"}</td>
                            <td className="px-3 py-2">{replica.stats?.nodeCount ?? "—"}</td>
                            <td className="px-3 py-2">{replica.stats?.edgeCount ?? "—"}</td>
                            <td className="px-3 py-2 break-all font-mono text-xs">{replica.stats?.graphChecksum || "—"}</td>
                            <td className="px-3 py-2 break-all font-mono text-xs">{replica.error || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <Text className="font-semibold">Local forensic export</Text>
                <Text size="sm" intent="muted" className="mt-1">Forensic export is read-only and page-bounded. If truncated, collect every page before drawing repair conclusions. Use manual repair workflows outside this UI.</Text>
                <div className="mt-4 flex flex-wrap gap-2">
                  <input aria-label="forensic source label" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="source label" value={forensicSourceLabel} onChange={(event) => setForensicSourceLabel(event.target.value)} />
                  <input aria-label="forensic page size" className="w-32 rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" min={1} type="number" value={forensicPageSize} onChange={(event) => setForensicPageSize(Number(event.target.value) || 100)} />
                  <input aria-label="forensic page token" className="min-w-72 rounded border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-950" placeholder="page token" value={forensicPageToken} onChange={(event) => setForensicPageToken(event.target.value)} />
                  <Button type="button" variant="secondary" onClick={() => void runForensicExport()} disabled={Boolean(consistencyLoading)}>{consistencyLoading === "forensic" ? "Exporting…" : "Run forensic export"}</Button>
                </div>
                {forensicMessage && <Text size="sm" className="mt-2 text-emerald-700 dark:text-emerald-300">{forensicMessage}</Text>}
                {forensicExport && (
                  <div className="mt-4 space-y-4">
                    {forensicExport.truncated && <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Export response is truncated. Collect every page before drawing conclusions.</div>}
                    <div className="grid gap-3 text-sm md:grid-cols-5">
                      <div><span className="text-slate-500">Report</span><div className="break-all font-mono text-xs">{forensicExport.manifest?.reportId || "—"}</div></div>
                      <div><span className="text-slate-500">Source node</span><div className="font-semibold">{forensicExport.manifest?.sourceNodeName || forensicExport.manifest?.sourceNodeId || "—"}</div></div>
                      <div><span className="text-slate-500">Collected</span><div className="font-semibold">{formatTime(forensicExport.manifest?.collectedAt)}</div></div>
                      <div><span className="text-slate-500">Nodes in page</span><div className="font-semibold">{forensicExport.nodes.length}</div></div>
                      <div><span className="text-slate-500">Edges in page</span><div className="font-semibold">{forensicExport.edges.length}</div></div>
                    </div>
                    {forensicExport.stats && <StatsGrid stats={forensicExport.stats} />}
                    {forensicExport.warnings.length > 0 && <ul className="list-disc pl-5 text-sm text-amber-800 dark:text-amber-200">{forensicExport.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="secondary" onClick={() => void copyText(forensicExportJson(forensicExport)).then(() => setForensicMessage("Forensic JSON copied to clipboard")).catch((err) => setConsistencyError(err instanceof Error ? err.message : String(err)))}>Copy JSON</Button>
                      <Button type="button" variant="secondary" onClick={() => downloadJson(`${forensicExport.manifest?.reportId || "graph-forensic-export"}.json`, forensicExportJson(forensicExport))}>Download JSON</Button>
                      {forensicExport.nextPageToken && <Button type="button" variant="secondary" onClick={() => void runForensicExport(forensicExport.nextPageToken)}>Fetch next page</Button>}
                    </div>
                    <Text size="sm" intent="muted">Next page token: <span className="font-mono">{forensicExport.nextPageToken || "—"}</span></Text>
                    <pre className="max-h-72 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{forensicExportJson(forensicExport)}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "events" && <ClusterEventLog events={events} />}

          {activeTab === "topology" && isRaft && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" role="tabpanel" aria-label="Raft groups">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><Text className="font-semibold">Raft groups</Text><Text size="sm" intent="muted" className="mt-1">System metadata and space partitions by leader, apply lag, snapshot, and read-index status.</Text></div>
                  <div className="flex flex-wrap gap-2">
                    <select aria-label="raft group status filter" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" value={raftGroupStatusFilter} onChange={(event) => setRaftGroupStatusFilter(event.target.value)}>
                      <option value="all">All</option>
                      <option value="unhealthy">Unhealthy</option>
                      <option value="no_leader">No leader</option>
                      <option value="lagging">Lagging</option>
                      <option value="read_failures">Read failures</option>
                      <option value="has_snapshot">Has snapshot</option>
                    </select>
                    <input aria-label="filter raft groups" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Filter groups…" value={raftGroupFilter} onChange={(event) => setRaftGroupFilter(event.target.value)} />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                    <tr><th className="px-4 py-3">Health</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Group</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Leader</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Commit</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Lag</th><th className="px-4 py-3">Last</th><th className="px-4 py-3">Snapshot</th><th className="px-4 py-3">Read failures</th><th className="px-4 py-3">Preferred</th><th className="px-4 py-3">Replicas</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredRaftGroups.map((group) => (
                      <tr key={group.groupId}>
                        <td className="px-4 py-3"><StatusBadge value={group.health} /></td>
                        <td className="px-4 py-3">{group.healthReason || "—"}</td>
                        <td className="px-4 py-3 font-mono">{group.groupId}</td>
                        <td className="px-4 py-3">{group.kind}{group.partitionId !== undefined ? ` ${group.partitionId}` : ""}</td>
                        <td className="px-4 py-3">{raftNodeLabel(group.leaderNodeId, runtime)}</td>
                        <td className="px-4 py-3">{group.term || "—"}</td>
                        <td className="px-4 py-3">{group.commitIndex || "—"}</td>
                        <td className="px-4 py-3">{group.appliedIndex || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge value={group.applyLag > 0 ? "lagging" : "pass"} /> <span className="ml-1">{group.applyLag || 0}</span></td>
                        <td className="px-4 py-3">{group.lastIndex || "—"}</td>
                        <td className="px-4 py-3">{group.snapshotIndex || "—"}</td>
                        <td className="px-4 py-3">{groupHasReadFailures(group) ? <StatusBadge value="fail" /> : <StatusBadge value="pass" />} <span className="ml-1">{groupReadFailureCount(group)}</span>{group.readDiagnostics?.lastFailureReason ? <div className="mt-1 text-xs text-slate-500">{group.readDiagnostics.lastFailureReason}</div> : null}</td>
                        <td className="px-4 py-3">{raftNodeLabel(group.preferredLeaderNodeId, runtime)}</td>
                        <td className="px-4 py-3">{group.replicaNodeIds.map((id) => raftNodeLabel(id, runtime)).join(", ") || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "topology" && !isRaft && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" role="tabpanel" aria-label="Topology">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <Text className="font-semibold">Peers / topology</Text>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">State</th>
                      <th className="px-4 py-3">Responsibility</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Backend address</th>
                      <th className="px-4 py-3">Source</th>
                      <th className="px-4 py-3">Last seen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {status.peers.map((peer) => {
                      const nodeKey = encodeURIComponent(peer.nodeId || peer.nodeName || peer.backendAdvertiseAddr);
                      return (
                      <tr key={`${peer.nodeId || peer.backendAdvertiseAddr}-${peer.state}`}>
                        <td className="px-4 py-3"><StatusBadge value={peer.state} /></td>
                        <td className="px-4 py-3"><StatusBadge value={topologyResponsibility(peer)} /></td>
                        <td className="px-4 py-3">
                          <Link className="font-medium text-sky-700 hover:underline dark:text-sky-300" to={`/cluster/nodes/${nodeKey}`}>{peer.nodeName || "View node"}</Link>
                          <div className="font-mono text-xs text-slate-500">{peer.nodeId || "—"}</div>
                        </td>
                        <td className="px-4 py-3 font-mono">{peer.backendAdvertiseAddr}</td>
                        <td className="px-4 py-3">{peer.source}</td>
                        <td className="px-4 py-3">{formatTime(peer.lastSeenAt)}</td>
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
