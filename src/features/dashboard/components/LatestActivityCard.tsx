import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Text } from "../../../components/typography";
import { listActivityEvents as defaultListActivityEvents, normalizeAppError } from "../../../services/adminService";
import type { ActivityEventInfo, ListActivityEventsInput, ListActivityEventsResponseInfo } from "../../../types/activity";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";

export type LatestActivityCardProps = {
  principalContext?: ConsolePrincipalContext | null;
  listActivityEventsService?: (input?: ListActivityEventsInput) => Promise<ListActivityEventsResponseInfo>;
};

export function LatestActivityCard({ principalContext, listActivityEventsService = defaultListActivityEvents }: LatestActivityCardProps) {
  const canReadActivity = canUseCapability(principalContext, "audit.read");
  const [events, setEvents] = useState<ActivityEventInfo[]>([]);
  const [loading, setLoading] = useState(canReadActivity);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!canReadActivity) return;
      setLoading(true);
      setError("");
      try {
        const response = await listActivityEventsService({ pageSize: 10 });
        if (!cancelled) setEvents(response.events);
      } catch (err) {
        if (!cancelled) setError(normalizeAppError(err, "Latest activity unavailable").message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [canReadActivity, listActivityEventsService]);

  const latestEvents = useMemo(() => [...events].sort(compareOccurredAt).slice(0, 10), [events]);

  if (!canReadActivity) return null;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between gap-4">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
          Latest activity
        </Text>
        <Link className="text-sm font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to="/activity">
          View all →
        </Link>
      </div>

      {error ? <Alert variant="warning" className="mt-4">{error}</Alert> : null}

      {loading ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/40">
          <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Loading latest activity…</Text>
        </div>
      ) : latestEvents.length === 0 && !error ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/40">
          <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">No activity yet</Text>
          <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">Activity events will appear here after daemon or operator activity is recorded.</Text>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {latestEvents.map((event) => (
            <li key={event.eventId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <SeverityDot severity={event.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">{event.message || event.eventType}</Text>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{event.category || "activity"}</span>
                  </div>
                  <Text intent="muted" size="sm" className="mt-1 truncate text-slate-600 dark:text-slate-400">
                    {event.eventType}{event.resource || event.source ? ` · ${event.resource || event.source}` : ""}
                  </Text>
                </div>
                <time className="shrink-0 text-xs text-slate-500 dark:text-slate-400" dateTime={event.occurredAt}>{formatWhen(event.occurredAt)}</time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color = severity === "error" ? "bg-rose-500" : severity === "warning" ? "bg-amber-500" : "bg-sky-500";
  return <span aria-label={severity || "info"} className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`} />;
}

function compareOccurredAt(a: ActivityEventInfo, b: ActivityEventInfo) {
  return timestampMillis(b.occurredAt) - timestampMillis(a.occurredAt);
}

function formatWhen(value: string): string {
  const millis = timestampMillis(value);
  if (!Number.isFinite(millis)) return value || "—";
  return new Date(millis).toLocaleString();
}

function timestampMillis(value: string): number {
  const numeric = Number.parseFloat(value);
  if (Number.isFinite(numeric)) return numeric * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
