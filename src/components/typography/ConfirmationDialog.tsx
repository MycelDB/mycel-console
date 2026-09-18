import type { ReactNode } from "react";
import { Button } from "./Button";
import { H2 } from "./H2";
import { Text } from "./Text";
import { themeClasses } from "./themeClasses";

type ConfirmationDialogIntent = "default" | "danger";

export type ConfirmationDialogProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  children: ReactNode;
  details?: ReactNode;
  error?: ReactNode;
  loading?: boolean;
  cancelLabel?: string;
  confirmLabel?: string;
  loadingLabel?: string;
  intent?: ConfirmationDialogIntent;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmationDialog({
  eyebrow,
  title,
  children,
  details,
  error,
  loading = false,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  loadingLabel = "Working…",
  intent = "default",
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const isDanger = intent === "danger";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80"
      role="presentation"
    >
      <div
        className={`w-full max-w-md rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-6 shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-dialog-title"
      >
        {eyebrow && (
          <Text
            as="p"
            size="sm"
            className={`font-medium uppercase tracking-[0.2em] ${
              isDanger ? "text-red-500 dark:text-red-300" : "text-sky-600 dark:text-sky-300"
            }`}
          >
            {eyebrow}
          </Text>
        )}
        <H2
          id="confirmation-dialog-title"
          className={`mt-2 text-xl ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {title}
        </H2>
        <Text intent="muted" size="sm" className="mt-3">
          {children}
        </Text>
        {details && (
          <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-950/60">
            {details}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
