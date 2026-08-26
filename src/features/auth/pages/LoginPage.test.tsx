import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LOGIN_HINTS_STORAGE_KEY } from "../loginHints";
import { LoginPage } from "./LoginPage";

beforeEach(() => {
  window.localStorage.clear();
});

test("invokes login service, stores login hints, and reports successful principal session", async () => {
  const session = {
    addr: "127.0.0.1:19091",
    principalId: "prn_operator",
    username: "operator",
  };
  const loginService = jest.fn().mockResolvedValue(session);
  const onLoginSuccess = jest.fn();

  render(<LoginPage loginService={loginService} onLoginSuccess={onLoginSuccess} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(session));
  expect(loginService).toHaveBeenCalledWith({
    addr: "127.0.0.1:19091",
    username: "operator",
    password: "secret",
  });
  expect(JSON.parse(window.localStorage.getItem(LOGIN_HINTS_STORAGE_KEY) || "{}")).toEqual({
    addr: "127.0.0.1:19091",
    username: "operator",
  });
  expect(window.localStorage.getItem(LOGIN_HINTS_STORAGE_KEY)).not.toContain("secret");
});

test("runs connection diagnostics after a connection problem", async () => {
  const loginService = jest.fn().mockRejectedValue({ kind: "connectivity", severity: "error", message: "transport error", detail: "connection refused" });
  const diagnosticsService = jest.fn().mockResolvedValue({
    addr: "127.0.0.1:19091",
    checks: [{ id: "tcp", label: "TCP reachable", status: "pass", detail: "Connected" }],
  });

  render(<LoginPage loginService={loginService} diagnosticsService={diagnosticsService} onLoginSuccess={jest.fn()} />);

  expect(screen.queryByRole("button", { name: /run connection diagnostics/i })).not.toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  await userEvent.click(await screen.findByRole("button", { name: /run connection diagnostics/i }));

  expect(await screen.findByText("Connection diagnostics")).toBeInTheDocument();
  expect(screen.getByText(/tcp reachable/i)).toBeInTheDocument();
  expect(diagnosticsService).toHaveBeenCalledWith(expect.objectContaining({ addr: "127.0.0.1:19091" }));
});

test("shows validation errors before calling login service", async () => {
  const loginService = jest.fn();
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("Principal username is required");
  expect(loginService).not.toHaveBeenCalled();
});

test("shows bad credential service errors as warnings", async () => {
  const loginService = jest.fn().mockRejectedValue({ kind: "authentication", severity: "warning", message: "Invalid credentials" });
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "wrong");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("Invalid credentials");
  expect(screen.queryByRole("button", { name: /run connection diagnostics/i })).not.toBeInTheDocument();
});

test("shows authorization service errors as warnings", async () => {
  const loginService = jest.fn().mockRejectedValue({ kind: "authorization", severity: "warning", message: "principal management capability is required" });
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("principal management capability is required");
});

test("shows connectivity service errors as errors with friendly copy", async () => {
  const loginService = jest.fn().mockRejectedValue({ kind: "connectivity", severity: "error", message: "transport error", detail: "connection refused" });
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "secret");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("❌");
  expect(alert).toHaveTextContent("Could not connect to the Mycel daemon.");
  expect(alert).toHaveTextContent("connection refused");
});

test("shows string errors from Tauri commands", async () => {
  const loginService = jest.fn().mockRejectedValue("transport error: connection refused");
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "wrong");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("❌");
  expect(alert).toHaveTextContent("transport error: connection refused");
});
