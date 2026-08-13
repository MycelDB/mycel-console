import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteUserDialog } from "./DeleteUserDialog";

const user = { principalId: "prn_alice", username: "alice", state: "PRINCIPAL_STATE_ACTIVE" };
const deletedUser = { ...user, state: "PRINCIPAL_STATE_DELETED" };

function renderDialog(overrides = {}) {
  const props = {
    user,
    onClose: jest.fn(),
    onDelete: jest.fn().mockResolvedValue(deletedUser),
    onDeleted: jest.fn(),
    ...overrides,
  };
  render(<DeleteUserDialog {...props} />);
  return props;
}

test("prevents accidental delete until username is typed", async () => {
  const props = renderDialog();
  const deleteButton = screen.getByRole("button", { name: /^delete principal$/i });

  expect(deleteButton).toBeDisabled();
  await userEvent.type(screen.getByLabelText(/confirmation/i), "wrong");
  expect(deleteButton).toBeDisabled();
  expect(props.onDelete).not.toHaveBeenCalled();
});

test("deletes principal after confirmation", async () => {
  const props = renderDialog();

  await userEvent.type(screen.getByLabelText(/confirmation/i), "alice");
  await userEvent.click(screen.getByRole("button", { name: /^delete principal$/i }));

  await waitFor(() => expect(props.onDeleted).toHaveBeenCalledWith(deletedUser));
  expect(props.onDelete).toHaveBeenCalledWith({ principalId: "prn_alice", revokeSessions: true });
});

test("shows backend errors", async () => {
  renderDialog({ onDelete: jest.fn().mockRejectedValue(new Error("Cannot delete")) });

  await userEvent.type(screen.getByLabelText(/confirmation/i), "alice");
  await userEvent.click(screen.getByRole("button", { name: /^delete principal$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Cannot delete");
});
