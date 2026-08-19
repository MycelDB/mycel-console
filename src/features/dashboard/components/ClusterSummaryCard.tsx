import { useEffect, useState } from "react";
import { Text } from "../../../components/typography";
import { getClusterRuntimeStatus as defaultGetClusterRuntimeStatus } from "../../../services/adminService";
import type { ClusterRuntimeStatusInfo } from "../../../types/cluster";

export type ClusterSummaryCardProps = {
  addr: string;
  getClusterRuntimeStatusService?: () => Promise<ClusterRuntimeStatusInfo>;
};

export function ClusterSummaryCard({ addr, getClusterRuntimeStatusService = defaultGetClusterRuntimeStatus }: ClusterSummaryCardProps) {
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    getClusterRuntimeStatusService()
      .then((response) => {
        if (!cancelled) setRuntime(response);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Cluster runtime unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getClusterRuntimeStatusService]);

  const clustered = runtime?.engine === "raft" || (runtime?.raftNodeCount ?? 0) > 1 || (runtime?.raftPartitionCount ?? 0) > 0;
  const mode = loading ? "Loading…" : error ? "Unavailable" : clustered ? "Cluster" : "Standalone";
  const nodeCount = runtime?.raftNodeCount || runtime?.raftNodeAddrs.length || 0;

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Cluster
      </Text>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Address</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{addr}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Mode</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{mode}</dd>
        </div>
        {clustered && runtime ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Pods / nodes" value={nodeCount || "—"} />
            <Metric label="Partitions" value={runtime.raftPartitionCount || "—"} />
          </div>
        ) : null}
        {error ? <div className="text-sm text-amber-700 dark:text-amber-300">{error}</div> : null}
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Connection state</dt>
          <dd className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-sm font-medium text-emerald-300">
            Connected
          </dd>
        </div>
      </dl>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
