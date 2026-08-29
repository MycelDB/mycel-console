import {
  Button,
  EnumBadge,
  formatEnumLabel,
  ResourceIdText,
  TableHead,
  Text,
  themeClasses,
} from "../../../../components/typography";
import type { InferenceProfileInfo } from "../../../../types/inference";
import type { SemanticMaintenanceWorkItemInfo } from "../../../../types/semanticMaintenance";
import type {
  ProfileOption,
  SemanticRow,
  SemanticTab,
} from "../model/pageTypes";

export function compareSemanticRows(a: SemanticRow, b: SemanticRow) {
  return `${a.space.name || a.space.spaceId}:${a.domain?.name || a.domain?.key || a.rule.domainId}:${a.rule.displayName || a.rule.key}`.localeCompare(
    `${b.space.name || b.space.spaceId}:${b.domain?.name || b.domain?.key || b.rule.domainId}:${b.rule.displayName || b.rule.key}`,
  );
}

export function semanticTab(value: string | null): SemanticTab {
  return value === "activity" ? value : "rules";
}

export function compareProfiles(
  a: InferenceProfileInfo,
  b: InferenceProfileInfo,
) {
  return `${a.spaceId}:${a.displayName || a.key}`.localeCompare(
    `${b.spaceId}:${b.displayName || b.key}`,
  );
}

export function profileToOption(profile: InferenceProfileInfo): ProfileOption {
  return {
    value: profile.key || profile.inferenceProfileId,
    label: `${profile.displayName || profile.key} (${profile.key || profile.inferenceProfileId})`,
    spaceId: profile.spaceId,
    domainIds: profile.domainIds || [],
  };
}

export function groupValue(group: Record<string, string>, ...keys: string[]) {
  for (const key of keys) if (group[key]) return group[key];
  return "";
}

export function formatActionLabel(value?: string) {
  return formatEnumLabel(value, "Embed");
}

export function formatTimestamp(value?: string) {
  if (!value) return "—";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}

export function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <div
        className={`mt-2 text-3xl font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

export function StatusPill({ value }: { value: string }) {
  return <EnumBadge value={value || "unknown"} />;
}

export function SearchWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="font-medium">Search warnings</div>
      <ul className="mt-1 list-disc pl-5">
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}

export function searchResultTitle(
  node: Record<string, unknown> | null | undefined,
): string {
  const props = node?.properties as Record<string, unknown> | undefined;
  const payload = node?.payload as Record<string, unknown> | undefined;
  return String(
    props?.title ||
      payload?.title ||
      props?.name ||
      payload?.name ||
      node?.nodeId ||
      "Semantic result",
  );
}

export function MaintenanceWorkTable({
  items,
  canManage,
  loading,
  onRetry,
  onCancel,
}: {
  items: SemanticMaintenanceWorkItemInfo[];
  canManage: boolean;
  loading: boolean;
  onRetry: (item: SemanticMaintenanceWorkItemInfo) => void;
  onCancel: (item: SemanticMaintenanceWorkItemInfo) => void;
}) {
  if (items.length === 0)
    return (
      <Text intent="muted" size="sm" className="mt-4">
        No recent embedding generation work items found.
      </Text>
    );
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead
          className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}
        >
          <tr>
            <TableHead className="px-3 py-2">Triggered work</TableHead>
            <TableHead className="px-3 py-2">Rule / binding</TableHead>
            <TableHead className="px-3 py-2">Target</TableHead>
            <TableHead className="px-3 py-2">Result</TableHead>
            <TableHead className="px-3 py-2">Updated</TableHead>
            <TableHead className="px-3 py-2">Actions</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.workItemId}>
              <td className="px-3 py-2">
                <div>{formatActionLabel(item.action || "embed")}</div>
                <div>
                  <ResourceIdText value={item.workItemId} />
                </div>
                <div
                  className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  {formatTimestamp(item.createdAt)}
                </div>
              </td>
              <td className="px-3 py-2">
                <ResourceIdText value={item.semanticRuleId} />
                <div
                  className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  {item.embeddingBindingKey || "—"}
                </div>
              </td>
              <td className="px-3 py-2">
                <ResourceIdText value={item.targetNodeId} />
              </td>
              <td className="px-3 py-2">
                <StatusPill value={item.status || "unknown"} />
                <div
                  className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  Attempts {item.attemptCount}
                </div>
                {(item.lastErrorCategory || item.lastErrorMessageSanitized) && (
                  <div
                    className="mt-1 max-w-md truncate text-xs text-red-700 dark:text-red-300"
                    title={item.lastErrorMessageSanitized}
                  >
                    {item.lastErrorCategory || item.lastErrorMessageSanitized}
                  </div>
                )}
              </td>
              <td
                className={`px-3 py-2 text-xs ${themeClasses.text.parts.mutedLight}`}
              >
                {formatTimestamp(
                  item.updatedAt || item.claimedUntil || item.notBefore,
                )}
              </td>
              <td className="px-3 py-2">
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={loading}
                      onClick={() => onRetry(item)}
                    >
                      Retry
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={loading}
                      onClick={() => onCancel(item)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
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

export function DetailDrawer({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
      <aside
        className={`h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {title}
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Semantic rule diagnostic payload.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <pre
          className={`mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs ${themeClasses.text.parts.inverseSoft}`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
