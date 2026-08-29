import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SpacesPage } from "./SpacesPage";
import type {
  ListSpacesInput,
  ListSpacesResponse,
} from "../../../types/spaces";

const spaces = [
  { spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" },
  { spaceId: "sp_research", name: "Research", state: "SPACE_STATE_ACTIVE" },
  { spaceId: "sp_archive", name: "Archive", state: "SPACE_STATE_ARCHIVED" },
];

function numberedSpaces(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const number = start + index;
    return {
      spaceId: `sp_${number}`,
      name: `Space ${String(number).padStart(3, "0")}`,
      state: "SPACE_STATE_ACTIVE",
    };
  });
}

function listSpacesResponse(
  overrides: Partial<ListSpacesResponse> = {},
): ListSpacesResponse {
  return {
    spaces,
    nextPageToken: "",
    ...overrides,
  };
}

function renderSpacesPage(
  listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValue(listSpacesResponse()),
) {
  render(
    <MemoryRouter>
      <SpacesPage listSpacesService={listSpacesService} />
    </MemoryRouter>,
  );
  return { listSpacesService };
}

test("renders loading state then space rows", async () => {
  renderSpacesPage();

  expect(screen.getByText(/loading spaces/i)).toBeInTheDocument();
  expect(await screen.findByText("Main")).toBeInTheDocument();
  expect(screen.getByText("sp_main")).toBeInTheDocument();
});

test("renders backend errors", async () => {
  renderSpacesPage(
    jest.fn().mockRejectedValue(new Error("List spaces failed")),
  );

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "List spaces failed",
  );
});

test("renders empty state", async () => {
  renderSpacesPage(
    jest.fn().mockResolvedValue(listSpacesResponse({ spaces: [] })),
  );

  expect(await screen.findByText(/no spaces found/i)).toBeInTheDocument();
});

test("filters by name", async () => {
  renderSpacesPage();

  expect(await screen.findByText("Main")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/name/i), "Research");

  expect(screen.getByText("Research")).toBeInTheDocument();
  expect(screen.queryByText("Main")).not.toBeInTheDocument();
});

test("explains when a name search miss only covered loaded spaces", async () => {
  const page1 = numberedSpaces(1, 100);
  const page2 = numberedSpaces(101, 100);
  const page3 = [
    ...numberedSpaces(201, 49),
    {
      spaceId: "sp_late_target",
      name: "Late target",
      state: "SPACE_STATE_ACTIVE",
    },
  ];
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: page1, nextPageToken: "page-2" }),
    )
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: page2, nextPageToken: "page-3" }),
    )
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: page3, nextPageToken: "" }),
    );
  renderSpacesPage(listSpacesService);

  expect(await screen.findByText("Space 001")).toBeInTheDocument();
  expect(
    screen.getByText("Showing 100 of 100 loaded spaces."),
  ).toBeInTheDocument();

  await userEvent.type(screen.getByLabelText(/name/i), "Late target");

  expect(
    screen.getByText("Showing 0 of 100 loaded spaces."),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/No matches among the 100 loaded spaces/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/More spaces have not been loaded yet/i),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /load more/i }));
  await waitFor(() =>
    expect(
      screen.getByText("Showing 0 of 200 loaded spaces."),
    ).toBeInTheDocument(),
  );
  expect(
    screen.getByText(/No matches among the 200 loaded spaces/i),
  ).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /load more/i }));
  expect(await screen.findByText("Late target")).toBeInTheDocument();
  expect(
    screen.getByText("Showing 1 of 250 loaded spaces."),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(/More spaces have not been loaded yet/i),
  ).not.toBeInTheDocument();
});

test("uses the plain empty state when a name search miss covered all loaded spaces", async () => {
  renderSpacesPage(
    jest
      .fn()
      .mockResolvedValue(
        listSpacesResponse({
          spaces: numberedSpaces(1, 40),
          nextPageToken: "",
        }),
      ),
  );

  expect(await screen.findByText("Space 001")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/name/i), "Missing space");

  expect(
    screen.getByText("Showing 0 of 40 loaded spaces."),
  ).toBeInTheDocument();
  expect(screen.getByText(/no spaces found/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/More spaces have not been loaded yet/i),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /load more/i }),
  ).not.toBeInTheDocument();
});

