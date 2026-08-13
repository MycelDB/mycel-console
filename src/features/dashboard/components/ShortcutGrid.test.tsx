import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShortcutGrid } from "./ShortcutGrid";

test("renders operational shortcuts", () => {
  render(
    <MemoryRouter>
      <ShortcutGrid />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /manage principals/i })).toHaveAttribute("href", "/principals");
  expect(screen.getByRole("link", { name: /view spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.getByRole("link", { name: /admin access/i })).toHaveAttribute("href", "/access");
  expect(screen.getByRole("link", { name: /maintenance/i })).toHaveAttribute("href", "/maintenance");
});
