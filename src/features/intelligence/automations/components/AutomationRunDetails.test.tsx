import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type {
  AutomationRunInfo,
  AutomationRunState,
} from "../../../../types/automations";
import { AutomationRunDetails } from "./AutomationRunDetails";

function info(state: AutomationRunState = "succeeded"): AutomationRunInfo {
  return {
    compatibility: "typed_projection_available",
    diagnosticJson: '{"state":"succeeded"}',
    projection: {
      id: "run-1",
      domainId: "domain-1",
      invocationId: "invocation-1",
      bindingId: "binding-1",
      bindingVersion: 2,
      procedureId: "procedure-1",
      procedureVersion: 3,
      attemptNumber: 4,
      state,
      stateCode: state === "unsupported" ? 999 : 2,
      outcomeCategory: "published",
      actorPrincipalId: "actor-1",
      ownerPrincipalId: "owner-1",
      onBehalfOfPrincipalId: "subject-1",
      eventOriginPrincipalId: "origin-1",
      inferenceProfile: "production-chat",
      inferenceProfileId: "profile-1",
      policyDecisionId: "decision-1",
      endpointId: "endpoint-1",
      modelId: "model-1",
      capabilityId: "capability-1",
      inputTokens: "9223372036854775805",
      outputTokens: "9223372036854775806",
      totalTokens: "9223372036854775807",
      tokenCountAuthority: "provider",
      inferenceAttemptIds: ["attempt-1", "attempt-2", "attempt-3", "attempt-4"],
      startedAt: "1793478000",
      completedAt: "1793478001.000000025",
    },
  };
}

function renderDetails(runInfo = info()) {
  render(
    <MemoryRouter>
      <AutomationRunDetails
        info={runInfo}
        spaceId="space-1"
        principalById={
          new Map([
            [
              "actor-1",
              {
                principalId: "actor-1",
                username: "automation-actor",
                displayName: "Automation Actor",
                state: "PRINCIPAL_STATE_ACTIVE",
              },
            ],
          ])
        }
      />
    </MemoryRouter>,
  );
}

test.each<AutomationRunState>([
  "running",
  "succeeded",
  "skipped",
  "retryable",
  "failed",
  "canceled",
])("renders typed %s run state", (state) => {
  renderDetails(info(state));
  expect(screen.getByTitle(state)).toBeInTheDocument();
});

test("renders typed versions, attribution, route, exact tokens, and bounded attempt references", () => {
  renderDetails();

  expect(screen.getByText("Published")).toBeInTheDocument();
  expect(screen.getByText("v3")).toBeInTheDocument();
  expect(screen.getByText("v2")).toBeInTheDocument();
  expect(screen.getByText("Automation Actor")).toBeInTheDocument();
  expect(screen.getByText("production-chat")).toBeInTheDocument();
  expect(screen.getByText("endpoint-1")).toBeInTheDocument();
  expect(screen.getByText("9223372036854775807")).toBeInTheDocument();
  expect(screen.getByText("Provider")).toBeInTheDocument();
  expect(screen.getByText("attempt-1")).toBeInTheDocument();
  expect(screen.queryByText("attempt-4")).not.toBeInTheDocument();
  expect(
    screen.getByText(/1 additional attempt reference/i),
  ).toBeInTheDocument();

  const explorer = screen.getByRole("link", {
    name: "View 4 attempts in explorer",
  });
  expect(explorer).toHaveAttribute(
    "href",
    expect.stringContaining("tab=attempts"),
  );
  expect(explorer).toHaveAttribute(
    "href",
    expect.stringContaining("runId=run-1"),
  );
});

test("fails closed for unknown run states", () => {
  renderDetails(info("unsupported"));
  expect(
    screen.getByText(/unsupported automation run state code 999/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/unsupported \(999\)/i)).toBeInTheDocument();
});

test("supports partial optional run evidence", () => {
  const partial = info("running");
  partial.projection = {
    ...partial.projection!,
    bindingId: "",
    bindingVersion: 0,
    procedureId: "",
    procedureVersion: 0,
    outcomeCategory: "",
    completedAt: "",
    inferenceAttemptIds: [],
  };
  renderDetails(partial);
  expect(
    screen.getByText("No inference attempts were reported for this run."),
  ).toBeInTheDocument();
  expect(screen.getByTitle("running")).toBeInTheDocument();
});

test("reports older daemon projections as unavailable without rendering legacy JSON", () => {
  renderDetails({
    compatibility: "typed_projection_unavailable",
    projection: null,
    diagnosticJson: "",
  });
  expect(
    screen.getByText(/unavailable from this daemon version/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/sanitized v0.21 allowlist/i)).toBeInTheDocument();
});
