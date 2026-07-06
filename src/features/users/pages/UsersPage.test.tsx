import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersPage } from "./UsersPage";
import type { ListUsersInput, ListUsersResponse } from "../../../types/users";

const users = [
  { userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" },
  { userId: "usr_bob", username: "bob", state: "USER_STATE_ACTIVE" },
  { userId: "usr_disabled", username: "disabled-user", state: "USER_STATE_DISABLED" },
  { userId: "usr_deleted", username: "deleted-user", state: "USER_STATE_DELETED" },
];

function listUsersResponse(overrides: Partial<ListUsersResponse> = {}): ListUsersResponse {
  return {
    users,
    nextPageToken: "",
    ...overrides,
  };
}

function renderUsersPage(listUsersService = jest.fn<Promise<ListUsersResponse>, [ListUsersInput]>().mockResolvedValue(listUsersResponse())) {
  render(<UsersPage listUsersService={listUsersService} />);
  return { listUsersService };
}

test("renders loading state then user rows", async () => {
  renderUsersPage();

  expect(screen.getByText(/loading users/i)).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
  expect(screen.getByText("usr_alice")).toBeInTheDocument();
});

test("renders backend errors", async () => {
  renderUsersPage(jest.fn().mockRejectedValue(new Error("List failed")));

  expect(await screen.findByRole("alert")).toHaveTextContent("List failed");
});

test("renders empty state", async () => {
  renderUsersPage(jest.fn().mockResolvedValue(listUsersResponse({ users: [] })));

  expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
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
  await userEvent.selectOptions(screen.getByLabelText(/state/i), "USER_STATE_DISABLED");

  expect(screen.getByText("disabled-user")).toBeInTheDocument();
  expect(screen.queryByText("alice")).not.toBeInTheDocument();
});

test("refresh invokes list service with current include flags", async () => {
  const listUsersService = jest.fn<Promise<ListUsersResponse>, [ListUsersInput]>().mockResolvedValue(listUsersResponse());
  renderUsersPage(listUsersService);

  await screen.findByText("alice");
  await userEvent.click(screen.getByLabelText(/include disabled/i));
  await userEvent.click(screen.getByLabelText(/include deleted/i));
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() =>
    expect(listUsersService).toHaveBeenLastCalledWith({
      pageSize: 100,
      pageToken: "",
      includeDisabled: false,
      includeDeleted: true,
    }),
  );
});

test("loads additional pages", async () => {
  const listUsersService = jest
    .fn<Promise<ListUsersResponse>, [ListUsersInput]>()
    .mockResolvedValueOnce(listUsersResponse({ users: [users[0]], nextPageToken: "next" }))
    .mockResolvedValueOnce(listUsersResponse({ users: [users[1]], nextPageToken: "" }));
  renderUsersPage(listUsersService);

  expect(await screen.findByText("alice")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("bob")).toBeInTheDocument();
  expect(listUsersService).toHaveBeenLastCalledWith({
    pageSize: 100,
    pageToken: "next",
    includeDisabled: true,
    includeDeleted: false,
  });
});

test("creates a user and refreshes the list", async () => {
  const listUsersService = jest.fn<Promise<ListUsersResponse>, [ListUsersInput]>().mockResolvedValue(listUsersResponse());
  const createUserService = jest.fn().mockResolvedValue({ userId: "usr_new", username: "new-user", state: "USER_STATE_ACTIVE" });
  render(<UsersPage listUsersService={listUsersService} createUserService={createUserService} />);

  await screen.findByText("alice");
  await userEvent.click(screen.getByRole("button", { name: /^create user$/i }));
  const usernameFields = screen.getAllByLabelText(/^username$/i);
  await userEvent.type(usernameFields[usernameFields.length - 1], "new-user");
  const createButtons = screen.getAllByRole("button", { name: /^create user$/i });
  await userEvent.click(createButtons[createButtons.length - 1]);

  await waitFor(() => expect(createUserService).toHaveBeenCalledWith({ username: "new-user", password: undefined, disabled: false }));
  await waitFor(() => expect(listUsersService).toHaveBeenCalledTimes(2));
});

test("enables a disabled user", async () => {
  const enableUserService = jest.fn().mockResolvedValue({ userId: "usr_disabled", username: "disabled-user", state: "USER_STATE_ACTIVE" });
  render(<UsersPage listUsersService={jest.fn().mockResolvedValue(listUsersResponse())} enableUserService={enableUserService} />);

  expect(await screen.findByText("disabled-user")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /^enable$/i }));

  await waitFor(() => expect(enableUserService).toHaveBeenCalledWith("usr_disabled"));
});
