import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { AccountPage } from "../../features/account";
import { BackupsPage } from "../../features/backups";
import { ClusterPage, NodeDetailPage } from "../../features/cluster";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { AccessPage } from "../../features/intelligence/access";
import { AutomationsPage } from "../../features/intelligence/automations";
import { SemanticPage } from "../../features/intelligence/semantic";
import { SpaceDetailPage, SpacesPage } from "../../features/spaces";
import { UserDetailPage, UsersPage } from "../../features/users";
import { Text } from "../typography";
import { evaluateRequirements, navigationCapabilityState, requirement, type CapabilityRequirement, type ConsolePrincipalContext } from "../../features/console";
import type { PrincipalSession } from "../../types/auth";
import type { Theme } from "../../types/theme";

export type AppShellProps = {
  session: PrincipalSession;
  loggingOut: boolean;
  logoutError: string;
  principalContext?: ConsolePrincipalContext | null;
  principalContextLoading?: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
};

function RequireCapabilities({ principalContext, requirements, children }: { principalContext?: ConsolePrincipalContext | null; requirements: CapabilityRequirement[]; children: ReactNode }) {
  const state = navigationCapabilityState(principalContext);
  if (!evaluateRequirements(state, requirements).available) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function PrincipalAccessRedirect() {
  const { principalId = "" } = useParams();
  return <Navigate to={`/principals/${encodeURIComponent(principalId)}?tab=access`} replace />;
}

export function AppShell({
  session,
  loggingOut,
  logoutError,
  principalContext,
  principalContextLoading = false,
  theme,
  onToggleTheme,
  onLogout,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar session={session} theme={theme} loggingOut={loggingOut} principalContext={principalContext} onToggleTheme={onToggleTheme} onLogout={onLogout} />
      <div className="flex min-w-0 flex-1 flex-col">
        {logoutError && (
          <Text
            intent="danger"
            size="sm"
            className="border-b border-red-500/30 bg-red-950/40 px-6 py-2"
          >
            {logoutError}
          </Text>
        )}
        <main className="min-h-0 flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage session={session} principalContext={principalContext} />} />
            <Route path="/me" element={<AccountPage session={session} principalContext={principalContext} loading={principalContextLoading} />} />
            <Route path="/principals" element={<RequireCapabilities principalContext={principalContext} requirements={[requirement("identity.principal.read")]}><UsersPage principalContext={principalContext} /></RequireCapabilities>} />
            <Route path="/principals/:principalId" element={<RequireCapabilities principalContext={principalContext} requirements={[requirement("identity.principal.read")]}><UserDetailPage principalContext={principalContext} /></RequireCapabilities>} />
            <Route path="/principals/:principalId/access" element={<PrincipalAccessRedirect />} />
            <Route path="/access" element={<Navigate to="/principals" replace />} />
            <Route path="/operators" element={<Navigate to="/principals" replace />} />
            <Route path="/spaces" element={<SpacesPage principalContext={principalContext} />} />
            <Route path="/spaces/:spaceId" element={<SpaceDetailPage principalContext={principalContext} />} />
            <Route path="/backups" element={<BackupsPage principalContext={principalContext} />} />
            <Route path="/cluster" element={<ClusterPage />} />
            <Route path="/cluster/nodes/:nodeKey" element={<NodeDetailPage />} />
            <Route path="/inference" element={<Navigate to="/intelligence/access" replace />} />
            <Route path="/semantic" element={<Navigate to="/intelligence/semantic" replace />} />
            <Route path="/intelligence/access" element={<RequireCapabilities principalContext={principalContext} requirements={[requirement("inference.catalog.read")]}><AccessPage principalContext={principalContext} /></RequireCapabilities>} />
            <Route path="/intelligence/automations" element={<RequireCapabilities principalContext={principalContext} requirements={[requirement("automation.read"), requirement("space.read"), requirement("domain.read")]}><AutomationsPage principalContext={principalContext} /></RequireCapabilities>} />
            <Route path="/intelligence/semantic" element={<RequireCapabilities principalContext={principalContext} requirements={[requirement("semantic.search"), requirement("space.read"), requirement("domain.read")]}><SemanticPage principalContext={principalContext} /></RequireCapabilities>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
