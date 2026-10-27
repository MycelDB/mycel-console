import {
  Button,
  EnumBadge,
  formatEnumLabel,
  ResourceIdText,
  shortResourceId,
  TableHead,
  Text,
  TextLink,
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

export type SemanticScopeDisambiguation = {
  spaces: Record<string, string>;
  domains: Record<string, string>;
};

export function semanticScopeDisambiguation(
  rows: SemanticRow[],
): SemanticScopeDisambiguation {
  const spaceGroups = new Map<string, Set<string>>();
  const domainGroups = new Map<string, Set<string>>();

  for (const row of rows) {
    const spaceId = row.space.spaceId.trim();
    const spaceName = row.space.name.trim();
    if (spaceId && spaceName) {
      addIdentity(spaceGroups, normalizedLabel(spaceName), spaceId);
    }

    const domainId = row.rule.domainId.trim();
    const domainName = firstNonBlank(row.domain?.name, row.domain?.key);
    if (spaceId && domainId && domainName) {
      addIdentity(
        domainGroups,
        `${spaceId}\u0000${normalizedLabel(domainName)}`,
        domainId,
      );
    }
  }

  return {
    spaces: disambiguatorsForGroups(spaceGroups),
    domains: disambiguatorsForGroups(domainGroups),
  };
}

export function SemanticRuleScope({
  row,
  disambiguation,
}: {
  row: SemanticRow;
  disambiguation: SemanticScopeDisambiguation;
}) {
  const spaceId = row.space.spaceId.trim();
  const spaceName = row.space.name.trim();
  const spaceLabel = spaceName || shortResourceId(spaceId) || "Unknown space";
  const domainId = row.rule.domainId.trim();
  const domainName = firstNonBlank(row.domain?.name, row.domain?.key);
  const domainLabel =
    domainName || shortResourceId(domainId) || "Unknown domain";
  const spaceTitle = spaceId ? `Space ID: ${spaceId}` : "Space ID not reported";
  const domainTitle = domainId
    ? `Domain ID: ${domainId}`
    : "Domain ID not reported";

  return (
    <div>
      <div
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {spaceId ? (
          <TextLink
            to={`/spaces/${encodeURIComponent(spaceId)}`}
            title={spaceTitle}
            aria-label={`Space ${spaceLabel}; ID ${spaceId}`}
          >
            {spaceLabel}
          </TextLink>
        ) : (
          <span title={spaceTitle}>{spaceLabel}</span>
        )}
        <IdentityDisambiguator value={disambiguation.spaces[spaceId]} />
      </div>
      <div
        className={`mt-1 text-xs ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
        title={domainTitle}
        aria-label={`Domain ${domainLabel}${domainId ? `; ID ${domainId}` : ""}`}
      >
        <span className="font-medium">Domain:</span> {domainLabel}
        <IdentityDisambiguator value={disambiguation.domains[domainId]} />
      </div>
    </div>
  );
}

function IdentityDisambiguator({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span
      aria-hidden="true"
      className={`ml-1 font-mono text-xs font-normal ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
    >
      · {value}
    </span>
  );
}

function addIdentity(
  groups: Map<string, Set<string>>,
  label: string,
  id: string,
) {
  const group = groups.get(label) ?? new Set<string>();
  group.add(id);
  groups.set(label, group);
}

function disambiguatorsForGroups(groups: Map<string, Set<string>>) {
  const result: Record<string, string> = {};
  for (const ids of groups.values()) {
    if (ids.size < 2) continue;
    Object.assign(result, uniqueIdPrefixes([...ids]));
  }
  return result;
}

function uniqueIdPrefixes(ids: string[]) {
  const ordered = [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(
    ordered.map((id) => {
      let length = Math.min(8, id.length);
      while (
        length < id.length &&
        ordered.some(
          (other) => other !== id && other.slice(0, length) === id.slice(0, length),
        )
      ) {
        length += 1;
      }
      const prefix = id.slice(0, length);
      return [id, prefix.length < id.length ? `${prefix}…` : prefix];
    }),
  );
}

function normalizedLabel(value: string) {
  return value.trim().toLowerCase();
}

function firstNonBlank(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const trimmed = String(value || "").trim();
    if (trimmed) return trimmed;
  }
  return "";
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
