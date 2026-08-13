import { useState, type FormEvent } from "react";
import { Button, ErrorBox, Form, H2, Input, Label, Text } from "../../../components/typography";
import type { DisableUserInput, UserInfo } from "../../../types/users";
import { principalIdOf } from "../../../types/users";

export type DisableUserDialogProps = {
  user: UserInfo | null;
  onClose: () => void;
  onDisable: (input: DisableUserInput) => Promise<UserInfo>;
  onDisabled: (user: UserInfo) => void;
};

export function DisableUserDialog({ user, onClose, onDisable, onDisabled }: DisableUserDialogProps) {
  const [reason, setReason] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  function reset() {
    setReason("");
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
    setLoading(true);
    try {
      const currentUser = user;
      if (!currentUser) return;
      const updated = await onDisable({
        userId: principalIdOf(currentUser),
        reason: reason.trim() || undefined,
        revokeSessions,
      });
      onDisabled(updated);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disable principal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <Form className="w-full max-w-md p-6" onSubmit={(event) => void handleSubmit(event)}>
        <H2>Disable principal</H2>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
          Disable principal <span className="font-medium text-slate-900 dark:text-slate-100">{user.username}</span> and optionally revoke active sessions.
        </Text>

        {error && <ErrorBox className="mt-4">{error}</ErrorBox>}

        <Label className="mt-5" htmlFor="disable-reason">
          Reason
        </Label>
        <Input
          id="disable-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={loading}
          autoFocus
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
          <Button disabled={loading}>{loading ? "Disabling…" : "Disable principal"}</Button>
        </div>
      </Form>
    </div>
  );
}
