import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpacesPage } from "./SpacesPage";
import type { ListSpacesInput, ListSpacesResponse } from "../../../types/spaces";

const spaces = [
  { spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" },
  { spaceId: "sp_research", name: "Research", state: "SPACE_STATE_ACTIVE" },
  { spaceId: "sp_archive", name: "Archive", state: "SPACE_STATE_ARCHIVED" },
];

function listSpacesResponse(overrides: Partial<ListSpacesResponse> = {}): ListSpacesResponse {
  return {
    spaces,
    nextPageToken: "",
    ...overrides,
  };
}

function renderSpacesPage(
  listSpacesService = jest.fn<Promise<ListSpacesResponse>, [ListSpacesInput]>().mockResolvedValue(listSpacesResponse()),
) {
  render(<SpacesPage listSpacesService={listSpacesService} />);
  return { listSpacesService };
}

test("renders loading state then space rows", async () => {
  renderSpacesPage();

  expect(screen.getByText(/loading spaces/i)).toBeInTheDocument();
  expect(await screen.findByText("Main")).toBeInTheDocument();
  expect(screen.getByText("sp_main")).toBeInTheDocument();
});

test("renders backend errors", async () => {
  renderSpacesPage(jest.fn().mockRejectedValue(new Error("List spaces failed")));

  expect(await screen.findByRole("alert")).toHaveTextContent("List spaces failed");
});

test("renders empty state", async () => {
  renderSpacesPage(jest.fn().mockResolvedValue(listSpacesResponse({ spaces: [] })));

  expect(await screen.findByText(/no spaces found/i)).toBeInTheDocument();
});

test("filters by name", async () => {
  renderSpacesPage();

  expect(await screen.findByText("Main")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/name/i), "Research");

  expect(screen.getByText("Research")).toBeInTheDocument();
  expect(screen.queryByText("Main")).not.toBeInTheDocument();
});

test("refresh invokes list service with current include archived flag", async () => {
  const listSpacesService = jest.fn<Promise<ListSpacesResponse>, [ListSpacesInput]>().mockResolvedValue(listSpacesResponse());
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

test("loads additional pages", async () => {
  const listSpacesService = jest
    .fn<Promise<ListSpacesResponse>, [ListSpacesInput]>()
    .mockResolvedValueOnce(listSpacesResponse({ spaces: [spaces[0]], nextPageToken: "next" }))
    .mockResolvedValueOnce(listSpacesResponse({ spaces: [spaces[1]], nextPageToken: "" }));
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
