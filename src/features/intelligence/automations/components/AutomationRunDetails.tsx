import {
  Alert,
  EnumBadge,
  ResourceIdText,
  Text,
  TextLink,
  formatEnumLabel,
  shortResourceId,
  themeClasses,
} from "../../../../components/typography";
import type { AutomationRunInfo } from "../../../../types/automations";
import type { PrincipalInfo } from "../../../../types/users";
import type { ConsolePrincipalContext } from "../../../console";

const inlineAttemptLimit = 3;

export function AutomationRunDetails({
  info,
  spaceId,
  principalById,
  principalContext,
}: {
  info: AutomationRunInfo;
  spaceId: string;
  principalById?: Map<string, PrincipalInfo>;
  principalContext?: ConsolePrincipalContext | null;
}) {
  const run = info.projection;
  if (!run) {
    return (
      <Alert variant="warning">
        Typed automation run evidence is unavailable from this daemon version.
        Legacy run JSON is not displayed because Console cannot verify that it
        follows the sanitized v0.21 allowlist.
      </Alert>
    );
  }

  const attemptsUrl = `/intelligence/automations?${new URLSearchParams({
    tab: "attempts",
    spaceId,
    domainId: run.domainId,
    procedureId: run.procedureId,
    invocationId: run.invocationId,
    runId: run.id,
  }).toString()}`;

  return (
    <div className="space-y-6">
      {run.state === "unsupported" && (
        <Alert variant="warning">
          This daemon returned unsupported automation run state code{" "}
          {run.stateCode}. Console will not infer a lifecycle state.
        </Alert>
      )}

      <section aria-label="Automation run lifecycle">
        <SectionTitle>Lifecycle</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EvidenceItem label="State">
            <EnumBadge
              value={
                run.state === "unsupported"
                  ? `unsupported (${run.stateCode})`
                  : run.state
              }
            />
          </EvidenceItem>
          <EvidenceItem
            label="Outcome"
            value={formatEnumLabel(run.outcomeCategory) || "—"}
          />
          <EvidenceItem
            label="Run attempt"
            value={run.attemptNumber > 0 ? String(run.attemptNumber) : "—"}
          />
          <EvidenceItem
            label="Started"
            value={formatTimestamp(run.startedAt)}
          />
          <EvidenceItem
            label="Completed"
            value={formatTimestamp(run.completedAt)}
          />
          <EvidenceItem label="Invocation ID">
            <ResourceIdText value={run.invocationId || "—"} />
          </EvidenceItem>
        </div>
      </section>

      <section aria-label="Automation run definition versions">
        <SectionTitle>Definition versions</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <VersionEvidence
            label="Procedure"
            id={run.procedureId}
            version={run.procedureVersion}
          />
          <VersionEvidence
            label="Binding"
            id={run.bindingId}
            version={run.bindingVersion}
          />
        </div>
      </section>

      <section aria-label="Automation run attribution">
        <SectionTitle>Attribution</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <PrincipalEvidence
            label="Actor"
            principalId={run.actorPrincipalId}
            principalById={principalById}
            principalContext={principalContext}
          />
          <PrincipalEvidence
            label="Owner"
            principalId={run.ownerPrincipalId}
            principalById={principalById}
            principalContext={principalContext}
          />
          <PrincipalEvidence
            label="On behalf of"
            principalId={run.onBehalfOfPrincipalId}
            principalById={principalById}
            principalContext={principalContext}
          />
          <PrincipalEvidence
            label="Event origin"
            principalId={run.eventOriginPrincipalId}
            principalById={principalById}
            principalContext={principalContext}
          />
        </div>
      </section>

      <section aria-label="Automation run inference route">
        <SectionTitle>Inference profile and configured route</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <EvidenceItem
            label="Profile"
            value={run.inferenceProfile || run.inferenceProfileId || "—"}
          />
          <EvidenceItem label="Profile ID">
            <ResourceIdText value={run.inferenceProfileId || "—"} />
          </EvidenceItem>
          <EvidenceItem label="Endpoint ID">
            <ResourceIdText value={run.endpointId || "—"} />
          </EvidenceItem>
          <EvidenceItem label="Model ID">
            <ResourceIdText value={run.modelId || "—"} />
          </EvidenceItem>
          <EvidenceItem label="Capability ID">
            <ResourceIdText value={run.capabilityId || "—"} />
          </EvidenceItem>
          <EvidenceItem label="Policy decision ID">
            <ResourceIdText value={run.policyDecisionId || "—"} />
          </EvidenceItem>
        </div>
      </section>

      <section aria-label="Automation run token evidence">
        <SectionTitle>Token evidence</SectionTitle>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <EvidenceItem label="Input tokens" value={run.inputTokens} />
          <EvidenceItem label="Output tokens" value={run.outputTokens} />
          <EvidenceItem label="Total tokens" value={run.totalTokens} />
          <EvidenceItem
            label="Count authority"
            value={formatEnumLabel(run.tokenCountAuthority) || "—"}
          />
        </div>
      </section>

      <section aria-label="Procedure inference attempt references">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle>Inference attempts</SectionTitle>
          {run.inferenceAttemptIds.length > 0 && (
            <TextLink to={attemptsUrl}>
              View {run.inferenceAttemptIds.length} attempt
              {run.inferenceAttemptIds.length === 1 ? "" : "s"} in explorer
            </TextLink>
          )}
        </div>
        {run.inferenceAttemptIds.length === 0 ? (
          <Text intent="muted" size="sm" className="mt-3">
            No inference attempts were reported for this run.
          </Text>
        ) : (
          <div className="mt-3 space-y-1">
            {run.inferenceAttemptIds
              .slice(0, inlineAttemptLimit)
              .map((attemptId) => (
                <div key={attemptId}>
                  <ResourceIdText value={attemptId} />
                </div>
              ))}
            {run.inferenceAttemptIds.length > inlineAttemptLimit && (
              <Text intent="muted" size="sm">
                {run.inferenceAttemptIds.length - inlineAttemptLimit} additional
                attempt references are available in the explorer.
              </Text>
            )}
          </div>
        )}
      </section>

      {info.diagnosticJson && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-sky-700 dark:text-sky-300">
            Raw sanitized JSON
          </summary>
          <pre
            className={`mt-3 overflow-auto rounded-lg bg-slate-950 p-4 text-xs ${themeClasses.text.parts.inverseSoft}`}
          >
            {info.diagnosticJson}
          </pre>
        </details>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text as="h4" className="font-semibold">
      {children}
    </Text>
  );
}

function EvidenceItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <div className="mt-1 break-all text-sm">{children ?? value ?? "—"}</div>
    </div>
  );
}

