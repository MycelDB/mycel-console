import { act, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { ProcedureInferenceAttemptInfo } from "../../../../types/procedureInference";
import { ProcedureInferenceAttemptsPanel } from "./ProcedureInferenceAttemptsPanel";

const spaces = [{ spaceId: "sp1", name: "Research" }];
const domains = [
  {
    spaceId: "sp1",
    domainId: "dom1",
    key: "main",
    name: "Main",
    description: "",
    state: "active",
    isDefault: true,
    system: false,
  },
];

const authorizedPrincipal = {
  session: {
    addr: "127.0.0.1:19091",
    principalId: "principal-viewer",
    username: "viewer",
  },
  roles: [],
  capabilities: ["automation.read", "inference.audit.read"],
  capabilityState: {
    kind: "complete" as const,
    capabilities: [
      { capability: "automation.read" },
      { capability: "inference.audit.read" },
    ],
  },
  warnings: [],
};

function attempt(
  overrides: Partial<ProcedureInferenceAttemptInfo> = {},
): ProcedureInferenceAttemptInfo {
  return {
    id: "attempt-1",
    recordVersion: "1",
    spaceId: "sp1",
    domainId: "dom1",
    procedureId: "procedure-1",
    procedureVersion: 3,
    bindingId: "binding-1",
    bindingVersion: 4,
    invocationId: "invocation-1",
    runId: "run-1",
    runAttemptNumber: 2,
    workflowStepId: "step-1",
    providerAttemptNumber: 1,
    sourceEventId: "event-source-1",
    sourceTransactionId: "transaction-1",
    sourceGraphRevision: "9007199254740999",
    eventOriginPrincipalId: "principal-origin",
    actorPrincipalId: "principal-actor",
    ownerPrincipalId: "principal-owner",
    onBehalfOfPrincipalId: "principal-behalf",
    operation: "chat",
    profileId: "profile-1",
    endpointId: "endpoint-1",
    modelId: "model-1",
    capabilityId: "capability-1",
    policyDecisionId: "decision-1",
    authorizationRevision: "9007199254741001",
    configurationRevision: "9007199254741002",
    state: "requested",
    outcomeCategory: "",
    inputTokens: "10",
    outputTokens: "20",
    totalTokens: "30",
    tokenCountAuthority: "provider_reported",
    providerDurationMillis: "1250",
    publicationDisposition: "pending",
    requestedAt: "1700000000",
    authorizedAt: "",
    startedAt: "",
    completedAt: "",
    ...overrides,
  };
}

function snapshot(
  attempts: ProcedureInferenceAttemptInfo[],
  overrides: Record<string, unknown> = {},
) {
  return {
    attempts,
    nextPageToken: "",
    snapshotHighWaterSequence: "10",
    earliestRetainedStateSequence: "1",
    snapshotCursor: "snapshot-cursor",
    ...overrides,
  };
}

function renderPanel(
  services: Partial<
    ComponentProps<typeof ProcedureInferenceAttemptsPanel>
  > = {},
) {
  return render(
    <MemoryRouter>
      <ProcedureInferenceAttemptsPanel
        spaces={spaces}
        domains={domains}
        principalContext={authorizedPrincipal}
        pollIntervalMs={0}
        listAttemptsService={jest.fn().mockResolvedValue(snapshot([]))}
        listChangesService={jest.fn().mockResolvedValue({
          changes: [],
          nextCursor: "snapshot-cursor",
          highWaterSequence: "10",
          earliestRetainedSequence: "1",
          earliestRetainedStateSequence: "1",
          historyGap: false,
        })}
        getAttemptService={jest.fn().mockResolvedValue(attempt())}
        {...services}
      />
    </MemoryRouter>,
  );
}

test("applies run-linked initial filters without interpreting daemon pagination state", async () => {
  const listAttemptsService = jest.fn().mockResolvedValue(snapshot([]));
  renderPanel({
    initialSpaceId: "sp1",
    initialDomainId: "dom1",
    initialProcedureId: "procedure-1",
    initialInvocationId: "invocation-1",
    initialRunId: "run-1",
    listAttemptsService,
  });

  await waitFor(() => expect(listAttemptsService).toHaveBeenCalled());
  expect(listAttemptsService).toHaveBeenCalledWith({
    spaceId: "sp1",
    filter: {
      domainId: "dom1",
      procedureId: "procedure-1",
      invocationId: "invocation-1",
      runId: "run-1",
    },
    pageSize: 50,
    pageToken: "",
  });
});

test("applies the typed filter set and preserves snapshot-bound pagination tokens", async () => {
  const listAttemptsService = jest
    .fn()
    .mockResolvedValueOnce(snapshot([attempt()]))
    .mockResolvedValueOnce(
      snapshot([attempt({ state: "failed" })], {
        nextPageToken: "filtered page token",
      }),
    )
    .mockResolvedValueOnce(snapshot([attempt({ id: "attempt-filtered-2" })]));
  renderPanel({ listAttemptsService });

  await screen.findByText("30 tokens");
  await userEvent.type(screen.getByLabelText("Procedure ID"), " procedure-9 ");
  await userEvent.type(screen.getByLabelText("Procedure version"), "7");
  await userEvent.selectOptions(screen.getByLabelText("Operation"), "chat");
  await userEvent.click(screen.getByLabelText("Failed"));
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));

  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(2));
  expect(listAttemptsService).toHaveBeenLastCalledWith({
    spaceId: "sp1",
    filter: {
      procedureId: "procedure-9",
      procedureVersion: 7,
      operation: "chat",
      states: ["failed"],
    },
    pageSize: 50,
    pageToken: "",
  });

  await userEvent.click(
    screen.getByRole("button", { name: "Load next snapshot page" }),
  );
  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(3));
  expect(listAttemptsService).toHaveBeenLastCalledWith(
    expect.objectContaining({ pageToken: "filtered page token" }),
  );
});

