import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";
import type { SpaceInfo } from "../../../types/spaces";
import { SpaceStateBadge } from "./SpaceStateBadge";

export type SpaceTableProps = {
  spaces: SpaceInfo[];
};

export function SpaceTable({ spaces }: SpaceTableProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 p-8 text-center">
        <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">
          No spaces found
        </Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
          Adjust filters or refresh after creating spaces.
        </Text>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Space ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">State</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {spaces.map((space) => (
            <tr key={space.spaceId} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
              <td className="px-4 py-3 font-medium">
                <Link className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(space.spaceId)}`}>
                  {space.name}
                </Link>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{space.spaceId}</td>
              <td className="px-4 py-3"><SpaceStateBadge state={space.state} /></td>
              <td className="px-4 py-3 text-sm text-slate-500">Read-only</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
