import type { ComponentProps } from "react";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

export type TextLinkProps = ComponentProps<typeof Link>;

export function TextLink({ className, ...props }: TextLinkProps) {
  return (
    <Link
      className={twMerge(
        "text-sm font-medium text-sky-700 transition hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100",
        className,
      )}
      {...props}
    />
  );
}
