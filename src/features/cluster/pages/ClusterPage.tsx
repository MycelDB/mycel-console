import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getClusterHealth, getClusterRuntimeStatus, getClusterStatus, listClusterMembers, listRaftGroups, lookupSpaceRoute } from "../../../services/adminService";
import type { ClusterHealthInfo, ClusterPeerInfo, ClusterRuntimeStatusInfo, ClusterStatusInfo, ListClusterMembersResponse, ListRaftGroupsResponse, LookupSpaceRouteResult } from "../../../types/cluster";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { ClusterEventLog, clusterEventsFromState } from "../components/ClusterEventLog";

function badgeClass(value: string) {
  switch (value) {
    case "clustered":
    case "active":
    case "self":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "standalone":
      return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
    case "unreachable":
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    default:
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200";
  }
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(value)}`}>{value}</span>;
}

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
  const [routeSpaceId, setRouteSpaceId] = useState("");
  const [routeResult, setRouteResult] = useState<LookupSpaceRouteResult | null>(null);
  const [routeError, setRouteError] = useState("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "topology" | "events">("general");
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
  const systemGroup = raftGroups.groups.find((group) => group.kind === "system");
  const partitionGroups = raftGroups.groups.filter((group) => group.kind === "partition");
  const partitionLeaders = partitionGroups.filter((group) => group.leaderNodeId).length;
  const filteredRaftGroups = raftGroups.groups.filter((group) => {
    const filter = raftGroupFilter.trim().toLowerCase();
    if (!filter) return true;
    return group.groupId.toLowerCase().includes(filter) || group.kind.toLowerCase().includes(filter) || String(group.partitionId ?? "").includes(filter) || String(group.leaderNodeId ?? "").includes(filter);
  });
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
          <H2>Cluster</H2>
          <Text intent="muted">Inspect cluster engine, Raft status, local node identity, and known peers.</Text>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={() => void load()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
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
              {runtime && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900 dark:bg-sky-950/30">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <Text size="sm" intent="subtle" className="uppercase tracking-wide">Cluster engine</Text>
                    </div>
                    <Text size="sm" intent="muted">{runtime.clusterName || status.cluster.clusterName || "Unnamed cluster"}</Text>
                  </div>
                  {isRaft && (
                    <div className="mt-4 grid gap-3 text-sm md:grid-cols-5">
                      <div><span className="text-slate-500">Local Raft node</span><div className="font-semibold">{runtime.localRaftNodeId || "—"}</div></div>
                      <div><span className="text-slate-500">Nodes</span><div className="font-semibold">{runtime.raftNodeCount}</div></div>
                      <div><span className="text-slate-500">Partitions</span><div className="font-semibold">{runtime.raftPartitionCount}</div></div>
                      <div><span className="text-slate-500">Replica factor</span><div className="font-semibold">{runtime.raftReplicaFactor}</div></div>
                      <div><span className="text-slate-500">Groups with leader</span><div className="font-semibold">{runtime.raftGroupsWithLeader}/{runtime.raftGroupCount}</div></div>
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

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <Text size="sm" intent="subtle" className="uppercase tracking-wide">Cluster ID</Text>
                  <Text className="mt-2 break-all font-mono text-sm">{status.cluster.clusterId || "—"}</Text>
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

          {activeTab === "events" && <ClusterEventLog events={events} />}

          {activeTab === "topology" && isRaft && (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" role="tabpanel" aria-label="Raft groups">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><Text className="font-semibold">Raft groups</Text><Text size="sm" intent="muted" className="mt-1">System metadata and space partitions by leader.</Text></div>
                  <input aria-label="filter raft groups" className="rounded border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950" placeholder="Filter groups…" value={raftGroupFilter} onChange={(event) => setRaftGroupFilter(event.target.value)} />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                    <tr><th className="px-4 py-3">Health</th><th className="px-4 py-3">Group</th><th className="px-4 py-3">Kind</th><th className="px-4 py-3">Leader</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Commit</th><th className="px-4 py-3">Applied</th><th className="px-4 py-3">Lag</th><th className="px-4 py-3">Preferred</th><th className="px-4 py-3">Replicas</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredRaftGroups.map((group) => (
                      <tr key={group.groupId}>
                        <td className="px-4 py-3"><StatusBadge value={group.health} /></td>
                        <td className="px-4 py-3 font-mono">{group.groupId}</td>
                        <td className="px-4 py-3">{group.kind}{group.partitionId !== undefined ? ` ${group.partitionId}` : ""}</td>
                        <td className="px-4 py-3">{raftNodeLabel(group.leaderNodeId, runtime)}</td>
                        <td className="px-4 py-3">{group.term || "—"}</td>
                        <td className="px-4 py-3">{group.commitIndex || "—"}</td>
                        <td className="px-4 py-3">{group.appliedIndex || "—"}</td>
                        <td className="px-4 py-3">{group.applyLag || 0}</td>
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
