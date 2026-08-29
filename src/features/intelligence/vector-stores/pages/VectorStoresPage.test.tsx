import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VectorStoresPage } from "./VectorStoresPage";

function renderPage(
  overrides: Partial<Parameters<typeof VectorStoresPage>[0]> = {},
) {
  const listVectorStoresService = jest.fn().mockResolvedValue({
    vectorStores: [
      {
        vectorStoreId: "vs1",
        key: "mycel-file",
        name: "Mycel File",
        type: "mycel-file",
        privacyClass: "local_only",
        enabled: true,
      },
    ],
    nextPageToken: "",
  });
  render(
    <VectorStoresPage
      listVectorStoresService={listVectorStoresService}
      {...overrides}
    />,
  );
  return { listVectorStoresService };
}

test("renders vector stores as a standalone Intelligence page", async () => {
  const { listVectorStoresService } = renderPage();

  expect(
    screen.getByRole("heading", { name: "Vector stores" }),
  ).toBeInTheDocument();
  expect(await screen.findAllByText("Mycel File")).toHaveLength(2);
  expect(screen.getByText("Local Only")).toBeInTheDocument();
  expect(listVectorStoresService).toHaveBeenCalledWith({
    pageSize: 100,
    includeDisabled: false,
  });
});

test("can include disabled vector stores", async () => {
  const { listVectorStoresService } = renderPage();

  await screen.findAllByText("Mycel File");
  await userEvent.click(screen.getByLabelText(/include disabled/i));

  await waitFor(() =>
    expect(listVectorStoresService).toHaveBeenLastCalledWith({
      pageSize: 100,
      includeDisabled: true,
    }),
  );
});

test("opens vector store details", async () => {
  renderPage();

  await screen.findAllByText("Mycel File");
  await userEvent.click(screen.getByRole("button", { name: "View" }));

  expect(
    screen.getByText("Vector store diagnostic payload."),
  ).toBeInTheDocument();
  expect(screen.getByText(/"vectorStoreId": "vs1"/)).toBeInTheDocument();
});
