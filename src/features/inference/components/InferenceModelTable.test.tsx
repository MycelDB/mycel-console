import { render, screen } from "@testing-library/react";
import { InferenceModelTable } from "./InferenceModelTable";

test("renders model rows", () => {
  render(<InferenceModelTable models={[{ modelId: "m1", key: "openai/text-embedding-3-small", operation: "embeddings", modelName: "text-embedding-3-small", connectorTypes: ["openai-compatible"], dimensions: 1536, modality: "text", vectorSpaceKey: "openai/text-embedding-3-small" }]} capabilities={[{ modelEndpointCapabilityId: "cap1", modelEndpointId: "ep1", modelEndpointKey: "openai", modelId: "m1", modelKey: "openai/text-embedding-3-small", operation: "embeddings", enabled: true }]} />);
  expect(screen.getAllByText("openai/text-embedding-3-small")).toHaveLength(2);
  expect(screen.getByText("embeddings · openai")).toBeInTheDocument();
  expect(screen.getByText("1536")).toBeInTheDocument();
  expect(screen.getByText("openai-compatible")).toBeInTheDocument();
});

test("renders model empty state", () => {
  render(<InferenceModelTable models={[]} />);
  expect(screen.getByText(/no models/i)).toBeInTheDocument();
});
