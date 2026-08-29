import { act, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { THEME_STORAGE_KEY } from "./types/theme";
import { AUTH_EXPIRED_EVENT, logout, whoAmI } from "./services/adminService";
import { loadConsolePrincipalContext } from "./features/console";

jest.mock("./components/layout/AppShell", () => ({
  AppShell: ({
    session,
    theme,
    onToggleTheme,
  }: {
    session: { username: string };
    theme: string;
    onToggleTheme: () => void;
  }) => (
    <div data-testid="app-shell" data-theme={theme}>
      Signed in as {session.username}
      <button type="button" onClick={onToggleTheme}>
        Toggle theme
      </button>
    </div>
  ),
}));

jest.mock("./features/auth", () => ({
  LoginPage: ({ notice }: { notice?: string }) => (
    <div data-testid="login-page">{notice}</div>
  ),
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

const session = {
  addr: "127.0.0.1:9091",
  principalId: "prn_admin",
  username: "admin",
};

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  jest.mocked(logout).mockClear();
  jest.mocked(whoAmI).mockReset().mockResolvedValue(session);
  jest
    .mocked(loadConsolePrincipalContext)
    .mockReset()
    .mockResolvedValue({
      session,
      roles: [],
      capabilities: [],
      capabilityState: { kind: "complete", capabilities: [] },
      warnings: [],
    });
});

test("passes stored theme to shell and persists toggles", async () => {
  localStorage.setItem(THEME_STORAGE_KEY, "light");

  render(<App />);

  const shell = await screen.findByTestId("app-shell");
  expect(shell).toHaveAttribute("data-theme", "light");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

  act(() => {
    screen.getByRole("button", { name: /toggle theme/i }).click();
  });

  expect(await screen.findByTestId("app-shell")).toHaveAttribute(
    "data-theme",
    "dark",
  );
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(document.documentElement).toHaveClass("dark");
});

test("returns to login when an auth-expired event is emitted", async () => {
  render(<App />);

  expect(await screen.findByTestId("app-shell")).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(
      new CustomEvent(AUTH_EXPIRED_EVENT, {
        detail: { message: "authorization token is expired" },
      }),
    );
  });

  await waitFor(() =>
    expect(screen.getByTestId("login-page")).toHaveTextContent(
      "authorization token is expired",
    ),
  );
  expect(screen.queryByTestId("app-shell")).not.toBeInTheDocument();
  expect(logout).toHaveBeenCalledTimes(1);
});
