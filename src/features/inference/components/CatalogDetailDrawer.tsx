import { Button, Text, themeClasses } from "../../../components/typography";

export function CatalogDetailDrawer({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
      <aside
        className={`h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {title}
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Raw catalog metadata from the daemon.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <pre
          className={`mt-4 overflow-auto rounded-lg bg-slate-950 p-4 text-xs ${themeClasses.text.parts.inverseSoft}`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </aside>
    </div>
  );
}
