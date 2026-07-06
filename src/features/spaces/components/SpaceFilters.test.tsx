import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpaceFilters, type SpaceFiltersValue } from "./SpaceFilters";

const value: SpaceFiltersValue = {
  query: "",
  includeArchived: false,
};

test("updates name query", async () => {
  const onChange = jest.fn();
  render(<SpaceFilters value={value} onChange={onChange} />);

  await userEvent.type(screen.getByLabelText(/name/i), "main");

  expect(onChange).toHaveBeenCalledWith({ ...value, query: "m" });
});

test("updates include archived", async () => {
  const onChange = jest.fn();
  render(<SpaceFilters value={value} onChange={onChange} />);

  await userEvent.click(screen.getByLabelText(/include archived/i));

  expect(onChange).toHaveBeenCalledWith({ ...value, includeArchived: true });
});
