import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AutomationsPage } from "./AutomationsPage";

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
              createdAt: "",
              updatedAt: "",
            },
          ],
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
