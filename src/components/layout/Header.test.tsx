import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Header, type HeaderProps } from "./Header";

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_operator",
  username: "operator",
};

function renderHeader(props: Partial<HeaderProps> = {}) {
  render(
    <MemoryRouter>
      <Header session={session} loggingOut={false} onLogout={jest.fn()} {...props} />
    </MemoryRouter>,
  );
}

test("renders cluster and principal session details", () => {
  renderHeader();

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.getByText("operator")).toBeInTheDocument();
  expect(screen.queryByText(/access context/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/role/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/capabilit/i)).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /account/i })).toHaveAttribute("href", "/me");
});


test("does not render role and capability counts", () => {
  renderHeader({
    principalContext: {
      session,
      roles: ["system_admin"],
      capabilities: ["CAPABILITY_CLUSTER_READ", "CAPABILITY_SPACE_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_CLUSTER_READ" }, { capability: "CAPABILITY_SPACE_READ" }] },
      warnings: [],
    },
  });

  expect(screen.getByText("operator")).toBeInTheDocument();
  expect(screen.queryByText(/1 role · 2 capabilities/i)).not.toBeInTheDocument();
});

test("invokes logout callback", async () => {
  const onLogout = jest.fn();
  renderHeader({ onLogout });

  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});

test("disables logout while logging out", () => {
  renderHeader({ loggingOut: true });

  expect(screen.getByRole("button", { name: /logging out/i })).toBeDisabled();
});
