import { useId } from "react";
import { twMerge } from "tailwind-merge";

export type FieldHintProps = {
  children: string;
  label?: string;
  className?: string;
};

export function FieldHint({ children, label = "Field help", className }: FieldHintProps) {
  const tooltipId = useId();

  return (
    <span className={twMerge("group relative inline-flex items-center", className)}>
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[10px] font-semibold leading-none text-slate-600 transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-sky-500 dark:hover:bg-sky-950 dark:hover:text-sky-200"
        aria-label={label}
        aria-describedby={tooltipId}
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs normal-case leading-relaxed tracking-normal text-slate-700 opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {children}
      </span>
    </span>
  );
}
