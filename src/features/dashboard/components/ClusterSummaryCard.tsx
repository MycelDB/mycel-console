import { useEffect, useState } from "react";
import { Text } from "../../../components/typography";
import {
  getClusterHealth as defaultGetClusterHealth,
  getClusterRuntimeStatus as defaultGetClusterRuntimeStatus,
  getClusterSpaceDistribution as defaultGetClusterSpaceDistribution,
  getClusterStatus as defaultGetClusterStatus,
  listRaftGroups as defaultListRaftGroups,
} from "../../../services/adminService";
import { SpaceDistributionCard } from "../../cluster/components/SpaceDistributionCard";
import type { ClusterHealthInfo, ClusterReadinessInfo, ClusterRuntimeStatusInfo, ClusterSpaceDistributionInfo, ClusterStatusInfo, ListRaftGroupsResponse } from "../../../types/cluster";

export type ClusterSummaryCardProps = {
  addr: string;
  getClusterRuntimeStatusService?: () => Promise<ClusterRuntimeStatusInfo>;
  getClusterStatusService?: () => Promise<ClusterStatusInfo>;
  getClusterHealthService?: () => Promise<ClusterHealthInfo>;
  listRaftGroupsService?: () => Promise<ListRaftGroupsResponse>;
  getClusterSpaceDistributionService?: (runtime: ClusterRuntimeStatusInfo) => Promise<ClusterSpaceDistributionInfo>;
};

export function ClusterSummaryCard({
  addr,
  getClusterRuntimeStatusService = defaultGetClusterRuntimeStatus,
  getClusterStatusService = defaultGetClusterStatus,
  getClusterHealthService = defaultGetClusterHealth,
  listRaftGroupsService = defaultListRaftGroups,
  getClusterSpaceDistributionService = defaultGetClusterSpaceDistribution,
}: ClusterSummaryCardProps) {
  const [runtime, setRuntime] = useState<ClusterRuntimeStatusInfo | null>(null);
  const [status, setStatus] = useState<ClusterStatusInfo | null>(null);
  const [health, setHealth] = useState<ClusterHealthInfo | null>(null);
  const [raftGroups, setRaftGroups] = useState<ListRaftGroupsResponse | null>(null);
  const [distribution, setDistribution] = useState<ClusterSpaceDistributionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributionError, setDistributionError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setRuntime(null);
      setStatus(null);
      setHealth(null);
      setRaftGroups(null);
      setDistribution(null);
      setDistributionError("");
      setErrors([]);
      const nextErrors: string[] = [];

      const [runtimeResult, statusResult, healthResult] = await Promise.allSettled([
        getClusterRuntimeStatusService(),
        getClusterStatusService(),
        getClusterHealthService(),
      ]);
      if (cancelled) return;

      let runtimeResponse: ClusterRuntimeStatusInfo | null = null;
      if (runtimeResult.status === "fulfilled") {
        runtimeResponse = runtimeResult.value;
        setRuntime(runtimeResponse);
      } else {
        nextErrors.push(messageFromError(runtimeResult.reason, "Cluster runtime unavailable"));
      }
      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
      } else {
        nextErrors.push(messageFromError(statusResult.reason, "Cluster status unavailable"));
      }
      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        nextErrors.push(messageFromError(healthResult.reason, "Cluster health unavailable"));
      }

      const clustered = isClusteredRuntime(runtimeResponse);
      if (clustered && runtimeResponse) {
        const [groupsResult, distributionResult] = await Promise.allSettled([
          listRaftGroupsService(),
          getClusterSpaceDistributionService(runtimeResponse),
        ]);
        if (cancelled) return;
        if (groupsResult.status === "fulfilled") {
          setRaftGroups(groupsResult.value);
        } else {
          nextErrors.push(messageFromError(groupsResult.reason, "Raft group status unavailable"));
        }
        if (distributionResult.status === "fulfilled") {
          setDistribution(distributionResult.value);
        } else {
          setDistributionError(messageFromError(distributionResult.reason, "Space distribution unavailable"));
        }
      }

      setErrors(nextErrors);
      setLoading(false);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [getClusterRuntimeStatusService, getClusterStatusService, getClusterHealthService, listRaftGroupsService, getClusterSpaceDistributionService]);

  const clustered = isClusteredRuntime(runtime) || status?.cluster.mode === "clustered";
  const readiness = status?.readiness || health?.readiness;
  const mode = loading && !runtime ? "Loading…" : runtime ? modeLabel(runtime, status) : "Unavailable";
  const readinessLabel = readiness ? (readiness.clientReady ? "Ready" : "Blocked") : loading ? "Loading…" : "Unknown";
  const healthLabel = health?.status ? labelize(health.status) : loading ? "Loading…" : "Unknown";
  const nodeValue = nodeCountLabel(clustered, runtime, health, readiness);
  const leaderValue = raftGroups
    ? `${raftGroups.groups.filter((group) => Boolean(group.leaderNodeId)).length}/${raftGroups.groups.length}`
    : runtime && clustered
      ? `${runtime.raftGroupsWithLeader || 0}/${runtime.raftGroupCount || expectedRaftGroupCount(runtime) || "—"}`
      : "—";

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
        Deployment topology
      </Text>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Endpoint</dt>
          <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{addr}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Mode" value={mode} />
          <Metric label="Readiness" value={readinessLabel} tone={readiness?.clientReady ? "success" : readiness ? "danger" : "neutral"} />
          <Metric label="Health" value={healthLabel} tone={health?.status === "healthy" ? "success" : health?.status ? "warning" : "neutral"} />
          <Metric label="Nodes" value={nodeValue} />
        </div>
        {clustered && runtime ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric label="Partitions" value={runtime.raftPartitionCount || "—"} />
            <Metric label="Replica factor" value={runtime.raftReplicaFactor || "—"} />
            <Metric label="Raft leaders" value={leaderValue} tone={leaderValueComplete(leaderValue) ? "success" : "warning"} />
            <Metric label="Local raft node" value={runtime.localRaftNodeId || "—"} />
          </div>
        ) : null}
        {readiness?.readinessBlockers?.length ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="font-medium">Readiness blockers</div>
            <ul className="mt-1 list-disc pl-5">
              {readiness.readinessBlockers.slice(0, 3).map((blocker) => <li key={blocker}>{blocker}</li>)}
            </ul>
          </div>
        ) : null}
        {errors.length ? <div className="text-sm text-amber-700 dark:text-amber-300">{errors.join("; ")}</div> : null}
      </dl>
      {clustered ? <div className="mt-4"><SpaceDistributionCard distribution={distribution} error={distributionError} compact /></div> : null}
    </article>
  );
}

