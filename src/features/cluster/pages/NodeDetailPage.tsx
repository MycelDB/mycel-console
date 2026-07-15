import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { getClusterStatus, listClusterMembers } from "../../../services/adminService";
import type { ClusterMemberInfo, ClusterPeerInfo, ClusterStatusInfo, ListClusterMembersResponse } from "../../../types/cluster";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function Field({ label, value, mono = false }: { label: string; value?: string | boolean; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-slate-200 py-3 last:border-0 dark:border-slate-800 md:grid-cols-3">
      <Text size="sm" intent="subtle" className="uppercase tracking-wide">{label}</Text>
      <Text className={`md:col-span-2 ${mono ? "break-all font-mono text-sm" : ""}`}>{value === undefined || value === "" ? "—" : String(value)}</Text>
    </div>
  );
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    Promise.all([getClusterStatus(), listClusterMembers().catch(() => null)])
      .then(([clusterStatus, members]) => {
        if (cancelled) return;
        setStatus(clusterStatus);
        setMembership(members);
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

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-300" to="/cluster">← Back to Cluster</Link>
          <H2 className="mt-3">{title}</H2>
          <Text intent="muted">Topology and membership details for this node.</Text>
        </div>
        <Button type="button" variant="secondary" disabled>Future actions</Button>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {!detail.member && !detail.peer ? (
        <ErrorBox>Node not found in current topology or membership view.</ErrorBox>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Field label="Membership state" value={detail.member?.state} />
          <Field label="Topology state" value={detail.peer?.state} />
          <Field label="Node ID" value={detail.member?.nodeId || detail.peer?.nodeId} mono />
          <Field label="Node name" value={title} />
          <Field label="Cluster ID" value={detail.peer?.clusterId || status?.cluster.clusterId} mono />
          <Field label="Cluster name" value={detail.peer?.clusterName || status?.cluster.clusterName} />
          <Field label="Backend address" value={detail.member?.backendAdvertiseAddr || detail.peer?.backendAdvertiseAddr} mono />
          <Field label="Role" value={detail.member?.role} />
          <Field label="Bootstrap" value={detail.member?.clusterBootstrap} />
          <Field label="Source" value={detail.peer?.source} />
          <Field label="Last seen" value={formatTime(detail.peer?.lastSeenAt)} />
          <Field label="Joined at" value={formatTime(detail.member?.joinedAt)} />
          <Field label="Token expires" value={formatTime(detail.member?.tokenExpiresAt)} />
          <Field label="Public key fingerprint" value={detail.member?.nodePublicKeyFingerprint || "not enforced yet"} mono />
        </div>
      )}
    </section>
  );
}
