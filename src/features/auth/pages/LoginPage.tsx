import { useState } from "react";
import { Main } from "../../../components/typography";
import type { AppError, ConnectionDiagnosticsResponse, LoginInput, PrincipalSession } from "../../../types/auth";
import { connectionDiagnostics as defaultConnectionDiagnostics, login as defaultLogin, normalizeAppError } from "../../../services/adminService";
import { LoginForm } from "../components/LoginForm";
import { writeLoginHints } from "../loginHints";

export type LoginPageProps = {
  onLoginSuccess: (session: PrincipalSession) => void;
  loginService?: (input: LoginInput) => Promise<PrincipalSession>;
  diagnosticsService?: (input: LoginInput) => Promise<ConnectionDiagnosticsResponse>;
  notice?: string;
};

function validationError(message: string): AppError {
  return { kind: "validation", severity: "warning", message };
}

function loginDisplayError(err: unknown): AppError {
  const appError = normalizeAppError(err, "Login failed");
  if (appError.kind === "connectivity") {
    return { ...appError, severity: "error", message: "Could not connect to the Mycel daemon.", detail: appError.detail || appError.message };
  }
  if (appError.kind === "unavailable") {
    return { ...appError, severity: "error", message: "The Mycel daemon is unavailable.", detail: appError.detail || appError.message };
  }
  if (appError.kind === "timeout") {
    return { ...appError, severity: "error", message: "The Mycel daemon request timed out.", detail: appError.detail || appError.message };
  }
  if (["validation", "authentication", "authorization"].includes(appError.kind)) {
    return { ...appError, severity: "warning" };
  }
  return { ...appError, severity: "error" };
}

export function LoginPage({ onLoginSuccess, loginService = defaultLogin, diagnosticsService = defaultConnectionDiagnostics, notice = "" }: LoginPageProps) {
  const [error, setError] = useState<AppError | null>(null);
  const [loading, setLoading] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnosticsResponse | null>(null);

  async function handleSubmit(input: LoginInput) {
    setError(null);
    setLoading(true);
    try {
      if (!input.addr.trim()) throw validationError("Cluster gRPC address is required");
      if (!input.username.trim()) throw validationError("Principal username is required");
      if (!input.password) throw validationError("Password is required");
      const session = await loginService(input);
      writeLoginHints(input);
      onLoginSuccess(session);
    } catch (err) {
      setError(loginDisplayError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDiagnostics(input: LoginInput) {
    setError(null);
    setDiagnosticsLoading(true);
    try {
      setDiagnostics(await diagnosticsService(input));
    } catch (err) {
      setError(normalizeAppError(err, "Connection diagnostics failed"));
    } finally {
      setDiagnosticsLoading(false);
    }
  }

  return (
    <Main className="flex items-center justify-center px-4">
      <LoginForm
        loading={loading}
        diagnosticsLoading={diagnosticsLoading}
        error={error}
        notice={notice}
        diagnostics={diagnostics}
        onSubmit={handleSubmit}
        onRunDiagnostics={handleDiagnostics}
      />
    </Main>
  );
}
