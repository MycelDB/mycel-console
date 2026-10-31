import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  DomainLabel,
  EnumBadge,
  Input,
  ResourceIdText,
  Select,
  SpaceLabel,
  TableHead,
  Text,
  TextLink,
  formatEnumLabel,
  themeClasses,
} from "../../../../components/typography";
import {
  getProcedureInferenceAttempt as defaultGetAttempt,
  listProcedureInferenceAttemptChanges as defaultListChanges,
  listProcedureInferenceAttempts as defaultListAttempts,
} from "../../../../services/adminService";
import type { AppError } from "../../../../types/auth";
import type { DomainInfo } from "../../../../types/domains";
import type {
  GetProcedureInferenceAttemptInput,
  ListProcedureInferenceAttemptChangesInput,
  ListProcedureInferenceAttemptChangesResponseInfo,
  ListProcedureInferenceAttemptsInput,
  ListProcedureInferenceAttemptsResponseInfo,
  ProcedureInferenceAttemptFilterInput,
  ProcedureInferenceAttemptInfo,
  ProcedureInferenceAttemptState,
  ProcedureInferenceOperation,
} from "../../../../types/procedureInference";
import type { SpaceInfo } from "../../../../types/spaces";
import type { PrincipalInfo } from "../../../../types/users";
import {
  canUseCapability,
  type ConsolePrincipalContext,
} from "../../../console";

const attemptStates: ProcedureInferenceAttemptState[] = [
  "requested",
  "authorized",
  "started",
  "succeeded",
  "failed",
  "denied",
  "canceled",
  "ambiguous",
];

const operationOptions: Array<{
  value: ProcedureInferenceOperation;
  label: string;
}> = [
  { value: "chat", label: "Chat" },
  { value: "summarize", label: "Summarize" },
  { value: "classify", label: "Classify" },
  { value: "embeddings", label: "Embeddings" },
  { value: "rerank", label: "Rerank" },
  { value: "image_analysis", label: "Image analysis" },
];

type DraftFilter = {
  spaceId: string;
  domainId: string;
  procedureId: string;
  procedureVersion: string;
  bindingId: string;
  bindingVersion: string;
  invocationId: string;
  runId: string;
  workflowStepId: string;
  endpointId: string;
  modelId: string;
  capabilityId: string;
  operation: "" | ProcedureInferenceOperation;
  states: ProcedureInferenceAttemptState[];
  eventOriginPrincipalId: string;
  actorPrincipalId: string;
  ownerPrincipalId: string;
  onBehalfOfPrincipalId: string;
  requestedAtOrAfter: string;
  requestedBefore: string;
  completedAtOrAfter: string;
  completedBefore: string;
};

export type ProcedureInferenceAttemptsPanelProps = {
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  principals?: PrincipalInfo[];
  principalContext?: ConsolePrincipalContext | null;
  initialSpaceId?: string;
  initialDomainId?: string;
  pollIntervalMs?: number;
  listAttemptsService?: (
    input: ListProcedureInferenceAttemptsInput,
  ) => Promise<ListProcedureInferenceAttemptsResponseInfo>;
  listChangesService?: (
    input: ListProcedureInferenceAttemptChangesInput,
  ) => Promise<ListProcedureInferenceAttemptChangesResponseInfo>;
  getAttemptService?: (
    input: GetProcedureInferenceAttemptInput,
  ) => Promise<ProcedureInferenceAttemptInfo>;
};

