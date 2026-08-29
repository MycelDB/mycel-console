import type { ReactNode } from "react";
import { Alert, Text, themeClasses } from "../../../components/typography";
import type { ClusterSpaceDistributionInfo } from "../../../types/cluster";

export function SpaceDistributionCard({
  distribution,
  error,
  loading = false,
  compact = false,
}: {
  distribution: ClusterSpaceDistributionInfo | null;
  error?: string;
  loading?: boolean;
  compact?: boolean;
}) {
  if (loading && !distribution) {
    return (
      <Card compact={compact}>
        <Text intent="muted">Loading space distribution…</Text>
      </Card>
    );
  }
  if (error && !distribution) {
    return (
      <Card compact={compact}>
        <Text className="font-semibold">Space distribution</Text>
        <Alert className="mt-2" icon={false}>
          {error}
        </Alert>
      </Card>
    );
  }
  if (!distribution) return null;

  const maxPartitionSpaces = Math.max(1, distribution.maxPartitionSpaces);
  const maxNodeSpaces = Math.max(
    1,
    ...distribution.nodes.map((node) =>
      Math.max(node.leaderSpaceCount, node.replicaSpaceCount),
    ),
  );
  const balanced =
    distribution.maxPartitionSpaces <=
    Math.max(
      1,
      Math.ceil(
        distribution.totalSpaces / Math.max(1, distribution.partitionCount),
      ) * 2,
    );

  return (
    <Card compact={compact}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text className="font-semibold">Space distribution</Text>
          <Text size="sm" intent="muted" className="mt-1">
            Active spaces by raft partition and serving pod/node.
          </Text>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${balanced ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
        >
          {balanced ? "balanced" : "skewed"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Spaces" value={distribution.totalSpaces} />
        <Metric
          label="Partitions used"
          value={`${distribution.partitionsUsed}/${distribution.partitionCount || "—"}`}
        />
        <Metric
          label="Max / partition"
          value={distribution.maxPartitionSpaces}
        />
        <Metric
          label="Skew"
          value={
            distribution.skewRatio
              ? `${distribution.skewRatio.toFixed(1)}×`
              : "—"
          }
        />
      </div>

      {compact ? (
        <div className="mt-4 space-y-4">
          <PartitionSparkline
            distribution={distribution}
            maxPartitionSpaces={maxPartitionSpaces}
          />
          <CompactNodeBars
            distribution={distribution}
            maxNodeSpaces={maxNodeSpaces}
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.75fr)]">
          <PartitionHeatmap
            distribution={distribution}
            maxPartitionSpaces={maxPartitionSpaces}
          />
          <NodeBars distribution={distribution} maxNodeSpaces={maxNodeSpaces} />
        </div>
      )}

      {distribution.unavailableRoutes > 0 ? (
        <Alert className="mt-3" icon={false} variant="warning">
          {distribution.unavailableRoutes} space route(s) could not be resolved
          and are excluded from the graph.
        </Alert>
      ) : null}
    </Card>
  );
}

