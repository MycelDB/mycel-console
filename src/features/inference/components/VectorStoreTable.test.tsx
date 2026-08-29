import { render, screen } from "@testing-library/react";
import { VectorStoreTable } from "./VectorStoreTable";

test("renders vector store rows", () => {
  render(
    <VectorStoreTable
      stores={[
        {
          vectorStoreId: "vs1",
          key: "mycel-file",
          name: "Mycel File",
          type: "mycel-file",
          privacyClass: "local_only",
          enabled: true,
        },
      ]}
    />,
  );
  expect(screen.getByText("mycel-file")).toBeInTheDocument();
  expect(screen.getAllByText("Mycel File").length).toBeGreaterThan(0);
  expect(screen.getByText("Local Only")).toBeInTheDocument();
});

test("renders vector store empty state", () => {
  render(<VectorStoreTable stores={[]} />);
  expect(screen.getByText(/no vector stores/i)).toBeInTheDocument();
});
