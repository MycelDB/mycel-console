import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShortcutGrid } from "./ShortcutGrid";

test("renders operational shortcuts", () => {
  render(
    <MemoryRouter>
      <ShortcutGrid />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /manage users/i })).toHaveAttribute("href", "/users");
  expect(screen.getByRole("link", { name: /view spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.getByRole("link", { name: /operators/i })).toHaveAttribute("href", "/operators");
  expect(screen.getByRole("link", { name: /maintenance/i })).toHaveAttribute("href", "/maintenance");
});
