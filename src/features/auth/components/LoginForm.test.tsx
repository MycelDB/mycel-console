import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { LOGIN_HINTS_STORAGE_KEY } from "../loginHints";

beforeEach(() => {
  window.localStorage.clear();
});

const defaultProps = {
  loading: false,
  error: null,
  onSubmit: jest.fn().mockResolvedValue(undefined),
};

test("prefills stored login hints without a password", () => {
  window.localStorage.setItem(LOGIN_HINTS_STORAGE_KEY, JSON.stringify({ addr: "10.0.0.5:9091", username: "operator" }));

  render(<LoginForm {...defaultProps} />);

  expect(screen.getByLabelText(/cluster grpc address/i)).toHaveValue("10.0.0.5:9091");
  expect(screen.getByLabelText(/principal username/i)).toHaveValue("operator");
  expect(screen.getByLabelText(/password/i)).toHaveValue("");
});

test("submits cluster address, username, and password", async () => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  render(<LoginForm {...defaultProps} onSubmit={onSubmit} />);

  await userEvent.clear(screen.getByLabelText(/cluster grpc address/i));
  await userEvent.type(screen.getByLabelText(/cluster grpc address/i), "10.0.0.5:9091");
  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  expect(onSubmit).toHaveBeenCalledWith({
    addr: "10.0.0.5:9091",
    username: "operator",
    password: "secret",
  });
});

test("renders errors", () => {
  render(<LoginForm {...defaultProps} error={{ kind: "unknown", severity: "error", message: "Login failed" }} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("❌");
  expect(alert).toHaveTextContent("Login failed");
});

test("renders warning errors", () => {
  render(<LoginForm {...defaultProps} error={{ kind: "authentication", severity: "warning", message: "Invalid credentials" }} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("Invalid credentials");
});

test("renders error details", () => {
  render(<LoginForm {...defaultProps} error={{ kind: "connectivity", severity: "error", message: "Could not connect", detail: "connection refused" }} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Could not connect");
  expect(alert).toHaveTextContent("connection refused");
});

test("only renders connection diagnostics action for connection problems", () => {
  const onRunDiagnostics = jest.fn().mockResolvedValue(undefined);
  const { rerender } = render(<LoginForm {...defaultProps} onRunDiagnostics={onRunDiagnostics} />);

  expect(screen.queryByRole("button", { name: /run connection diagnostics/i })).not.toBeInTheDocument();

  rerender(<LoginForm {...defaultProps} onRunDiagnostics={onRunDiagnostics} error={{ kind: "authentication", severity: "warning", message: "Invalid credentials" }} />);
  expect(screen.queryByRole("button", { name: /run connection diagnostics/i })).not.toBeInTheDocument();

  rerender(<LoginForm {...defaultProps} onRunDiagnostics={onRunDiagnostics} error={{ kind: "connectivity", severity: "error", message: "Could not connect" }} />);
  expect(screen.getByRole("button", { name: /run connection diagnostics/i })).toBeInTheDocument();
});

test("renders notices as warnings", () => {
  render(<LoginForm {...defaultProps} notice="Session expired. Sign in again." />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("Session expired. Sign in again.");
});

test("disables fields and submit button while loading", () => {
  render(<LoginForm {...defaultProps} loading />);

  expect(screen.getByLabelText(/cluster grpc address/i)).toBeDisabled();
  expect(screen.getByLabelText(/principal username/i)).toBeDisabled();
  expect(screen.getByLabelText(/password/i)).toBeDisabled();
  expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();
});