test("polls from the snapshot cursor, advances cursors, and deduplicates event IDs", async () => {
  const listAttemptsService = jest
    .fn()
    .mockResolvedValue(snapshot([attempt()]));
  const listChangesService = jest
    .fn()
    .mockResolvedValueOnce({
      changes: [
        {
          eventId: "event-1",
          schemaVersion: "v1",
          spaceId: "sp1",
          sequence: "11",
          changeKind: "succeeded",
          attemptId: "attempt-1",
          recordVersion: "2",
          attempt: attempt({
            recordVersion: "2",
            state: "succeeded",
            publicationDisposition: "published",
          }),
          occurredAt: "1700000001",
          committedAt: "1700000001",
        },
      ],
      nextCursor: "cursor-11",
      highWaterSequence: "11",
      earliestRetainedSequence: "1",
      earliestRetainedStateSequence: "1",
      historyGap: false,
    })
    .mockResolvedValueOnce({
      changes: [
        {
          eventId: "event-1",
          schemaVersion: "v1",
          spaceId: "sp1",
          sequence: "11",
          changeKind: "failed",
          attemptId: "attempt-1",
          recordVersion: "3",
          attempt: attempt({ recordVersion: "3", state: "failed" }),
          occurredAt: "1700000002",
          committedAt: "1700000002",
        },
      ],
      nextCursor: "cursor-12",
      highWaterSequence: "12",
      earliestRetainedSequence: "1",
      earliestRetainedStateSequence: "1",
      historyGap: false,
    });
  renderPanel({ listAttemptsService, listChangesService });

  await screen.findByText("30 tokens");
  await userEvent.click(
    screen.getByRole("button", { name: "Check for updates" }),
  );
  expect(await screen.findByTitle("succeeded")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Check for updates" }),
  );

  await waitFor(() => expect(listChangesService).toHaveBeenCalledTimes(2));
  expect(listChangesService).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({ afterCursor: "snapshot-cursor" }),
  );
  expect(listChangesService).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ afterCursor: "cursor-11" }),
  );
  expect(screen.getByTitle("succeeded")).toBeInTheDocument();
  expect(screen.queryByTitle("failed")).not.toBeInTheDocument();
});

test("refreshes a state-filtered snapshot when the ledger advances", async () => {
  const listAttemptsService = jest
    .fn()
    .mockResolvedValueOnce(snapshot([]))
    .mockResolvedValueOnce(
      snapshot([attempt({ state: "requested" })], {
        snapshotCursor: "filtered-cursor",
      }),
    )
    .mockResolvedValueOnce(
      snapshot([], { snapshotCursor: "refreshed-filtered-cursor" }),
    );
  const listChangesService = jest.fn().mockResolvedValue({
    changes: [],
    nextCursor: "advanced-filtered-cursor",
    highWaterSequence: "11",
    earliestRetainedSequence: "1",
    earliestRetainedStateSequence: "1",
    historyGap: false,
  });
  renderPanel({ listAttemptsService, listChangesService });

  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole("checkbox", { name: "Requested" }));
  await userEvent.click(screen.getByRole("button", { name: "Apply filters" }));
  expect(await screen.findByTitle("requested")).toBeInTheDocument();

  await userEvent.click(
    screen.getByRole("button", { name: "Check for updates" }),
  );

  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(3));
  expect(screen.queryByTitle("requested")).not.toBeInTheDocument();
  expect(listChangesService).toHaveBeenCalledWith(
    expect.objectContaining({ afterCursor: "filtered-cursor" }),
  );
});

