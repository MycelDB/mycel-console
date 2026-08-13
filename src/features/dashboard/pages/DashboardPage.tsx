import { Text } from "../../../components/typography";
import type { PrincipalSession } from "../../../types/auth";
import { AlarmList } from "../components/AlarmList";
import { BackupStatusCard } from "../components/BackupStatusCard";
import { ClusterSummaryCard } from "../components/ClusterSummaryCard";
import { ShortcutGrid } from "../components/ShortcutGrid";

export type DashboardPageProps = {
  session: PrincipalSession;
};

export function DashboardPage({ session }: DashboardPageProps) {
  return (
    <section className="space-y-6">
      <div>
        <Text
          as="p"
          size="sm"
          className="font-medium uppercase tracking-[0.3em] text-cyan-300"
        >
          Dashboard
        </Text>
        <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Monitor Mycel cluster state, alarms, and operational shortcuts from here.
        </Text>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,1.4fr)]">
        <ClusterSummaryCard session={session} />
        <AlarmList />
      </div>

      <BackupStatusCard />

      <ShortcutGrid />
    </section>
  );
}
