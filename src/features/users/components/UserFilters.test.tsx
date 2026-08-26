import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserFilters, type UserFiltersValue } from "./UserFilters";

const value: UserFiltersValue = {
  query: "",
  state: "all",
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

  await userEvent.selectOptions(screen.getByLabelText(/state/i), "PRINCIPAL_STATE_DISABLED");

  expect(onChange).toHaveBeenCalledWith({ ...value, state: "PRINCIPAL_STATE_DISABLED" });
});

test("does not render include flag checkboxes", () => {
  render(<UserFilters value={value} onChange={jest.fn()} />);

  expect(screen.queryByLabelText(/include disabled/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/include deleted/i)).not.toBeInTheDocument();
});
