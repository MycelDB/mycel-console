import { themeClasses } from "./themeClasses";
export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

export type SelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
};

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: SelectProps) {
  return (
    <label
      className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
    >
      {label}
      <span className="relative mt-1 block">
        <select
          aria-label={label}
          className={`block w-full appearance-none rounded-md border border-slate-300 ${themeClasses.surface.input} px-3 py-2 pr-10 text-sm ${themeClasses.text.parts.primaryLight} transition focus-visible:border-sky-500 ${themeClasses.focus.ring} disabled:opacity-60 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.hint ? `${option.label} — ${option.hint}` : option.label}
            </option>
          ))}
        </select>
        <span
          className={`pointer-events-none absolute inset-y-0 right-3 flex items-center ${themeClasses.text.parts.quietLight}`}
        >
          ⌄
        </span>
      </span>
    </label>
  );
}
