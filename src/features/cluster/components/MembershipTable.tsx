import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";
import type { ClusterMemberInfo } from "../../../types/cluster";

function badgeClass(state: string) {
  switch (state) {
    case "active": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "pending": return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "removed":
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    default: return "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
  }
}

function StateBadge({ state }: { state: string }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(state)}`}>{state}</span>;
}

function formatTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function joinedOrTtl(member: ClusterMemberInfo) {
  if (member.state === "pending") return member.tokenExpiresAt ? `expires ${formatTime(member.tokenExpiresAt)}` : "pending";
  if (member.clusterBootstrap) return "bootstrap";
  return formatTime(member.joinedAt);
}

export function MembershipTable({ members }: { members: ClusterMemberInfo[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Text className="font-semibold">Membership</Text>
        <Text size="sm" intent="muted">Authoritative admission state. Token hashes and plaintext tokens are never shown.</Text>
      </div>
      {members.length === 0 ? (
        <Text intent="muted" className="p-4">No membership records found.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Node ID</th>
                <th className="px-4 py-3">Backend address</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined / TTL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {members.map((member) => {
                const nodeKey = encodeURIComponent(member.nodeId || member.nodeName);
                return (
                <tr key={`${member.nodeName}-${member.nodeId || member.tokenId || member.state}`}>
                  <td className="px-4 py-3"><StateBadge state={member.state} /></td>
                  <td className="px-4 py-3 font-medium"><Link className="text-sky-700 hover:underline dark:text-sky-300" to={`/cluster/nodes/${nodeKey}`}>{member.nodeName}</Link>{member.clusterBootstrap ? " · bootstrap" : ""}</td>
                  <td className="px-4 py-3 font-mono text-xs">{member.nodeId || "—"}</td>
                  <td className="px-4 py-3 font-mono">{member.backendAdvertiseAddr || "—"}</td>
                  <td className="px-4 py-3">{member.role || "—"}</td>
                  <td className="px-4 py-3">{joinedOrTtl(member)}</td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
