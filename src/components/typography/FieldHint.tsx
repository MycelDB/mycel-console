import { useId } from "react";
import { twMerge } from "tailwind-merge";
import { themeClasses } from "./themeClasses";

export type FieldHintProps = {
  children: string;
  label?: string;
  className?: string;
};

export function FieldHint({
  children,
  label = "Field help",
  className,
}: FieldHintProps) {
  const tooltipId = useId();

  return (
    <span
      className={twMerge("group relative inline-flex items-center", className)}
    >
      <button
        type="button"
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-[10px] font-semibold leading-none ${themeClasses.text.parts.subtleLight} transition hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 ${themeClasses.focus.ringSubtle} dark:border-slate-600 dark:bg-slate-800 ${themeClasses.text.parts.darkSecondary} dark:hover:border-sky-500 dark:hover:bg-sky-950 dark:hover:text-sky-200`}
        aria-label={label}
        aria-describedby={tooltipId}
      >
        ?
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 rounded-md border ${themeClasses.border.default} ${themeClasses.surface.elevated} px-3 py-2 text-left text-xs normal-case leading-relaxed tracking-normal ${themeClasses.text.parts.bodyLight} opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100 dark:border-slate-700 ${themeClasses.text.parts.darkStrong}`}
      >
        {children}
      </span>
    </span>
  );
}
