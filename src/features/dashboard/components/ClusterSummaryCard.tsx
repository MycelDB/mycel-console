import { useCallback, useEffect, useState } from "react";
import {
  ErrorGroup,
  Text,
  errorMessage,
  metricToneClass,
  themeClasses,
  useErrorGroup,
  type MetricTone,
} from "../../../components/typography";
import {
  getClusterHealth as defaultGetClusterHealth,
  getClusterRuntimeStatus as defaultGetClusterRuntimeStatus,
  getClusterSpaceDistribution as defaultGetClusterSpaceDistribution,
  getClusterStatus as defaultGetClusterStatus,
  listRaftGroups as defaultListRaftGroups,
} from "../../../services/adminService";
import { SpaceDistributionCard } from "../../cluster/components/SpaceDistributionCard";
import type {
  ClusterHealthInfo,
  ClusterReadinessInfo,
  ClusterRuntimeStatusInfo,
  ClusterSpaceDistributionInfo,
  ClusterStatusInfo,
  ListRaftGroupsResponse,
} from "../../../types/cluster";

export type ClusterSummaryCardProps = {
  addr: string;
  getClusterRuntimeStatusService?: () => Promise<ClusterRuntimeStatusInfo>;
  getClusterStatusService?: () => Promise<ClusterStatusInfo>;
  getClusterHealthService?: () => Promise<ClusterHealthInfo>;
  listRaftGroupsService?: () => Promise<ListRaftGroupsResponse>;
  getClusterSpaceDistributionService?: (
    runtime: ClusterRuntimeStatusInfo,
  ) => Promise<ClusterSpaceDistributionInfo>;
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
  const [raftGroups, setRaftGroups] = useState<ListRaftGroupsResponse | null>(
    null,
  );
  const [distribution, setDistribution] =
    useState<ClusterSpaceDistributionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [distributionError, setDistributionError] = useState("");
  const [failedRequests, setFailedRequests] = useState<Set<string>>(
    () => new Set(),
  );
  const { errors, capture, clear } = useErrorGroup();

  const load = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      setLoading(true);
      setRuntime(null);
      setStatus(null);
      setHealth(null);
      setRaftGroups(null);
      setDistribution(null);
      setDistributionError("");
      setFailedRequests(new Set());
      clear();
      const nextFailedRequests = new Set<string>();

      const [runtimeResult, statusResult, healthResult] =
        await Promise.allSettled([
          getClusterRuntimeStatusService(),
          getClusterStatusService(),
          getClusterHealthService(),
        ]);
      if (isCancelled()) return;

      let runtimeResponse: ClusterRuntimeStatusInfo | null = null;
      if (runtimeResult.status === "fulfilled") {
        runtimeResponse = runtimeResult.value;
        setRuntime(runtimeResponse);
      } else {
        nextFailedRequests.add("cluster.runtime");
        capture(runtimeResult, {
          id: "cluster.runtime",
          source: "Cluster runtime",
          fallback: "Cluster runtime unavailable",
          onRetry: () => void load(),
        });
      }
      if (statusResult.status === "fulfilled") {
        setStatus(statusResult.value);
      } else {
        nextFailedRequests.add("cluster.status");
        capture(statusResult, {
          id: "cluster.status",
          source: "Cluster status",
          fallback: "Cluster status unavailable",
          onRetry: () => void load(),
        });
      }
      if (healthResult.status === "fulfilled") {
        setHealth(healthResult.value);
      } else {
        nextFailedRequests.add("cluster.health");
        capture(healthResult, {
          id: "cluster.health",
          source: "Cluster health",
          fallback: "Cluster health unavailable",
          onRetry: () => void load(),
        });
      }

      const clustered = isClusteredRuntime(runtimeResponse);
      if (clustered && runtimeResponse) {
        const [groupsResult, distributionResult] = await Promise.allSettled([
          listRaftGroupsService(),
          getClusterSpaceDistributionService(runtimeResponse),
        ]);
        if (isCancelled()) return;
        if (groupsResult.status === "fulfilled") {
          setRaftGroups(groupsResult.value);
        } else {
          nextFailedRequests.add("cluster.raftGroups");
          capture(groupsResult, {
            id: "cluster.raftGroups",
            source: "Raft group status",
            fallback: "Raft group status unavailable",
            onRetry: () => void load(),
          });
        }
        if (distributionResult.status === "fulfilled") {
          setDistribution(distributionResult.value);
        } else {
          setDistributionError(
            errorMessage(
              distributionResult.reason,
              "Space distribution unavailable",
            ),
          );
        }
      }

      setFailedRequests(nextFailedRequests);
      setLoading(false);
    },
    [
      capture,
      clear,
      getClusterHealthService,
      getClusterRuntimeStatusService,
      getClusterSpaceDistributionService,
      getClusterStatusService,
      listRaftGroupsService,
    ],
  );

  useEffect(() => {
    let cancelled = false;
    void load(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [load]);

  const clustered =
    isClusteredRuntime(runtime) || status?.cluster.mode === "clustered";
  const readiness = status?.readiness || health?.readiness;
  const mode =
    loading && !runtime
      ? "Loading…"
      : runtime
        ? modeLabel(runtime, status)
        : "Unavailable";
  const readinessLabel = readiness
    ? readiness.clientReady
      ? "Ready"
      : "Blocked"
    : loading
      ? "Loading…"
      : "Unknown";
  const healthLabel = health?.status
    ? labelize(health.status)
    : loading
      ? "Loading…"
      : "Unknown";
  const nodeValue = nodeCountLabel(clustered, runtime, health, readiness);
  const leaderValue = raftGroups
    ? `${raftGroups.groups.filter((group) => Boolean(group.leaderNodeId)).length}/${raftGroups.groups.length}`
    : runtime && clustered
      ? `${runtime.raftGroupsWithLeader || 0}/${runtime.raftGroupCount || expectedRaftGroupCount(runtime) || "—"}`
      : "—";

  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        Deployment topology
      </Text>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
            Endpoint
          </dt>
          <dd className={`mt-1 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
            {addr}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Mode"
            value={mode}
            tone={failedRequests.has("cluster.runtime") ? "danger" : "neutral"}
          />
          <Metric
            label="Readiness"
            value={readinessLabel}
            tone={
              failedRequests.has("cluster.status")
                ? "danger"
                : readiness?.clientReady
                  ? "success"
                  : readiness
                    ? "danger"
                    : "neutral"
            }
          />
          <Metric
            label="Health"
            value={healthLabel}
            tone={
              failedRequests.has("cluster.health")
                ? "danger"
                : healthTone(health?.status)
            }
          />
          <Metric label="Nodes" value={nodeValue} />
        </div>
        {clustered && runtime ? (
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Partitions"
              value={runtime.raftPartitionCount || "—"}
            />
            <Metric
              label="Replica factor"
              value={runtime.raftReplicaFactor || "—"}
            />
            <Metric
              label="Raft leaders"
              value={leaderValue}
              tone={
                failedRequests.has("cluster.raftGroups")
                  ? "danger"
                  : leaderValueComplete(leaderValue)
                    ? "success"
                    : "warning"
              }
            />
            <Metric
              label="Local raft node"
              value={runtime.localRaftNodeId || "—"}
            />
          </div>
        ) : null}
        {readiness?.readinessBlockers?.length ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
            <div className="font-medium">Readiness blockers</div>
            <ul className="mt-1 list-disc pl-5">
              {readiness.readinessBlockers.slice(0, 3).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
              {readiness.readinessBlockers.length > 3 && (
                <li>+{readiness.readinessBlockers.length - 3} more</li>
              )}
            </ul>
          </div>
        ) : null}
        <ErrorGroup
          errors={errors}
          title="Cluster status unavailable"
          onRetryAll={() => void load()}
        />
      </dl>
      {clustered ? (
        <div className="mt-4">
          <SpaceDistributionCard
            distribution={distribution}
            error={distributionError}
            compact
          />
        </div>
      ) : null}
    </article>
  );
}

function isClusteredRuntime(runtime: ClusterRuntimeStatusInfo | null) {
  return Boolean(
    runtime &&
    (runtime.engine === "raft" ||
      runtime.raftNodeCount > 1 ||
      runtime.raftPartitionCount > 0),
  );
}

function modeLabel(
  runtime: ClusterRuntimeStatusInfo,
  status: ClusterStatusInfo | null,
) {
  if (runtime.engine === "raft") return "Clustered Raft";
  if (runtime.engine === "static" || status?.cluster.mode === "standalone")
    return "Standalone";
  if (status?.cluster.mode === "clustered") return "Clustered";
  return labelize(runtime.engine || "unknown");
}

function nodeCountLabel(
  clustered: boolean,
  runtime: ClusterRuntimeStatusInfo | null,
  health: ClusterHealthInfo | null,
  readiness?: ClusterReadinessInfo,
) {
  if (!clustered) return "1";
  const expected =
    runtime?.raftNodeCount || readiness?.expectedMemberCount || 0;
  if (health) return `${health.activeMembers}/${expected || "—"}`;
  return expected || runtime?.raftNodeAddrs.length || "—";
}

function expectedRaftGroupCount(runtime: ClusterRuntimeStatusInfo) {
  return runtime.raftPartitionCount > 0 ? runtime.raftPartitionCount + 1 : 0;
}

function leaderValueComplete(value: string | number) {
  const [ready, total] = String(value)
    .split("/")
    .map((item) => Number(item));
  return (
    Number.isFinite(ready) &&
    Number.isFinite(total) &&
    total > 0 &&
    ready === total
  );
}

function labelize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function healthTone(status?: string) {
  if (!status) return "neutral";
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  return "danger";
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  tone?: MetricTone;
}) {
  const toneClass = metricToneClass(tone);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
        {label}
      </dt>
      <dd className={["mt-1 text-lg font-semibold", toneClass].join(" ")}>
        {value}
      </dd>
    </div>
  );
}
