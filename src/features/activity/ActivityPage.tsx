import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "../../components/layout/PageHeader";
import { Alert, Button, Input, Text } from "../../components/typography";
import { listActivityEvents, normalizeAppError } from "../../services/adminService";
import type { ActivityEventInfo, ListActivityEventsInput, ListActivityEventsResponseInfo } from "../../types/activity";

const categoryOptions = ["lifecycle", "identity", "access", "space", "domain", "backup", "cluster", "semantic", "automation", "external"];
const severityOptions = ["info", "warning", "error"];

interface ActivityPageProps {
  listActivityEventsService?: (input?: ListActivityEventsInput) => Promise<ListActivityEventsResponseInfo>;
}

export function ActivityPage({ listActivityEventsService = listActivityEvents }: ActivityPageProps = {}) {
  const [events, setEvents] = useState<ActivityEventInfo[]>([]);
  const [category, setCategory] = useState("");
  const [severities, setSeverities] = useState<string[]>([]);
  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState("");
  const [appliedInput, setAppliedInput] = useState<ListActivityEventsInput>({ pageSize: 50 });
  const [error, setError] = useState("");
  const scrollPanelRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void loadWithInput({ pageSize: 50 });
  }, []);

  useEffect(() => {
    if (!nextPageToken || loading || loadingMore || !("IntersectionObserver" in window)) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { root: scrollPanelRef.current, rootMargin: "160px" });
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
      setNextPageToken(result.nextPageToken || "");
      setAppliedInput(baseInput);
      if (typeof scrollPanelRef.current?.scrollTo === "function") {
        scrollPanelRef.current.scrollTo({ top: 0 });
      } else if (scrollPanelRef.current) {
        scrollPanelRef.current.scrollTop = 0;
      }
    } catch (err) {
      setEvents([]);
      setNextPageToken("");
      setError(normalizeAppError(err, "Unable to load activity events").message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextPageToken || loading || loadingMore) return;
    setLoadingMore(true);
    setError("");
    try {
      const result = await listActivityEventsService({ ...appliedInput, pageToken: nextPageToken });
      setEvents((current) => [...current, ...result.events]);
      setNextPageToken(result.nextPageToken || "");
    } catch (err) {
      setError(normalizeAppError(err, "Unable to load more activity events").message);
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
    setSeverities((current) => current.includes(severity) ? current.filter((item) => item !== severity) : [...current, severity]);
  }

  const counts = useMemo(() => ({
    errors: events.filter((event) => event.severity === "error").length,
    warnings: events.filter((event) => event.severity === "warning").length,
  }), [events]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Activity"
        description="Curated daemon activity events for operator history and diagnostics. Events are evidence only; raft and subsystem metadata remain authoritative."
      />

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Loaded events" value={events.length.toString()} />
        <SummaryCard label="Warnings" value={counts.warnings.toString()} />
        <SummaryCard label="Errors" value={counts.errors.toString()} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Text as="h2" className="text-lg font-semibold text-slate-950 dark:text-white">Filters</Text>
            <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Narrow activity by category, severity, and occurrence time.</Text>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={clearFilters} disabled={loading}>Clear</Button>
            <Button type="button" onClick={() => void load()} disabled={loading}>{loading ? "Applying…" : "Apply filters"}</Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Category
            <span className="relative mt-1 block">
              <select
                aria-label="Category"
                className="block w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={loading}
              >
                <option value="">All categories</option>
                {categoryOptions.map((item) => <option key={item} value={item}>{labelize(item)}</option>)}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">⌄</span>
            </span>
          </label>

          <div className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Severity
            <details className="relative mt-1">
              <summary className="block w-full cursor-pointer list-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition marker:hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                <span className="flex items-center justify-between gap-3">
                  <span>{severityLabel(severities)}</span>
                  <span aria-hidden="true" className="text-slate-400">⌄</span>
                </span>
              </summary>
              <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-800 dark:bg-slate-950">
                {severityOptions.map((severity) => (
                  <label key={severity} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900">
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

          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            From
            <Input className="mt-1" type="datetime-local" value={since} onChange={(event) => setSince(event.target.value)} disabled={loading} />
          </label>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            To
            <Input className="mt-1" type="datetime-local" value={until} onChange={(event) => setUntil(event.target.value)} disabled={loading} />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div ref={scrollPanelRef} className="max-h-[36rem] overflow-auto" aria-label="Activity events scroll panel">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Severity</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Resource</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((event) => (
                <tr key={event.eventId} className="text-slate-700 dark:text-slate-200">
                  <td className="whitespace-nowrap px-4 py-3">{formatWhen(event.occurredAt)}</td>
                  <td className="px-4 py-3"><SeverityBadge severity={event.severity} /></td>
                  <td className="px-4 py-3"><CategoryBadge category={event.category} /></td>
                  <td className="px-4 py-3 font-mono text-xs">{event.eventType}</td>
                  <td className="px-4 py-3">{event.message}</td>
                  <td className="px-4 py-3">{event.resource || event.source || "—"}</td>
                </tr>
              ))}
              {loading && events.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">Loading activity events…</td></tr> : null}
              {!loading && events.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">No activity events found.</td></tr> : null}
            </tbody>
          </table>
          <div ref={sentinelRef} className="h-1" aria-hidden="true" />
          {loadingMore ? <div className="border-t border-slate-100 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">Loading more activity events…</div> : null}
          {!loading && !loadingMore && nextPageToken ? (
            <div className="border-t border-slate-100 px-4 py-3 text-center dark:border-slate-800">
              <Button variant="secondary" type="button" onClick={() => void loadMore()}>
                Load more
              </Button>
            </div>
          ) : null}
          {!loading && !loadingMore && !nextPageToken && events.length > 0 ? <div className="border-t border-slate-100 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">End of activity events.</div> : null}
        </div>
      </div>
    </div>
  );
}

function buildListInput(filters: { category: string; severities: string[]; since: string; until: string }): ListActivityEventsInput {
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

function severityLabel(severities: string[]): string {
  if (severities.length === 0) return "All severities";
  return severities.map(labelize).join(", ");
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="text-sm text-slate-500 dark:text-slate-400">{label}</div><div className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">{value}</div></div>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severity === "error" ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200" : severity === "warning" ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200" : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${color}`}>{labelize(severity || "info")}</span>;
}

function CategoryBadge({ category }: { category: string }) {
  return <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">{labelize(category || "activity")}</span>;
}

function labelize(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function formatWhen(value: string): string {
  const seconds = Number.parseFloat(value);
  if (!Number.isFinite(seconds)) return value || "—";
  return new Date(seconds * 1000).toLocaleString();
}
