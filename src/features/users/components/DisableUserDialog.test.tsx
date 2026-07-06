import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisableUserDialog } from "./DisableUserDialog";

const user = { userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" };
const disabledUser = { ...user, state: "USER_STATE_DISABLED" };

function renderDialog(overrides = {}) {
  const props = {
    user,
    onClose: jest.fn(),
    onDisable: jest.fn().mockResolvedValue(disabledUser),
    onDisabled: jest.fn(),
    ...overrides,
  };
  render(<DisableUserDialog {...props} />);
  return props;
}

test("disables user with reason and revoke sessions", async () => {
  const props = renderDialog();

  await userEvent.type(screen.getByLabelText(/reason/i), "policy violation");
  await userEvent.click(screen.getByRole("button", { name: /^disable user$/i }));

  await waitFor(() => expect(props.onDisabled).toHaveBeenCalledWith(disabledUser));
  expect(props.onDisable).toHaveBeenCalledWith({
    userId: "usr_alice",
    reason: "policy violation",
    revokeSessions: true,
  });
});

test("shows backend errors", async () => {
  renderDialog({ onDisable: jest.fn().mockRejectedValue(new Error("Cannot disable")) });

  await userEvent.click(screen.getByRole("button", { name: /^disable user$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot disable");
});
