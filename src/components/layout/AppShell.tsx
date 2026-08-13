import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { BackupsPage } from "../../features/backups";
import { ClusterPage, NodeDetailPage } from "../../features/cluster";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { InferencePage } from "../../features/inference";
import { MaintenancePage } from "../../features/maintenance";
import { ComingSoonPage } from "../../features/placeholder/ComingSoonPage";
import { SpaceDetailPage, SpacesPage } from "../../features/spaces";
import { UserDetailPage, UsersPage } from "../../features/users";
import { Text } from "../typography";
import type { OperatorSession } from "../../types/auth";
import type { Theme } from "../../types/theme";

export type AppShellProps = {
  session: OperatorSession;
  loggingOut: boolean;
  logoutError: string;
  theme: Theme;
  onToggleTheme: () => void;
  onLogout: () => void;
};

const placeholderRoutes = [
  {
    path: "/access",
    title: "Admin access",
    description: "Manage admin-capable principals, roles, capabilities, and scoped access.",
  },
  {
    path: "/semantic",
    title: "Semantic",
    description: "Inspect semantic indexing, providers, models, and backfill state.",
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Configure local admin console preferences and cluster connection options.",
  },
];

export function AppShell({
  session,
  loggingOut,
  logoutError,
  theme,
  onToggleTheme,
  onLogout,
}: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar theme={theme} onToggleTheme={onToggleTheme} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header session={session} loggingOut={loggingOut} onLogout={onLogout} />
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
            <Route path="/dashboard" element={<DashboardPage session={session} />} />
            <Route path="/principals" element={<UsersPage />} />
            <Route path="/principals/:userId" element={<UserDetailPage />} />
            <Route path="/users" element={<Navigate to="/principals" replace />} />
            <Route path="/users/:userId" element={<UserDetailPage />} />
            <Route path="/operators" element={<Navigate to="/access" replace />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/spaces/:spaceId" element={<SpaceDetailPage />} />
            <Route path="/backups" element={<BackupsPage />} />
            <Route path="/cluster" element={<ClusterPage />} />
            <Route path="/cluster/nodes/:nodeKey" element={<NodeDetailPage />} />
            <Route path="/inference" element={<InferencePage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            {placeholderRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={<ComingSoonPage title={route.title} description={route.description} />}
              />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
