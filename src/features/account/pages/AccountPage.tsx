import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  formatEnumLabel,
  PrincipalLabel,
  Text,
  themeClasses,
} from "../../../components/typography";
import { RoleBundleHelp, type ConsolePrincipalContext } from "../../console";
import type { PrincipalSession } from "../../../types/auth";

export type AccountPageProps = {
  session: PrincipalSession;
  principalContext?: ConsolePrincipalContext | null;
  loading?: boolean;
};

export function AccountPage({
  session,
  principalContext,
  loading = false,
}: AccountPageProps) {
  const roles = principalContext?.roles ?? [];
  const capabilities = principalContext?.capabilities ?? [];
  const warnings = principalContext?.warnings ?? [];
  const state = principalContext?.capabilityState.kind ?? "unknown";
  const discoveryUnavailable = state === "unknown";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="My principal"
        description="View the principal and access context currently loaded by this console. Daemon APIs remain authoritative for every action."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Session">
          <Detail label="Cluster" value={session.addr} />
          <div>
            <dt className={`text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
              Principal
            </dt>
            <dd className="mt-1">
              <PrincipalLabel
                principalId={session.principalId}
                username={session.username}
                link
              />
            </dd>
          </div>
        </Panel>
        <Panel title="Access context">
          <Detail
            label="Discovery state"
            value={loading ? "Loading" : formatEnumLabel(state, "Unknown")}
          />
          <Detail label="Effective roles" value={String(roles.length)} />
          <Detail
            label="Effective capabilities"
            value={String(capabilities.length)}
          />
          {warnings.length > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              {warnings.join("; ")}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Roles and capabilities">
        <TokenSection
          label="Roles"
          values={roles}
          empty={
            discoveryUnavailable
              ? "Access discovery unavailable."
              : "No effective roles reported for this principal."
          }
        />
        <TokenSection
          label="Effective capabilities"
          values={capabilities}
          empty={
            discoveryUnavailable
              ? "Access discovery unavailable."
              : "No effective capabilities reported for this principal."
          }
        />
        <Text intent="muted" size="sm">
          Role labels help operators understand common bundles; effective
          capabilities and scopes are what the daemon authorizes.
        </Text>
      </Panel>

      <RoleBundleHelp roles={roles} />

      <Panel title="Console entry points">
        <div className="flex flex-wrap gap-2">
          <ConsoleLink to="/spaces">Open accessible spaces</ConsoleLink>
          <ConsoleLink
            to={`/principals/${encodeURIComponent(session.principalId)}`}
          >
            Open principal detail
          </ConsoleLink>
          <ConsoleLink
            to={`/principals/${encodeURIComponent(session.principalId)}?tab=access`}
          >
            Open access details
          </ConsoleLink>
        </div>
        <Text intent="muted" size="sm" className="mt-3">
          Some links may require additional capabilities. Permission-denied
          responses are still enforced by the daemon.
        </Text>
      </Panel>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
    >
      <Text as="h3" className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {title}
      </Text>
      <div className="mt-4 space-y-3">{children}</div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className={`text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
        {label}
      </dt>
      <dd className={`mt-1 break-words text-sm ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
        {value || "Not reported"}
      </dd>
    </div>
  );
}

function TokenSection({
  label,
  values,
  empty,
}: {
  label: string;
  values: string[];
  empty: string;
}) {
  return (
    <div>
      <Text
        as="p"
        size="sm"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {label}
      </Text>
      {values.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-2">
          {empty}
        </Text>
      ) : (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <span
              key={value}
              className="rounded bg-sky-50 px-2 py-1 font-mono text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200"
            >
              {value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConsoleLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      className={`rounded-md border border-slate-300 px-3 py-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} hover:bg-slate-100 dark:border-slate-700 ${themeClasses.text.parts.darkPrimary} dark:hover:bg-slate-800`}
      to={to}
    >
      {children}
    </Link>
  );
}
