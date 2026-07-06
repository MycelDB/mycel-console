import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { DashboardPage } from "../../features/dashboard/pages/DashboardPage";
import { ComingSoonPage } from "../../features/placeholder/ComingSoonPage";
import { SpacesPage } from "../../features/spaces";
import { UsersPage } from "../../features/users";
import { Text } from "../typography";
import type { OperatorSession } from "../../types/auth";

export type AppShellProps = {
  session: OperatorSession;
  loggingOut: boolean;
  logoutError: string;
  onLogout: () => void;
};

const placeholderRoutes = [
  {
    path: "/domains",
    title: "Domains",
    description: "Review domain configuration and domain-level operational state.",
  },
  {
    path: "/operators",
    title: "Operators",
    description: "Manage admin operators, roles, capabilities, and access.",
  },
  {
    path: "/semantic",
    title: "Semantic",
    description: "Inspect semantic indexing, providers, models, and backfill state.",
  },
  {
    path: "/maintenance",
    title: "Maintenance",
    description: "Run and monitor cluster maintenance workflows.",
  },
  {
    path: "/inference",
    title: "Inference",
    description: "Configure inference providers and runtime behavior.",
  },
  {
    path: "/settings",
    title: "Settings",
    description: "Configure local admin console preferences and cluster connection options.",
  },
];

export function AppShell({ session, loggingOut, logoutError, onLogout }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar />
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
            <Route path="/users" element={<UsersPage />} />
            <Route path="/spaces" element={<SpacesPage />} />
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
