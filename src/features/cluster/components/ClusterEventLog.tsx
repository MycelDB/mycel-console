import {
  Alert,
  EnumBadge,
  formatEnumLabel,
  ResourceIdText,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type { ActivityEventInfo } from "../../../types/activity";

function formatTime(value?: string) {
  if (!value) return "—";
  const asSeconds = Number.parseFloat(value);
  const date =
    Number.isFinite(asSeconds) && /^\d+(\.\d+)?$/.test(value)
      ? new Date(asSeconds * 1000)
      : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sourceLabel(event: ActivityEventInfo) {
  return event.resource || event.source || event.actor || "—";
}

export function ClusterEventLog({
  events,
  error,
  loading = false,
}: {
  events: ActivityEventInfo[];
  error?: string;
  loading?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated}`}
    >
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Text className="font-semibold">Cluster activity</Text>
        <Text size="sm" intent="muted">
          Durable Activity Events for cluster operations and diagnostics.
        </Text>
      </div>
      {error ? (
        <div className="p-4">
          <Alert variant="warning">{error}</Alert>
        </div>
      ) : null}
      {loading ? (
        <Text intent="muted" className="p-4">
          Loading cluster activity…
        </Text>
      ) : null}
      {!loading && events.length === 0 ? (
        <Text intent="muted" className="p-4">
          No cluster activity events found.
        </Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className={`bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-900/80 ${themeClasses.text.parts.darkMuted}`}>
              <tr>
                <TableHead className="px-4 py-3">Time</TableHead>
                <TableHead className="px-4 py-3">Severity</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Message</TableHead>
                <TableHead className="px-4 py-3">Source / resource</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {events.map((event) => (
                <tr key={event.eventId}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatTime(event.occurredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <EnumBadge value={event.severity || "info"} />
                  </td>
                  <td className="px-4 py-3" title={event.eventType}>
                    {formatEnumLabel(event.eventType)}
                  </td>
                  <td className="px-4 py-3">{event.message}</td>
                  <td className="px-4 py-3">
                    <ResourceIdText value={sourceLabel(event)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
