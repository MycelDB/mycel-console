import { Input, Label, Text } from "../../../components/typography";

export type SpaceFiltersValue = {
  query: string;
  includeArchived: boolean;
};

export type SpaceFiltersProps = {
  value: SpaceFiltersValue;
  onChange: (value: SpaceFiltersValue) => void;
};

export function SpaceFilters({ value, onChange }: SpaceFiltersProps) {
  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4">
      <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">
        Filters
      </Text>
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_12rem]">
        <div>
          <Label htmlFor="space-query">Name</Label>
          <Input
            id="space-query"
            placeholder="Filter by space name"
            value={value.query}
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => onChange({ ...value, query: event.target.value })}
          />
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-950"
            checked={value.includeArchived}
            onChange={(event) => onChange({ ...value, includeArchived: event.target.checked })}
          />
          Include archived
        </label>
      </div>
    </section>
  );
}
