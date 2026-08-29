import { render, screen } from "@testing-library/react";
import { ModelEndpointCapabilityTable } from "./ModelEndpointCapabilityTable";

test("renders capability rows", () => {
  render(
    <ModelEndpointCapabilityTable
      capabilities={[
        {
          modelEndpointCapabilityId: "cap1",
          modelEndpointId: "ep1",
          modelEndpointKey: "openai",
          modelId: "m1",
          modelKey: "openai/text-embedding-3-small",
          operation: "embeddings",
          enabled: true,
        },
      ]}
    />,
  );
  expect(screen.getByText("openai")).toBeInTheDocument();
  expect(screen.getByText("openai/text-embedding-3-small")).toBeInTheDocument();
  expect(screen.getByText("Embeddings")).toBeInTheDocument();
});

test("renders capability empty state", () => {
  render(<ModelEndpointCapabilityTable capabilities={[]} />);
  expect(screen.getByText(/no endpoint capabilities/i)).toBeInTheDocument();
});
