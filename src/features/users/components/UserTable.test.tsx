import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { UserTable } from "./UserTable";

test("renders empty state", () => {
  render(<UserTable users={[]} />);

  expect(screen.getByText(/no principals found/i)).toBeInTheDocument();
});

test("renders principal rows", () => {
  render(
    <MemoryRouter>
      <UserTable
        users={[
          { principalId: "prn_alice", username: "alice", state: "PRINCIPAL_STATE_ACTIVE" },
          { principalId: "prn_disabled", username: "disabled", state: "PRINCIPAL_STATE_DISABLED" },
        ]}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "alice" })).toHaveAttribute("href", "/principals/prn_alice");
  expect(screen.getByText("prn_alice")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText("disabled")).toBeInTheDocument();
  expect(screen.getByText("Disabled")).toBeInTheDocument();
});
