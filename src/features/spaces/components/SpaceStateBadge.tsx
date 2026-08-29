import type { SpaceInfo } from "../../../types/spaces";
import { themeClasses } from "../../../components/typography";

export type SpaceStateBadgeProps = {
  state?: SpaceInfo["state"];
};

const stateClasses: Record<string, string> = {
  SPACE_STATE_ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300",
  SPACE_STATE_ARCHIVED: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300",
  SPACE_STATE_UNSPECIFIED: `border-slate-300 bg-slate-100 ${themeClasses.text.parts.bodyLight} dark:border-slate-600 dark:bg-slate-900 ${themeClasses.text.parts.darkSecondary}`,
};

const stateLabels: Record<string, string> = {
  SPACE_STATE_ACTIVE: "Active",
  SPACE_STATE_ARCHIVED: "Archived",
  SPACE_STATE_UNSPECIFIED: "Unspecified",
};

export function SpaceStateBadge({ state }: SpaceStateBadgeProps) {
  const stateKey = state || "SPACE_STATE_UNSPECIFIED";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${
        stateClasses[stateKey] ?? stateClasses.SPACE_STATE_UNSPECIFIED
      }`}
    >
      {stateLabels[stateKey] ?? stateKey}
    </span>
  );
}
