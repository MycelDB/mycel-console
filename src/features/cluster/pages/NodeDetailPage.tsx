import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getClusterRuntimeStatus, getClusterStatus, listClusterMembers, listRaftGroups } from "../../../services/adminService";
import type { ClusterMemberInfo, ClusterPeerInfo, ClusterRuntimeStatusInfo, ClusterStatusInfo, ListClusterMembersResponse, ListRaftGroupsResponse } from "../../../types/cluster";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function Field({ label, value, mono = false }: { label: string; value?: string | number | boolean; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-slate-200 py-3 last:border-0 dark:border-slate-800 md:grid-cols-3">
      <Text size="sm" intent="subtle" className="uppercase tracking-wide">{label}</Text>
      <Text className={`md:col-span-2 ${mono ? "break-all font-mono text-sm" : ""}`}>{value === undefined || value === "" ? "—" : String(value)}</Text>
    </div>
  );
}

function hostPart(value?: string) {
  return (value || "").split(":")[0].trim();
}

function inferRaftNodeId(key: string, runtime: ClusterRuntimeStatusInfo | null, member?: ClusterMemberInfo, peer?: ClusterPeerInfo) {
  if (!runtime || runtime.engine !== "raft") return undefined;
  const numeric = Number(key);
  if (Number.isInteger(numeric) && numeric > 0) return numeric;
  const names = [member?.nodeName, peer?.nodeName, member?.backendAdvertiseAddr, peer?.backendAdvertiseAddr].filter(Boolean).map((value) => hostPart(value));
  const idx = runtime.raftNodeAddrs.findIndex((addr) => {
    const host = hostPart(addr);
    return names.some((name) => name === host || name?.includes(host) || host.includes(name || "__never__"));
  });
  return idx >= 0 ? idx + 1 : undefined;
}

function matches(key: string, member?: ClusterMemberInfo, peer?: ClusterPeerInfo) {
  return [member?.nodeId, member?.nodeName, peer?.nodeId, peer?.nodeName, peer?.backendAdvertiseAddr]
    .filter(Boolean)
    .some((value) => value === key);
}

export function NodeDetailPage() {
  const { nodeKey = "" } = useParams();
  const [status, setStatus] = useState<ClusterStatusInfo | null>(null);
  const [membership, setMembership] = useState<ListClusterMembersResponse | null>(null);
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [raftGroups, setRaftGroups] = useState<ListRaftGroupsResponse>({ groups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getClusterStatus(), listClusterMembers().catch(() => null), getClusterRuntimeStatus().catch(() => null)])
      .then(async ([clusterStatus, members, clusterRuntime]) => {
        if (cancelled) return;
        setStatus(clusterStatus);
        setMembership(members);
        setRuntime(clusterRuntime);
        if (clusterRuntime?.engine === "raft") setRaftGroups(await listRaftGroups().catch(() => ({ groups: [] })));
        else setRaftGroups({ groups: [] });
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load node detail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [nodeKey]);

  const detail = useMemo(() => {
    const peers = status?.peers || [];
    const members = membership?.members || [];
    const member = members.find((candidate) => matches(nodeKey, candidate));
    const peer = peers.find((candidate) => matches(nodeKey, member, candidate));
    return { member, peer };
  }, [membership, nodeKey, status]);

  if (loading) return <Text intent="muted">Loading node detail…</Text>;

  const title = detail.member?.nodeName || detail.peer?.nodeName || nodeKey;
  const raftNodeId = inferRaftNodeId(nodeKey, runtime, detail.member, detail.peer);
  const ledGroups = raftNodeId ? raftGroups.groups.filter((group) => group.leaderNodeId === raftNodeId) : [];
  const replicatedGroups = raftNodeId ? raftGroups.groups.filter((group) => group.replicaNodeIds.includes(raftNodeId)) : [];
  const systemRole = raftNodeId && raftGroups.groups.find((group) => group.kind === "system")?.leaderNodeId === raftNodeId ? "leader" : raftNodeId ? "replica" : undefined;
  const partitionLeaderCount = ledGroups.filter((group) => group.kind === "partition").length;
  const partitionReplicaCount = replicatedGroups.filter((group) => group.kind === "partition").length;

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300" to="/cluster">← Back to Cluster</Link>
          <H2 className="mt-3">{title}</H2>
          <Text intent="muted">Topology, membership, and Raft responsibility details for this node.</Text>
        </div>
        <Button type="button" variant="secondary" disabled>Future actions</Button>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {!detail.member && !detail.peer ? (
        <ErrorBox>Node not found in current topology or membership view.</ErrorBox>
      ) : (
        <>
        {runtime?.engine === "raft" && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-900 dark:bg-sky-950/30">
            <Text className="font-semibold">Raft responsibilities</Text>
            <div className="mt-3 grid gap-3 text-sm md:grid-cols-5">
              <div><span className="text-slate-500">Raft node ID</span><div className="font-semibold">{raftNodeId || "—"}</div></div>
              <div><span className="text-slate-500">System role</span><div className="font-semibold">{systemRole || "unknown"}</div></div>
              <div><span className="text-slate-500">Partition leaders</span><div className="font-semibold">{partitionLeaderCount}</div></div>
              <div><span className="text-slate-500">Partition replicas</span><div className="font-semibold">{partitionReplicaCount}</div></div>
              <div><span className="text-slate-500">Groups led</span><div className="font-semibold">{ledGroups.length}</div></div>
            </div>
            {raftNodeId && ledGroups.length > 0 && <Text size="sm" intent="muted" className="mt-3">Leading: {ledGroups.slice(0, 8).map((group) => group.groupId).join(", ")}{ledGroups.length > 8 ? " …" : ""}</Text>}
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Field label="Membership state" value={detail.member?.state} />
          <Field label="Topology state" value={detail.peer?.state} />
          <Field label="Node ID" value={detail.member?.nodeId || detail.peer?.nodeId} mono />
          <Field label="Node name" value={title} />
          <Field label="Cluster ID" value={detail.peer?.clusterId || status?.cluster.clusterId} mono />
          <Field label="Cluster name" value={detail.peer?.clusterName || status?.cluster.clusterName} />
          <Field label="Backend address" value={detail.member?.backendAdvertiseAddr || detail.peer?.backendAdvertiseAddr} mono />
          <Field label="Bootstrap" value={detail.member?.clusterBootstrap} />
          <Field label="Source" value={detail.peer?.source} />
          <Field label="Last seen" value={formatTime(detail.peer?.lastSeenAt)} />
          <Field label="Joined at" value={formatTime(detail.member?.joinedAt)} />
          <Field label="Token expires" value={formatTime(detail.member?.tokenExpiresAt)} />
          <Field label="Public key fingerprint" value={detail.member?.nodePublicKeyFingerprint || "not enforced yet"} mono />
        </div>
        </>
      )}
    </section>
  );
}
