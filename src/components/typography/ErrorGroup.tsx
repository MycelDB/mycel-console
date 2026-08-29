import { useCallback, useMemo, useState } from "react";
import { Alert } from "./Alert";
import { Button } from "./Button";

export type PanelError = {
  /** Stable key — also used for dedupe. e.g. "cluster.health" */
  id: string;
  /** What failed, in operator language. e.g. "Cluster health" */
  source: string;
  /** Why, as returned or as a fallback. */
  message: string;
  severity?: "error" | "warning";
  onRetry?: () => void;
};

export type ErrorGroupProps = {
  errors: PanelError[];
  title?: string;
  max?: number;
  onRetryAll?: () => void;
};

export type CaptureErrorOptions = {
  id: string;
  source: string;
  fallback: string;
  severity?: PanelError["severity"];
  onRetry?: () => void;
};

export function ErrorGroup({
  errors,
  title,
  max = 3,
  onRetryAll,
}: ErrorGroupProps) {
  const uniqueErrors = dedupeErrors(errors);
  if (uniqueErrors.length === 0) return null;

  const variant = strongestSeverity(uniqueErrors);
  if (uniqueErrors.length === 1) {
    const error = uniqueErrors[0];
    return (
      <Alert variant={variant}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="font-medium">{error.source}</span>: {error.message}
          </div>
          {error.onRetry && (
            <Button type="button" variant="ghost" onClick={error.onRetry}>
              Retry
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  const visibleMax = Math.max(0, max);
  const visibleErrors = uniqueErrors.slice(0, visibleMax);
  const remaining = uniqueErrors.length - visibleErrors.length;

  return (
    <Alert variant={variant}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="font-medium">
            {title || `${uniqueErrors.length} requests failed`}
          </div>
          {onRetryAll && (
            <Button type="button" variant="ghost" onClick={onRetryAll}>
              Retry all
            </Button>
          )}
        </div>
        <ul className="space-y-2">
          {visibleErrors.map((error) => (
            <li
              key={error.id}
              className="flex flex-wrap items-start justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-medium">{error.source}</span>:{" "}
                {error.message}
              </div>
              {error.onRetry && (
                <Button type="button" variant="ghost" onClick={error.onRetry}>
                  Retry
                </Button>
              )}
            </li>
          ))}
          {remaining > 0 && <li>+{remaining} more</li>}
        </ul>
      </div>
    </Alert>
  );
}

export function useErrorGroup(initialErrors: PanelError[] = []) {
  const [errors, setErrors] = useState<PanelError[]>(initialErrors);

  const capture = useCallback(
    (result: PromiseSettledResult<unknown>, options: CaptureErrorOptions) => {
      if (result.status === "fulfilled") return;
      setErrors((current) =>
        dedupeErrors([
          ...current,
          {
            id: options.id,
            source: options.source,
            message: errorMessage(result.reason, options.fallback),
            severity: options.severity,
            onRetry: options.onRetry,
          },
        ]),
      );
    },
    [],
  );

  const clear = useCallback(() => setErrors([]), []);

  const retryAll = useCallback(() => {
    for (const error of dedupeErrors(errors)) error.onRetry?.();
  }, [errors]);

  return useMemo(
    () => ({ errors, capture, clear, retryAll }),
    [capture, clear, errors, retryAll],
  );
}

export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}

function dedupeErrors(errors: PanelError[]): PanelError[] {
  const seen = new Set<string>();
  const uniqueErrors: PanelError[] = [];
  for (const error of errors) {
    if (seen.has(error.id)) continue;
    seen.add(error.id);
    uniqueErrors.push(error);
  }
  return uniqueErrors;
}

function strongestSeverity(errors: PanelError[]) {
  return errors.some((error) => (error.severity || "error") === "error")
    ? "error"
    : "warning";
}
