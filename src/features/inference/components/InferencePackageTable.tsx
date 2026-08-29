import {
  formatEnumLabel,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type { InferencePackageInfo } from "../../../types/inference";

export type InferencePackageTableProps = {
  packages: InferencePackageInfo[];
};

export function InferencePackageTable({
  packages,
}: InferencePackageTableProps) {
  if (packages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/40">
        <Text as="p" className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          No inference packages imported yet
        </Text>
        <Text intent="muted" size="sm" className="mt-2">
          Import a package JSON file to install or update inference catalog
          definitions.
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
    >
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-950/40`}>
          <tr>
            <TableHead className="px-4 py-3">Name</TableHead>
            <TableHead className="px-4 py-3">Version</TableHead>
            <TableHead className="px-4 py-3">Source</TableHead>
            <TableHead className="px-4 py-3">Definitions</TableHead>
            <TableHead className="px-4 py-3">Installed at</TableHead>
            <TableHead className="px-4 py-3">Installed by</TableHead>
            <TableHead className="px-4 py-3">Checksum</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {packages.map((pkg) => (
            <tr
              key={pkg.inferencePackageId || `${pkg.name}-${pkg.version}`}
              className="hover:bg-slate-100 dark:hover:bg-slate-800/40"
            >
              <td className={`px-4 py-3 font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
                {pkg.name}
              </td>
              <td className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
                {pkg.version}
              </td>
              <td
                className={`max-w-64 truncate px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                title={pkg.source}
              >
                {pkg.source || "—"}
              </td>
              <td className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
                {formatCounts(pkg.definitionCounts)}
              </td>
              <td className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
                {formatInstalledAt(pkg.installedAt)}
              </td>
              <td className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
                {pkg.installedBy || "—"}
              </td>
              <td
                className={`max-w-48 truncate px-4 py-3 font-mono text-xs ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
                title={pkg.checksum}
              >
                {pkg.checksum || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const definitionCountOrder = [
  "model_endpoints",
  "models",
  "vector_stores",
  "model_endpoint_capabilities",
];

function formatCounts(counts: Record<string, number>) {
  const entries = Object.entries(counts).sort(([left], [right]) => {
    const leftIndex = definitionCountOrder.indexOf(left);
    const rightIndex = definitionCountOrder.indexOf(right);
    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right);
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
  if (entries.length === 0) return "—";
  return entries
    .map(([key, value]) => `${formatEnumLabel(key)}: ${value}`)
    .join(", ");
}

function formatInstalledAt(value: string) {
  if (!value) return "—";
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const millis = Number(value) * 1000;
    if (Number.isFinite(millis))
      return new Date(millis)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, " UTC");
  }
  return value
    .replace("T", " ")
    .replace(/\.\d+Z$/, " UTC")
    .replace(/Z$/, " UTC");
}
