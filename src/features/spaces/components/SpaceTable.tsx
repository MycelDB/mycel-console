import {
  Button,
  ResourceIdText,
  SpaceLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type { SpaceInfo } from "../../../types/spaces";
import { SpaceStateBadge } from "./SpaceStateBadge";

export type SpaceTableProps = {
  spaces: SpaceInfo[];
  canDelete?: boolean;
  deletingSpaceId?: string;
  onDelete?: (space: SpaceInfo) => void;
};

export function SpaceTable({
  spaces,
  canDelete = false,
  deletingSpaceId = "",
  onDelete,
}: SpaceTableProps) {
  if (spaces.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 p-8 text-center">
        <Text as="p" className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          No spaces found
        </Text>
        <Text intent="muted" size="sm" className="mt-2">
          Adjust filters or refresh after creating spaces.
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
    >
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950/40">
          <tr>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Space
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Identifier
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              State
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Actions
            </TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {spaces.map((space) => (
            <tr
              key={space.spaceId}
              className="hover:bg-slate-100 dark:hover:bg-slate-800/40"
            >
              <td className="px-4 py-3">
                <SpaceLabel
                  spaceId={space.spaceId}
                  name={space.name}
                  link
                  showId={false}
                />
              </td>
              <td className="px-4 py-3">
                <ResourceIdText value={space.spaceId} />
              </td>
              <td className="px-4 py-3">
                <SpaceStateBadge state={space.state} />
              </td>
              <td className="px-4 py-3 text-sm">
                {canDelete && onDelete ? (
                  <Button
                    variant="danger"
                    onClick={() => onDelete(space)}
                    disabled={deletingSpaceId === space.spaceId}
                  >
                    {deletingSpaceId === space.spaceId ? "Deleting…" : "Delete"}
                  </Button>
                ) : (
                  <span className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
                    Read-only
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
