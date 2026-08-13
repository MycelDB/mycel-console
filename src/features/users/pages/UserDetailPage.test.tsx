import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { UserDetailPage } from "./UserDetailPage";

function renderDetail(overrides: Partial<ComponentProps<typeof UserDetailPage>> = {}) {
  const getUserService = jest.fn().mockResolvedValue({
    userId: "usr_alice",
    username: "alice",
    state: "USER_STATE_ACTIVE",
    createTime: "1710000000",
    updateTime: "1710003600",
  });
  const listUserSessionsService = jest.fn().mockResolvedValue({
    sessions: [{
      authSessionId: "sess_1",
      state: "ADMIN_AUTH_SESSION_STATE_ACTIVE",
      createTime: "1710000000",
      lastSeenTime: "1710003600",
      expireTime: "1710010000",
      client: { name: "knot", version: "1.0", platform: "web", deviceLabel: "laptop" },
    }],
    nextPageToken: "",
  });
  const services = {
    getUserService,
    listUserSessionsService,
    listSpacesService: jest.fn().mockResolvedValue({
      spaces: [
        { spaceId: "sp_owned", name: "Owned Space", state: "SPACE_STATE_ACTIVE", owner: { principalType: "PRINCIPAL_TYPE_USER", id: "usr_alice", displayName: "alice" } },
        { spaceId: "sp_other", name: "Other Space", state: "SPACE_STATE_ACTIVE", owner: { principalType: "PRINCIPAL_TYPE_USER", id: "usr_other", displayName: "other" } },
      ],
      nextPageToken: "",
    }),
    revokeUserSessionService: jest.fn().mockResolvedValue(undefined),
    revokeUserSessionsService: jest.fn().mockResolvedValue({ revokedCount: 1 }),
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={["/principals/usr_alice"]}>
      <Routes>
        <Route path="/principals/:userId" element={<UserDetailPage {...services} />} />
      </Routes>
    </MemoryRouter>,
  );
  return services;
}

test("renders principal identity and sessions", async () => {
  const { getUserService, listUserSessionsService, listSpacesService } = renderDetail();

  expect(screen.getByText(/loading principal/i)).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "alice" })).toBeInTheDocument();
  expect(screen.getByText("usr_alice")).toBeInTheDocument();
  expect(screen.getByText("sess_1")).toBeInTheDocument();
  expect(screen.getByText(/knot · 1.0 · web · laptop/)).toBeInTheDocument();
  expect(getUserService).toHaveBeenCalledWith("usr_alice");
  expect(listUserSessionsService).toHaveBeenCalledWith({ userId: "usr_alice", pageSize: 100, includeInactive: false });
  expect(listSpacesService).toHaveBeenCalledWith({ pageSize: 100, includeArchived: true });
  expect(screen.getByRole("heading", { name: /owned spaces/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Owned Space" })).toHaveAttribute("href", "/spaces/sp_owned");
  expect(screen.queryByText("Other Space")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /semantic diagnostics/i })).toBeInTheDocument();
  expect(screen.getByText(/ExplainEffectiveAccess/)).toBeInTheDocument();
  expect(screen.getByText(/ExplainSemanticSearch/)).toBeInTheDocument();
});

test("revokes one session after confirmation", async () => {
  const services = renderDetail();

  await screen.findByText("sess_1");
  await userEvent.click(screen.getByRole("button", { name: /^revoke$/i }));
  expect(screen.getByRole("heading", { name: /revoke this principal session/i })).toBeInTheDocument();
  const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
  await userEvent.click(revokeButtons[revokeButtons.length - 1]);

  await waitFor(() => expect(services.revokeUserSessionService).toHaveBeenCalledWith({ userId: "usr_alice", authSessionId: "sess_1" }));
});

test("revokes all sessions after confirmation", async () => {
  const services = renderDetail();

  await screen.findByText("sess_1");
  await userEvent.click(screen.getByRole("button", { name: /revoke all sessions/i }));
  expect(screen.getByRole("heading", { name: /revoke all principal sessions/i })).toBeInTheDocument();
  const revokeButtons = screen.getAllByRole("button", { name: /^revoke$/i });
  await userEvent.click(revokeButtons[revokeButtons.length - 1]);

  await waitFor(() => expect(services.revokeUserSessionsService).toHaveBeenCalledWith("usr_alice"));
});
