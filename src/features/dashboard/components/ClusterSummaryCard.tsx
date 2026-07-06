import { Text } from "../../../components/typography";
import type { OperatorSession } from "../../../types/auth";

export type ClusterSummaryCardProps = {
  session: OperatorSession;
};

export function ClusterSummaryCard({ session }: ClusterSummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Cluster
      </Text>
      <dl className="mt-5 space-y-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Address</dt>
          <dd className="mt-1 font-medium text-slate-100">{session.addr}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Operator</dt>
          <dd className="mt-1 font-medium text-slate-100">{session.username}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Connection state</dt>
          <dd className="mt-1 inline-flex rounded-full border border-emerald-500/30 bg-emerald-950/50 px-2.5 py-1 text-sm font-medium text-emerald-300">
            Connected
          </dd>
        </div>
      </dl>
    </article>
  );
}
