import { render, screen } from "@testing-library/react";
import { SpaceTable } from "./SpaceTable";

test("renders empty state", () => {
  render(<SpaceTable spaces={[]} />);

  expect(screen.getByText(/no spaces found/i)).toBeInTheDocument();
});

test("renders space rows", () => {
  render(
    <SpaceTable
      spaces={[
        { spaceId: "sp_main", name: "Main", state: "SPACE_STATE_ACTIVE" },
        { spaceId: "sp_archive", name: "Archive", state: "SPACE_STATE_ARCHIVED" },
      ]}
    />,
  );

  expect(screen.getByText("Main")).toBeInTheDocument();
  expect(screen.getByText("sp_main")).toBeInTheDocument();
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(screen.getByText("Archive")).toBeInTheDocument();
  expect(screen.getByText("Archived")).toBeInTheDocument();
});
