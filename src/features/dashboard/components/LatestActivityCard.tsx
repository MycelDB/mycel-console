import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  formatEnumLabel,
  ResourceIdText,
  Text,
  TextLink,
  themeClasses,
} from "../../../components/typography";
import {
  listActivityEvents as defaultListActivityEvents,
  normalizeAppError,
} from "../../../services/adminService";
import type {
  ActivityEventInfo,
  ListActivityEventsInput,
  ListActivityEventsResponseInfo,
} from "../../../types/activity";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";

export type LatestActivityCardProps = {
  principalContext?: ConsolePrincipalContext | null;
  listActivityEventsService?: (
    input?: ListActivityEventsInput,
  ) => Promise<ListActivityEventsResponseInfo>;
};

export function LatestActivityCard({
  principalContext,
  listActivityEventsService = defaultListActivityEvents,
}: LatestActivityCardProps) {
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
        if (!cancelled)
          setError(
            normalizeAppError(err, "Latest activity unavailable").message,
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [canReadActivity, listActivityEventsService]);

  const latestEvents = useMemo(
    () => [...events].sort(compareOccurredAt).slice(0, 10),
    [events],
  );

  if (!canReadActivity) return null;

  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <div className="flex items-center justify-between gap-4">
        <Text
          as="p"
          size="sm"
          className={`font-medium uppercase tracking-[0.2em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
        >
          Latest activity
        </Text>
        <TextLink to="/activity">View all →</TextLink>
      </div>

      {error ? (
        <Alert variant="warning" className="mt-4">
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/40">
          <Text intent="muted" size="sm">
            Loading latest activity…
          </Text>
        </div>
      ) : latestEvents.length === 0 && !error ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center dark:border-slate-700 dark:bg-slate-950/40">
          <Text
            as="p"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            No activity yet
          </Text>
          <Text intent="muted" size="sm" className="mt-2">
            Activity events will appear here after daemon or operator activity
            is recorded.
          </Text>
        </div>
      ) : (
        <ol className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {latestEvents.map((event) => (
            <li key={event.eventId} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                <SeverityDot severity={event.severity} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Text
                      as="p"
                      size="sm"
                      className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                    >
                      {event.message || formatEnumLabel(event.eventType)}
                    </Text>
                    <span className={`rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] ${themeClasses.text.parts.subtleLight} dark:bg-slate-800 ${themeClasses.text.parts.darkSecondary}`}>
                      {formatEnumLabel(event.category || "activity")}
                    </span>
                  </div>
                  <Text intent="muted" size="sm" className="mt-1 truncate">
                    {formatEnumLabel(event.eventType)}
                    {event.resource || event.source ? (
                      <>
                        {" · "}
                        <ResourceIdText
                          value={event.resource || event.source}
                        />
                      </>
                    ) : null}
                  </Text>
                </div>
                <time
                  className={`shrink-0 text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  dateTime={event.occurredAt}
                >
                  {formatWhen(event.occurredAt)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const color =
    severity === "error"
      ? "bg-rose-500"
      : severity === "warning"
        ? "bg-amber-500"
        : "bg-sky-500";
  return (
    <span
      aria-label={severity || "info"}
      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
    />
  );
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
