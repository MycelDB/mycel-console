import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserFilters, type UserFiltersValue } from "./UserFilters";

const value: UserFiltersValue = {
  query: "",
  state: "all",
  includeDisabled: true,
  includeDeleted: false,
};

test("updates username query", async () => {
  const onChange = jest.fn();
  render(<UserFilters value={value} onChange={onChange} />);

  await userEvent.type(screen.getByLabelText(/username/i), "alice");

  expect(onChange).toHaveBeenCalledWith({ ...value, query: "a" });
});

test("updates state filter", async () => {
  const onChange = jest.fn();
  render(<UserFilters value={value} onChange={onChange} />);

  await userEvent.selectOptions(screen.getByLabelText(/state/i), "USER_STATE_DISABLED");

  expect(onChange).toHaveBeenCalledWith({ ...value, state: "USER_STATE_DISABLED" });
});

test("updates include flags", async () => {
  const onChange = jest.fn();
  render(<UserFilters value={value} onChange={onChange} />);

  await userEvent.click(screen.getByLabelText(/include disabled/i));
  await userEvent.click(screen.getByLabelText(/include deleted/i));

  expect(onChange).toHaveBeenCalledWith({ ...value, includeDisabled: false });
  expect(onChange).toHaveBeenCalledWith({ ...value, includeDeleted: true });
});
