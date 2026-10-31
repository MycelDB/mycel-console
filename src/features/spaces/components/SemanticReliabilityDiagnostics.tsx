import {
  Button,
  EnumBadge,
  ResourceIdText,
  Text,
  themeClasses,
} from "../../../components/typography";
import type {
  SemanticEmbeddingBindingSummary,
  SemanticGenerationRuleSummary,
} from "../../../types/semantic";
import type { SemanticReliabilityStatusInfo } from "../../../types/semanticMaintenance";
import { Metric } from "./SpaceDetailPrimitives";

export type SemanticReliabilityDiagnostic = {
  rule: SemanticGenerationRuleSummary;
  binding: SemanticEmbeddingBindingSummary;
  status: SemanticReliabilityStatusInfo;
};

export type SemanticRebuildNotice = {
  targetKey: string;
  tone: "success" | "warning" | "danger";
  message: string;
};

export function semanticRebuildTargetKey(
  semanticRuleId: string,
  embeddingBindingKey: string,
): string {
  return `${semanticRuleId}/${embeddingBindingKey}`;
}

export function hasPendingSemanticLifecycle(
  rule: SemanticGenerationRuleSummary,
): boolean {
  const state = String(rule.state || "")
    .trim()
    .toLowerCase();
  return state.includes("building") || state.includes("pending");
}

type ReliabilityAssessment = {
  badgeValue: string;
  summary: string;
  tone: "default" | "warning" | "danger";
};

function normalizedDecimal(value: string): string | null {
  const trimmed = String(value || "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return trimmed.replace(/^0+(?=\d)/, "");
}

export function compareUnsignedDecimal(left: string, right: string): number {
  const normalizedLeft = normalizedDecimal(left);
  const normalizedRight = normalizedDecimal(right);
  if (normalizedLeft === null || normalizedRight === null) return -1;
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }
  return normalizedLeft === normalizedRight
    ? 0
    : normalizedLeft > normalizedRight
      ? 1
      : -1;
}

export function assessSemanticReliability(
  rule: SemanticGenerationRuleSummary,
  binding: SemanticEmbeddingBindingSummary,
  status: SemanticReliabilityStatusInfo,
): ReliabilityAssessment {
  const ruleState = String(rule.state || "")
    .trim()
    .toLowerCase();
  const capacityState = String(status.capacityState || "")
    .trim()
    .toLowerCase();
  const rebuildState = String(status.rebuild?.state || "")
    .trim()
    .toLowerCase();

  if (ruleState.includes("building") || ruleState.includes("pending")) {
    return {
      badgeValue: "pending effectively disabled",
      summary:
        "The rule is pending and is treated as effectively disabled. Its desired configuration is unchanged.",
      tone: "warning",
    };
  }
  if (!rule.enabled || !binding.enabled) {
    return {
      badgeValue: "disabled",
      summary:
        "The rule or embedding binding is disabled, so no current-freshness claim is made.",
      tone: "default",
    };
  }
  if (capacityState !== "ok") {
    return {
      badgeValue:
        capacityState === "exhausted"
          ? "capacity exhausted"
          : "capacity state unknown",
      summary:
        "Reliability capacity is not available, so semantic freshness is not established.",
      tone: "danger",
    };
  }
  if (status.rebuildRequired || rebuildState === "required") {
    return {
      badgeValue: "rebuild required",
      summary:
        "The daemon requires a rebuilt baseline before this generation can be considered current.",
      tone: "danger",
    };
  }
  if (rebuildState === "running") {
    return {
      badgeValue: "rebuild running",
      summary:
        "A rebuild is in progress; freshness is not established until it completes and catch-up converges.",
      tone: "warning",
    };
  }
  if (rebuildState === "failed") {
    return {
      badgeValue: "rebuild failed",
      summary:
        "The latest rebuild failed. Review the sanitized rebuild diagnostic.",
      tone: "danger",
    };
  }
  if (rebuildState && rebuildState !== "completed") {
    return {
      badgeValue: "rebuild state unknown",
      summary:
        "The daemon reported an unknown rebuild state, which must be treated as not ready.",
      tone: "warning",
    };
  }
  if (status.degraded) {
    return {
      badgeValue: "degraded",
      summary:
        status.degradedReason ||
        "The daemon reports degraded semantic reliability.",
      tone: "danger",
    };
  }
  if (normalizedDecimal(status.unresolvedGapCount) !== "0") {
    return {
      badgeValue: "unresolved gaps",
      summary: "At least one semantic outcome gap remains unresolved.",
      tone: "warning",
    };
  }
  if (
    !normalizedDecimal(status.semanticGeneration) ||
    normalizedDecimal(status.semanticGeneration) === "0"
  ) {
    return {
      badgeValue: "generation missing",
      summary: "No usable semantic generation has been reported.",
      tone: "warning",
    };
  }
  if (
    rebuildState === "completed" &&
    normalizedDecimal(status.rebuild?.semanticGeneration || "0") !== "0" &&
    normalizedDecimal(status.rebuild?.semanticGeneration || "0") !==
      normalizedDecimal(status.semanticGeneration)
  ) {
    return {
      badgeValue: "generation mismatch",
      summary:
        "The completed rebuild belongs to a different semantic generation.",
      tone: "warning",
    };
  }
  if (
    compareUnsignedDecimal(
      status.analyzedThroughGraphRevision,
      status.latestObservedGraphRevision,
    ) < 0
  ) {
    return {
      badgeValue: "analysis lagging",
      summary:
        "The analyzer has not classified all graph revisions observed by the daemon.",
      tone: "warning",
    };
  }
  if (
    compareUnsignedDecimal(
      status.freshThroughGraphRevision,
      status.latestObservedGraphRevision,
    ) < 0
  ) {
    return {
      badgeValue: "freshness lagging",
      summary:
        "Required semantic outcomes have not completed through the latest observed graph revision.",
      tone: "warning",
    };
  }
  return {
    badgeValue: "ready current",
    summary:
      "The daemon reports a contiguous current frontier for this semantic generation.",
    tone: "default",
  };
}

