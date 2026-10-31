import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  SemanticEmbeddingBindingSummary,
  SemanticGenerationRuleSummary,
} from "../../../types/semantic";
import type { SemanticReliabilityStatusInfo } from "../../../types/semanticMaintenance";
import { SemanticReliabilityDiagnostics } from "./SemanticReliabilityDiagnostics";

const rule: SemanticGenerationRuleSummary = {
  semanticRuleId: "rule_notes",
  key: "notes",
  displayName: "Notes",
  description: "",
  spaceId: "sp_main",
  domainId: "dom_default",
  enabled: true,
  state: "SEMANTIC_RULE_STATE_ACTIVE",
  bindings: [],
};

const binding: SemanticEmbeddingBindingSummary = {
  key: "search",
  purpose: "semantic_search",
  intelligenceProfileId: "profile_1",
  intelligenceProfileKey: "embeddings",
  vectorStoreId: "store_1",
  vectorStoreKey: "vectors",
  enabled: true,
};

const healthyStatus: SemanticReliabilityStatusInfo = {
  spaceId: "sp_main",
  semanticRuleId: "rule_notes",
  embeddingBindingKey: "search",
  latestObservedGraphRevision: "9007199254740995",
  analyzedThroughGraphRevision: "9007199254740995",
  freshThroughGraphRevision: "9007199254740995",
  unresolvedGapCount: "0",
  oldestUnresolvedGraphRevision: "0",
  configuredFrontierLimit: "4096",
  retainedWorkItemCount: "0",
  semanticGeneration: "9007199254740993",
  capacityState: "ok",
  degraded: false,
  degradedReason: "",
  rebuildRequired: false,
  configuredGapIntervalLimit: "128",
  configuredRevisionSpanLimit: "8192",
  configuredSerializedByteLimit: "65536",
  retainedGapIntervalCount: "0",
  retainedRevisionSpan: "0",
  retainedSerializedBytes: "0",
};

function renderStatus(
  status: SemanticReliabilityStatusInfo,
  ruleOverride: Partial<SemanticGenerationRuleSummary> = {},
) {
  render(
    <SemanticReliabilityDiagnostics
      authorized
      supported
      loading={false}
      error=""
      diagnostics={[
        {
          rule: { ...rule, ...ruleOverride },
          binding,
          status,
        },
      ]}
    />,
  );
}

test("shows healthy reliability only when every freshness condition permits it", () => {
  renderStatus(healthyStatus);

  expect(screen.getByText("Ready Current")).toBeInTheDocument();
  expect(screen.getAllByText("9007199254740995")).toHaveLength(3);
  expect(screen.getByText("9007199254740993")).toBeInTheDocument();
});

test("distinguishes analyzed progress from a lagging fresh frontier", () => {
  renderStatus({
    ...healthyStatus,
    freshThroughGraphRevision: "9007199254740994",
  });

  expect(screen.getByText("Freshness Lagging")).toBeInTheDocument();
  expect(
    screen.getByText(/required semantic outcomes have not completed/i),
  ).toBeInTheDocument();
});

test("shows exhausted capacity without claiming freshness", () => {
  renderStatus({
    ...healthyStatus,
    capacityState: "exhausted",
    rebuildRequired: true,
  });

  expect(screen.getByText("Capacity Exhausted")).toBeInTheDocument();
  expect(screen.queryByText("Ready Current")).not.toBeInTheDocument();
});

test("shows daemon degradation and its sanitized reason", () => {
  renderStatus({
    ...healthyStatus,
    degraded: true,
    degradedReason: "frontier journal unavailable",
  });

  expect(screen.getByText("Degraded")).toBeInTheDocument();
  expect(
    screen.getAllByText(/frontier journal unavailable/i).length,
  ).toBeGreaterThan(0);
});

test("treats pending rules as effectively disabled without mutating desired configuration", () => {
  renderStatus(healthyStatus, {
    state: "SEMANTIC_RULE_STATE_BUILDING",
    enabled: true,
  });

  expect(screen.getByText("Pending Effectively Disabled")).toBeInTheDocument();
  expect(
    screen.getByText(/desired configuration is unchanged/i),
  ).toBeInTheDocument();
});

test("shows rebuild-required and failed rebuild diagnostics", () => {
  renderStatus({
    ...healthyStatus,
    rebuildRequired: true,
    rebuild: {
      rebuildEpoch: "epoch_1",
      state: "failed",
      pinnedTargetGraphRevision: "41",
      deltaCatchupGraphRevision: "42",
      semanticGeneration: "9007199254740993",
      startedAt: "2026-01-01T00:00:00Z",
      completedAt: "",
      errorMessageSanitized: "rebuild storage unavailable",
    },
  });

  expect(screen.getByText("Rebuild Required")).toBeInTheDocument();
  expect(screen.getByText("Failed")).toBeInTheDocument();
  expect(screen.getByText("rebuild storage unavailable")).toBeInTheDocument();
});

test("requests an explicit rebuild for the selected rule binding", async () => {
  const onRequestRebuild = jest.fn();
  const diagnostic = { rule, binding, status: healthyStatus };
  render(
    <SemanticReliabilityDiagnostics
      authorized
      supported
      loading={false}
      error=""
      diagnostics={[diagnostic]}
      onRequestRebuild={onRequestRebuild}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Rebuild" }));
  expect(onRequestRebuild).toHaveBeenCalledWith(diagnostic);
});

test("disables rebuild during running and pending lifecycle states", () => {
  const { rerender } = render(
    <SemanticReliabilityDiagnostics
      authorized
      supported
      loading={false}
      error=""
      diagnostics={[
        {
          rule,
          binding,
          status: {
            ...healthyStatus,
            rebuild: {
              rebuildEpoch: "epoch_running",
              state: "running",
              pinnedTargetGraphRevision: "41",
              deltaCatchupGraphRevision: "41",
              semanticGeneration: "1",
              startedAt: "2026-01-01T00:00:00Z",
              completedAt: "",
              errorMessageSanitized: "",
            },
          },
        },
      ]}
      onRequestRebuild={jest.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Rebuild" })).toBeDisabled();
  expect(
    screen.getByText(/current rebuild epoch is running/i),
  ).toBeInTheDocument();

  rerender(
    <SemanticReliabilityDiagnostics
      authorized
      supported
      loading={false}
      error=""
      diagnostics={[
        {
          rule: { ...rule, state: "SEMANTIC_RULE_STATE_BUILDING" },
          binding,
          status: healthyStatus,
        },
      ]}
      onRequestRebuild={jest.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "Rebuild" })).toBeDisabled();
  expect(screen.getByText(/pending lifecycle transition/i)).toBeInTheDocument();
});

test("gracefully explains older daemons and missing capability", () => {
  const { rerender } = render(
    <SemanticReliabilityDiagnostics
      authorized
      supported={false}
      loading={false}
      error=""
      diagnostics={[]}
    />,
  );
  expect(
    screen.getByText(/unavailable on this older daemon/i),
  ).toBeInTheDocument();

  rerender(
    <SemanticReliabilityDiagnostics
      authorized={false}
      supported={null}
      loading={false}
      error=""
      diagnostics={[]}
    />,
  );
  expect(
    screen.getByText(/semantic.manage capability is required/i),
  ).toBeInTheDocument();
});
