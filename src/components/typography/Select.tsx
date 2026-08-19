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

export function Select({ label, value, onChange, options, placeholder, disabled = false }: SelectProps) {
  return (
    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
      {label}
      <span className="relative mt-1 block">
        <select
          aria-label={label}
          className="block w-full appearance-none rounded-md border border-slate-300 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.hint ? `${option.label} — ${option.hint}` : option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">⌄</span>
      </span>
    </label>
  );
}