export function ProcedureInferenceAttemptsPanel({
  spaces,
  domains,
  principals = [],
  principalContext,
  initialSpaceId = "",
  initialDomainId = "",
  pollIntervalMs = 5000,
  listAttemptsService = defaultListAttempts,
  listChangesService = defaultListChanges,
  getAttemptService = defaultGetAttempt,
}: ProcedureInferenceAttemptsPanelProps) {
  const canReadAttempts =
    canUseCapability(principalContext, "automation.read") &&
    canUseCapability(principalContext, "inference.audit.read");
  const authorizationVisibilityKey = visibilityKey(principalContext);
  const [draft, setDraft] = useState<DraftFilter>(() =>
    emptyDraft(initialSpaceId, initialDomainId),
  );
  const [applied, setApplied] = useState<DraftFilter>(() =>
    emptyDraft(initialSpaceId, initialDomainId),
  );
  const [attempts, setAttempts] = useState<ProcedureInferenceAttemptInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [snapshotCursor, setSnapshotCursor] = useState("");
  const [snapshotHighWater, setSnapshotHighWater] = useState("0");
  const [earliestRetainedState, setEarliestRetainedState] = useState("0");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState("");
  const [compatibilityUnavailable, setCompatibilityUnavailable] =
    useState(false);
  const [historyGapNotice, setHistoryGapNotice] = useState("");
  const [detail, setDetail] = useState<ProcedureInferenceAttemptInfo | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const requestEpochRef = useRef(0);
  const cursorRef = useRef("");
  const seenEventIdsRef = useRef(new Set<string>());
  const pollingRef = useRef(false);
  const visibilityKeyRef = useRef(authorizationVisibilityKey);
  visibilityKeyRef.current = authorizationVisibilityKey;

  useEffect(() => {
    if (applied.spaceId || spaces.length === 0) return;
    const spaceId =
      spaces.find((space) => space.spaceId === initialSpaceId)?.spaceId ||
      spaces[0].spaceId;
    const domainId = domains.some(
      (domain) =>
        domain.domainId === initialDomainId && domain.spaceId === spaceId,
    )
      ? initialDomainId
      : "";
    const initial = emptyDraft(spaceId, domainId);
    setDraft(initial);
    setApplied(initial);
  }, [applied.spaceId, domains, initialDomainId, initialSpaceId, spaces]);

  const principalById = useMemo(
    () =>
      new Map(
        principals.map((principal) => [principal.principalId, principal]),
      ),
    [principals],
  );
  const filteredDomains = useMemo(
    () => domains.filter((domain) => domain.spaceId === draft.spaceId),
    [domains, draft.spaceId],
  );

  const loadFreshSnapshot = useCallback(async () => {
    if (!canReadAttempts || !applied.spaceId) return;
    const epoch = ++requestEpochRef.current;
    const requestVisibilityKey = authorizationVisibilityKey;
    setLoading(true);
    setError("");
    setCompatibilityUnavailable(false);
    setNextPageToken("");
    setSnapshotCursor("");
    cursorRef.current = "";
    seenEventIdsRef.current.clear();
    try {
      const response = await listAttemptsService({
        spaceId: applied.spaceId,
        filter: toFilterInput(applied),
        pageSize: 50,
        pageToken: "",
      });
      if (
        requestEpochRef.current !== epoch ||
        visibilityKeyRef.current !== requestVisibilityKey
      )
        return;
      setAttempts(sortAttempts(response.attempts));
      setNextPageToken(response.nextPageToken);
      setSnapshotCursor(response.snapshotCursor);
      cursorRef.current = response.snapshotCursor;
      setSnapshotHighWater(response.snapshotHighWaterSequence);
      setEarliestRetainedState(response.earliestRetainedStateSequence);
    } catch (cause) {
      if (requestEpochRef.current !== epoch) return;
      if (isUnavailable(cause)) setCompatibilityUnavailable(true);
      else
        setError(
          errorMessage(cause, "Failed to load procedure inference attempts"),
        );
      setAttempts([]);
    } finally {
      if (requestEpochRef.current === epoch) setLoading(false);
    }
  }, [
    applied,
    authorizationVisibilityKey,
    canReadAttempts,
    listAttemptsService,
  ]);

  useEffect(() => {
    void loadFreshSnapshot();
    return () => {
      requestEpochRef.current += 1;
    };
  }, [loadFreshSnapshot]);

  const pollChanges = useCallback(async () => {
    if (
      pollingRef.current ||
      !canReadAttempts ||
      !applied.spaceId ||
      !cursorRef.current
    )
      return;
    pollingRef.current = true;
    setPolling(true);
    const epoch = requestEpochRef.current;
    try {
      const response = await listChangesService({
        spaceId: applied.spaceId,
        filter: toFilterInput(applied),
        pageSize: 100,
        afterCursor: cursorRef.current,
      });
      if (requestEpochRef.current !== epoch) return;
      if (response.historyGap) {
        setHistoryGapNotice(
          "Attempt history was compacted. The explorer rebuilt from a fresh current-state snapshot.",
        );
        await loadFreshSnapshot();
        return;
      }
      const unseenAttempts: ProcedureInferenceAttemptInfo[] = [];
      for (const change of response.changes) {
        if (seenEventIdsRef.current.has(change.eventId)) continue;
        seenEventIdsRef.current.add(change.eventId);
        if (change.attempt) unseenAttempts.push(change.attempt);
      }
      if (unseenAttempts.length > 0) {
        setAttempts((current) => mergeAttempts(current, unseenAttempts));
      }
      if (response.nextCursor) {
        cursorRef.current = response.nextCursor;
        setSnapshotCursor(response.nextCursor);
      }
      setSnapshotHighWater(response.highWaterSequence);
      setEarliestRetainedState(response.earliestRetainedStateSequence);
    } catch (cause) {
      if (requestEpochRef.current !== epoch) return;
      if (isUnavailable(cause)) setCompatibilityUnavailable(true);
      else
        setError(
          errorMessage(
            cause,
            "Failed to poll procedure inference attempt changes",
          ),
        );
    } finally {
      pollingRef.current = false;
      setPolling(false);
    }
  }, [applied, canReadAttempts, listChangesService, loadFreshSnapshot]);

  useEffect(() => {
    if (!snapshotCursor || !canReadAttempts || pollIntervalMs <= 0) return;
    const timer = window.setInterval(() => void pollChanges(), pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [canReadAttempts, pollChanges, pollIntervalMs, snapshotCursor]);

  async function loadNextPage() {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    setError("");
    const epoch = requestEpochRef.current;
    try {
      const response = await listAttemptsService({
        spaceId: applied.spaceId,
        filter: toFilterInput(applied),
        pageSize: 50,
        pageToken: nextPageToken,
      });
      if (requestEpochRef.current !== epoch) return;
      setAttempts((current) => mergeAttempts(current, response.attempts));
      setNextPageToken(response.nextPageToken);
    } catch (cause) {
      if (requestEpochRef.current === epoch)
        setError(errorMessage(cause, "Failed to load the next attempt page"));
    } finally {
      if (requestEpochRef.current === epoch) setLoadingMore(false);
    }
  }

  async function showAttempt(attemptId: string) {
    setDetailLoading(true);
    setError("");
    try {
      setDetail(
        await getAttemptService({
          spaceId: applied.spaceId,
          attemptId,
        }),
      );
    } catch (cause) {
      if (isUnavailable(cause)) setCompatibilityUnavailable(true);
      else setError(errorMessage(cause, "Failed to load attempt details"));
    } finally {
      setDetailLoading(false);
    }
  }

  function applyFilters() {
    setDetail(null);
    setHistoryGapNotice("");
    setApplied(normalizeDraft(draft));
  }

  function resetFilters() {
    const reset = emptyDraft(draft.spaceId || spaces[0]?.spaceId || "", "");
    setDraft(reset);
    setApplied(reset);
    setDetail(null);
    setHistoryGapNotice("");
  }

  if (!canReadAttempts) {
    return (
      <div className="p-4">
        <Alert variant="warning">
          Procedure inference evidence requires both automation.read and
          inference.audit.read. No attempt RPC was called.
        </Alert>
      </div>
    );
  }

  if (spaces.length === 0) {
    return (
      <div className="p-4">
        <Alert variant="info">No readable spaces are available.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Procedure inference attempts
          </Text>
          <Text intent="muted" size="sm">
            Sanitized, daemon-authoritative lifecycle evidence with
            snapshot-bound pagination and live change polling.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => void pollChanges()}
            disabled={polling || loading || !snapshotCursor}
          >
            {polling ? "Checking…" : "Check for updates"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void loadFreshSnapshot()}
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Fresh snapshot"}
          </Button>
        </div>
      </div>

      {compatibilityUnavailable && (
        <Alert variant="info">
          Procedure inference attempt evidence is unavailable on this daemon
          version. Existing automation inventory remains available.
        </Alert>
      )}
      {historyGapNotice && <Alert variant="warning">{historyGapNotice}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <details
        open
        className={`rounded-lg border ${themeClasses.border.default} p-4`}
      >
        <summary className="cursor-pointer font-medium">
          Attempt filters
        </summary>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              label="Attempt space"
              value={draft.spaceId}
              onChange={(spaceId) =>
                setDraft((current) => ({ ...current, spaceId, domainId: "" }))
              }
              options={spaces.map((space) => ({
                value: space.spaceId,
                label: space.name || space.spaceId,
              }))}
            />
            <Select
              label="Attempt domain"
              value={draft.domainId}
              onChange={(domainId) =>
                setDraft((current) => ({ ...current, domainId }))
              }
              options={filteredDomains.map((domain) => ({
                value: domain.domainId,
                label: domain.name || domain.key || domain.domainId,
              }))}
              placeholder="All domains"
            />
            <Select
              label="Operation"
              value={draft.operation}
              onChange={(operation) =>
                setDraft((current) => ({
                  ...current,
                  operation: operation as DraftFilter["operation"],
                }))
              }
              options={operationOptions}
              placeholder="All operations"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Lifecycle states</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {attemptStates.map((state) => (
                <label key={state} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.states.includes(state)}
                    onChange={() =>
                      setDraft((current) => ({
                        ...current,
                        states: toggleValue(current.states, state),
                      }))
                    }
                  />
                  {formatEnumLabel(state)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterTextField
              label="Procedure ID"
              value={draft.procedureId}
              onChange={(procedureId) =>
                setDraft((current) => ({ ...current, procedureId }))
              }
            />
            <FilterTextField
              label="Procedure version"
              type="number"
              min="1"
              value={draft.procedureVersion}
              onChange={(procedureVersion) =>
                setDraft((current) => ({ ...current, procedureVersion }))
              }
            />
            <FilterTextField
              label="Binding ID"
              value={draft.bindingId}
              onChange={(bindingId) =>
                setDraft((current) => ({ ...current, bindingId }))
              }
            />
            <FilterTextField
              label="Binding version"
              type="number"
              min="1"
              value={draft.bindingVersion}
              onChange={(bindingVersion) =>
                setDraft((current) => ({ ...current, bindingVersion }))
              }
            />
            <FilterTextField
              label="Invocation ID"
              value={draft.invocationId}
              onChange={(invocationId) =>
                setDraft((current) => ({ ...current, invocationId }))
              }
            />
            <FilterTextField
              label="Run ID"
              value={draft.runId}
              onChange={(runId) =>
                setDraft((current) => ({ ...current, runId }))
              }
            />
            <FilterTextField
              label="Workflow step ID"
              value={draft.workflowStepId}
              onChange={(workflowStepId) =>
                setDraft((current) => ({ ...current, workflowStepId }))
              }
            />
            <FilterTextField
              label="Endpoint ID"
              value={draft.endpointId}
              onChange={(endpointId) =>
                setDraft((current) => ({ ...current, endpointId }))
              }
            />
            <FilterTextField
              label="Model ID"
              value={draft.modelId}
              onChange={(modelId) =>
                setDraft((current) => ({ ...current, modelId }))
              }
            />
            <FilterTextField
              label="Capability ID"
              value={draft.capabilityId}
              onChange={(capabilityId) =>
                setDraft((current) => ({ ...current, capabilityId }))
              }
            />
            <FilterTextField
              label="Event-origin principal ID"
              value={draft.eventOriginPrincipalId}
              onChange={(eventOriginPrincipalId) =>
                setDraft((current) => ({ ...current, eventOriginPrincipalId }))
              }
            />
            <FilterTextField
              label="Actor principal ID"
              value={draft.actorPrincipalId}
              onChange={(actorPrincipalId) =>
                setDraft((current) => ({ ...current, actorPrincipalId }))
              }
            />
            <FilterTextField
              label="Owner principal ID"
              value={draft.ownerPrincipalId}
              onChange={(ownerPrincipalId) =>
                setDraft((current) => ({ ...current, ownerPrincipalId }))
              }
            />
            <FilterTextField
              label="On-behalf-of principal ID"
              value={draft.onBehalfOfPrincipalId}
              onChange={(onBehalfOfPrincipalId) =>
                setDraft((current) => ({ ...current, onBehalfOfPrincipalId }))
              }
            />
            <FilterTextField
              label="Requested at or after"
              type="datetime-local"
              value={draft.requestedAtOrAfter}
              onChange={(requestedAtOrAfter) =>
                setDraft((current) => ({ ...current, requestedAtOrAfter }))
              }
            />
            <FilterTextField
              label="Requested before"
              type="datetime-local"
              value={draft.requestedBefore}
              onChange={(requestedBefore) =>
                setDraft((current) => ({ ...current, requestedBefore }))
              }
            />
            <FilterTextField
              label="Completed at or after"
              type="datetime-local"
              value={draft.completedAtOrAfter}
              onChange={(completedAtOrAfter) =>
                setDraft((current) => ({ ...current, completedAtOrAfter }))
              }
            />
            <FilterTextField
              label="Completed before"
              type="datetime-local"
              value={draft.completedBefore}
              onChange={(completedBefore) =>
                setDraft((current) => ({ ...current, completedBefore }))
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={applyFilters} disabled={!draft.spaceId || loading}>
              Apply filters
            </Button>
            <Button
              variant="secondary"
              onClick={resetFilters}
              disabled={loading}
            >
              Reset filters
            </Button>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
        <span>Snapshot high water: {snapshotHighWater}</span>
        <span>Earliest retained state: {earliestRetainedState}</span>
        <span>
          Live polling: {snapshotCursor ? "active" : "waiting for snapshot"}
        </span>
      </div>

      <div
        className={`overflow-x-auto rounded-lg border ${themeClasses.border.default}`}
      >
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide dark:bg-slate-950/60">
            <tr>
              <TableHead className="px-4 py-3">Attempt</TableHead>
              <TableHead className="px-4 py-3">Procedure</TableHead>
              <TableHead className="px-4 py-3">Lifecycle</TableHead>
              <TableHead className="px-4 py-3">Route</TableHead>
              <TableHead className="px-4 py-3">Usage</TableHead>
              <TableHead className="px-4 py-3">Actions</TableHead>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={6}>
                  Loading attempts…
                </td>
              </tr>
            ) : attempts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center" colSpan={6}>
                  No procedure inference attempts match these filters.
                </td>
              </tr>
            ) : (
              attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td className="px-4 py-3">
                    <ResourceIdText value={attempt.id} />
                    <div className="mt-1 text-xs">
                      record v{attempt.recordVersion}
                    </div>
                    <div className="text-xs">
                      {formatTimestamp(attempt.requestedAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ResourceIdText value={attempt.procedureId} /> v
                    {attempt.procedureVersion}
                    <div className="mt-1 text-xs">
                      binding <ResourceIdText value={attempt.bindingId} /> v
                      {attempt.bindingVersion}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <EnumBadge value={attempt.state} />
                    <div className="mt-1 text-xs">
                      {formatEnumLabel(attempt.outcomeCategory)}
                    </div>
                    <div className="text-xs">
                      {formatEnumLabel(attempt.publicationDisposition)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{formatEnumLabel(attempt.operation)}</div>
                    <div className="text-xs">
                      endpoint <ResourceIdText value={attempt.endpointId} />
                    </div>
                    <div className="text-xs">
                      model <ResourceIdText value={attempt.modelId} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{attempt.totalTokens} tokens</div>
                    <div className="text-xs">
                      {formatEnumLabel(attempt.tokenCountAuthority)}
                    </div>
                    <div className="text-xs">
                      {formatDuration(attempt.providerDurationMillis)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="secondary"
                      onClick={() => void showAttempt(attempt.id)}
                      disabled={detailLoading}
                    >
                      View details
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {nextPageToken && (
        <Button
          variant="secondary"
          onClick={() => void loadNextPage()}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading page…" : "Load next snapshot page"}
        </Button>
      )}

      {detail && (
        <AttemptDetails
          attempt={detail}
          spaces={spaces}
          domains={domains}
          principalById={principalById}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function FilterTextField({
  label,
  value,
  onChange,
  type = "text",
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  min?: string;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <Input
        className="mt-1"
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function AttemptDetails({
  attempt,
  spaces,
  domains,
  principalById,
  onClose,
}: {
  attempt: ProcedureInferenceAttemptInfo;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  principalById: Map<string, PrincipalInfo>;
  onClose: () => void;
}) {
  const space = spaces.find((item) => item.spaceId === attempt.spaceId);
  const domain = domains.find((item) => item.domainId === attempt.domainId);
  return (
    <section
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
      aria-label="Procedure inference attempt details"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text as="h3" className="font-semibold">
            Attempt details
          </Text>
          <ResourceIdText value={attempt.id} />
        </div>
        <Button variant="secondary" onClick={onClose}>
          Close details
        </Button>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        <DetailGroup
          title="Lifecycle"
          rows={[
            ["State", formatEnumLabel(attempt.state)],
            ["Outcome", formatEnumLabel(attempt.outcomeCategory)],
            ["Publication", formatEnumLabel(attempt.publicationDisposition)],
            ["Record version", attempt.recordVersion],
            ["Requested", formatTimestamp(attempt.requestedAt)],
            ["Authorized", formatTimestamp(attempt.authorizedAt)],
            ["Started", formatTimestamp(attempt.startedAt)],
            ["Completed", formatTimestamp(attempt.completedAt)],
          ]}
        />
        <div>
          <Text as="h4" className="font-medium">
            Identity and scope
          </Text>
          <div className="mt-2 space-y-3 text-sm">
            <SpaceLabel spaceId={attempt.spaceId} name={space?.name} link />
            <DomainLabel
              domainId={attempt.domainId}
              name={domain?.name}
              domainKey={domain?.key}
            />
            <IdDetail
              label="Procedure"
              value={attempt.procedureId}
              suffix={`v${attempt.procedureVersion}`}
            />
            <IdDetail
              label="Binding"
              value={attempt.bindingId}
              suffix={`v${attempt.bindingVersion}`}
            />
            <IdDetail label="Invocation" value={attempt.invocationId} />
            <IdDetail
              label="Run"
              value={attempt.runId}
              suffix={`attempt ${attempt.runAttemptNumber}`}
            />
            <IdDetail label="Workflow step" value={attempt.workflowStepId} />
            <IdDetail label="Source event" value={attempt.sourceEventId} />
            <IdDetail
              label="Source transaction"
              value={attempt.sourceTransactionId}
            />
            <div>Source graph revision: {attempt.sourceGraphRevision}</div>
          </div>
        </div>
        <DetailGroup
          title="Route and authority"
          rows={[
            ["Operation", formatEnumLabel(attempt.operation)],
            ["Profile", attempt.profileId || "—"],
            ["Endpoint", attempt.endpointId || "—"],
            ["Model", attempt.modelId || "—"],
            ["Capability", attempt.capabilityId || "—"],
            ["Policy decision", attempt.policyDecisionId || "—"],
            ["Authorization revision", attempt.authorizationRevision],
            ["Configuration revision", attempt.configurationRevision],
            ["Provider attempt", String(attempt.providerAttemptNumber)],
          ]}
        />
        <div>
          <Text as="h4" className="font-medium">
            Attribution
          </Text>
          <dl className="mt-2 space-y-2 text-sm">
            <PrincipalDetail
              label="Event origin"
              principalId={attempt.eventOriginPrincipalId}
              principalById={principalById}
            />
            <PrincipalDetail
              label="Actor"
              principalId={attempt.actorPrincipalId}
              principalById={principalById}
            />
            <PrincipalDetail
              label="Owner"
              principalId={attempt.ownerPrincipalId}
              principalById={principalById}
            />
            <PrincipalDetail
              label="On behalf of"
              principalId={attempt.onBehalfOfPrincipalId}
              principalById={principalById}
            />
          </dl>
        </div>
        <DetailGroup
          title="Token accounting"
          rows={[
            ["Input tokens", attempt.inputTokens],
            ["Output tokens", attempt.outputTokens],
            ["Total tokens", attempt.totalTokens],
            ["Authority", formatEnumLabel(attempt.tokenCountAuthority)],
            [
              "Provider duration",
              formatDuration(attempt.providerDurationMillis),
            ],
          ]}
        />
      </div>
    </section>
  );
}

function DetailGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<[string, string]>;
}) {
  return (
    <div>
      <Text as="h4" className="font-medium">
        {title}
      </Text>
      <dl className="mt-2 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className={themeClasses.text.parts.mutedLight}>{label}</dt>
            <dd className="break-all">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function IdDetail({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div>
      <span className={themeClasses.text.parts.mutedLight}>{label}: </span>
      <ResourceIdText value={value} /> {suffix || ""}
    </div>
  );
}

function PrincipalDetail({
  label,
  principalId,
  principalById,
}: {
  label: string;
  principalId: string;
  principalById: Map<string, PrincipalInfo>;
}) {
  const principal = principalById.get(principalId);
  const name = principal?.displayName || principal?.username || principalId;
  return (
    <div>
      <dt className={themeClasses.text.parts.mutedLight}>{label}</dt>
      <dd>
        {principalId ? (
          <>
            <TextLink to={`/principals/${encodeURIComponent(principalId)}`}>
              {name}
            </TextLink>
            {name !== principalId && (
              <div>
                <ResourceIdText value={principalId} />
              </div>
            )}
          </>
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}

function emptyDraft(spaceId = "", domainId = ""): DraftFilter {
  return {
    spaceId,
    domainId,
    procedureId: "",
    procedureVersion: "",
    bindingId: "",
    bindingVersion: "",
    invocationId: "",
    runId: "",
    workflowStepId: "",
    endpointId: "",
    modelId: "",
    capabilityId: "",
    operation: "",
    states: [],
    eventOriginPrincipalId: "",
    actorPrincipalId: "",
    ownerPrincipalId: "",
    onBehalfOfPrincipalId: "",
    requestedAtOrAfter: "",
    requestedBefore: "",
    completedAtOrAfter: "",
    completedBefore: "",
  };
}

function normalizeDraft(draft: DraftFilter): DraftFilter {
  return {
    ...draft,
    spaceId: draft.spaceId.trim(),
    domainId: draft.domainId.trim(),
    procedureId: draft.procedureId.trim(),
    procedureVersion: draft.procedureVersion.trim(),
    bindingId: draft.bindingId.trim(),
    bindingVersion: draft.bindingVersion.trim(),
    invocationId: draft.invocationId.trim(),
    runId: draft.runId.trim(),
    workflowStepId: draft.workflowStepId.trim(),
    endpointId: draft.endpointId.trim(),
    modelId: draft.modelId.trim(),
    capabilityId: draft.capabilityId.trim(),
    eventOriginPrincipalId: draft.eventOriginPrincipalId.trim(),
    actorPrincipalId: draft.actorPrincipalId.trim(),
    ownerPrincipalId: draft.ownerPrincipalId.trim(),
    onBehalfOfPrincipalId: draft.onBehalfOfPrincipalId.trim(),
  };
}

function toFilterInput(
  draft: DraftFilter,
): ProcedureInferenceAttemptFilterInput {
  return compactObject({
    domainId: draft.domainId || undefined,
    procedureId: draft.procedureId || undefined,
    procedureVersion: positiveInteger(draft.procedureVersion),
    bindingId: draft.bindingId || undefined,
    bindingVersion: positiveInteger(draft.bindingVersion),
    invocationId: draft.invocationId || undefined,
    runId: draft.runId || undefined,
    workflowStepId: draft.workflowStepId || undefined,
    endpointId: draft.endpointId || undefined,
    modelId: draft.modelId || undefined,
    capabilityId: draft.capabilityId || undefined,
    operation: draft.operation || undefined,
    states: draft.states.length > 0 ? draft.states : undefined,
    eventOriginPrincipalId: draft.eventOriginPrincipalId || undefined,
    actorPrincipalId: draft.actorPrincipalId || undefined,
    ownerPrincipalId: draft.ownerPrincipalId || undefined,
    onBehalfOfPrincipalId: draft.onBehalfOfPrincipalId || undefined,
    requestedAtOrAfterSeconds: dateSeconds(draft.requestedAtOrAfter),
    requestedBeforeSeconds: dateSeconds(draft.requestedBefore),
    completedAtOrAfterSeconds: dateSeconds(draft.completedAtOrAfter),
    completedBeforeSeconds: dateSeconds(draft.completedBefore),
  });
}

function compactObject<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function positiveInteger(value: string): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function dateSeconds(value: string): number | undefined {
  if (!value) return undefined;
  const millis = new Date(value).getTime();
  return Number.isFinite(millis) ? Math.floor(millis / 1000) : undefined;
}

function toggleValue<T>(values: T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...values, value];
}

export function mergeAttempts(
  current: ProcedureInferenceAttemptInfo[],
  incoming: ProcedureInferenceAttemptInfo[],
): ProcedureInferenceAttemptInfo[] {
  const byId = new Map(current.map((attempt) => [attempt.id, attempt]));
  for (const attempt of incoming) {
    const existing = byId.get(attempt.id);
    if (
      !existing ||
      compareUnsignedDecimal(attempt.recordVersion, existing.recordVersion) >= 0
    ) {
      byId.set(attempt.id, attempt);
    }
  }
  return sortAttempts([...byId.values()]);
}

function sortAttempts(attempts: ProcedureInferenceAttemptInfo[]) {
  return [...attempts].sort((left, right) => {
    const timeOrder =
      numericTimestamp(right.requestedAt) - numericTimestamp(left.requestedAt);
    return timeOrder || left.id.localeCompare(right.id);
  });
}

function numericTimestamp(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function compareUnsignedDecimal(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+/, "") || "0";
  const normalizedRight = right.replace(/^0+/, "") || "0";
  if (normalizedLeft.length !== normalizedRight.length)
    return normalizedLeft.length - normalizedRight.length;
  return normalizedLeft.localeCompare(normalizedRight);
}

function formatTimestamp(value: string): string {
  if (!value) return "—";
  const seconds = Number(value);
  return Number.isFinite(seconds)
    ? new Date(seconds * 1000).toLocaleString()
    : "—";
}

function formatDuration(value: string): string {
  const millis = Number(value);
  if (!Number.isFinite(millis) || millis < 0) return "—";
  if (millis < 1000) return `${millis} ms`;
  return `${(millis / 1000).toFixed(2)} s`;
}

function visibilityKey(
  principalContext: ConsolePrincipalContext | null | undefined,
): string {
  if (!principalContext) return "anonymous";
  return JSON.stringify({
    principalId: principalContext.session.principalId,
    capabilityState: principalContext.capabilityState,
  });
}

function isUnavailable(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as Partial<AppError>).kind === "unavailable"
  );
}

function errorMessage(cause: unknown, fallback: string): string {
  if (typeof cause === "object" && cause !== null) {
    const message = (cause as Partial<AppError>).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return fallback;
}
