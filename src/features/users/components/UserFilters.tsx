import { Input, Label, Text } from "../../../components/typography";
import type { UserState } from "../../../types/users";

export type UserStateFilter = "all" | UserState;

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
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <Text as="p" size="sm" className="font-medium text-slate-100">
        Filters
      </Text>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <Label htmlFor="user-query">Username</Label>
          <Input
            id="user-query"
            placeholder="Filter by username"
            value={value.query}
            onChange={(event) => onChange({ ...value, query: event.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="user-state">State</Label>
          <select
            id="user-state"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
            value={value.state}
            onChange={(event) => onChange({ ...value, state: event.target.value as UserStateFilter })}
          >
            <option value="all">All states</option>
            <option value="USER_STATE_ACTIVE">Active</option>
            <option value="USER_STATE_DISABLED">Disabled</option>
            <option value="USER_STATE_DELETED">Deleted</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
            checked={value.includeDisabled}
            onChange={(event) => onChange({ ...value, includeDisabled: event.target.checked })}
          />
          Include disabled
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-600 bg-slate-950"
            checked={value.includeDeleted}
            onChange={(event) => onChange({ ...value, includeDeleted: event.target.checked })}
          />
          Include deleted
        </label>
      </div>
    </section>
  );
}