function ratio(used: string, limit: string): string {
  return `${used} / ${limit}`;
}

export function SemanticReliabilityDiagnostics({
  authorized,
  supported,
  loading,
  error,
  diagnostics,
  rebuildLoadingTargetKey = "",
  rebuildNotice = null,
  onRequestRebuild,
}: {
  authorized: boolean;
  supported: boolean | null;
  loading: boolean;
  error: string;
  diagnostics: SemanticReliabilityDiagnostic[];
  rebuildLoadingTargetKey?: string;
  rebuildNotice?: SemanticRebuildNotice | null;
  onRequestRebuild?: (diagnostic: SemanticReliabilityDiagnostic) => void;
}) {
  return (
    <section
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Text as="h2" className="font-semibold">
            Semantic reliability diagnostics
          </Text>
          <Text intent="muted" size="sm" className="mt-1 max-w-3xl">
            Daemon-authoritative frontiers, unresolved gaps, bounded capacity,
            generation, degradation, and rebuild state for each rule binding.
          </Text>
        </div>
        {loading ? <EnumBadge value="loading" /> : null}
      </div>

      {!authorized ? (
        <Text intent="muted" size="sm" className="mt-4">
          The semantic.manage capability is required to load reliability
          diagnostics.
        </Text>
      ) : supported === false ? (
        <Text intent="muted" size="sm" className="mt-4">
          Reliability diagnostics are unavailable on this older daemon. Existing
          semantic maintenance information remains usable.
        </Text>
      ) : error ? (
        <Text className="mt-4 text-rose-700 dark:text-rose-300" size="sm">
          {error}
        </Text>
      ) : !loading && diagnostics.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-4">
          No semantic rule bindings are available for reliability diagnostics.
        </Text>
      ) : (
        <div className="mt-5 space-y-4">
          {diagnostics.map((diagnostic) => {
            const { rule, binding, status } = diagnostic;
            const assessment = assessSemanticReliability(rule, binding, status);
            const rebuild = status.rebuild;
            const targetKey = semanticRebuildTargetKey(
              rule.semanticRuleId,
              binding.key,
            );
            const pendingLifecycle = hasPendingSemanticLifecycle(rule);
            const rebuildRunning =
              String(rebuild?.state || "")
                .trim()
                .toLowerCase() === "running";
            const rebuilding = rebuildLoadingTargetKey === targetKey;
            const rebuildDisabled =
              rebuilding || rebuildRunning || pendingLifecycle;
            return (
              <article
                key={`${rule.semanticRuleId}/${binding.key}`}
                className="rounded-xl border border-slate-200 p-5 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Text as="h3" className="font-medium">
                      {rule.displayName || rule.key || rule.semanticRuleId} /{" "}
                      {binding.key || "binding"}
                    </Text>
                    <Text intent="muted" size="sm" className="mt-1">
                      Rule <ResourceIdText value={rule.semanticRuleId} />
                    </Text>
                  </div>
                  <EnumBadge value={assessment.badgeValue} />
                </div>
                <Text
                  size="sm"
                  className={`mt-3 ${
                    assessment.tone === "danger"
                      ? "text-rose-700 dark:text-rose-300"
                      : assessment.tone === "warning"
                        ? "text-amber-700 dark:text-amber-300"
                        : themeClasses.text.muted
                  }`}
                >
                  {assessment.summary}
                </Text>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    label="Latest observed"
                    value={status.latestObservedGraphRevision}
                  />
                  <Metric
                    label="Analyzed through"
                    value={status.analyzedThroughGraphRevision}
                  />
                  <Metric
                    label="Fresh through"
                    value={status.freshThroughGraphRevision}
                  />
                  <Metric
                    label="Semantic generation"
                    value={status.semanticGeneration}
                  />
                  <Metric
                    label="Unresolved gaps"
                    value={status.unresolvedGapCount}
                    tone={
                      normalizedDecimal(status.unresolvedGapCount) === "0"
                        ? "default"
                        : "warning"
                    }
                  />
                  <Metric
                    label="Oldest unresolved revision"
                    value={
                      normalizedDecimal(status.unresolvedGapCount) === "0"
                        ? "—"
                        : status.oldestUnresolvedGraphRevision
                    }
                  />
                  <Metric
                    label="Capacity state"
                    value={status.capacityState || "Unknown"}
                    tone={status.capacityState === "ok" ? "default" : "danger"}
                  />
                  <Metric
                    label="Retained work items"
                    value={status.retainedWorkItemCount}
                  />
                  <Metric
                    label="Gap intervals"
                    value={ratio(
                      status.retainedGapIntervalCount,
                      status.configuredGapIntervalLimit,
                    )}
                  />
                  <Metric
                    label="Revision span"
                    value={ratio(
                      status.retainedRevisionSpan,
                      status.configuredRevisionSpanLimit,
                    )}
                  />
                  <Metric
                    label="Serialized bytes"
                    value={ratio(
                      status.retainedSerializedBytes,
                      status.configuredSerializedByteLimit,
                    )}
                  />
                  <Metric
                    label="Frontier limit"
                    value={status.configuredFrontierLimit}
                  />
                </div>

                {status.degradedReason ? (
                  <Text
                    className="mt-4 text-rose-700 dark:text-rose-300"
                    size="sm"
                  >
                    Degraded: {status.degradedReason}
                  </Text>
                ) : null}

                <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-950/40">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text as="h4" className="font-medium">
                      Rebuild status
                    </Text>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <EnumBadge
                        value={
                          rebuild?.state ||
                          (status.rebuildRequired ? "required" : "not recorded")
                        }
                      />
                      {authorized && supported === true && onRequestRebuild ? (
                        <Button
                          variant="secondary"
                          disabled={rebuildDisabled}
                          onClick={() => onRequestRebuild(diagnostic)}
                        >
                          {rebuilding ? "Starting rebuild…" : "Rebuild"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  {pendingLifecycle ? (
                    <Text intent="muted" size="sm" className="mt-2">
                      Rebuild is unavailable while the semantic rule has a
                      pending lifecycle transition.
                    </Text>
                  ) : rebuildRunning ? (
                    <Text intent="muted" size="sm" className="mt-2">
                      Rebuild is unavailable while the current rebuild epoch is
                      running.
                    </Text>
                  ) : null}
                  {rebuild ? (
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <strong>Epoch:</strong> {rebuild.rebuildEpoch || "—"}
                      </div>
                      <div>
                        <strong>Pinned target:</strong>{" "}
                        {rebuild.pinnedTargetGraphRevision}
                      </div>
                      <div>
                        <strong>Delta catch-up:</strong>{" "}
                        {rebuild.deltaCatchupGraphRevision}
                      </div>
                      <div>
                        <strong>Generation:</strong>{" "}
                        {rebuild.semanticGeneration}
                      </div>
                      <div>
                        <strong>Started:</strong> {rebuild.startedAt || "—"}
                      </div>
                      <div>
                        <strong>Completed:</strong> {rebuild.completedAt || "—"}
                      </div>
                    </div>
                  ) : (
                    <Text intent="muted" size="sm" className="mt-2">
                      No rebuild epoch has been reported.
                    </Text>
                  )}
                  {rebuild?.errorMessageSanitized ? (
                    <Text
                      className="mt-3 text-rose-700 dark:text-rose-300"
                      size="sm"
                    >
                      {rebuild.errorMessageSanitized}
                    </Text>
                  ) : null}
                  {rebuildNotice?.targetKey === targetKey ? (
                    <Text
                      className={`mt-3 ${
                        rebuildNotice.tone === "danger"
                          ? "text-rose-700 dark:text-rose-300"
                          : rebuildNotice.tone === "warning"
                            ? "text-amber-700 dark:text-amber-300"
                            : "text-emerald-700 dark:text-emerald-300"
                      }`}
                      size="sm"
                    >
                      {rebuildNotice.message}
                    </Text>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
