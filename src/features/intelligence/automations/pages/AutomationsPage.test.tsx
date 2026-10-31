import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AutomationsPage } from "./AutomationsPage";

const completedDisableResponse = {
  control: {
    spaceId: "sp1",
    domainId: "dom1",
    procedureId: "procedure-1",
    procedureVersion: 2,
    targetStatus: "disabled" as const,
    controlEpoch: "18446744073709551615",
    controllingPrincipalId: "principal-1",
    affectedPartitions: [0, 1, 2],
    acknowledgedPartitions: [2, 0, 1],
    completed: true,
    completionRevision: "18446744073709551614",
    committedAt: "1793478000",
    completedAt: "1793478001.000000025",
  },
};

function renderProcedureControls({
  disableGraphProcedureService = jest
    .fn()
    .mockResolvedValue(completedDisableResponse),
  enableGraphProcedureService = jest.fn().mockResolvedValue({
    ...completedDisableResponse,
    control: { ...completedDisableResponse.control, targetStatus: "enabled" },
  }),
} = {}) {
  render(
    <MemoryRouter>
      <AutomationsPage
        principalContext={{
          session: {
            addr: "127.0.0.1:9091",
            principalId: "principal-1",
            username: "operator",
          },
          roles: [],
          capabilities: ["automation.manage", "identity.principal.read"],
          capabilityState: {
            kind: "complete",
            capabilities: [
              { capability: "automation.manage" },
              { capability: "identity.principal.read" },
            ],
          },
          warnings: [],
        }}
        listSpacesService={jest.fn().mockResolvedValue({
          spaces: [{ spaceId: "sp1", name: "Research" }],
          nextPageToken: "",
        })}
        listDomainsService={jest.fn().mockResolvedValue({
          domains: [
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
          ],
          nextPageToken: "",
        })}
        listAutomationsService={jest
          .fn()
          .mockResolvedValue({ automations: [] })}
        listAutomationInvocationsService={jest
          .fn()
          .mockResolvedValue({ invocations: [] })}
        listGraphProceduresService={jest.fn().mockResolvedValue({
          procedures: [
            {
              id: "procedure-1",
              name: "Summarize procedure",
              version: 2,
              status: "enabled",
              updatedAt: "",
              operation: "chat",
              inferenceProfile: "local",
              inferenceProfileId: "profile-1",
            },
          ],
        })}
        listGraphAutomationBindingsService={jest
          .fn()
          .mockResolvedValue({ bindings: [] })}
        listPrincipalsService={jest.fn().mockResolvedValue({
          principals: [
            {
              principalId: "principal-1",
              username: "operator",
              displayName: "Console Operator",
              state: "PRINCIPAL_STATE_ACTIVE",
            },
          ],
          nextPageToken: "",
        })}
        summarizeInferenceUsageService={jest
          .fn()
          .mockResolvedValue({ summaries: [] })}
        disableGraphProcedureService={disableGraphProcedureService}
        enableGraphProcedureService={enableGraphProcedureService}
      />
    </MemoryRouter>,
  );
  return { disableGraphProcedureService, enableGraphProcedureService };
}

function renderPage() {
  render(
    <MemoryRouter>
      <AutomationsPage
        listSpacesService={jest.fn().mockResolvedValue({
          spaces: [{ spaceId: "sp1", name: "Research" }],
          nextPageToken: "",
        })}
        listDomainsService={jest.fn().mockResolvedValue({
          domains: [
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
          ],
          nextPageToken: "",
        })}
        listAutomationsService={jest.fn().mockResolvedValue({
          automations: [
            {
              id: "summarize",
              name: "Summarize pages",
              version: 1,
              status: "enabled",
              events: ["node.updated"],
              labels: ["Page"],
              updatedAt: "",
            },
          ],
        })}
        listAutomationInvocationsService={jest.fn().mockResolvedValue({
          invocations: [
            {
              id: "run1",
              automationId: "summarize",
              automationVersion: 1,
              eventId: "evt1",
              changedElementId: "node1",
              eventType: "node.updated",
              status: "succeeded",
              skipReason: "",
              createdAt: "1793478000",
              updatedAt: "1793478001",
              bindingId: "binding-1",
              bindingVersion: 2,
              procedureId: "procedure-1",
              procedureVersion: 3,
              actorPrincipalId: "actor-1",
              ownerPrincipalId: "owner-1",
              onBehalfOfPrincipalId: "subject-1",
              eventOriginPrincipalId: "origin-1",
            },
          ],
        })}
        getAutomationRunService={jest.fn().mockResolvedValue({
          compatibility: "typed_projection_available",
          diagnosticJson: '{"id":"run1"}',
          projection: {
            id: "run1",
            domainId: "dom1",
            invocationId: "invocation-1",
            bindingId: "binding-1",
            bindingVersion: 2,
            procedureId: "procedure-1",
            procedureVersion: 3,
            attemptNumber: 1,
            state: "succeeded",
            stateCode: 2,
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
            inputTokens: "10",
            outputTokens: "20",
            totalTokens: "30",
            tokenCountAuthority: "provider",
            inferenceAttemptIds: ["attempt-1"],
            startedAt: "1793478000",
            completedAt: "1793478001",
          },
        })}
        summarizeInferenceUsageService={jest.fn().mockResolvedValue({
          summaries: [
            {
              group: { automation_id: "summarize", domain_id: "dom1" },
              requestCount: 2,
              succeededCount: 2,
              failedCount: 0,
              deniedCount: 0,
              inputTokens: 10,
              outputTokens: 20,
              totalTokens: 30,
              totalLatencyMillis: 100,
            },
          ],
        })}
      />
    </MemoryRouter>,
  );
}

