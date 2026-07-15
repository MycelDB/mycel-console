import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { Main, Text } from "./components/typography";
import { LoginPage } from "./features/auth";
import { logout as logoutService, whoAmI } from "./services/adminService";
import type { OperatorSession } from "./types/auth";
import { storedTheme, THEME_STORAGE_KEY, type Theme } from "./types/theme";

export default function App() {
  const [session, setSession] = useState<OperatorSession | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState<Theme>(storedTheme);

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

  async function handleLogout() {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await logoutService();
      setSession(null);
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
        theme={theme}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
        onLogout={() => void handleLogout()}
      />
    </BrowserRouter>
  );
}
