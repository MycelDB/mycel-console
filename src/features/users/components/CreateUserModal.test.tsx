import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateUserModal } from "./CreateUserModal";

const createdUser = { userId: "usr_new", username: "new-user", state: "USER_STATE_ACTIVE" };

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

  await userEvent.click(screen.getByRole("button", { name: /^create user$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Username is required");
  expect(props.onCreate).not.toHaveBeenCalled();
});

test("creates a user and reports success", async () => {
  const props = renderModal();

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.type(screen.getByLabelText(/initial password/i), "secret");
  await userEvent.click(screen.getByLabelText(/create disabled/i));
  await userEvent.click(screen.getByRole("button", { name: /^create user$/i }));

  await waitFor(() => expect(props.onCreated).toHaveBeenCalledWith(createdUser));
  expect(props.onCreate).toHaveBeenCalledWith({ username: "new-user", password: "secret", disabled: true });
  expect(props.onClose).toHaveBeenCalled();
});

test("shows backend errors", async () => {
  renderModal({ onCreate: jest.fn().mockRejectedValue(new Error("Already exists")) });

  await userEvent.type(screen.getByLabelText(/^username$/i), "new-user");
  await userEvent.click(screen.getByRole("button", { name: /^create user$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Already exists");
});
