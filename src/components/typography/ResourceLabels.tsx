import { themeClasses } from "./themeClasses";
import type { ReactNode } from "react";
import { TextLink } from "./TextLink";

const enumLabelOverrides: Record<string, string> = {
  SPACE_STATE_ACTIVE: "Active",
  SPACE_STATE_ARCHIVED: "Archived",
  SPACE_STATE_UNSPECIFIED: "Unspecified",
  PRINCIPAL_STATE_ACTIVE: "Active",
  PRINCIPAL_STATE_DISABLED: "Disabled",
  PRINCIPAL_STATE_DELETED: "Deleted",
  PRINCIPAL_STATE_UNSPECIFIED: "Unspecified",
  DOMAIN_STATE_ACTIVE: "Active",
  DOMAIN_STATE_UNSPECIFIED: "Unspecified",
  SEMANTIC_RULE_STATE_ACTIVE: "Active",
  SEMANTIC_RULE_STATE_BUILDING: "Building",
  SEMANTIC_RULE_STATE_STALE: "Stale",
  SEMANTIC_RULE_STATE_DISABLED: "Disabled",
  SEMANTIC_RULE_STATE_ERROR: "Error",
  SEMANTIC_RULE_STATE_UNSPECIFIED: "Unspecified",
  SEARCH_INDEX_STATE_READY: "Ready",
  SEARCH_INDEX_STATE_BUILDING: "Building",
  SEARCH_INDEX_STATE_DEGRADED: "Degraded",
  SEARCH_INDEX_STATE_MISSING: "Missing",
  SEARCH_INDEX_STATE_ERROR: "Error",
  SEARCH_INDEX_STATE_UNSPECIFIED: "Unspecified",
};

const enumPrefixes = [
  "SPACE_STATE_",
  "PRINCIPAL_STATE_",
  "PRINCIPAL_TYPE_",
  "DOMAIN_STATE_",
  "SEMANTIC_RULE_STATE_",
  "SEARCH_INDEX_STATE_",
  "MODEL_KIND_",
  "VECTOR_STORE_TYPE_",
  "PRIVACY_CLASS_",
  "INFERENCE_OPERATION_",
  "ACTIVITY_CATEGORY_",
  "ACTIVITY_EVENT_TYPE_",
  "ACCESS_SCOPE_TYPE_",
  "SESSION_STATE_",
];

export function formatEnumLabel(value?: string | null, empty = "—") {
  const raw = String(value || "").trim();
  if (!raw) return empty;
  if (enumLabelOverrides[raw]) return enumLabelOverrides[raw];
  const stripped = enumPrefixes.reduce(
    (current, prefix) =>
      current.startsWith(prefix) ? current.slice(prefix.length) : current,
    raw,
  );
  return stripped
    .replace(/[._-]+/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function shortResourceId(value?: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length <= 24) return raw;
  return `${raw.slice(0, 10)}…${raw.slice(-8)}`;
}

export function ResourceIdText({
  value,
  empty = "—",
  className = "",
}: {
  value?: string | null;
  empty?: string;
  className?: string;
}) {
  const raw = String(value || "").trim();
  return (
    <span
      className={`break-all font-mono text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted} ${className}`.trim()}
      title={raw || empty}
    >
      {raw ? shortResourceId(raw) : empty}
    </span>
  );
}

export function ResourceLabel({
  primary,
  id,
  idLabel,
  to,
  children,
  showId = true,
}: {
  primary?: string | null;
  id?: string | null;
  idLabel?: string;
  to?: string;
  children?: ReactNode;
  showId?: boolean;
}) {
  const display = String(primary || id || "—");
  const content = to ? <TextLink to={to}>{display}</TextLink> : display;
  return (
    <div>
      <div className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {content}
      </div>
      {showId && id && primary && id !== primary ? (
        <div className="mt-1">
          {idLabel ? (
            <span className={`mr-1 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
              {idLabel}
            </span>
          ) : null}
          <ResourceIdText value={id} />
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function SpaceLabel({
  spaceId,
  name,
  link = false,
  showId = true,
}: {
  spaceId?: string | null;
  name?: string | null;
  link?: boolean;
  showId?: boolean;
}) {
  return (
    <ResourceLabel
      primary={name}
      id={spaceId}
      idLabel="ID"
      to={
        link && spaceId ? `/spaces/${encodeURIComponent(spaceId)}` : undefined
      }
      showId={showId}
    />
  );
}

export function DomainLabel({
  domainId,
  name,
  domainKey,
  showId = true,
}: {
  domainId?: string | null;
  name?: string | null;
  domainKey?: string | null;
  showId?: boolean;
}) {
  return (
    <ResourceLabel
      primary={name || domainKey}
      id={domainId}
      idLabel="ID"
      showId={showId}
    />
  );
}

export function PrincipalLabel({
  principalId,
  username,
  displayName,
  link = false,
  showId = true,
}: {
  principalId?: string | null;
  username?: string | null;
  displayName?: string | null;
  link?: boolean;
  showId?: boolean;
}) {
  const primary = displayName || username;
  return (
    <ResourceLabel
      primary={primary}
      id={principalId}
      idLabel="ID"
      to={
        link && principalId
          ? `/principals/${encodeURIComponent(principalId)}`
          : undefined
      }
      showId={showId}
    />
  );
}

function toneFor(value: string) {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("active") ||
    normalized.includes("ready") ||
    normalized.includes("enabled") ||
    normalized.includes("succeeded") ||
    normalized === "pass"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("denied") ||
    normalized.includes("deleted") ||
    normalized === "fail"
  ) {
    return "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-950/50 dark:text-rose-300";
  }
  if (
    normalized.includes("archived") ||
    normalized.includes("stale") ||
    normalized.includes("building") ||
    normalized.includes("running") ||
    normalized.includes("pending") ||
    normalized.includes("mixed") ||
    normalized.includes("degraded") ||
    normalized.includes("missing") ||
    normalized.includes("warning")
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300";
  }
  return `border-slate-300 bg-slate-100 ${themeClasses.text.parts.bodyLight} dark:border-slate-600 dark:bg-slate-900 ${themeClasses.text.parts.darkSecondary}`;
}

export function EnumBadge({ value }: { value?: string | null }) {
  const raw = String(value || "").trim();
  const label = formatEnumLabel(raw || "unknown", "Unknown");
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneFor(raw || label)}`}
      title={raw || label}
    >
      {label}
    </span>
  );
}
