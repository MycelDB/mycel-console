import { Text, themeClasses } from "../../components/typography";
import type {
  CapabilityRequirement,
  FeatureAvailability,
} from "./capabilities";

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
  const defaultMessage =
    availability === "readonly"
      ? "You can view this feature, but mutation actions are not available for the current principal."
      : "The current principal does not have the required capability for this feature.";

  return (
    <section
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text
        as="h2"
        className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {title}
      </Text>
      <Text intent="muted" size="sm" className="mt-2">
        {message ?? defaultMessage}
      </Text>
      {missing.length > 0 && (
        <ul className={`mt-3 list-disc space-y-1 pl-5 text-sm ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}>
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
