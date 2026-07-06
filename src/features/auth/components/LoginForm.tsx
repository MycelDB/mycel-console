import { useState } from "react";
import { Button, ErrorBox, Form, H2, Input, Label, Text } from "../../../components/typography";
import { DEFAULT_CLUSTER_ADDR, type LoginInput } from "../../../types/auth";

export type LoginFormProps = {
  loading: boolean;
  error: string;
  onSubmit: (input: LoginInput) => Promise<void>;
};

export function LoginForm({ loading, error, onSubmit }: LoginFormProps) {
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

      <Button className="mt-6 w-full" disabled={loading}>
        {loading ? "Logging in…" : "Login"}
      </Button>
    </Form>
  );
}