test("renders global graph automation inventory and usage", async () => {
  renderPage();

  expect(
    screen.getByRole("heading", { level: 1, name: "Automations" }),
  ).toBeInTheDocument();
  expect(await screen.findByText("Summarize pages")).toBeInTheDocument();
  expect(screen.getByText(/30 tokens/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Runs" }));
  expect(screen.getByText("run1")).toBeInTheDocument();
  expect(screen.getByText("procedure-1")).toBeInTheDocument();
  expect(screen.getByText("binding-1")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "View details" }));
  expect(
    await screen.findByLabelText("Automation run details"),
  ).toBeInTheDocument();
  expect(screen.getByText("Published")).toBeInTheDocument();
  expect(screen.getByText("production-chat")).toBeInTheDocument();
  expect(screen.getByText("attempt-1")).toBeInTheDocument();
});

test("confirms procedure disable and displays completed barrier evidence", async () => {
  const { disableGraphProcedureService } = renderProcedureControls();

  await userEvent.click(screen.getByRole("tab", { name: "Procedures" }));
  expect(await screen.findByText("Summarize procedure")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Disable" }));

  expect(
    screen.getByRole("dialog", { name: "Disable procedure?" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Provider work that already started may finish/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/Research \(sp1\)/)).toBeInTheDocument();
  expect(screen.getByText(/Main \(dom1\)/)).toBeInTheDocument();
  expect(
    screen.getByText(/Summarize procedure \(procedure-1\)/),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(disableGraphProcedureService).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Disable" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Disable procedure" }),
  );

  expect(
    await screen.findByText("Procedure control completed"),
  ).toBeInTheDocument();
  expect(screen.getByText("18446744073709551615")).toBeInTheDocument();
  expect(screen.getByText("18446744073709551614")).toBeInTheDocument();
  expect(screen.getByText("Console Operator")).toBeInTheDocument();
  expect(disableGraphProcedureService).toHaveBeenCalledWith({
    spaceId: "sp1",
    domainId: "dom1",
    procedureId: "procedure-1",
  });

  await userEvent.click(
    screen.getByRole("button", { name: "Reconfirm disabled" }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Disable procedure" }),
  );
  expect(disableGraphProcedureService).toHaveBeenCalledTimes(2);
});

test("confirms idempotent procedure enable actions", async () => {
  const { enableGraphProcedureService } = renderProcedureControls();

  await userEvent.click(screen.getByRole("tab", { name: "Procedures" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "Reconfirm enabled" }),
  );
  expect(
    screen.getByText(/every affected partition acknowledges/i),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Enable procedure" }),
  );

  expect(
    await screen.findByText("Procedure control completed"),
  ).toBeInTheDocument();
  expect(enableGraphProcedureService).toHaveBeenCalledWith({
    spaceId: "sp1",
    domainId: "dom1",
    procedureId: "procedure-1",
  });
});

test("does not report success for incomplete procedure barriers", async () => {
  const disableGraphProcedureService = jest.fn().mockResolvedValue({
    ...completedDisableResponse,
    control: { ...completedDisableResponse.control, completed: false },
  });
  renderProcedureControls({ disableGraphProcedureService });

  await userEvent.click(screen.getByRole("tab", { name: "Procedures" }));
  await userEvent.click(await screen.findByRole("button", { name: "Disable" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Disable procedure" }),
  );

  expect(
    await screen.findByText(
      /did not return valid completed procedure control barrier evidence/i,
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Procedure control completed"),
  ).not.toBeInTheDocument();
});

test("preserves authorization failures from procedure controls", async () => {
  const disableGraphProcedureService = jest.fn().mockRejectedValue({
    kind: "authorization",
    severity: "warning",
    message: "automation.manage capability is required",
  });
  renderProcedureControls({ disableGraphProcedureService });

  await userEvent.click(screen.getByRole("tab", { name: "Procedures" }));
  await userEvent.click(await screen.findByRole("button", { name: "Disable" }));
  await userEvent.click(
    screen.getByRole("button", { name: "Disable procedure" }),
  );

  expect(
    await screen.findByText("automation.manage capability is required"),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Procedure control completed"),
  ).not.toBeInTheDocument();
});

test("keeps usage scoped when automation ids repeat across domains", async () => {
  render(
    <MemoryRouter>
      <AutomationsPage
        listSpacesService={jest.fn().mockResolvedValue({
          spaces: [{ spaceId: "sp1", name: "Research" }],
          nextPageToken: "",
        })}
        listDomainsService={jest.fn().mockResolvedValue({
          domains: [
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
            {
              spaceId: "sp1",
              domainId: "dom2",
              key: "archive",
              name: "Archive",
              description: "",
              state: "active",
              isDefault: false,
              system: false,
            },
          ],
          nextPageToken: "",
        })}
        listAutomationsService={jest.fn().mockResolvedValue({
          automations: [
            {
              id: "summarize",
              name: "Summarize pages",
              version: 1,
              status: "enabled",
              events: ["node.updated"],
              labels: ["Page"],
              updatedAt: "",
            },
          ],
        })}
        listAutomationInvocationsService={jest
          .fn()
          .mockResolvedValue({ invocations: [] })}
        summarizeInferenceUsageService={jest.fn().mockResolvedValue({
          summaries: [
            {
              group: { automation_id: "summarize", domain_id: "dom1" },
              requestCount: 2,
              succeededCount: 2,
              failedCount: 0,
              deniedCount: 0,
              inputTokens: 10,
              outputTokens: 20,
              totalTokens: 30,
              totalLatencyMillis: 100,
            },
            {
              group: { automation_id: "summarize", domain_id: "dom2" },
              requestCount: 4,
              succeededCount: 4,
              failedCount: 0,
              deniedCount: 0,
              inputTokens: 20,
              outputTokens: 50,
              totalTokens: 70,
              totalLatencyMillis: 100,
            },
          ],
        })}
      />
    </MemoryRouter>,
  );

  expect(await screen.findAllByText("Summarize pages")).toHaveLength(2);
  expect(screen.getByText(/30 tokens/i)).toBeInTheDocument();
  expect(screen.getByText(/70 tokens/i)).toBeInTheDocument();
});

test("links runtime principals with friendly names when principal context is known", async () => {
  const listPrincipalsService = jest.fn().mockResolvedValue({
    principals: [
      {
        principalId: "principal-2",
        username: "bob",
        displayName: "Bob Builder",
        state: "PRINCIPAL_STATE_ACTIVE",
      },
    ],
    nextPageToken: "",
  });

  render(
    <MemoryRouter>
      <AutomationsPage
        principalContext={{
          session: {
            addr: "127.0.0.1:19091",
            principalId: "principal-1",
            username: "alice",
          },
          roles: [],
          capabilities: ["*"],
          capabilityState: {
            kind: "complete",
            capabilities: [{ capability: "*" }],
          },
          warnings: [],
        }}
        listSpacesService={jest.fn().mockResolvedValue({
          spaces: [{ spaceId: "sp1", name: "Research" }],
          nextPageToken: "",
        })}
        listDomainsService={jest.fn().mockResolvedValue({
          domains: [
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
          ],
          nextPageToken: "",
        })}
        listAutomationsService={jest
          .fn()
          .mockResolvedValue({ automations: [] })}
        listAutomationInvocationsService={jest
          .fn()
          .mockResolvedValue({ invocations: [] })}
        listGraphProceduresService={jest
          .fn()
          .mockResolvedValue({ procedures: [] })}
        listGraphAutomationBindingsService={jest.fn().mockResolvedValue({
          bindings: [
            {
              id: "binding-1",
              name: "Summarize pages",
              version: 1,
              status: "enabled",
              procedureId: "procedure-1",
              procedureVersion: 1,
              triggerType: "graph_event",
              events: ["node.updated"],
              labels: ["Page"],
              actorPrincipalId: "",
              ownerPrincipalId: "principal-1",
              onBehalfOfPrincipalId: "principal-2",
              inferenceProfile: "",
              inferenceProfileId: "",
              scopeSpaceId: "sp1",
              scopeDomainId: "dom1",
              updatedAt: "",
            },
          ],
        })}
        listPrincipalsService={listPrincipalsService}
        summarizeInferenceUsageService={jest
          .fn()
          .mockResolvedValue({ summaries: [] })}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Summarize pages")).toBeInTheDocument();
  expect(screen.getByText("automation")).toBeInTheDocument();
  expect(listPrincipalsService).toHaveBeenCalledWith({
    pageSize: 100,
    includeDisabled: true,
    includeDeleted: true,
  });
  expect(screen.getByRole("link", { name: "alice" })).toHaveAttribute(
    "href",
    "/principals/principal-1",
  );
  expect(screen.getByRole("link", { name: "Bob Builder" })).toHaveAttribute(
    "href",
    "/principals/principal-2",
  );
});
