import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginPage } from "./LoginPage";

test("invokes login service and reports successful principal session", async () => {
  const session = {
    addr: "127.0.0.1:19091",
    operatorId: "operator-1",
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
});

test("runs connection diagnostics", async () => {
  const diagnosticsService = jest.fn().mockResolvedValue({
    addr: "127.0.0.1:19091",
    checks: [{ id: "tcp", label: "TCP reachable", status: "pass", detail: "Connected" }],
  });

  render(<LoginPage diagnosticsService={diagnosticsService} onLoginSuccess={jest.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: /run connection diagnostics/i }));

  expect(await screen.findByText("Connection diagnostics")).toBeInTheDocument();
  expect(screen.getByText(/tcp reachable/i)).toBeInTheDocument();
  expect(diagnosticsService).toHaveBeenCalledWith(expect.objectContaining({ addr: "127.0.0.1:19091" }));
});

test("shows validation errors before calling login service", async () => {
  const loginService = jest.fn();
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Principal username is required");
  expect(loginService).not.toHaveBeenCalled();
});

test("shows login service errors", async () => {
  const loginService = jest.fn().mockRejectedValue(new Error("Invalid credentials"));
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "wrong");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Invalid credentials");
});

test("shows string errors from Tauri commands", async () => {
  const loginService = jest.fn().mockRejectedValue("transport error: connection refused");
  render(<LoginPage loginService={loginService} onLoginSuccess={jest.fn()} />);

  await userEvent.type(screen.getByLabelText(/principal username/i), "operator");
  await userEvent.type(screen.getByLabelText(/password/i), "wrong");
  await userEvent.click(screen.getByRole("button", { name: /login/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("transport error: connection refused");
});
