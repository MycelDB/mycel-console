import type { PrincipalInfo } from "../../../types/users";
import { themeClasses } from "../../../components/typography";

export type UserStateBadgeProps = {
  state: PrincipalInfo["state"];
};

const stateClasses: Record<string, string> = {
  PRINCIPAL_STATE_ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300",
  PRINCIPAL_STATE_DISABLED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300",
  PRINCIPAL_STATE_DELETED: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/50 dark:text-red-300",
  PRINCIPAL_STATE_UNSPECIFIED: `border-slate-300 bg-slate-100 ${themeClasses.text.parts.bodyLight} dark:border-slate-600 dark:bg-slate-900 ${themeClasses.text.parts.darkSecondary}`,
};

const stateLabels: Record<string, string> = {
  PRINCIPAL_STATE_ACTIVE: "Active",
  PRINCIPAL_STATE_DISABLED: "Disabled",
  PRINCIPAL_STATE_DELETED: "Deleted",
  PRINCIPAL_STATE_UNSPECIFIED: "Unspecified",
};

export function UserStateBadge({ state }: UserStateBadgeProps) {
  const stateKey = state || "PRINCIPAL_STATE_UNSPECIFIED";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        stateClasses[stateKey] ?? stateClasses.PRINCIPAL_STATE_UNSPECIFIED
      }`}
    >
      {stateLabels[stateKey] ?? stateKey}
    </span>
  );
}
