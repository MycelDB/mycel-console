import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationDialog } from "./ConfirmationDialog";

test("renders title, body, eyebrow, and details", () => {
  render(
    <ConfirmationDialog
      eyebrow="Delete backup"
      title="Confirm delete"
      details={<div>Backup: backup-1</div>}
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    >
      This action cannot be undone.
    </ConfirmationDialog>,
  );

  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Confirm delete" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Delete backup")).toBeInTheDocument();
  expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  expect(screen.getByText("Backup: backup-1")).toBeInTheDocument();
});

test("calls cancel and confirm callbacks", async () => {
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  render(
    <ConfirmationDialog
      title="Confirm action"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      Continue?
    </ConfirmationDialog>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test("disables actions and shows loading label while loading", () => {
  render(
    <ConfirmationDialog
      title="Revoke credential"
      loading
      loadingLabel="Revoking…"
      confirmLabel="Revoke credential"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    >
      Revoke this credential?
    </ConfirmationDialog>,
  );

  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Revoking…" })).toBeDisabled();
});

test("renders error message", () => {
  render(
    <ConfirmationDialog
      title="Confirm action"
      error="Something failed"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
    >
      Continue?
    </ConfirmationDialog>,
  );

  expect(screen.getByText("Something failed")).toBeInTheDocument();
});
