import { Alert, Text } from "../../../components/typography";
import type { ActivityEventInfo } from "../../../types/activity";

function formatTime(value?: string) {
  if (!value) return "—";
  const asSeconds = Number.parseFloat(value);
  const date = Number.isFinite(asSeconds) && /^\d+(\.\d+)?$/.test(value) ? new Date(asSeconds * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function sourceLabel(event: ActivityEventInfo) {
  return event.resource || event.source || event.actor || "—";
}

export function ClusterEventLog({ events, error, loading = false }: { events: ActivityEventInfo[]; error?: string; loading?: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Text className="font-semibold">Cluster activity</Text>
        <Text size="sm" intent="muted">
          Durable Activity Events for cluster operations and diagnostics.
        </Text>
      </div>
      {error ? <div className="p-4"><Alert variant="warning">{error}</Alert></div> : null}
      {loading ? <Text intent="muted" className="p-4">Loading cluster activity…</Text> : null}
      {!loading && events.length === 0 ? (
        <Text intent="muted" className="p-4">No cluster activity events found.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Source / resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {events.map((event) => (
                <tr key={event.eventId}>
                  <td className="whitespace-nowrap px-4 py-3">{formatTime(event.occurredAt)}</td>
                  <td className="px-4 py-3">{event.severity || "info"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{event.eventType}</td>
                  <td className="px-4 py-3">{event.message}</td>
                  <td className="px-4 py-3">{sourceLabel(event)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
