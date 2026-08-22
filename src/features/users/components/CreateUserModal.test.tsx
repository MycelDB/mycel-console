import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserModal } from "./CreateUserModal";

const createdUser = { principalId: "prn_new", username: "new-user", state: "PRINCIPAL_STATE_ACTIVE" };

function renderModal(overrides = {}) {
  const props = {
    open: true,
    onClose: jest.fn(),
    onCreate: jest.fn().mockResolvedValue(createdUser),
    onCreated: jest.fn(),
    ...overrides,
  };
  render(<CreateUserModal {...props} />);
  return props;
}

test("validates username", async () => {
  const props = renderModal();

  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Username is required");
  expect(props.onCreate).not.toHaveBeenCalled();
});

test("hides personal space option by default", () => {
  renderModal();

  expect(screen.queryByLabelText(/create a personal space/i)).not.toBeInTheDocument();
});

test("requires a password for active principals", async () => {
  const props = renderModal();

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Initial password is required");
  expect(props.onCreate).not.toHaveBeenCalled();
});

test("creates a principal and reports success", async () => {
  const props = renderModal();

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByLabelText(/create disabled/i));
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  await waitFor(() => expect(props.onCreated).toHaveBeenCalledWith(createdUser));
  expect(props.onCreate).toHaveBeenCalledWith({ username: "new-user", password: "secret", disabled: true });
  expect(props.onClose).toHaveBeenCalled();
});

test("optionally creates a personal space for the new principal", async () => {
  const onCreatePersonalSpace = jest.fn().mockResolvedValue({ space: { spaceId: "sp_new", name: "new-user" }, defaultDomainId: "dom_default" });
  const props = renderModal({ canCreatePersonalSpace: true, onCreatePersonalSpace });

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByLabelText(/create a personal space/i));
  expect(screen.getByLabelText(/space name/i)).toHaveValue("new-user");
  expect(screen.getByLabelText(/default domain key/i)).toHaveValue("default");
  expect(screen.getByLabelText(/default domain name/i)).toHaveValue("default");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  await waitFor(() => expect(onCreatePersonalSpace).toHaveBeenCalledWith({
    name: "new-user",
    ownerUserId: "prn_new",
    ownerUsername: "new-user",
    defaultDomainKey: "default",
    defaultDomainName: "default",
  }));
  expect(props.onCreated).toHaveBeenCalledWith(createdUser);
});

test("reports partial success when personal space creation fails", async () => {
  const onCreatePersonalSpace = jest.fn().mockRejectedValue(new Error("space denied"));
  const props = renderModal({ canCreatePersonalSpace: true, onCreatePersonalSpace });

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByLabelText(/create a personal space/i));
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  await waitFor(() => expect(props.onCreated).toHaveBeenCalledWith(createdUser, "Principal created, but personal space creation failed: space denied"));
  expect(props.onClose).toHaveBeenCalled();
});

test("shows backend errors", async () => {
  renderModal({ onCreate: jest.fn().mockRejectedValue(new Error("Already exists")) });

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Already exists");
});

test("shows string backend errors from Tauri", async () => {
  renderModal({ onCreate: jest.fn().mockRejectedValue("status: InvalidArgument, message: password is required") });

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /^create principal$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("password is required");
});
