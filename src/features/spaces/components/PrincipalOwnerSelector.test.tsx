import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PrincipalInfo } from "../../../types/users";
import { PrincipalOwnerSelector } from "./PrincipalOwnerSelector";

const active: PrincipalInfo = {
  principalId: "prn_alex_active",
  username: "alex",
  displayName: "Alex Example",
  type: "PRINCIPAL_TYPE_USER",
  state: "PRINCIPAL_STATE_ACTIVE",
};
const activeSecond: PrincipalInfo = {
  principalId: "prn_blair_active",
  username: "blair",
  displayName: "Blair Example",
  type: "PRINCIPAL_TYPE_SERVICE",
  state: "PRINCIPAL_STATE_ACTIVE",
};
const disabled: PrincipalInfo = {
  principalId: "prn_alex_disabled",
  username: "alex-disabled",
  displayName: "Alex Example",
  type: "PRINCIPAL_TYPE_SERVICE",
  state: "PRINCIPAL_STATE_DISABLED",
};
const deleted: PrincipalInfo = {
  principalId: "prn_deleted",
  username: "deleted-owner",
  displayName: "Deleted Owner",
  type: "PRINCIPAL_TYPE_USER",
  state: "PRINCIPAL_STATE_DELETED",
};

function renderSelector(
  overrides: Partial<React.ComponentProps<typeof PrincipalOwnerSelector>> = {},
) {
  const props: React.ComponentProps<typeof PrincipalOwnerSelector> = {
    principals: [active, activeSecond, disabled, deleted],
    selectedPrincipal: null,
    query: "",
    loading: false,
    loadingMore: false,
    error: "",
    hasMore: false,
    onQueryChange: jest.fn(),
    onSelect: jest.fn(),
    onClear: jest.fn(),
    onLoadMore: jest.fn(),
    onRetry: jest.fn(),
    onUseManualFallback: jest.fn(),
    ...overrides,
  };
  const view = render(<PrincipalOwnerSelector {...props} />);
  return { ...view, props };
}

test("shows only active principal names and supports keyboard selection", async () => {
  const { props } = renderSelector();
  const combobox = screen.getByRole("combobox", { name: "Owner principal" });

  await userEvent.click(combobox);
  expect(screen.getByRole("option", { name: "alex" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: "blair" })).toBeInTheDocument();
  expect(screen.queryByText("Alex Example")).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "alex-disabled" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "deleted-owner" })).not.toBeInTheDocument();

  await userEvent.keyboard("{ArrowDown}{Enter}");
  expect(props.onSelect).toHaveBeenCalledWith(activeSecond);
});

test("fails closed when the catalog contains no active principals", async () => {
  renderSelector({ principals: [disabled, deleted] });
  expect(
    screen.getByText("No active owner principals are available in the catalog."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
});

test("renders loading, empty, failure, and partial no-match states explicitly", async () => {
  const { rerender, props } = renderSelector({ loading: true, principals: [] });
  expect(screen.getByText("Loading owner principals…")).toBeInTheDocument();

  rerender(
    <PrincipalOwnerSelector {...props} loading={false} principals={[]} />,
  );
  expect(
    screen.getByText("No active owner principals are available in the catalog."),
  ).toBeInTheDocument();

  rerender(
    <PrincipalOwnerSelector
      {...props}
      loading={false}
      principals={[]}
      error="Catalog unavailable"
    />,
  );
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Principal catalog failed: Catalog unavailable",
  );

  rerender(
    <PrincipalOwnerSelector
      {...props}
      loading={false}
      principals={[active]}
      query="missing"
      hasMore
    />,
  );
  expect(
    screen.getByText(/More principals have not been loaded yet/i),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Load more principals" }),
  ).toBeInTheDocument();
});

test("selected identity stays in the compact input until explicitly cleared", async () => {
  const { props } = renderSelector({ selectedPrincipal: active });
  const combobox = screen.getByRole("combobox", { name: "Owner principal" });
  expect(combobox).toHaveValue("alex");
  expect(combobox).toHaveAttribute("readonly");
  expect(combobox).toHaveAttribute("title", "Principal ID: prn_alex_active");

  await userEvent.click(combobox);
  expect(
    screen.getByRole("listbox", { name: "Owner principal results" }),
  ).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Clear owner" }));
  expect(props.onClear).toHaveBeenCalledTimes(1);
});
