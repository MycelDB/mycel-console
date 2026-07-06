import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";

const defaultProps = {
  loading: false,
  error: "",
  onSubmit: jest.fn().mockResolvedValue(undefined),
};

test("submits cluster address, username, and password", async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

  await userEvent.clear(screen.getByLabelText(/cluster grpc address/i));
  await userEvent.type(screen.getByLabelText(/cluster grpc address/i), "10.0.0.5:9091");
  await userEvent.type(screen.getByLabelText(/operator username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    addr: "10.0.0.5:9091",
    username: "operator",
    password: "secret",
  });
});

test("renders errors", () => {
  render(<LoginForm {...defaultProps} error="Login failed" />);

  expect(screen.getByRole("alert")).toHaveTextContent("Login failed");
});

test("disables fields and submit button while loading", () => {
  render(<LoginForm {...defaultProps} loading />);

  expect(screen.getByLabelText(/cluster grpc address/i)).toBeDisabled();
  expect(screen.getByLabelText(/operator username/i)).toBeDisabled();
  expect(screen.getByLabelText(/password/i)).toBeDisabled();
  expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();
});
