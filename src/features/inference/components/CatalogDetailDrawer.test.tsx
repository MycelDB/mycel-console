import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogDetailDrawer } from "./CatalogDetailDrawer";

test("renders catalog details and closes", async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();

  render(
    <CatalogDetailDrawer
      title="Endpoint details"
      data={{ modelEndpointId: "endpoint_1", nested: { enabled: true } }}
      onClose={onClose}
    />,
  );

  expect(
    screen.getByRole("heading", { name: "Endpoint details" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/modelEndpointId/)).toBeInTheDocument();
  expect(screen.getByText(/endpoint_1/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
