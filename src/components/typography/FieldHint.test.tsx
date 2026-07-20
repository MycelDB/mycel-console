import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FieldHint } from "./FieldHint";

test("renders a question mark help button", () => {
  render(<FieldHint>Explains what this field controls.</FieldHint>);

  expect(screen.getByRole("button", { name: /field help/i })).toHaveTextContent("?");
});

test("renders accessible tooltip text", () => {
  render(<FieldHint>Filesystem path on the daemon host.</FieldHint>);

  const button = screen.getByRole("button", { name: /field help/i });
  const tooltip = screen.getByRole("tooltip");

  expect(tooltip).toHaveTextContent("Filesystem path on the daemon host.");
  expect(button).toHaveAttribute("aria-describedby", tooltip.id);
});

test("supports a custom aria label", () => {
  render(<FieldHint label="Backup directory help">Where backups are stored.</FieldHint>);

  expect(screen.getByRole("button", { name: /backup directory help/i })).toBeInTheDocument();
});

test("can be focused with keyboard", async () => {
  render(<FieldHint>Keyboard accessible hint.</FieldHint>);

  await userEvent.tab();

  expect(screen.getByRole("button", { name: /field help/i })).toHaveFocus();
});
