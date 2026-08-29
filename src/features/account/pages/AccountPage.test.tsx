import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountPage } from "./AccountPage";

const session = {
  addr: "127.0.0.1:19091",
  principalId: "prn_alice",
  username: "alice",
};

test("renders current principal session and access summary", () => {
  render(
    <MemoryRouter>
      <AccountPage
        session={session}
        principalContext={{
          session,
          roles: ["space.viewer"],
          capabilities: ["CAPABILITY_SPACE_READ"],
          capabilityState: {
            kind: "complete",
            capabilities: [{ capability: "CAPABILITY_SPACE_READ" }],
          },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: /my principal/i }),
  ).toBeInTheDocument();
  expect(screen.getByText("prn_alice")).toBeInTheDocument();
  expect(screen.getByText("space.viewer")).toBeInTheDocument();
  expect(screen.getByText("CAPABILITY_SPACE_READ")).toBeInTheDocument();
  expect(screen.getByText(/daemon authorizes/i)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /role bundle guide/i }),
  ).toBeInTheDocument();
  expect(screen.getAllByText("Space user").length).toBeGreaterThan(0);
  expect(
    screen.getByRole("link", { name: /open accessible spaces/i }),
  ).toHaveAttribute("href", "/spaces");
});

test("renders unknown access context warnings", () => {
  render(
    <MemoryRouter>
      <AccountPage
        session={session}
        principalContext={{
          session,
          roles: [],
          capabilities: [],
          capabilityState: {
            kind: "unknown",
            warnings: ["Capabilities unavailable"],
          },
          warnings: ["Capabilities unavailable"],
        }}
      />
    </MemoryRouter>,
  );

  expect(screen.getByText("Unknown")).toBeInTheDocument();
  expect(screen.getByText("Capabilities unavailable")).toBeInTheDocument();
  expect(
    screen.getAllByText("Access discovery unavailable.").length,
  ).toBeGreaterThan(0);
});
