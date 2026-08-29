import {
  Input,
  Label,
  Select,
  Text,
  themeClasses,
} from "../../../components/typography";
import type { PrincipalState } from "../../../types/users";

export type UserStateFilter = "all" | PrincipalState;

export type UserFiltersValue = {
  query: string;
  state: UserStateFilter;
};

export type UserFiltersProps = {
  value: UserFiltersValue;
  onChange: (value: UserFiltersValue) => void;
};

export function UserFilters({ value, onChange }: UserFiltersProps) {
  return (
    <section
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <Text
        as="p"
        size="sm"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
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
            onChange={(event) =>
              onChange({ ...value, query: event.target.value })
            }
          />
        </div>
        <div>
          <Select
            label="State"
            value={value.state}
            onChange={(state) =>
              onChange({ ...value, state: state as UserStateFilter })
            }
            options={[
              { value: "all", label: "All states" },
              { value: "PRINCIPAL_STATE_ACTIVE", label: "Active" },
              { value: "PRINCIPAL_STATE_DISABLED", label: "Disabled" },
              { value: "PRINCIPAL_STATE_DELETED", label: "Deleted" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