test("rebuilds from a fresh snapshot when the daemon reports a history gap", async () => {
  const listAttemptsService = jest
    .fn()
    .mockResolvedValueOnce(snapshot([attempt()]))
    .mockResolvedValueOnce(
      snapshot([attempt({ recordVersion: "9", state: "ambiguous" })], {
        snapshotCursor: "rebuilt-cursor",
        snapshotHighWaterSequence: "30",
      }),
    );
  const listChangesService = jest.fn().mockResolvedValue({
    changes: [],
    nextCursor: "",
    highWaterSequence: "30",
    earliestRetainedSequence: "20",
    earliestRetainedStateSequence: "20",
    historyGap: true,
  });
  renderPanel({ listAttemptsService, listChangesService });

  await screen.findByText("30 tokens");
  await userEvent.click(
    screen.getByRole("button", { name: "Check for updates" }),
  );

  expect(
    await screen.findByText(/rebuilt from a fresh current-state snapshot/i),
  ).toBeInTheDocument();
  expect(await screen.findByTitle("ambiguous")).toBeInTheDocument();
  expect(listAttemptsService).toHaveBeenCalledTimes(2);
});

test("restarts the snapshot when authorization visibility scope changes", async () => {
  const listAttemptsService = jest.fn().mockResolvedValue(snapshot([]));
  const { rerender } = renderPanel({ listAttemptsService });
  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(1));

  rerender(
    <MemoryRouter>
      <ProcedureInferenceAttemptsPanel
        spaces={spaces}
        domains={domains}
        principalContext={{
          ...authorizedPrincipal,
          capabilityState: {
            kind: "complete",
            capabilities: [
              {
                capability: "automation.read",
                scope: { kind: "space", spaceId: "sp1" },
              },
              {
                capability: "inference.audit.read",
                scope: { kind: "space", spaceId: "sp1" },
              },
            ],
          },
        }}
        pollIntervalMs={0}
        listAttemptsService={listAttemptsService}
        listChangesService={jest.fn()}
        getAttemptService={jest.fn()}
      />
    </MemoryRouter>,
  );

  await waitFor(() => expect(listAttemptsService).toHaveBeenCalledTimes(2));
  expect(listAttemptsService).toHaveBeenLastCalledWith(
    expect.objectContaining({ pageToken: "" }),
  );
});

test("does not call attempt RPCs without both required capabilities", async () => {
  const listAttemptsService = jest.fn();
  renderPanel({
    principalContext: {
      ...authorizedPrincipal,
      capabilities: ["automation.read"],
      capabilityState: {
        kind: "complete",
        capabilities: [{ capability: "automation.read" }],
      },
    },
    listAttemptsService,
  });

  expect(
    screen.getByText(/requires both automation.read and inference.audit.read/i),
  ).toBeInTheDocument();
  expect(listAttemptsService).not.toHaveBeenCalled();
});

test("shows safe attribution and route detail without rendering extra sensitive properties", async () => {
  const sensitive = {
    ...attempt({
      state: "succeeded",
      outcomeCategory: "success",
      publicationDisposition: "published",
      authorizedAt: "1700000001",
      startedAt: "1700000002",
      completedAt: "1700000003",
    }),
    prompt: "SECRET PROMPT",
    outputBody: "SECRET OUTPUT",
    credential: "SECRET CREDENTIAL",
    providerRequestId: "SECRET REQUEST",
    rawProviderError: "SECRET ERROR",
    metadata: { secret: "SECRET METADATA" },
  } as ProcedureInferenceAttemptInfo;
  const getAttemptService = jest.fn().mockResolvedValue(sensitive);
  renderPanel({
    principals: [
      {
        principalId: "principal-actor",
        username: "actor-user",
        displayName: "Actor User",
        state: "PRINCIPAL_STATE_ACTIVE",
      },
      {
        principalId: "principal-owner",
        username: "owner-user",
        displayName: "Owner User",
        state: "PRINCIPAL_STATE_ACTIVE",
      },
    ],
    listAttemptsService: jest.fn().mockResolvedValue(snapshot([attempt()])),
    getAttemptService,
  });

  await screen.findByText("30 tokens");
  await userEvent.click(screen.getByRole("button", { name: "View details" }));

  expect(await screen.findByText("Actor User")).toBeInTheDocument();
  expect(screen.getByText("Owner User")).toBeInTheDocument();
  expect(screen.getAllByText("endpoint-1").length).toBeGreaterThan(0);
  expect(screen.getByText("9007199254741001")).toBeInTheDocument();
  expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
  for (const secret of [
    "SECRET PROMPT",
    "SECRET OUTPUT",
    "SECRET CREDENTIAL",
    "SECRET REQUEST",
    "SECRET ERROR",
    "SECRET METADATA",
  ]) {
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
  }
});

test("starts bounded automatic polling after the snapshot cursor is available", async () => {
  jest.useFakeTimers();
  const listChangesService = jest.fn().mockResolvedValue({
    changes: [],
    nextCursor: "cursor-next",
    highWaterSequence: "10",
    earliestRetainedSequence: "1",
    earliestRetainedStateSequence: "1",
    historyGap: false,
  });
  renderPanel({
    pollIntervalMs: 1000,
    listAttemptsService: jest.fn().mockResolvedValue(snapshot([])),
    listChangesService,
  });

  await act(async () => Promise.resolve());
  await act(async () => {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  });
  expect(listChangesService).toHaveBeenCalledWith(
    expect.objectContaining({ afterCursor: "snapshot-cursor" }),
  );
  jest.useRealTimers();
});
