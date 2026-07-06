import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";

const shortcuts = [
  {
    label: "Manage users",
    description: "List, filter, create, disable, and delete users.",
    to: "/users",
  },
  {
    label: "View spaces",
    description: "Inspect spaces and ownership across the cluster.",
    to: "/spaces",
  },
  {
    label: "Operators",
    description: "Review operator access, roles, and capabilities.",
    to: "/operators",
  },
  {
    label: "Maintenance",
    description: "Run and monitor operational maintenance workflows.",
    to: "/maintenance",
  },
];

export function ShortcutGrid() {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Shortcuts
      </Text>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.to}
            className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 transition hover:border-sky-700 hover:bg-sky-950/30"
            to={shortcut.to}
          >
            <Text as="p" className="font-medium text-slate-100">
              {shortcut.label}
            </Text>
            <Text intent="muted" size="sm" className="mt-2 text-slate-400">
              {shortcut.description}
            </Text>
          </Link>
        ))}
      </div>
    </article>
  );
}
