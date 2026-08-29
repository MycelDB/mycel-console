import {
  Button,
  formatEnumLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type { VectorStoreInfo } from "../../../types/inference";

export function VectorStoreTable({
  stores,
  onViewDetails,
}: {
  stores: VectorStoreInfo[];
  onViewDetails?: (store: VectorStoreInfo) => void;
}) {
  if (stores.length === 0) return <Empty message="No vector stores found." />;
  return (
    <div
      className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}>
          <tr>
            <TableHead className="px-4 py-3">Status</TableHead>
            <TableHead className="px-4 py-3">Key</TableHead>
            <TableHead className="px-4 py-3">Name</TableHead>
            <TableHead className="px-4 py-3">Type</TableHead>
            <TableHead className="px-4 py-3">Privacy</TableHead>
            {onViewDetails && <TableHead className="px-4 py-3">Actions</TableHead>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {stores.map((store) => (
            <tr key={store.vectorStoreId}>
              <td className="px-4 py-3">
                {store.enabled ? "Enabled" : "Disabled"}
              </td>
              <td className={`px-4 py-3 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
                {store.key}
              </td>
              <td className="px-4 py-3">{store.name || "—"}</td>
              <td className="px-4 py-3">{formatEnumLabel(store.type)}</td>
              <td className="px-4 py-3">
                {formatEnumLabel(store.privacyClass)}
              </td>
              {onViewDetails && (
                <td className="px-4 py-3">
                  <Button
                    variant="secondary"
                    onClick={() => onViewDetails(store)}
                  >
                    View
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-300 ${themeClasses.surface.panel} p-6 text-center dark:border-slate-700`}
    >
      <Text intent="muted">{message}</Text>
    </div>
  );
}
