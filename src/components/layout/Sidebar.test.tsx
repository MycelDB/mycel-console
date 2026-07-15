import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";

test("renders main navigation links", () => {
  render(
    <MemoryRouter>
      <Sidebar theme="dark" onToggleTheme={jest.fn()} />
    </MemoryRouter>,
  );

  for (const label of [
    "Dashboard",
    "Users",
    "Spaces",
    "Backups",
    "Operators",
    "Semantic",
    "Maintenance",
    "Inference",
    "Settings",
  ]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
  expect(screen.queryByRole("link", { name: "Domains" })).not.toBeInTheDocument();
});

test("marks the active route", () => {
  render(
    <MemoryRouter initialEntries={["/users"]}>
      <Sidebar theme="dark" onToggleTheme={jest.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
});

test("invokes theme toggle", async () => {
  const onToggleTheme = jest.fn();
  render(
    <MemoryRouter>
      <Sidebar theme="dark" onToggleTheme={onToggleTheme} />
    </MemoryRouter>,
  );

  await userEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));

  expect(onToggleTheme).toHaveBeenCalledTimes(1);
});
