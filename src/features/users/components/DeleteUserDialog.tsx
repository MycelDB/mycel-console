import { useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Form,
  H2,
  Input,
  Label,
  ResourceIdText,
  Text,
  themeClasses,
} from "../../../components/typography";
import type { DeletePrincipalInput, PrincipalInfo } from "../../../types/users";
import { principalIdOf } from "../../../types/users";

export type DeleteUserDialogProps = {
  user: PrincipalInfo | null;
  onClose: () => void;
  onDelete: (input: DeletePrincipalInput) => Promise<PrincipalInfo>;
  onDeleted: (user: PrincipalInfo) => void;
};

export function DeleteUserDialog({
  user,
  onClose,
  onDelete,
  onDeleted,
}: DeleteUserDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const [revokeSessions, setRevokeSessions] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!user) return null;

  const confirmed = confirmation === user.username;

  function reset() {
    setConfirmation("");
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
    if (confirmation !== currentUser.username) {
      setError("Type the username to confirm deletion");
      return;
    }

    setLoading(true);
    try {
      const deleted = await onDelete({
        principalId: principalIdOf(currentUser),
        revokeSessions,
      });
      onDeleted(deleted);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete principal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <Form
        className="w-full max-w-md p-6"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <H2>Delete principal</H2>
        <Text intent="muted" size="sm" className="mt-2">
          This will delete{" "}
          <span className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
            {user.username}
          </span>
          . This action is destructive.
        </Text>

        {error && <Alert className="mt-4">{error}</Alert>}

        <div className="mt-5 rounded-lg border border-red-500/30 bg-red-950/30 p-3">
          <Text size="sm" className="text-red-200">
            Type{" "}
            <span className="font-mono font-semibold">{user.username}</span> to
            confirm.
          </Text>
          <Text intent="muted" size="xs" className="mt-1">
            Principal ID: <ResourceIdText value={principalIdOf(user)} />
          </Text>
        </div>

        <Label className="mt-4" htmlFor="delete-confirmation">
          Confirmation
        </Label>
        <Input
          id="delete-confirmation"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          disabled={loading}
          autoFocus
        />

        <label className={`mt-4 flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}>
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
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button disabled={loading || !confirmed}>
            {loading ? "Deleting…" : "Delete principal"}
          </Button>
        </div>
      </Form>
    </div>
  );
}
