import { useEffect, useState } from "react";
import { Text } from "../../../components/typography";
import { getClusterRuntimeStatus as defaultGetClusterRuntimeStatus, getClusterSpaceDistribution as defaultGetClusterSpaceDistribution } from "../../../services/adminService";
import { SpaceDistributionCard } from "../../cluster/components/SpaceDistributionCard";
import type { ClusterRuntimeStatusInfo, ClusterSpaceDistributionInfo } from "../../../types/cluster";

export type ClusterSummaryCardProps = {
  addr: string;
  getClusterRuntimeStatusService?: () => Promise<ClusterRuntimeStatusInfo>;
  getClusterSpaceDistributionService?: (runtime: ClusterRuntimeStatusInfo) => Promise<ClusterSpaceDistributionInfo>;
};

export function ClusterSummaryCard({ addr, getClusterRuntimeStatusService = defaultGetClusterRuntimeStatus, getClusterSpaceDistributionService = defaultGetClusterSpaceDistribution }: ClusterSummaryCardProps) {
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [distribution, setDistribution] = useState<ClusterSpaceDistributionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributionError, setDistributionError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setDistribution(null);
    setDistributionError("");
    getClusterRuntimeStatusService()
      .then(async (response) => {
        if (cancelled) return;
        setRuntime(response);
        const clustered = response.engine === "raft" || response.raftPartitionCount > 0;
        if (clustered) {
          try {
            const nextDistribution = await getClusterSpaceDistributionService(response);
            if (!cancelled) setDistribution(nextDistribution);
          } catch (err) {
            if (!cancelled) setDistributionError(err instanceof Error ? err.message : "Space distribution unavailable");
          }
        }
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
  }, [getClusterRuntimeStatusService, getClusterSpaceDistributionService]);

  const clustered = runtime?.engine === "raft" || (runtime?.raftNodeCount ?? 0) > 1 || (runtime?.raftPartitionCount ?? 0) > 0;
  const mode = loading ? "Loading…" : error ? "Unavailable" : clustered ? "Cluster" : "Standalone";
  const nodeCount = runtime?.raftNodeCount || runtime?.raftNodeAddrs.length || 0;

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
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
          <dd className="mt-1 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
            Connected
          </dd>
        </div>
      </dl>
      {clustered ? <div className="mt-4"><SpaceDistributionCard distribution={distribution} error={distributionError} compact /></div> : null}
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
