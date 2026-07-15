import { useState } from "react";
import { Button, ErrorBox, Form, H2, Input, Label, Text } from "../../../components/typography";
import { DEFAULT_CLUSTER_ADDR, type ConnectionDiagnosticsResponse, type LoginInput } from "../../../types/auth";

export type LoginFormProps = {
  loading: boolean;
  diagnosticsLoading?: boolean;
  error: string;
  diagnostics?: ConnectionDiagnosticsResponse | null;
  onSubmit: (input: LoginInput) => Promise<void>;
  onRunDiagnostics?: (input: LoginInput) => Promise<void>;
};

export function LoginForm({ loading, diagnosticsLoading = false, error, diagnostics, onSubmit, onRunDiagnostics }: LoginFormProps) {
  const [addr, setAddr] = useState(DEFAULT_CLUSTER_ADDR);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Form
      className="w-full max-w-sm p-6"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit({ addr, username, password });
      }}
    >
      <H2 className="mb-1">Mycel Admin</H2>
      <Text intent="muted" size="sm" className="mb-6">
        Log in with your operator credentials to manage a Mycel cluster.
      </Text>

      {error && <ErrorBox className="mb-4">{error}</ErrorBox>}

      <Label htmlFor="addr">Cluster gRPC address</Label>
      <Input
        id="addr"
        value={addr}
        onChange={(event) => setAddr(event.target.value)}
        autoComplete="off"
        disabled={loading}
      />

      <Label className="mt-4" htmlFor="username">
        Operator username
      </Label>
      <Input
        id="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoComplete="username"
        autoFocus
        disabled={loading}
      />

      <Label className="mt-4" htmlFor="password">
        Password
      </Label>
      <Input
        id="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        disabled={loading}
      />

      <div className="mt-6 grid gap-2">
        <Button className="w-full" disabled={loading || diagnosticsLoading}>
          {loading ? "Logging in…" : "Login"}
        </Button>
        {onRunDiagnostics && (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={loading || diagnosticsLoading || !addr.trim()}
            onClick={() => void onRunDiagnostics({ addr, username, password })}
          >
            {diagnosticsLoading ? "Running diagnostics…" : "Run connection diagnostics"}
          </Button>
        )}
      </div>

      {diagnostics && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
          <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">Connection diagnostics</Text>
          <dl className="mt-3 space-y-2">
            {diagnostics.checks.map((check) => (
              <div key={check.id}>
                <dt className="font-medium text-slate-900 dark:text-slate-100">{statusIcon(check.status)} {check.label}</dt>
                <dd className="mt-0.5 text-slate-600 dark:text-slate-400">{check.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Form>
  );
}

function statusIcon(status: string) {
  if (status === "pass") return "✅";
  if (status === "warn") return "⚠️";
  if (status === "fail") return "❌";
  return "•";
}