function Card({
  children,
  compact,
}: {
  children: ReactNode;
  compact: boolean;
}) {
  return (
    <section
      className={`rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} ${compact ? "p-4" : "p-4"}`}
    >
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <div className={`text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {value}
      </div>
    </div>
  );
}

function PartitionSparkline({
  distribution,
  maxPartitionSpaces,
}: {
  distribution: ClusterSpaceDistributionInfo;
  maxPartitionSpaces: number;
}) {
  return (
    <div>
      <Text size="xs" intent="muted">
        Spaces per partition
      </Text>
      <div
        className="mt-2 flex h-10 items-end gap-1"
        aria-label="Spaces per partition mini chart"
        role="img"
      >
        {distribution.partitions.map((partition) => (
          <span
            key={partition.partitionId}
            className="flex-1 rounded-t bg-sky-500/80 dark:bg-sky-400/80"
            style={{
              height: `${Math.max(8, (partition.spaceCount / maxPartitionSpaces) * 40)}px`,
              opacity: partition.spaceCount > 0 ? 1 : 0.2,
            }}
            title={`Partition ${partition.partitionId}: ${partition.spaceCount} spaces`}
          />
        ))}
      </div>
    </div>
  );
}

function CompactNodeBars({
  distribution,
  maxNodeSpaces,
}: {
  distribution: ClusterSpaceDistributionInfo;
  maxNodeSpaces: number;
}) {
  return (
    <div>
      <Text size="xs" intent="muted">
        Spaces per pod/node
      </Text>
      <div className="mt-2 space-y-2">
        {distribution.nodes.slice(0, 4).map((node) => (
          <div
            key={node.nodeId}
            className="grid grid-cols-[minmax(4rem,0.7fr)_minmax(0,1fr)_auto] items-center gap-2 text-xs"
          >
            <span
              className={`truncate ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkSecondary}`}
              title={node.label}
            >
              {node.label}
            </span>
            <span className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <span
                className="block h-2 rounded-full bg-emerald-500"
                style={{
                  width: `${(node.leaderSpaceCount / maxNodeSpaces) * 100}%`,
                }}
              />
            </span>
            <span className={`font-semibold tabular-nums ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
              {node.leaderSpaceCount}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartitionHeatmap({
  distribution,
  maxPartitionSpaces,
}: {
  distribution: ClusterSpaceDistributionInfo;
  maxPartitionSpaces: number;
}) {
  return (
    <div>
      <Text size="sm" className="font-semibold">
        Spaces per partition
      </Text>
      <div
        className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(2.75rem,1fr))] gap-2"
        aria-label="Spaces per partition heatmap"
        role="img"
      >
        {distribution.partitions.map((partition) => {
          const intensity = partition.spaceCount / maxPartitionSpaces;
          return (
            <div
              key={partition.partitionId}
              className="rounded-lg border border-slate-200 bg-sky-50 p-2 text-center dark:border-slate-800 dark:bg-sky-950/30"
              style={{
                boxShadow: `inset 0 -${Math.round(intensity * 36)}px 0 rgba(14, 165, 233, ${partition.spaceCount ? 0.35 : 0.08})`,
              }}
              title={`Partition ${partition.partitionId}: ${partition.spaceCount} spaces`}
            >
              <div className={`text-[10px] uppercase tracking-wide ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
                p{partition.partitionId}
              </div>
              <div className={`mt-1 text-base font-semibold tabular-nums ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
                {partition.spaceCount}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeBars({
  distribution,
  maxNodeSpaces,
}: {
  distribution: ClusterSpaceDistributionInfo;
  maxNodeSpaces: number;
}) {
  return (
    <div>
      <Text size="sm" className="font-semibold">
        Spaces per pod/node
      </Text>
      <div className="mt-3 space-y-3">
        {distribution.nodes.length > 0 ? (
          distribution.nodes.map((node) => (
            <div key={node.nodeId}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span
                  className={`truncate ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkSecondary}`}
                  title={node.label}
                >
                  {node.label}
                </span>
                <span className={`font-semibold tabular-nums ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
                  {node.leaderSpaceCount} led / {node.replicaSpaceCount}{" "}
                  replicated
                </span>
              </div>
              <div
                className="space-y-1"
                aria-label={`Node ${node.nodeId}: ${node.leaderSpaceCount} leader spaces, ${node.replicaSpaceCount} replica spaces`}
              >
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{
                      width: `${(node.leaderSpaceCount / maxNodeSpaces) * 100}%`,
                    }}
                  />
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-sky-500"
                    style={{
                      width: `${(node.replicaSpaceCount / maxNodeSpaces) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <Text size="sm" intent="muted">
            No raft nodes are available.
          </Text>
        )}
      </div>
      <div className={`mt-3 flex gap-3 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> leader-owned
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-500" /> replica-hosted
        </span>
      </div>
    </div>
  );
}
