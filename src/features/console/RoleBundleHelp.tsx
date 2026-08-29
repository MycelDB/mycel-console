import { Text, themeClasses } from "../../components/typography";
import { consoleRoleBundleForRole, consoleRoleBundles } from "./roles";

type RoleBundleHelpProps = {
  roles?: string[];
};

export function RoleBundleHelp({ roles = [] }: RoleBundleHelpProps) {
  const matched = matchedBundles(roles);

  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Role bundle guide
          </Text>
          <Text intent="muted" size="sm" className="mt-1 max-w-3xl">
            Roles are operator-facing labels for capability bundles. The daemon
            remains authoritative: every action is still checked against
            effective capabilities and scope when the API call runs.
          </Text>
        </div>
        {matched.length > 0 && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            {matched.length} matching bundle{matched.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {matched.length > 0 && (
        <section className="mt-5">
          <Text
            as="p"
            size="sm"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Matched current roles
          </Text>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {matched.map(({ role, label }) => (
              <div
                key={`${role}:${label}`}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30"
              >
                <Text
                  as="p"
                  size="sm"
                  className="font-medium text-emerald-900 dark:text-emerald-100"
                >
                  {label}
                </Text>
                <Text intent="muted" size="xs" className="mt-1">
                  from role {role}
                </Text>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        {consoleRoleBundles.map((bundle) => (
          <div
            key={bundle.id}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
          >
            <Text
              as="p"
              size="sm"
              className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {bundle.label}
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              {bundle.description}
            </Text>
            <div
              className="mt-3 flex flex-wrap gap-2"
              aria-label={`${bundle.label} example capabilities`}
            >
              {bundle.exampleCapabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded bg-sky-50 px-2 py-1 font-mono text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
    </article>
  );
}

function matchedBundles(roles: string[]) {
  return roles.flatMap((role) => {
    const bundle = consoleRoleBundleForRole(role);
    return bundle ? [{ role, label: bundle.label }] : [];
  });
}
