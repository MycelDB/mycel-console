import type { ThHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";
import { themeClasses } from "./themeClasses";

export function TableHead({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={twMerge(
        `px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.surface.tableHeader} ${themeClasses.text.muted}`,
        className,
      )}
      {...props}
    />
  );
}
