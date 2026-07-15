import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addClusterNode, getClusterStatus, listClusterMembers } from "../../../services/adminService";
import type { ClusterPeerInfo, ClusterStatusInfo, ListClusterMembersResponse } from "../../../types/cluster";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { AddClusterNodeModal } from "../components/AddClusterNodeModal";
import { ClusterEventLog, clusterEventsFromState } from "../components/ClusterEventLog";
import { MembershipTable } from "../components/MembershipTable";

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

export function ClusterPage() {
  const [status, setStatus] = useState<ClusterStatusInfo | null>(null);
  const [membership, setMembership] = useState<ListClusterMembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [membershipError, setMembershipError] = useState("");
  const [addNodeOpen, setAddNodeOpen] = useState(false);

  async function load() {
    setError("");
    setLoading(true);
    try {
      setMembershipError("");
      const clusterStatus = await getClusterStatus();
      const members = await listClusterMembers().catch((err) => {
        setMembershipError(err instanceof Error ? err.message : "Membership is unavailable");
        return null;
      });
      setStatus(clusterStatus);
      setMembership(members);
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

  const canAddNode = Boolean(status?.node.admitted && status.cluster.mode === "clustered");

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
          <Text intent="muted">Inspect local clustering mode, node identity, and known peers.</Text>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setAddNodeOpen(true)} disabled={!canAddNode} title={!canAddNode ? "Add Node requires an admitted clustered daemon" : undefined}>
            Add Node
          </Button>
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

          {status.cluster.mode === "clustered" && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
              <Text className="font-semibold text-amber-900 dark:text-amber-100">Development-stage cluster controls</Text>
              <Text size="sm" className="mt-1 text-amber-800 dark:text-amber-200">Cluster admission actions currently use internal daemon-to-daemon APIs. Production exposure should move these behind authenticated admin APIs with node credential enforcement.</Text>
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
              <div className="mt-2"><StatusBadge value={status.node.state} /></div>
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

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Text size="sm" intent="subtle" className="uppercase tracking-wide">Cluster ID</Text>
            <Text className="mt-2 break-all font-mono text-sm">{status.cluster.clusterId || "—"}</Text>
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

          {membership && <MembershipTable members={membership.members} />}

          <ClusterEventLog events={events} />

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <Text className="font-semibold">Peers / topology</Text>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">State</th>
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
        </>
      )}
      <AddClusterNodeModal
        open={addNodeOpen}
        cluster={status}
        onClose={() => setAddNodeOpen(false)}
        onAdd={addClusterNode}
        onAdded={() => void load()}
      />
    </section>
  );
}
