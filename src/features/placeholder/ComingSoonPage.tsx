import { H2, Text, themeClasses } from "../../components/typography";

export type ComingSoonPageProps = {
  title: string;
  description: string;
};

export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <section className="space-y-6">
      <div>
        <Text
          as="p"
          size="sm"
          className={`font-medium uppercase tracking-[0.3em] ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
        >
          {title}
        </Text>
        <H2 className={`mt-2 ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>{title}</H2>
        <Text intent="muted" className="mt-2 max-w-2xl">
          {description}
        </Text>
      </div>
      <div
        className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
      >
        <Text as="p" className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          Coming soon
        </Text>
        <Text intent="muted" size="sm" className="mt-2">
          This section is part of the console navigation and will be implemented
          in a dedicated feature phase.
        </Text>
      </div>
    </section>
  );
}