function VersionEvidence({
  label,
  id,
  version,
}: {
  label: string;
  id: string;
  version: number;
}) {
  return (
    <EvidenceItem label={label}>
      {id ? <ResourceIdText value={id} /> : "—"}
      {version > 0 && <span className="ml-2">v{version}</span>}
    </EvidenceItem>
  );
}

function PrincipalEvidence({
  label,
  principalId,
  principalById,
  principalContext,
}: {
  label: string;
  principalId: string;
  principalById?: Map<string, PrincipalInfo>;
  principalContext?: ConsolePrincipalContext | null;
}) {
  if (!principalId) return <EvidenceItem label={label} value="—" />;
  const principal = principalById?.get(principalId);
  const session = principalContext?.session;
  const display =
    principal?.displayName ||
    principal?.username ||
    (session?.principalId === principalId ? session.username : "") ||
    shortResourceId(principalId);
  return (
    <EvidenceItem label={label}>
      <TextLink
        to={`/principals/${encodeURIComponent(principalId)}`}
        title={principalId}
      >
        {display}
      </TextLink>
      {display !== principalId && (
        <div className="mt-1 text-xs">
          <ResourceIdText value={principalId} />
        </div>
      )}
    </EvidenceItem>
  );
}

function formatTimestamp(value: string) {
  if (!value) return "—";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}
