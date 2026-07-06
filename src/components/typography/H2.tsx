import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

type H2Props = HTMLAttributes<HTMLHeadingElement>;

export function H2({ className, ...props }: H2Props) {
  return (
    <h2
      className={twMerge(`text-3xl font-semibold tracking-tight ${themeClasses.text.primary}`, className)}
      {...props}
    />
  );
}
