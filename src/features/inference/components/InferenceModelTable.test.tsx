import { fireEvent, render, screen, within } from "@testing-library/react";
import type {
  InferenceModelInfo,
  ModelEndpointCapabilityInfo,
} from "../../../types/inference";
import { InferenceModelTable } from "./InferenceModelTable";

const generativeModel: InferenceModelInfo = {
  modelId: "gen-1",
  key: "openai/gpt-5.6-terra",
  kind: "generative",
  modelName: "gpt-5.6-terra",
  connectorTypes: ["openai-compatible"],
  dimensions: 0,
  inputModalities: ["text", "image"],
  outputModalities: ["text", "json"],
  vectorSpaceKey: "",
  metadata: {
    context_tokens: 1_050_000,
    max_output_tokens: 128_000,
  },
};

const embeddingModel: InferenceModelInfo = {
  modelId: "embed-1",
  key: "openai/text-embedding-3-small",
  kind: "embedding",
  modelName: "text-embedding-3-small",
  connectorTypes: ["openai-compatible"],
  dimensions: 1536,
  inputModalities: ["text"],
  outputModalities: ["embedding"],
  vectorSpaceKey: "openai/text-embedding-3-small",
  metadata: {
    max_input_tokens: 8192,
    default_dimensions: 1536,
    provider_supports_adjustable_dimensions: true,
    connector_uses_fixed_dimensions: true,
  },
};

const capabilities: ModelEndpointCapabilityInfo[] = [
  {
    modelEndpointCapabilityId: "gen-cap",
    modelEndpointId: "ep-openai",
    modelEndpointKey: "openai",
    modelId: generativeModel.modelId,
    operation: "chat",
    enabled: true,
  },
  {
    modelEndpointCapabilityId: "embed-cap",
    modelEndpointId: "ep-openai",
    modelEndpointKey: "openai",
    modelId: embeddingModel.modelId,
    operation: "embeddings",
    enabled: true,
  },
];

function sectionNamed(name: string) {
  const section = screen.getByRole("heading", { name }).closest("section");
  expect(section).not.toBeNull();
  return within(section as HTMLElement);
}

test("separates generative and embedding models into type-aware tables", () => {
  render(
    <InferenceModelTable
      models={[embeddingModel, generativeModel]}
      capabilities={capabilities}
    />,
  );

  const generative = sectionNamed("Generative models");
  expect(generative.getByText("openai/gpt-5.6-terra")).toBeInTheDocument();
  expect(generative.getByText("Chat · openai")).toBeInTheDocument();
  expect(generative.getByText("Text+Image → Text+Json")).toBeInTheDocument();
  expect(generative.getByText("1,050,000")).toBeInTheDocument();
  expect(generative.getByText("128,000")).toBeInTheDocument();
  expect(
    generative.queryByRole("columnheader", { name: "Dimensions" }),
  ).not.toBeInTheDocument();
  expect(
    generative.queryByRole("columnheader", { name: "Vector space" }),
  ).not.toBeInTheDocument();

  const embedding = sectionNamed("Embedding models");
  expect(
    embedding.getAllByText("openai/text-embedding-3-small"),
  ).toHaveLength(2);
  expect(embedding.getByText("Embeddings · openai")).toBeInTheDocument();
  expect(embedding.getByText("1,536")).toBeInTheDocument();
  expect(embedding.getByText("8,192")).toBeInTheDocument();
  expect(embedding.getByText("Fixed by connector")).toBeInTheDocument();
  expect(
    embedding.getByText("Provider supports adjustment"),
  ).toBeInTheDocument();
  expect(
    embedding.queryByRole("columnheader", { name: "Context window" }),
  ).not.toBeInTheDocument();
  expect(
    embedding.queryByRole("columnheader", { name: "Max output tokens" }),
  ).not.toBeInTheDocument();
});

test("keeps unknown kinds visible in a deterministic fallback section", () => {
  render(
    <InferenceModelTable
      models={[
        {
          ...generativeModel,
          modelId: "future-2",
          key: "provider/zeta",
          modelName: "zeta",
          kind: "future_generation",
        },
        {
          ...generativeModel,
          modelId: "future-1",
          key: "provider/alpha",
          modelName: "alpha",
          kind: "reranker",
        },
      ]}
    />,
  );

  const other = sectionNamed("Other models");
  expect(other.getByText("Future Generation")).toBeInTheDocument();
  expect(other.getByText("Reranker")).toBeInTheDocument();
  const modelKeys = other
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
  expect(modelKeys).toEqual([
    "provider/alphaalpha",
    "provider/zetazeta",
  ]);
});

test("reports missing or malformed optional metadata without inventing zero values", () => {
  render(
    <InferenceModelTable
      models={[
        {
          ...generativeModel,
          dimensions: 0,
          metadata: {
            context_tokens: "1050000",
            max_output_tokens: 0,
          },
        },
        {
          ...embeddingModel,
          dimensions: 0,
          vectorSpaceKey: "",
          metadata: {
            default_dimensions: -1,
            max_input_tokens: Number.POSITIVE_INFINITY,
            provider_supports_adjustable_dimensions: "true",
          },
        },
      ]}
    />,
  );

  expect(sectionNamed("Generative models").getAllByText("Not reported")).toHaveLength(
    3,
  );
  expect(sectionNamed("Embedding models").getAllByText("Not reported")).toHaveLength(
    5,
  );
  expect(screen.queryByText("0")).not.toBeInTheDocument();
});

test("uses consistent capability metadata as a limit fallback and reports conflicts", () => {
  render(
    <InferenceModelTable
      models={[
        {
          ...generativeModel,
          metadata: null,
        },
      ]}
      capabilities={[
        {
          ...capabilities[0],
          metadata: { max_input_tokens: 64_000, max_output_tokens: 4096 },
        },
        {
          ...capabilities[0],
          modelEndpointCapabilityId: "gen-cap-2",
          operation: "summarize",
          metadata: { max_input_tokens: 128_000, max_output_tokens: 4096 },
        },
      ]}
    />,
  );

  const generative = sectionNamed("Generative models");
  expect(generative.getByText("Varies by capability")).toBeInTheDocument();
  expect(generative.getByText("4,096")).toBeInTheDocument();
});

test("preserves disabled capability presentation and model-scoped detail records", () => {
  const onViewDetails = jest.fn();
  const disabledCapability = {
    ...capabilities[0],
    enabled: false,
  };

  render(
    <InferenceModelTable
      models={[generativeModel, embeddingModel]}
      capabilities={[disabledCapability, capabilities[1]]}
      onViewDetails={onViewDetails}
    />,
  );

  const disabled = screen.getByText("Chat · openai");
  expect(disabled).toHaveClass("line-through");

  fireEvent.click(
    within(
      screen.getByRole("heading", { name: "Generative models" }).closest(
        "section",
      ) as HTMLElement,
    ).getByRole("button", { name: "View" }),
  );
  expect(onViewDetails).toHaveBeenCalledWith(
    expect.objectContaining({
      modelId: generativeModel.modelId,
      modelEndpointCapabilities: [disabledCapability],
    }),
  );
});

test("renders model empty state", () => {
  render(<InferenceModelTable models={[]} />);
  expect(screen.getByText(/no models/i)).toBeInTheDocument();
});
