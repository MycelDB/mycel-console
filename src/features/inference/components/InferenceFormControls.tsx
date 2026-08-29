import {
  Input,
  Select,
  Text,
  themeClasses,
} from "../../../components/typography";

export type SelectFieldOption = {
  value: string;
  label: string;
  hint?: string;
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label
      className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
    >
      {label}
      <Input
        type={type}
        className="mt-1 block text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

export function MultiSelectChecklist({
  label,
  values,
  options,
  emptyText,
  onToggle,
}: {
  label: string;
  values: string[];
  options: SelectFieldOption[];
  emptyText: string;
  onToggle: (value: string, checked: boolean) => void;
}) {
  return (
    <fieldset className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend
        className={`px-1 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {label}
      </legend>
      {options.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-2">
          {emptyText}
        </Text>
      ) : (
        <div className="mt-2 max-h-40 space-y-2 overflow-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={values.includes(option.value)}
                onChange={(event) =>
                  onToggle(option.value, event.target.checked)
                }
                aria-label={`${label}: ${option.label}`}
              />
              <span>
                <span
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  {option.label}
                </span>
                {option.hint && (
                  <span
                    className={`block text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
                    {option.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

export function uniqueOptions(options: SelectFieldOption[]) {
  return Array.from(
    new Map(options.map((option) => [option.value, option])).values(),
  );
}
