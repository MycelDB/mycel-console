import { H2, Text } from "../../components/typography";

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
          className="font-medium uppercase tracking-[0.3em] text-cyan-300"
        >
          {title}
        </Text>
        <H2 className="mt-2 text-slate-900 dark:text-slate-100">{title}</H2>
        <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          {description}
        </Text>
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6">
        <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">
          Coming soon
        </Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
          This section is part of the console navigation and will be implemented in a dedicated feature phase.
        </Text>
      </div>
    </section>
  );
}
