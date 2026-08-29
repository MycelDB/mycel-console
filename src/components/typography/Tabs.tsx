import { KeyboardEvent, useMemo, useRef } from "react";
import { themeClasses } from "./themeClasses";

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  disabled?: boolean;
};

export type TabsProps<T extends string = string> = {
  tabs: readonly TabItem<T>[];
  active: T;
  onChange: (tab: T) => void;
  ariaLabel: string;
  className?: string;
};

export function Tabs<T extends string = string>({
  tabs,
  active,
  onChange,
  ariaLabel,
  className = "",
}: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabledTabs = useMemo(
    () => tabs.filter((tab) => !tab.disabled),
    [tabs],
  );

  function focusTab(index: number) {
    refs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    const enabledIndex = enabledTabs.findIndex((tab) => tab.id === active);
    if (enabledIndex < 0 || enabledTabs.length === 0) return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextEnabled =
      enabledTabs[
        (enabledIndex + direction + enabledTabs.length) % enabledTabs.length
      ];
    const nextIndex = tabs.findIndex((tab) => tab.id === nextEnabled.id);
    if (nextIndex < 0) return;
    onChange(nextEnabled.id);
    requestAnimationFrame(() => focusTab(nextIndex));
  }

  return (
    <div
      className={`border-b ${themeClasses.border.default} ${className}`.trim()}
    >
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab, index) => {
          const selected = active === tab.id;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              disabled={tab.disabled}
              className={[
                "rounded-t-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
                themeClasses.focus.ring,
                selected
                  ? `border ${themeClasses.border.default} border-b-transparent ${themeClasses.surface.tabActive} ${themeClasses.text.parts.headingLight} dark:border-b-slate-950 ${themeClasses.text.parts.darkPrimary}`
                  : `border border-transparent ${themeClasses.text.parts.subtleLight} hover:bg-slate-100 ${themeClasses.text.hover.primary} ${themeClasses.text.parts.darkMuted} dark:hover:bg-slate-900`,
              ].join(" ")}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
