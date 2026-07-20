import { render, screen } from "@testing-library/react";
import { ModelEndpointCapabilityTable } from "./ModelEndpointCapabilityTable";

test("renders capability rows", () => {
  render(<ModelEndpointCapabilityTable capabilities={[{ modelEndpointCapabilityId: "cap1", modelEndpointId: "ep1", modelId: "m1", operation: "embeddings", enabled: true, modelNameOverride: "" }]} />);
  expect(screen.getByText("ep1")).toBeInTheDocument();
  expect(screen.getByText("m1")).toBeInTheDocument();
  expect(screen.getByText("embeddings")).toBeInTheDocument();
});

test("renders capability empty state", () => {
  render(<ModelEndpointCapabilityTable capabilities={[]} />);
  expect(screen.getByText(/no endpoint capabilities/i)).toBeInTheDocument();
});
