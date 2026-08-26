import { twMerge } from "tailwind-merge";
import type { HTMLAttributes, ReactNode } from "react";

type AlertVariant = "error" | "warning" | "info" | "success";

type AlertProps = HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
  icon?: boolean | ReactNode;
};

const variantClasses: Record<AlertVariant, string> = {
  error: "border-red-300/60 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-950/60 dark:text-red-300",
  warning: "border-amber-300/70 bg-amber-50 text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/50 dark:text-amber-200",
  info: "border-sky-300/70 bg-sky-50 text-sky-800 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-200",
  success: "border-emerald-300/70 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-950/50 dark:text-emerald-200",
};

const defaultIcons: Record<AlertVariant, ReactNode> = {
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  success: "✅",
};

export function Alert({ variant = "error", icon = true, className, children, role, ...props }: AlertProps) {
  const renderedIcon = icon === true ? defaultIcons[variant] : icon || null;
  return (
    <div
      role={role ?? (variant === "info" || variant === "success" ? "status" : "alert")}
      className={twMerge("flex items-start gap-2 rounded-md border p-3 text-sm", variantClasses[variant], className)}
      {...props}
    >
      {renderedIcon && <span aria-hidden="true" className="shrink-0 leading-5">{renderedIcon}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export type { AlertProps, AlertVariant };
