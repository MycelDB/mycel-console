import { useState, type FormEvent } from "react";
import { Button, Alert, Form, H2, Input, Label, Text } from "../../../components/typography";
import type { PrincipalInfo, SetPrincipalPasswordInput } from "../../../types/users";
import { principalIdOf } from "../../../types/users";

export type SetUserPasswordDialogProps = {
  user: PrincipalInfo | null;
  onClose: () => void;
  onSetPassword: (input: SetPrincipalPasswordInput) => Promise<PrincipalInfo>;
  onPasswordSet: (user: PrincipalInfo) => void;
};

export function SetUserPasswordDialog({
  user,
  onClose,
  onSetPassword,
  onPasswordSet,
}: SetUserPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  function reset() {
    setPassword("");
    setConfirmPassword("");
    setRevokeSessions(true);
    setError("");
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const currentUser = user;
    if (!currentUser) return;
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password confirmation does not match");
      return;
    }

    setLoading(true);
    try {
      const updated = await onSetPassword({
        principalId: principalIdOf(currentUser),
        password,
        revokeSessions,
      });
      onPasswordSet(updated);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Set password failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <Form className="w-full max-w-md p-6" onSubmit={(event) => void handleSubmit(event)}>
        <H2>Set password</H2>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
          Set a new password for <span className="font-medium text-slate-900 dark:text-slate-100">{user.username}</span>.
        </Text>

        {error && <Alert className="mt-4">{error}</Alert>}

        <Label className="mt-5" htmlFor="set-password">
          New password
        </Label>
        <Input
          id="set-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
          autoFocus
        />

        <Label className="mt-4" htmlFor="confirm-password">
          Confirm password
        </Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={loading}
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
            checked={revokeSessions}
            onChange={(event) => setRevokeSessions(event.target.checked)}
            disabled={loading}
          />
          Revoke active sessions
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={loading}>{loading ? "Saving…" : "Set password"}</Button>
        </div>
      </Form>
    </div>
  );
}
