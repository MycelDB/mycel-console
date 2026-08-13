import { useState } from "react";
import { Main } from "../../../components/typography";
import type { ConnectionDiagnosticsResponse, LoginInput, OperatorSession } from "../../../types/auth";
import { connectionDiagnostics as defaultConnectionDiagnostics, login as defaultLogin } from "../../../services/adminService";
import { LoginForm } from "../components/LoginForm";

export type LoginPageProps = {
  onLoginSuccess: (session: OperatorSession) => void;
  loginService?: (input: LoginInput) => Promise<OperatorSession>;
  diagnosticsService?: (input: LoginInput) => Promise<ConnectionDiagnosticsResponse>;
};

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function LoginPage({ onLoginSuccess, loginService = defaultLogin, diagnosticsService = defaultConnectionDiagnostics }: LoginPageProps) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ConnectionDiagnosticsResponse | null>(null);

  async function handleSubmit(input: LoginInput) {
    setError("");
    setLoading(true);
    try {
      if (!input.addr.trim()) throw new Error("Cluster gRPC address is required");
      if (!input.username.trim()) throw new Error("Principal username is required");
      if (!input.password) throw new Error("Password is required");
      const session = await loginService(input);
      onLoginSuccess(session);
    } catch (err) {
      setError(errorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDiagnostics(input: LoginInput) {
    setError("");
    setDiagnosticsLoading(true);
    try {
      setDiagnostics(await diagnosticsService(input));
    } catch (err) {
      setError(errorMessage(err, "Connection diagnostics failed"));
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
        diagnostics={diagnostics}
        onSubmit={handleSubmit}
        onRunDiagnostics={handleDiagnostics}
      />
    </Main>
  );
}
