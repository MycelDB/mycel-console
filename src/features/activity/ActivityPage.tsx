import { useEffect, useRef, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import {
  Alert,
  Button,
  EnumBadge,
  formatEnumLabel,
  Input,
  ResourceIdText,
  Text,
  themeClasses,
  TableHead,
} from "../../components/typography";
import {
  listActivityEvents,
  normalizeAppError,
} from "../../services/adminService";
import type {
  ActivityEventInfo,
  ActivityEventSummaryInfo,
  ListActivityEventsInput,
  ListActivityEventsResponseInfo,
} from "../../types/activity";

const categoryOptions = [
  "lifecycle",
  "identity",
  "access",
  "space",
  "domain",
  "backup",
  "cluster",
  "semantic",
  "automation",
  "external",
];
const severityOptions = ["info", "warning", "error"];

interface ActivityPageProps {
  listActivityEventsService?: (
    input?: ListActivityEventsInput,
  ) => Promise<ListActivityEventsResponseInfo>;
}

export function ActivityPage({
  listActivityEventsService = listActivityEvents,
}: ActivityPageProps = {}) {
  const [events, setEvents] = useState<ActivityEventInfo[]>([]);
  const [summary, setSummary] = useState<ActivityEventSummaryInfo>({
    totalCount: 0,
    warningCount: 0,
    errorCount: 0,
  });
  const [category, setCategory] = useState("");
  const [severities, setSeverities] = useState<string[]>([]);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState("");
  const [appliedInput, setAppliedInput] = useState<ListActivityEventsInput>({
    pageSize: 50,
  });
  const [error, setError] = useState("");
  const scrollPanelRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadWithInput({ pageSize: 50 });
  }, []);

  useEffect(() => {
    if (
      !nextPageToken ||
      loading ||
      loadingMore ||
      !("IntersectionObserver" in window)
    )
      return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root: scrollPanelRef.current, rootMargin: "160px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [nextPageToken, loading, loadingMore, appliedInput]);

  async function load() {
    await loadWithInput(buildListInput({ category, severities, since, until }));
  }

  async function loadWithInput(input: ListActivityEventsInput) {
    const baseInput = { ...input };
    delete baseInput.pageToken;
    setLoading(true);
    setError("");
    try {
      const result = await listActivityEventsService(baseInput);
      setEvents(result.events);
      setSummary(summaryFromResponse(result));
      setNextPageToken(result.nextPageToken || "");
      setAppliedInput(baseInput);
      if (typeof scrollPanelRef.current?.scrollTo === "function") {
        scrollPanelRef.current.scrollTo({ top: 0 });
      } else if (scrollPanelRef.current) {
        scrollPanelRef.current.scrollTop = 0;
      }
    } catch (err) {
      setEvents([]);
      setSummary({ totalCount: 0, warningCount: 0, errorCount: 0 });
      setNextPageToken("");
      setError(
        normalizeAppError(err, "Unable to load activity events").message,
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextPageToken || loading || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const result = await listActivityEventsService({
        ...appliedInput,
        pageToken: nextPageToken,
      });
      setEvents((current) => [...current, ...result.events]);
      setSummary(summaryFromResponse(result));
      setNextPageToken(result.nextPageToken || "");
    } catch (err) {
      setError(
        normalizeAppError(err, "Unable to load more activity events").message,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  function clearFilters() {
    setCategory("");
    setSeverities([]);
    setSince("");
    setUntil("");
    void loadWithInput({ pageSize: 50 });
  }

  function toggleSeverity(severity: string) {
    setSeverities((current) =>
      current.includes(severity)
        ? current.filter((item) => item !== severity)
        : [...current, severity],
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Activity"
        description="Curated daemon activity events for operator history and diagnostics. Events are evidence only; raft and subsystem metadata remain authoritative."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total events"
          value={summary.totalCount.toString()}
        />
        <SummaryCard label="Warnings" value={summary.warningCount.toString()} />
        <SummaryCard label="Errors" value={summary.errorCount.toString()} />
      </div>

      <div
        className={`rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-5 dark:border-slate-800`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text
              as="h2"
              className={`text-lg font-semibold ${themeClasses.text.parts.headingLight} dark:text-white`}
            >
              Filters
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Narrow activity by category, severity, and occurrence time.
            </Text>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={clearFilters}
              disabled={loading}
            >
              Clear
            </Button>
            <Button
              type="button"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Applying…" : "Apply filters"}
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
          <label
            className={`block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
          >
            Category
            <span className="relative mt-1 block">
              <select
                aria-label="Category"
                className={`block w-full appearance-none rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 pr-10 text-sm ${themeClasses.text.parts.primaryLight} transition focus-visible:border-sky-500 ${themeClasses.focus.ring} disabled:opacity-60 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={loading}
              >
                <option value="">All categories</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {labelize(item)}
                  </option>
                ))}
              </select>
              <span
                className={`pointer-events-none absolute inset-y-0 right-3 flex items-center ${themeClasses.text.parts.quietLight}`}
              >
                ⌄
              </span>
            </span>
          </label>

          <div
            className={`block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
          >
            Severity
            <details className="relative mt-1">
              <summary
                className={`block w-full cursor-pointer list-none rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 text-sm ${themeClasses.text.parts.primaryLight} transition marker:hidden focus-visible:border-sky-500 ${themeClasses.focus.ring} dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>{severityLabel(severities)}</span>
                  <span
                    aria-hidden="true"
                    className={`${themeClasses.text.parts.quietLight}`}
                  >
                    ⌄
                  </span>
                </span>
              </summary>
              <div
                className={`absolute z-20 mt-2 w-full rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-2 shadow-lg dark:border-slate-800`}
              >
                {severityOptions.map((severity) => (
                  <label
                    key={severity}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm ${themeClasses.text.parts.bodyLight} hover:bg-slate-100 ${themeClasses.text.parts.darkStrong} dark:hover:bg-slate-900`}
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                      checked={severities.includes(severity)}
                      onChange={() => toggleSeverity(severity)}
                      disabled={loading}
                    />
                    {labelize(severity)}
                  </label>
                ))}
              </div>
            </details>
          </div>

          <label
            className={`block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
          >
            From
            <Input
              className="mt-1"
              type="datetime-local"
              value={since}
              onChange={(event) => setSince(event.target.value)}
              disabled={loading}
            />
          </label>
          <label
            className={`block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
          >
            To
            <Input
              className="mt-1"
              type="datetime-local"
              value={until}
              onChange={(event) => setUntil(event.target.value)}
              disabled={loading}
            />
          </label>
        </div>
      </div>

      <div
        className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
      >
        <div
          ref={scrollPanelRef}
          className="max-h-[36rem] overflow-auto"
          aria-label="Activity events scroll panel"
        >
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead
              className={`sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.mutedLight} dark:bg-slate-900 ${themeClasses.text.parts.darkMuted}`}
            >
              <tr>
                <TableHead className="px-4 py-3">When</TableHead>
                <TableHead className="px-4 py-3">Severity</TableHead>
                <TableHead className="px-4 py-3">Category</TableHead>
                <TableHead className="px-4 py-3">Type</TableHead>
                <TableHead className="px-4 py-3">Message</TableHead>
                <TableHead className="px-4 py-3">Resource</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((event) => (
                <tr
                  key={event.eventId}
                  className={`${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
                >
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatWhen(event.occurredAt)}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={event.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <CategoryBadge category={event.category} />
                  </td>
                  <td className="px-4 py-3" title={event.eventType}>
                    {formatEnumLabel(event.eventType)}
                  </td>
                  <td className="px-4 py-3">{event.message}</td>
                  <td className="px-4 py-3">
                    <ResourceIdText value={event.resource || event.source} />
                  </td>
                </tr>
              ))}
              {loading && events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`px-4 py-8 text-center ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
                    Loading activity events…
                  </td>
                </tr>
              ) : null}
              {!loading && events.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className={`px-4 py-8 text-center ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
                    No activity events found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          {loadingMore ? (
            <div
              className={`border-t border-slate-100 px-4 py-3 text-center text-sm ${themeClasses.text.parts.mutedLight} dark:border-slate-800 ${themeClasses.text.parts.darkMuted}`}
            >
              Loading more activity events…
            </div>
          ) : null}
          {!loading && !loadingMore && nextPageToken ? (
            <div className="border-t border-slate-100 px-4 py-3 text-center dark:border-slate-800">
              <Button
                variant="secondary"
                type="button"
                onClick={() => void loadMore()}
              >
                Load more
              </Button>
            </div>
          ) : null}
          {!loading && !loadingMore && !nextPageToken && events.length > 0 ? (
            <div
              className={`border-t border-slate-100 px-4 py-3 text-center text-xs ${themeClasses.text.parts.mutedLight} dark:border-slate-800 ${themeClasses.text.parts.darkMuted}`}
            >
              End of activity events.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function buildListInput(filters: {
  category: string;
  severities: string[];
  since: string;
  until: string;
}): ListActivityEventsInput {
  return {
    pageSize: 50,
    categories: filters.category ? [filters.category] : undefined,
    severities: filters.severities.length > 0 ? filters.severities : undefined,
    sinceSeconds: secondsFromDateTimeLocal(filters.since),
    untilSeconds: secondsFromDateTimeLocal(filters.until),
  };
}

function secondsFromDateTimeLocal(value: string): number | undefined {
  if (!value) return undefined;
  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? Math.floor(millis / 1000) : undefined;
}

function summaryFromResponse(
  response: ListActivityEventsResponseInfo,
): ActivityEventSummaryInfo {
  if (response.summary) return response.summary;
  return {
    totalCount: response.events.length,
    warningCount: response.events.filter(
      (event) => event.severity === "warning",
    ).length,
    errorCount: response.events.filter((event) => event.severity === "error")
      .length,
  };
}

function severityLabel(severities: string[]): string {
  if (severities.length === 0) return "All severities";
  return severities.map(labelize).join(", ");
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className={`rounded-2xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-4`}
    >
      <div
        className={`text-sm ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
      >
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-bold ${themeClasses.text.parts.headingLight} dark:text-white`}
      >
        {value}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return <EnumBadge value={severity || "info"} />;
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={`rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium ${themeClasses.text.parts.bodyLight} dark:border-slate-800 dark:bg-slate-900 ${themeClasses.text.parts.darkSecondary}`}
    >
      {labelize(category || "activity")}
    </span>
  );
}

function labelize(value: string): string {
  return formatEnumLabel(value, "Activity");
}

function formatWhen(value: string): string {
  const seconds = Number.parseFloat(value);
  if (!Number.isFinite(seconds)) return value || "—";
  return new Date(seconds * 1000).toLocaleString();
}
