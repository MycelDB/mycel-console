import { Text } from "../../../components/typography";
import type { VectorStoreInfo } from "../../../types/inference";

export function VectorStoreTable({ stores }: { stores: VectorStoreInfo[] }) {
  if (stores.length === 0) return <Empty message="No vector stores found." />;
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Status</th><th className="px-4 py-3">Key</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Privacy</th></tr></thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{stores.map((store) => <tr key={store.vectorStoreId}><td className="px-4 py-3">{store.enabled ? "Enabled" : "Disabled"}</td><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{store.key}</td><td className="px-4 py-3">{store.name || "—"}</td><td className="px-4 py-3">{store.type || "—"}</td><td className="px-4 py-3">{store.privacyClass || "—"}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900/70"><Text intent="muted" className="text-slate-600 dark:text-slate-400">{message}</Text></div>;
}
