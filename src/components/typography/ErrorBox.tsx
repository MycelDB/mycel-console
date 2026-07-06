import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

type ErrorBoxProps = HTMLAttributes<HTMLDivElement>;

export function ErrorBox({ className, ...props }: ErrorBoxProps) {
  return (
    <div
      role="alert"
      className={twMerge(
        `rounded-md border p-3 text-sm ${themeClasses.border.danger} ${themeClasses.surface.danger} ${themeClasses.text.danger}`,
        className,
      )}
      {...props}
    />
  );
}
