import type { PrincipalInfo } from "../../../types/users";

export type UserStateBadgeProps = {
  state: PrincipalInfo["state"];
};

const stateClasses: Record<string, string> = {
  PRINCIPAL_STATE_ACTIVE: "border-emerald-500/30 bg-emerald-950/50 text-emerald-300",
  PRINCIPAL_STATE_DISABLED: "border-amber-500/30 bg-amber-950/50 text-amber-300",
  PRINCIPAL_STATE_DELETED: "border-red-500/30 bg-red-950/50 text-red-300",
  PRINCIPAL_STATE_UNSPECIFIED: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300",
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