test("refresh invokes list service with current include archived flag", async () => {
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValue(listSpacesResponse());
  renderSpacesPage(listSpacesService);

  await screen.findByText("Main");
  await userEvent.click(screen.getByLabelText(/include archived/i));
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() =>
    expect(listSpacesService).toHaveBeenLastCalledWith({
      pageSize: 100,
      pageToken: "",
      includeArchived: true,
    }),
  );
});

test("creates a space without capitalizing submitted names", async () => {
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValue(listSpacesResponse());
  const createSpaceService = jest
    .fn()
    .mockResolvedValue({
      space: {
        spaceId: "sp_martin",
        name: "martin_space",
        state: "SPACE_STATE_ACTIVE",
      },
      defaultDomainId: "dom_default",
    });
  render(
    <MemoryRouter>
      <SpacesPage
        listSpacesService={listSpacesService}
        createSpaceService={createSpaceService}
      />
    </MemoryRouter>,
  );

  await screen.findByText("Main");
  await userEvent.click(
    screen.getByRole("button", { name: /^create space$/i }),
  );
  await userEvent.type(screen.getByLabelText(/space name/i), "martin_space");
  await userEvent.type(screen.getByLabelText(/owner username/i), "martin");
  expect(screen.getByLabelText(/default domain name/i)).toHaveValue("default");
  const createButtons = screen.getAllByRole("button", {
    name: /^create space$/i,
  });
  await userEvent.click(createButtons[createButtons.length - 1]);

  await waitFor(() =>
    expect(createSpaceService).toHaveBeenCalledWith({
      name: "martin_space",
      ownerUsername: "martin",
      defaultDomainKey: "default",
      defaultDomainName: "default",
    }),
  );
});

test("deletes a space after typing the space name", async () => {
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: [spaces[0]], nextPageToken: "" }),
    )
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: [], nextPageToken: "" }),
    );
  const deleteSpaceService = jest.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <SpacesPage
        listSpacesService={listSpacesService}
        deleteSpaceService={deleteSpaceService}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Main")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Delete" }));
  expect(
    screen.getByRole("heading", { name: /confirm space deletion/i }),
  ).toBeInTheDocument();
  const confirmButton = screen.getByRole("button", { name: /delete space/i });
  expect(confirmButton).toBeDisabled();

  await userEvent.type(screen.getByLabelText(/type main to confirm/i), "Main");
  expect(confirmButton).toBeEnabled();
  await userEvent.click(confirmButton);

  await waitFor(() =>
    expect(deleteSpaceService).toHaveBeenCalledWith("sp_main"),
  );
  expect(listSpacesService).toHaveBeenCalledTimes(2);
  expect(await screen.findByText(/no spaces found/i)).toBeInTheDocument();
});

test("hides delete action without space delete capability", async () => {
  render(
    <MemoryRouter>
      <SpacesPage
        listSpacesService={jest.fn().mockResolvedValue(listSpacesResponse())}
        principalContext={{
          session: {
            addr: "127.0.0.1:19091",
            principalId: "prn_reader",
            username: "reader",
          },
          roles: [],
          capabilities: ["CAPABILITY_SPACE_READ"],
          capabilityState: {
            kind: "complete",
            capabilities: [{ capability: "CAPABILITY_SPACE_READ" }],
          },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Main")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
  expect(screen.getAllByText("Read-only").length).toBeGreaterThan(0);
});

test("hides create action without space create capability", async () => {
  render(
    <MemoryRouter>
      <SpacesPage
        listSpacesService={jest.fn().mockResolvedValue(listSpacesResponse())}
        principalContext={{
          session: {
            addr: "127.0.0.1:19091",
            principalId: "prn_reader",
            username: "reader",
          },
          roles: [],
          capabilities: ["CAPABILITY_SPACE_READ"],
          capabilityState: {
            kind: "complete",
            capabilities: [{ capability: "CAPABILITY_SPACE_READ" }],
          },
          warnings: [],
        }}
      />
    </MemoryRouter>,
  );

  expect(await screen.findByText("Main")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /^create space$/i }),
  ).not.toBeInTheDocument();
});

test("loads additional pages", async () => {
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: [spaces[0]], nextPageToken: "next" }),
    )
    .mockResolvedValueOnce(
      listSpacesResponse({ spaces: [spaces[1]], nextPageToken: "" }),
    );
  renderSpacesPage(listSpacesService);

  expect(await screen.findByText("Main")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("Research")).toBeInTheDocument();
  expect(listSpacesService).toHaveBeenLastCalledWith({
    pageSize: 100,
    pageToken: "next",
    includeArchived: false,
  });
});
