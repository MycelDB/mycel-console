import { useState, type FormEvent } from "react";
import { Button, ErrorBox, Form, H2, Input, Label, Text } from "../../../components/typography";
import type { CreateSpaceInput, CreateSpaceResponse } from "../../../types/spaces";
import type { CreatePrincipalInput, PrincipalInfo } from "../../../types/users";
import { principalIdOf } from "../../../types/users";

export type CreateUserModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (input: CreatePrincipalInput) => Promise<PrincipalInfo>;
  onCreatePersonalSpace?: (input: CreateSpaceInput) => Promise<CreateSpaceResponse>;
  canCreatePersonalSpace?: boolean;
  onCreated: (principal: PrincipalInfo, warning?: string) => void;
};

export function CreateUserModal({ open, onClose, onCreate, onCreatePersonalSpace, canCreatePersonalSpace = false, onCreated }: CreateUserModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [disabled, setDisabled] = useState(false);
  const [createPersonalSpace, setCreatePersonalSpace] = useState(false);
  const [personalSpaceName, setPersonalSpaceName] = useState("");
  const [defaultDomainKey, setDefaultDomainKey] = useState("default");
  const [defaultDomainName, setDefaultDomainName] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  function reset() {
    setUsername("");
    setPassword("");
    setDisabled(false);
    setCreatePersonalSpace(false);
    setPersonalSpaceName("");
    setDefaultDomainKey("default");
    setDefaultDomainName("default");
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

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError("Username is required");
      return;
    }

    const trimmedSpaceName = personalSpaceName.trim() || trimmedUsername;
    const trimmedDomainKey = defaultDomainKey.trim() || "default";
    const trimmedDomainName = defaultDomainName.trim() || trimmedDomainKey;
    if (createPersonalSpace && !trimmedSpaceName) {
      setError("Personal space name is required");
      return;
    }

    setLoading(true);
    try {
      const principal = await onCreate({
        username: trimmedUsername,
        password: password || undefined,
        disabled,
      });
      if (createPersonalSpace && onCreatePersonalSpace) {
        try {
          await onCreatePersonalSpace({
            name: trimmedSpaceName,
            ownerUserId: principalIdOf(principal) || undefined,
            ownerUsername: principal.username || trimmedUsername,
            defaultDomainKey: trimmedDomainKey,
            defaultDomainName: trimmedDomainName,
          });
        } catch (spaceErr) {
          onCreated(principal, `Principal created, but personal space creation failed: ${spaceErr instanceof Error ? spaceErr.message : "Create space failed"}`);
          reset();
          onClose();
          return;
        }
      }
      onCreated(principal);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create principal failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <Form className="w-full max-w-md p-6" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <H2>Create principal</H2>
            <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
              Create a human mycel principal. Passwords are sent to the daemon and are never returned.
            </Text>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close create principal dialog"
          >
            ✕
          </button>
        </div>

        {error && <ErrorBox className="mt-4">{error}</ErrorBox>}

        <Label className="mt-5" htmlFor="create-username">
          Username
        </Label>
        <Input
          id="create-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
          disabled={loading}
        />

        <Label className="mt-4" htmlFor="create-password">
          Initial password
        </Label>
        <Input
          id="create-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={loading}
        />

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
            checked={disabled}
            onChange={(event) => setDisabled(event.target.checked)}
            disabled={loading}
          />
          Create disabled
        </label>

        {canCreatePersonalSpace && onCreatePersonalSpace && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
                checked={createPersonalSpace}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setCreatePersonalSpace(checked);
                  if (checked && !personalSpaceName.trim()) setPersonalSpaceName(username.trim());
                }}
                disabled={loading}
              />
              Create a personal space
            </label>
            {createPersonalSpace && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Space name</span>
                  <Input className="mt-1" value={personalSpaceName} onChange={(event) => setPersonalSpaceName(event.target.value)} autoCapitalize="none" spellCheck={false} disabled={loading} />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Default domain key</span>
                  <Input className="mt-1" value={defaultDomainKey} onChange={(event) => setDefaultDomainKey(event.target.value)} autoCapitalize="none" spellCheck={false} disabled={loading} />
                </label>
                <label className="block text-sm text-slate-700 dark:text-slate-300 sm:col-span-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Default domain name</span>
                  <Input className="mt-1" value={defaultDomainName} onChange={(event) => setDefaultDomainName(event.target.value)} autoCapitalize="none" spellCheck={false} disabled={loading} />
                </label>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button disabled={loading}>{loading ? "Creating…" : "Create principal"}</Button>
        </div>
      </Form>
    </div>
  );
}