function isClusteredRuntime(runtime: ClusterRuntimeStatusInfo | null) {
  return Boolean(runtime && (runtime.engine === "raft" || runtime.raftNodeCount > 1 || runtime.raftPartitionCount > 0));
}

function modeLabel(runtime: ClusterRuntimeStatusInfo, status: ClusterStatusInfo | null) {
  if (runtime.engine === "raft") return "Clustered Raft";
  if (runtime.engine === "static" || status?.cluster.mode === "standalone") return "Standalone";
  if (status?.cluster.mode === "clustered") return "Clustered";
  return labelize(runtime.engine || "unknown");
}

function nodeCountLabel(clustered: boolean, runtime: ClusterRuntimeStatusInfo | null, health: ClusterHealthInfo | null, readiness?: ClusterReadinessInfo) {
  if (!clustered) return "1";
  const expected = runtime?.raftNodeCount || readiness?.expectedMemberCount || 0;
  if (health) return `${health.activeMembers}/${expected || "—"}`;
  return expected || runtime?.raftNodeAddrs.length || "—";
}

function expectedRaftGroupCount(runtime: ClusterRuntimeStatusInfo) {
  return runtime.raftPartitionCount > 0 ? runtime.raftPartitionCount + 1 : 0;
}

function leaderValueComplete(value: string | number) {
  const [ready, total] = String(value).split("/").map((item) => Number(item));
  return Number.isFinite(ready) && Number.isFinite(total) && total > 0 && ready === total;
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function messageFromError(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : typeof err === "string" ? err : fallback;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "warning" | "danger" }) {
  const toneClass = tone === "success"
    ? "text-emerald-700 dark:text-emerald-300"
    : tone === "warning"
      ? "text-amber-700 dark:text-amber-300"
      : tone === "danger"
        ? "text-rose-700 dark:text-rose-300"
        : "text-slate-900 dark:text-slate-100";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={["mt-1 text-lg font-semibold", toneClass].join(" ")}>{value}</dd>
    </div>
  );
}
