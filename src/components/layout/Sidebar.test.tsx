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
    "Account",
    "Principals",
    "Spaces",
    "Access",
    "Automations",
    "Semantic",
    "Backups",
    "Maintenance",
    "Settings",
  ]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
  expect(screen.getByText("Intelligence")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Domains" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Access management" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Inference" })).not.toBeInTheDocument();
});

test("marks the active route", () => {
  render(
    <MemoryRouter initialEntries={["/principals"]}>
      <Sidebar theme="dark" onToggleTheme={jest.fn()} />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Principals" })).toHaveAttribute("aria-current", "page");
});

test("filters navigation when complete capabilities are available", () => {
  render(
    <MemoryRouter>
      <Sidebar
        theme="dark"
        principalContext={{
          session: { addr: "127.0.0.1:19091", principalId: "prn_viewer", username: "viewer" },
          roles: [],
          capabilities: ["CAPABILITY_SPACE_READ"],
          capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SPACE_READ" }] },
          warnings: [],
        }}
        onToggleTheme={jest.fn()}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Spaces" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Principals" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Backups" })).not.toBeInTheDocument();
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
