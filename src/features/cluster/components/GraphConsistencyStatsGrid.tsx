import {
  formatEnumLabel,
  ResourceIdText,
  themeClasses,
} from "../../../components/typography";
import type { LocalGraphConsistencyStatsInfo } from "../../../types/cluster";
import { formatClusterTime } from "../model/clusterDisplay";

export function GraphConsistencyStatsGrid({
  stats,
}: {
  stats: LocalGraphConsistencyStatsInfo;
}) {
  return (
    <div className="grid gap-3 text-sm md:grid-cols-4">
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Revision
        </span>
        <div className="font-semibold">{stats.revision}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Nodes</span>
        <div className="font-semibold">{stats.nodeCount}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Edges</span>
        <div className="font-semibold">{stats.edgeCount}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Partition
        </span>
        <div className="font-semibold">{stats.partitionId}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Graph checksum
        </span>
        <div>
          <ResourceIdText value={stats.graphChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Node checksum
        </span>
        <div>
          <ResourceIdText value={stats.nodeChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Edge checksum
        </span>
        <div>
          <ResourceIdText value={stats.edgeChecksum} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Algorithm
        </span>
        <div className="font-semibold">
          {formatEnumLabel(stats.checksumAlgorithm)}
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>
          Collected at
        </span>
        <div className="font-semibold">
          {formatClusterTime(stats.collectedAt)}
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Source</span>
        <div className="font-semibold">{formatEnumLabel(stats.source)}</div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Space</span>
        <div>
          <ResourceIdText value={stats.spaceId} />
        </div>
      </div>
      <div>
        <span className={`${themeClasses.text.parts.mutedLight}`}>Domain</span>
        <div>
          <ResourceIdText value={stats.domainId} />
        </div>
      </div>
    </div>
  );
}
