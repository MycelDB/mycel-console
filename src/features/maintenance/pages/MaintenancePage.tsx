import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, H2, Text } from "../../../components/typography";
import { listSpaces as defaultListSpaces } from "../../../services/adminService";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../types/spaces";

export function MaintenancePage({ listSpacesService = defaultListSpaces }: { listSpacesService?: (input: ListSpacesInput) => Promise<ListSpacesResponse> }) {
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await listSpacesService({ pageSize: 100, includeArchived: true });
        if (!cancelled) setSpaces(response.spaces);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load spaces");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [listSpacesService]);

  return <section className="space-y-6"><div><Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">Maintenance</Text><H2 className="mt-2">Maintenance dashboard</H2><Text intent="muted" className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">Current maintenance APIs are space-scoped. Use this dashboard to jump to a space's semantic maintenance status, work queue, and safe actions.</Text></div>{error && <ErrorBox>{error}</ErrorBox>}{loading ? <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted">Loading spaces…</Text></div> : <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Space</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Owner</th><th className="px-4 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{spaces.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={4}>No spaces found.</td></tr> : spaces.map((space) => <tr key={space.spaceId}><td className="px-4 py-3 font-medium">{space.name || space.spaceId}</td><td className="px-4 py-3">{space.state || "—"}</td><td className="px-4 py-3">{space.owner?.displayName || space.owner?.id || "—"}</td><td className="px-4 py-3"><Link className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(space.spaceId)}`}>Open maintenance</Link></td></tr>)}</tbody></table></div>}</section>;
}
