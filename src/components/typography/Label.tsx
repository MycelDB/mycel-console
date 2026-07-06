import { twMerge } from "tailwind-merge";
import type { LabelHTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={twMerge(`mb-1 block text-sm font-medium ${themeClasses.text.primary}`, className)}
      {...props}
    />
  );
}
