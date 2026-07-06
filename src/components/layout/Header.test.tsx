import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "./Header";

const session = {
  addr: "127.0.0.1:9091",
  operatorId: "operator-1",
  username: "operator",
};

test("renders cluster and operator session details", () => {
  render(<Header session={session} loggingOut={false} onLogout={jest.fn()} />);

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.getByText("operator")).toBeInTheDocument();
});

test("invokes logout callback", async () => {
  const onLogout = jest.fn();
  render(<Header session={session} loggingOut={false} onLogout={onLogout} />);

  await userEvent.click(screen.getByRole("button", { name: /logout/i }));

  expect(onLogout).toHaveBeenCalledTimes(1);
});

test("disables logout while logging out", () => {
  render(<Header session={session} loggingOut onLogout={jest.fn()} />);

  expect(screen.getByRole("button", { name: /logging out/i })).toBeDisabled();
});
