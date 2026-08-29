import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AccessPage } from "./AccessPage";

function renderAccessPage(
  overrides: Partial<Parameters<typeof AccessPage>[0]> = {},
) {
  const listPrincipalsService = jest.fn().mockResolvedValue({
    principals: [
      {
        principalId: "prn_admin",
        username: "admin",
        state: "PRINCIPAL_STATE_ACTIVE",
        loginEnabled: true,
      },
      {
        principalId: "prn_reader",
        username: "reader",
        state: "PRINCIPAL_STATE_ACTIVE",
        loginEnabled: true,
      },
    ],
    nextPageToken: "",
  });
  const listPrincipalRolesService = jest.fn(async (principalId: string) => ({
    grants:
      principalId === "prn_admin"
        ? [
            {
              roleGrantId: "role_1",
              principalId,
              role: "system_admin",
              scope: { type: "ACCESS_SCOPE_TYPE_SYSTEM" },
              reason: "bootstrap",
              grantedByPrincipalId: "system",
              createTime: "1710000000",
            },
          ]
        : [],
    effectiveRoles: principalId === "prn_admin" ? ["system_admin"] : [],
  }));
  const listPrincipalCapabilitiesService = jest.fn(
    async (principalId: string) => ({
      grants:
        principalId === "prn_reader"
          ? [
              {
                capabilityGrantId: "cap_1",
                principalId,
                capability: "CAPABILITY_SPACE_READ",
                scope: { type: "ACCESS_SCOPE_TYPE_SPACE", spaceId: "sp_main" },
                reason: "read only",
                grantedByPrincipalId: "admin",
                createTime: "1710000000",
              },
            ]
          : [],
      effectiveCapabilities:
        principalId === "prn_admin"
          ? ["CAPABILITY_IDENTITY_GRANT_MANAGE"]
          : ["CAPABILITY_SPACE_READ"],
    }),
  );

  render(
    <MemoryRouter>
      <AccessPage
        listPrincipalsService={listPrincipalsService}
        listPrincipalRolesService={listPrincipalRolesService}
        listPrincipalCapabilitiesService={listPrincipalCapabilitiesService}
        {...overrides}
      />
    </MemoryRouter>,
  );

  return {
    listPrincipalsService,
    listPrincipalRolesService,
    listPrincipalCapabilitiesService,
  };
}

test("renders principal roles and capabilities", async () => {
  const services = renderAccessPage();

  expect(
    screen.getByRole("heading", { name: /roles & capabilities/i }),
  ).toBeInTheDocument();
  expect(screen.getByText(/loading access/i)).toBeInTheDocument();
  expect(await screen.findByRole("link", { name: "admin" })).toHaveAttribute(
    "href",
    "/principals/prn_admin",
  );
  expect(screen.getByRole("link", { name: "reader" })).toHaveAttribute(
    "href",
    "/principals/prn_reader",
  );
  expect(screen.getAllByText("system_admin")).toHaveLength(2);
  expect(
    screen.getByText("CAPABILITY_IDENTITY_GRANT_MANAGE"),
  ).toBeInTheDocument();
  expect(screen.getAllByText("CAPABILITY_SPACE_READ")).toHaveLength(2);
  expect(screen.getByText("Space · sp_main")).toBeInTheDocument();
  expect(screen.getByText("Admin-capable principals")).toBeInTheDocument();
  expect(services.listPrincipalsService).toHaveBeenCalledWith({
    pageSize: 100,
    includeDisabled: true,
    includeDeleted: false,
  });
  expect(services.listPrincipalRolesService).toHaveBeenCalledWith("prn_admin");
  expect(services.listPrincipalCapabilitiesService).toHaveBeenCalledWith(
    "prn_reader",
  );
});

test("refresh reloads access rows", async () => {
  const services = renderAccessPage();

  await screen.findByRole("link", { name: "admin" });
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  expect(services.listPrincipalsService).toHaveBeenCalledTimes(2);
});

test("shows principal list failure", async () => {
  renderAccessPage({
    listPrincipalsService: jest
      .fn()
      .mockRejectedValue(new Error("Access unavailable")),
  });

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Access unavailable",
  );
});
