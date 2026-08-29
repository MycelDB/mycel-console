import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Button,
  DomainLabel,
  EnumBadge,
  formatEnumLabel,
  metricToneClass,
  ResourceIdText,
  Text,
  themeClasses,
  type MetricTone,
} from "../../../components/typography";
import type { AutomationInvocationSummaryInfo } from "../../../types/automations";
import type { SemanticMaintenanceWorkItemInfo } from "../../../types/semanticMaintenance";

export function ContextualIntelligenceLink({
  title,
  description,
  to,
}: {
  title: string;
  description: string;
  to: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/70 dark:bg-sky-950/30">
      <div>
        <Text
          as="h3"
          className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {title}
        </Text>
        <Text intent="muted" size="sm" className="mt-1 max-w-3xl">
          {description}
        </Text>
      </div>
      <Link
        className="rounded-md border border-sky-300 px-3 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-sky-900/60"
        to={to}
      >
        Open Intelligence view
      </Link>
    </div>
  );
}

export function ConfirmMaintenanceActionDialog({
  kind,
  item,
  loading,
  onCancel,
  onConfirm,
}: {
  kind: "retry" | "cancel";
  item: SemanticMaintenanceWorkItemInfo;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isRetry = kind === "retry";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div
        className={`w-full max-w-lg rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <Text
          as="h3"
          className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {isRetry
            ? "Retry maintenance work item"
            : "Cancel maintenance work item"}
        </Text>
        <Text intent="muted" size="sm" className="mt-2">
          {isRetry
            ? "Retry will make this item eligible for processing again."
            : "Cancel will stop this queued item from being processed."}{" "}
          Review the target before continuing.
        </Text>
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-950/60">
          <div>
            <strong>Work item:</strong>{" "}
            <ResourceIdText value={item.workItemId} />
          </div>
          <div>
            <strong>Action:</strong> {formatEnumLabel(item.action)}
          </div>
          <div>
            <strong>Status:</strong> {formatEnumLabel(item.status)}
          </div>
          <div>
            <strong>Rule:</strong>{" "}
            <ResourceIdText value={item.semanticRuleId} /> /{" "}
            {item.embeddingBindingKey || "—"}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Keep item unchanged
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : isRetry ? "Retry item" : "Cancel item"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: MetricTone;
}) {
  const valueClass = metricToneClass(tone);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <Text className={`mt-1 font-semibold ${valueClass}`}>{value}</Text>
    </div>
  );
}

export function DetailCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
    >
      <Text
        as="h3"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {title}
      </Text>
      <dl className="mt-4 space-y-3">{children}</dl>
    </div>
  );
}

export function DetailRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <dt
        className={`text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {children ?? value}
      </dd>
    </div>
  );
}

export function DetailList({
  label,
  values,
}: {
  label: string;
  values?: string[];
}) {
  const displayValues = values?.length ? values : ["Not reported"];
  return <DetailRow label={label} value={displayValues.join(", ")} />;
}

export function formatTargetLabel(spaceId: string, domainId: string) {
  return `${shortInlineId(spaceId)} / ${shortInlineId(domainId)}`;
}

export function shortInlineId(value?: string) {
  if (!value) return "—";
  if (value.length <= 24) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export function formatTimestamp(value?: string) {
  if (!value) return "Not reported";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}

export function RecentInvocations({
  domainId,
  items,
  onShowRun,
}: {
  domainId: string;
  items: AutomationInvocationSummaryInfo[];
  onShowRun: (domainId: string, runId: string) => void;
}) {
  if (items.length === 0)
    return (
      <Text intent="muted" size="sm" className="mt-2">
        No recent invocations.
      </Text>
    );
  return (
    <div className="mt-2 space-y-1">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex flex-wrap items-center gap-2 text-xs ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
        >
          <EnumBadge value={item.status} />
          <span>
            changed <ResourceIdText value={item.changedElementId} />
          </span>
          {item.skipReason && <span>{item.skipReason}</span>}
          <button
            type="button"
            className="text-sky-700 hover:text-sky-900 dark:text-sky-300"
            onClick={() => onShowRun(domainId, item.id)}
          >
            Run detail
          </button>
        </div>
      ))}
    </div>
  );
}
