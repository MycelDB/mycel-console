import { Input, Label, Select, Text } from "../../../components/typography";
import type { PrincipalState } from "../../../types/users";

export type UserStateFilter = "all" | PrincipalState;

export type UserFiltersValue = {
  query: string;
  state: UserStateFilter;
  includeDisabled: boolean;
  includeDeleted: boolean;
};

export type UserFiltersProps = {
  value: UserFiltersValue;
  onChange: (value: UserFiltersValue) => void;
};

export function UserFilters({ value, onChange }: UserFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
      <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">
        Filters
      </Text>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <Label htmlFor="user-query">Username</Label>
          <Input
            id="user-query"
            placeholder="Filter by username"
            value={value.query}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => onChange({ ...value, query: event.target.value })}
          />
        </div>
        <div>
          <Select
            label="State"
            value={value.state}
            onChange={(state) => onChange({ ...value, state: state as UserStateFilter })}
            options={[
              { value: "all", label: "All states" },
              { value: "PRINCIPAL_STATE_ACTIVE", label: "Active" },
              { value: "PRINCIPAL_STATE_DISABLED", label: "Disabled" },
              { value: "PRINCIPAL_STATE_DELETED", label: "Deleted" },
            ]}
          />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
            checked={value.includeDisabled}
            onChange={(event) => onChange({ ...value, includeDisabled: event.target.checked })}
          />
          Include disabled
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
            checked={value.includeDeleted}
            onChange={(event) => onChange({ ...value, includeDeleted: event.target.checked })}
          />
          Include deleted
        </label>
      </div>
    </section>
  );
}
