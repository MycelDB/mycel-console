import { act, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { AUTH_EXPIRED_EVENT, logout, whoAmI } from "./services/adminService";
import { loadConsolePrincipalContext } from "./features/console";

jest.mock("./components/layout/AppShell", () => ({
  AppShell: ({ session }: { session: { username: string } }) => <div data-testid="app-shell">Signed in as {session.username}</div>,
}));

jest.mock("./features/auth", () => ({
  LoginPage: ({ notice }: { notice?: string }) => <div data-testid="login-page">{notice}</div>,
}));

jest.mock("./features/console", () => ({
  consoleBranding: { currentDisplayName: "mycel console" },
  loadConsolePrincipalContext: jest.fn(),
}));

jest.mock("./services/adminService", () => ({
  AUTH_EXPIRED_EVENT: "mycel-console:auth-expired",
  logout: jest.fn().mockResolvedValue(undefined),
  whoAmI: jest.fn(),
}));

const session = { addr: "127.0.0.1:9091", principalId: "prn_admin", username: "admin" };

beforeEach(() => {
  jest.mocked(logout).mockClear();
  jest.mocked(whoAmI).mockReset().mockResolvedValue(session);
  jest.mocked(loadConsolePrincipalContext).mockReset().mockResolvedValue({
    session,
    roles: [],
    capabilities: [],
    capabilityState: { kind: "complete", capabilities: [] },
    warnings: [],
  });
});

test("returns to login when an auth-expired event is emitted", async () => {
  render(<App />);

  expect(await screen.findByTestId("app-shell")).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { message: "authorization token is expired" } }));
  });

  await waitFor(() => expect(screen.getByTestId("login-page")).toHaveTextContent("authorization token is expired"));
  expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});
