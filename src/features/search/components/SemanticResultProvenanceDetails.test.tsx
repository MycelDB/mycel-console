import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SemanticResultProvenance } from "../../../types/semantic";
import { SemanticResultProvenanceDetails } from "./SemanticResultProvenanceDetails";

const knownProvenance: SemanticResultProvenance = {
  sourceGraphRevision: "9007199254740993",
  semanticGeneration: "17",
  semanticConfigurationHash: "config-hash",
  opaqueSourceVersion: "source-version",
  dimensions: 1536,
  vectorSpaceKey: "primary",
  configuredIntelligenceProfileId: "profile-1",
  configuredModelEndpointId: "configured-endpoint",
  configuredModelId: "configured-model",
  configuredCapabilityId: "configured-capability",
  actualRouteKnown: true,
  actualModelEndpointId: "actual-endpoint",
  actualModelId: "actual-model",
  actualCapabilityId: "actual-capability",
  rebuildEpoch: "epoch-1",
  generatedAt: "2026-10-30T20:00:00Z",
};

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: undefined,
  });
});

test("shows known configured and actual route provenance and copies only safe fields", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  const provenanceWithUnknownField = {
    ...knownProvenance,
    rawVector: [0.1, 0.2],
  } as SemanticResultProvenance;

  render(<SemanticResultProvenanceDetails provenance={provenanceWithUnknownField} />);
  await userEvent.click(screen.getByText("Provenance details"));

  expect(screen.getByRole("region", { name: "Configured route" })).toHaveTextContent(
    "configured-endpoint",
  );
  const actualRoute = screen.getByRole("region", { name: "Actual route" });
  expect(actualRoute).toHaveTextContent("Known");
  expect(actualRoute).toHaveTextContent("actual-endpoint");
  expect(screen.getByText("9007199254740993")).toBeInTheDocument();
  expect(screen.getByText("2026-10-30T20:00:00Z")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Copy provenance" }));
  expect(writeText).toHaveBeenCalledTimes(1);
  const copied = writeText.mock.calls[0][0] as string;
  expect(JSON.parse(copied)).toEqual(knownProvenance);
  expect(copied).not.toContain("rawVector");
});

test("clearly reports an unknown actual route without borrowing configured IDs", async () => {
  render(
    <SemanticResultProvenanceDetails
      provenance={{
        ...knownProvenance,
        actualRouteKnown: false,
        actualModelEndpointId: "",
        actualModelId: "",
        actualCapabilityId: "",
      }}
    />,
  );
  await userEvent.click(screen.getByText("Provenance details"));

  const configuredRoute = screen.getByRole("region", { name: "Configured route" });
  const actualRoute = screen.getByRole("region", { name: "Actual route" });
  expect(configuredRoute).toHaveTextContent("configured-endpoint");
  expect(actualRoute).toHaveTextContent("Unknown (actual_route_known=false)");
  expect(actualRoute).not.toHaveTextContent("configured-endpoint");
  expect(within(actualRoute).getAllByText("Not reported")).toHaveLength(3);
});

test("renders partial provenance without inferring missing values", async () => {
  render(
    <SemanticResultProvenanceDetails
      provenance={{
        sourceGraphRevision: "23",
        semanticGeneration: "0",
        semanticConfigurationHash: "",
        opaqueSourceVersion: "",
        dimensions: 0,
        vectorSpaceKey: "",
        configuredIntelligenceProfileId: "",
        configuredModelEndpointId: "",
        configuredModelId: "",
        configuredCapabilityId: "",
        actualRouteKnown: false,
        actualModelEndpointId: "",
        actualModelId: "",
        actualCapabilityId: "",
        rebuildEpoch: "",
        generatedAt: "",
      }}
    />,
  );
  await userEvent.click(screen.getByText("Provenance details"));

  expect(screen.getByText("23")).toBeInTheDocument();
  expect(screen.getAllByText("0")).toHaveLength(2);
  expect(screen.getAllByText("Not reported").length).toBeGreaterThan(0);
  expect(screen.getByText("Unknown (actual_route_known=false)")).toBeInTheDocument();
});
