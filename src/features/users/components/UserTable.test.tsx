import { render, screen } from "@testing-library/react";
import { UserTable } from "./UserTable";

test("renders empty state", () => {
  render(<UserTable users={[]} />);

  expect(screen.getByText(/no users found/i)).toBeInTheDocument();
});

test("renders user rows", () => {
  render(
    <UserTable
      users={[
        { userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" },
        { userId: "usr_disabled", username: "disabled", state: "USER_STATE_DISABLED" },
      ]}
    />,
  );

  expect(screen.getByText("alice")).toBeInTheDocument();
  expect(screen.getByText("usr_alice")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText("disabled")).toBeInTheDocument();
  expect(screen.getByText("Disabled")).toBeInTheDocument();
});
