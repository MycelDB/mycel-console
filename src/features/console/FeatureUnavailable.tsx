import { Text } from "../../components/typography";
import type { CapabilityRequirement, FeatureAvailability } from "./capabilities";

export type FeatureUnavailableProps = {
  title?: string;
  message?: string;
  availability?: FeatureAvailability;
  missing?: CapabilityRequirement[];
};

export function FeatureUnavailable({
  title = "Feature unavailable",
  message,
  availability = "hidden",
  missing = [],
}: FeatureUnavailableProps) {
  const defaultMessage = availability === "readonly"
    ? "You can view this feature, but mutation actions are not available for the current principal."
    : "The current principal does not have the required capability for this feature.";

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <Text as="h2" className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </Text>
      <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
        {message ?? defaultMessage}
      </Text>
      {missing.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-400">
          {missing.map((req) => (
            <li key={`${req.capability}-${JSON.stringify(req.scope ?? "")}`}>
              <code>{req.capability}</code>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
