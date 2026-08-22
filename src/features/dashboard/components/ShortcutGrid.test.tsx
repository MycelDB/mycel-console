import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ShortcutGrid } from "./ShortcutGrid";

test("renders operational shortcuts using permissive default navigation", () => {
  render(
    <MemoryRouter>
      <ShortcutGrid />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /manage principals/i })).toHaveAttribute("href", "/principals");
  expect(screen.getByRole("link", { name: /view spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.queryByRole("link", { name: /access management/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /maintenance/i })).not.toBeInTheDocument();
});

test("filters shortcuts when complete capabilities are available", () => {
  render(
    <MemoryRouter>
      <ShortcutGrid
        principalContext={{
          session: { addr: "127.0.0.1:19091", principalId: "prn_viewer", username: "viewer" },
          roles: [],
          capabilities: ["CAPABILITY_SPACE_READ"],
          capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SPACE_READ" }] },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: /view spaces/i })).toHaveAttribute("href", "/spaces");
  expect(screen.queryByRole("link", { name: /manage principals/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /access management/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /maintenance/i })).not.toBeInTheDocument();
});
