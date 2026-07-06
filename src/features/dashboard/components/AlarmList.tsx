import { Text } from "../../../components/typography";

export function AlarmList() {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
          Alarms
        </Text>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-400">
          0 active
        </span>
      </div>
      <div className="mt-6 rounded-lg border border-dashed border-slate-700 bg-slate-950/40 p-5 text-center">
        <Text as="p" className="font-medium text-slate-100">
          No alarms available yet
        </Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-400">
          Cluster alarm integration will appear here when the health APIs are connected.
        </Text>
      </div>
    </article>
  );
}
