import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Main, Text } from "./components/typography";
import { LoginPage } from "./features/auth";
import { consoleBranding, loadConsolePrincipalContext, type ConsolePrincipalContext } from "./features/console";
import { logout as logoutService, whoAmI } from "./services/adminService";
import type { PrincipalSession } from "./types/auth";
import { storedTheme, THEME_STORAGE_KEY, type Theme } from "./types/theme";

export default function App() {
  const [session, setSession] = useState<PrincipalSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [principalContext, setPrincipalContext] = useState<ConsolePrincipalContext | null>(null);
  const [principalContextLoading, setPrincipalContextLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>(storedTheme);

  useEffect(() => {
    document.title = consoleBranding.currentDisplayName;
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    let cancelled = false;
    whoAmI()
      .then((restoredSession) => {
        if (!cancelled) setSession(restoredSession);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setAuthReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setPrincipalContext(null);
      setPrincipalContextLoading(false);
      return () => {
        cancelled = true;
      };
    }
    setPrincipalContext(null);
    setPrincipalContextLoading(true);
    loadConsolePrincipalContext(session)
      .then((context) => {
        if (!cancelled) setPrincipalContext(context);
      })
      .finally(() => {
        if (!cancelled) setPrincipalContextLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await logoutService();
      setSession(null);
      setPrincipalContext(null);
    } catch (err) {
      setLogoutError(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setLoggingOut(false);
    }
  }

  if (!authReady) {
    return (
      <Main className="flex items-center justify-center px-4">
        <Text intent="muted">Restoring session…</Text>
      </Main>
    );
  }

  if (!session) {
    return <LoginPage onLoginSuccess={setSession} />;
  }

  return (
    <BrowserRouter>
      <AppShell
        session={session}
        loggingOut={loggingOut}
        logoutError={logoutError}
        principalContext={principalContext}
        principalContextLoading={principalContextLoading}
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onLogout={() => void handleLogout()}
      />
    </BrowserRouter>
  );
}
