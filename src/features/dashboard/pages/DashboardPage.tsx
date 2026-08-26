import { PageHeader } from "../../../components/layout/PageHeader";
import { canUseCapability, consoleBranding, type ConsolePrincipalContext } from "../../console";
import type { PrincipalSession } from "../../../types/auth";
import { LatestActivityCard } from "../components/LatestActivityCard";
import { BackupStatusCard } from "../components/BackupStatusCard";
import { ClusterSummaryCard } from "../components/ClusterSummaryCard";

export type DashboardPageProps = {
  session: PrincipalSession;
  principalContext?: ConsolePrincipalContext | null;
};

export function DashboardPage({ session, principalContext }: DashboardPageProps) {
  const canReadBackups = canUseCapability(principalContext, "backup.read");

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`${consoleBranding.productDescription} Monitor cluster state and recent activity from here.`}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(28rem,1.4fr)]">
        <ClusterSummaryCard addr={session.addr} />
        <LatestActivityCard principalContext={principalContext} />
      </div>

      {canReadBackups && <BackupStatusCard />}

    </section>
  );
}
