import { Text } from "../../../components/typography";
import type { ClusterMemberInfo, ClusterPeerInfo } from "../../../types/cluster";

export type ClusterEvent = {
  id: string;
  time?: string;
  type: string;
  message: string;
};

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function clusterEventsFromState(members: ClusterMemberInfo[] = [], peers: ClusterPeerInfo[] = []): ClusterEvent[] {
  const events: ClusterEvent[] = [];

  for (const member of members) {
    if (member.state === "pending") {
      events.push({
        id: `token-issued-${member.nodeName}-${member.tokenId || member.createdAt || "pending"}`,
        time: member.createdAt || member.updatedAt,
        type: "token_issued",
        message: `Join token issued for ${member.nodeName}`,
      });
    }
    if (member.state === "active") {
      events.push({
        id: `node-active-${member.nodeName}-${member.joinedAt || member.updatedAt || member.nodeId || "active"}`,
        time: member.joinedAt || member.updatedAt,
        type: "node_joined",
        message: `${member.nodeName} joined the cluster`,
      });
    }
    if (member.state === "removed" || member.state === "rejected") {
      events.push({
        id: `node-${member.state}-${member.nodeName}-${member.updatedAt || "state"}`,
        time: member.updatedAt,
        type: `node_${member.state}`,
        message: `${member.nodeName} was ${member.state}`,
      });
    }
  }

  for (const peer of peers) {
    if (peer.state === "unreachable") {
      events.push({
        id: `peer-unreachable-${peer.nodeId || peer.nodeName || peer.backendAdvertiseAddr}-${peer.lastSeenAt || "unknown"}`,
        time: peer.lastSeenAt,
        type: "node_unreachable",
        message: `${peer.nodeName || peer.backendAdvertiseAddr} is unreachable`,
      });
    }
  }

  return events.sort((a, b) => {
    const at = a.time ? new Date(a.time).getTime() : 0;
    const bt = b.time ? new Date(b.time).getTime() : 0;
    return bt - at;
  });
}

export function ClusterEventLog({ events }: { events: ClusterEvent[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Text className="font-semibold">Cluster Events</Text>
        <Text size="sm" intent="muted">
          Derived from the current topology and membership snapshot. A durable event stream can replace this later.
        </Text>
      </div>
      {events.length === 0 ? (
        <Text intent="muted" className="p-4">No cluster events to show.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatTime(event.time)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{event.type}</td>
                  <td className="px-4 py-3">{event.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
