import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { UsersPage } from "./UsersPage";
import type { ListPrincipalsInput, ListPrincipalsResponse } from "../../../types/users";

const principals = [
  { principalId: "prn_alice", username: "alice", state: "PRINCIPAL_STATE_ACTIVE" },
  { principalId: "prn_bob", username: "bob", state: "PRINCIPAL_STATE_ACTIVE" },
  { principalId: "prn_disabled", username: "disabled-user", state: "PRINCIPAL_STATE_DISABLED" },
  { principalId: "prn_deleted", username: "deleted-user", state: "PRINCIPAL_STATE_DELETED" },
];

function listPrincipalsResponse(overrides: Partial<ListPrincipalsResponse> = {}): ListPrincipalsResponse {
  return {
    principals,
    nextPageToken: "",
    ...overrides,
  };
}

function renderUsersPage(listPrincipalsService = jest.fn<Promise<ListPrincipalsResponse>, [ListPrincipalsInput]>().mockResolvedValue(listPrincipalsResponse())) {
  render(
    <MemoryRouter>
      <UsersPage listPrincipalsService={listPrincipalsService} />
    </MemoryRouter>,
  );
  return { listPrincipalsService };
}

test("renders loading state then principal rows", async () => {
  renderUsersPage();

  expect(screen.getByText(/loading principals/i)).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(screen.getByText("prn_alice")).toBeInTheDocument();
});

test("renders backend errors", async () => {
  renderUsersPage(jest.fn().mockRejectedValue(new Error("List failed")));

  expect(await screen.findByRole("alert")).toHaveTextContent("List failed");
});

test("renders empty state", async () => {
  renderUsersPage(jest.fn().mockResolvedValue(listPrincipalsResponse({ principals: [] })));

  expect(await screen.findByText(/no principals found/i)).toBeInTheDocument();
});

test("filters by username", async () => {
  renderUsersPage();

  expect(await screen.findByText("alice")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/username/i), "bob");

  expect(screen.getByText("bob")).toBeInTheDocument();
  expect(screen.queryByText("alice")).not.toBeInTheDocument();
});

test("filters by state", async () => {
  renderUsersPage();

  expect(await screen.findByText("alice")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText(/state/i), "PRINCIPAL_STATE_DISABLED");

  expect(screen.getByText("disabled-user")).toBeInTheDocument();
  expect(screen.queryByText("alice")).not.toBeInTheDocument();
});

test("refresh includes all principal states for client-side state filtering", async () => {
  const listPrincipalsService = jest.fn<Promise<ListPrincipalsResponse>, [ListPrincipalsInput]>().mockResolvedValue(listPrincipalsResponse());
  renderUsersPage(listPrincipalsService);

  await screen.findByText("alice");
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() =>
    expect(listPrincipalsService).toHaveBeenLastCalledWith({
      pageSize: 100,
      pageToken: "",
      includeDisabled: true,
      includeDeleted: true,
    }),
  );
});

test("loads additional pages", async () => {
  const listPrincipalsService = jest
    .fn<Promise<ListPrincipalsResponse>, [ListPrincipalsInput]>()
    .mockResolvedValueOnce(listPrincipalsResponse({ principals: [principals[0]], nextPageToken: "next" }))
    .mockResolvedValueOnce(listPrincipalsResponse({ principals: [principals[1]], nextPageToken: "" }));
  renderUsersPage(listPrincipalsService);

  expect(await screen.findByText("alice")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("bob")).toBeInTheDocument();
  expect(listPrincipalsService).toHaveBeenLastCalledWith({
    pageSize: 100,
    pageToken: "next",
    includeDisabled: true,
    includeDeleted: true,
  });
});

test("uses a primary create principal button", async () => {
  renderUsersPage();

  await screen.findByText("alice");
  expect(screen.getByRole("button", { name: /^create principal$/i })).toHaveClass("bg-sky-500");
});

test("creates a principal and refreshes the list", async () => {
  const listPrincipalsService = jest.fn<Promise<ListPrincipalsResponse>, [ListPrincipalsInput]>().mockResolvedValue(listPrincipalsResponse());
  const createPrincipalService = jest.fn().mockResolvedValue({ principalId: "prn_new", username: "new-user", state: "PRINCIPAL_STATE_ACTIVE" });
  render(
    <MemoryRouter>
      <UsersPage listPrincipalsService={listPrincipalsService} createPrincipalService={createPrincipalService} />
    </MemoryRouter>,
  );

  await screen.findByText("alice");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));
  const usernameFields = screen.getAllByLabelText(/^username$/i);
  await userEvent.type(usernameFields[usernameFields.length - 1], "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  const createButtons = screen.getAllByRole("button", { name: /^create principal$/i });
  await userEvent.click(createButtons[createButtons.length - 1]);

  await waitFor(() => expect(createPrincipalService).toHaveBeenCalledWith({ username: "new-user", password: "secret", disabled: false }));
  await waitFor(() => expect(listPrincipalsService).toHaveBeenCalledTimes(2));
});

test("hides lifecycle actions for read-only principal capability context", async () => {
  render(
    <MemoryRouter>
      <UsersPage
        listPrincipalsService={jest.fn().mockResolvedValue(listPrincipalsResponse())}
        principalContext={{
          session: { addr: "127.0.0.1:19091", principalId: "prn_reader", username: "reader" },
          roles: [],
          capabilities: ["CAPABILITY_IDENTITY_PRINCIPAL_READ"],
          capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_IDENTITY_PRINCIPAL_READ" }] },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^create principal$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^enable$/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /^disable$/i })).not.toBeInTheDocument();
});

test("shows partial success warning when personal space creation fails", async () => {
  const createPrincipalService = jest.fn().mockResolvedValue({ principalId: "prn_new", username: "new-user", state: "PRINCIPAL_STATE_ACTIVE" });
  const createSpaceService = jest.fn().mockRejectedValue(new Error("space denied"));
  render(
    <MemoryRouter>
      <UsersPage
        listPrincipalsService={jest.fn().mockResolvedValue(listPrincipalsResponse())}
        createPrincipalService={createPrincipalService}
        createSpaceService={createSpaceService}
      />
    </MemoryRouter>,
  );

  await screen.findByText("alice");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));
  const usernameFields = screen.getAllByLabelText(/^username$/i);
  await userEvent.type(usernameFields[usernameFields.length - 1], "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByLabelText(/create a personal space/i));
  const createButtons = screen.getAllByRole("button", { name: /^create principal$/i });
  await userEvent.click(createButtons[createButtons.length - 1]);

  expect(await screen.findByRole("alert")).toHaveTextContent("Principal created, but personal space creation failed: space denied");
});

test("enables a disabled principal", async () => {
  const enablePrincipalService = jest.fn().mockResolvedValue({ principalId: "prn_disabled", username: "disabled-user", state: "PRINCIPAL_STATE_ACTIVE" });
  render(
    <MemoryRouter>
      <UsersPage listPrincipalsService={jest.fn().mockResolvedValue(listPrincipalsResponse())} enablePrincipalService={enablePrincipalService} />
    </MemoryRouter>,
  );

  expect(await screen.findByText("disabled-user")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /^enable$/i }));

  await waitFor(() => expect(enablePrincipalService).toHaveBeenCalledWith("prn_disabled"));
});
