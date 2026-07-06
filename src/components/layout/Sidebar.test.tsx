import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "./Sidebar";

test("renders main navigation links", () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );

  for (const label of [
    "Dashboard",
    "Users",
    "Spaces",
    "Domains",
    "Operators",
    "Semantic",
    "Maintenance",
    "Inference",
    "Settings",
  ]) {
    expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
  }
});

test("marks the active route", () => {
  render(
    <MemoryRouter initialEntries={["/users"]}>
      <Sidebar />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("aria-current", "page");
});
