import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetUserPasswordDialog } from "./SetUserPasswordDialog";

const user = { userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" };

function renderDialog(overrides = {}) {
  const props = {
    user,
    onClose: jest.fn(),
    onSetPassword: jest.fn().mockResolvedValue(user),
    onPasswordSet: jest.fn(),
    ...overrides,
  };
  render(<SetUserPasswordDialog {...props} />);
  return props;
}

test("validates password is required", async () => {
  const props = renderDialog();

  await userEvent.click(screen.getByRole("button", { name: /^set password$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Password is required");
  expect(props.onSetPassword).not.toHaveBeenCalled();
});

test("validates confirmation matches", async () => {
  renderDialog();

  await userEvent.type(screen.getByLabelText(/^new password$/i), "secret");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "different");
  await userEvent.click(screen.getByRole("button", { name: /^set password$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Password confirmation does not match");
});

test("sets password", async () => {
  const props = renderDialog();

  await userEvent.type(screen.getByLabelText(/^new password$/i), "secret");
  await userEvent.type(screen.getByLabelText(/confirm password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /^set password$/i }));

  await waitFor(() => expect(props.onPasswordSet).toHaveBeenCalledWith(user));
  expect(props.onSetPassword).toHaveBeenCalledWith({ userId: "usr_alice", password: "secret", revokeSessions: true });
});
