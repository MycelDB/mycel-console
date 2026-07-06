import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

jest.mock("../../services/adminService", () => ({
  listUsers: jest.fn().mockResolvedValue({
    users: [{ userId: "usr_alice", username: "alice", state: "USER_STATE_ACTIVE" }],
    nextPageToken: "",
  }),
}));

const session = {
  addr: "127.0.0.1:9091",
  operatorId: "operator-1",
  username: "operator",
};

function renderShell(path = "/dashboard", onLogout = jest.fn()) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell session={session} loggingOut={false} logoutError="" onLogout={onLogout} />
    </MemoryRouter>,
  );
  return { onLogout };
}

test("renders dashboard route", () => {
  renderShell("/dashboard");

  expect(screen.getByRole("heading", { name: /cluster overview/i })).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
});

test("renders users section route", async () => {
  renderShell("/users");

  expect(screen.getByRole("heading", { name: "User Management" })).toBeInTheDocument();
  expect(await screen.findByText("alice")).toBeInTheDocument();
});

test("invokes logout from persistent header", async () => {
  const onLogout = jest.fn();
  renderShell("/maintenance", onLogout);

  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});
