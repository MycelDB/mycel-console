import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InferencePage } from "./InferencePage";
import type { ApplyInferencePackageResponse, ListInferencePackagesInput, ListInferencePackagesResponse } from "../../../types/inference";

const packagesResponse: ListInferencePackagesResponse = {
  packages: [{
    inferencePackageId: "pkg-1",
    name: "standard-openai-chat",
    version: "2026-06",
    source: "standard-openai-chat.json",
    checksum: "abc",
    definitionCounts: { model_endpoints: 1, models: 2 },
    installedAt: "2026-07-06T20:00:00Z",
    installedBy: "admin",
  }],
  nextPageToken: "",
};

function renderPage(overrides: Partial<Parameters<typeof InferencePage>[0]> = {}) {
  const services = {
    listInferencePackagesService: jest.fn<Promise<ListInferencePackagesResponse>, [ListInferencePackagesInput | undefined]>().mockResolvedValue(packagesResponse),
    applyInferencePackageService: jest.fn<Promise<ApplyInferencePackageResponse>, any>().mockResolvedValue({ package: packagesResponse.packages[0], modelEndpointCount: 1, modelCount: 2, vectorStoreCount: 1, capabilityCount: 2 }),
    listModelEndpointsService: jest.fn().mockResolvedValue({ modelEndpoints: [{ modelEndpointId: "ep1", key: "openai", name: "OpenAI", connectorType: "openai-compatible", endpointUrl: "https://api.openai.com/v1", networkClass: "external_https", privacyClass: "third_party", authModes: ["api_key"], operations: ["embeddings"], enabled: true }], nextPageToken: "" }),
    listModelsService: jest.fn().mockResolvedValue({ models: [{ modelId: "m1", key: "openai/text-embedding-3-small", operation: "embeddings", modelName: "text-embedding-3-small", connectorTypes: ["openai-compatible"], dimensions: 1536, modality: "text", vectorSpaceKey: "openai/text-embedding-3-small" }], nextPageToken: "" }),
    listVectorStoresService: jest.fn().mockResolvedValue({ vectorStores: [{ vectorStoreId: "vs1", key: "mycel-file", name: "Mycel File", type: "mycel-file", privacyClass: "local_only", enabled: true }], nextPageToken: "" }),
    listModelEndpointCapabilitiesService: jest.fn().mockResolvedValue({ modelEndpointCapabilities: [{ modelEndpointCapabilityId: "cap1", modelEndpointId: "ep1", modelId: "m1", operation: "embeddings", enabled: true, modelNameOverride: "" }], nextPageToken: "" }),
    ...overrides,
  };
  render(<InferencePage {...services} />);
  return services;
}

test("renders imported packages", async () => {
  renderPage();

  expect(screen.getByText(/loading inference packages/i)).toBeInTheDocument();
  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  expect(screen.getByText("2026-06")).toBeInTheDocument();
  expect(screen.getByText(/model_endpoints: 1/)).toBeInTheDocument();
});

test("renders catalog tabs and loads endpoint section", async () => {
  const services = renderPage();

  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Packages" })).toHaveAttribute("aria-selected", "true");

  await userEvent.click(screen.getByRole("tab", { name: "Endpoints" }));

  expect(screen.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(services.listModelEndpointsService).toHaveBeenCalledWith({ pageSize: 100, includeDisabled: false });
});

test("sends catalog filter inputs", async () => {
  const services = renderPage();

  await screen.findByText("standard-openai-chat");
  await userEvent.click(screen.getByRole("tab", { name: "Endpoints" }));
  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByLabelText(/include disabled/i));
  await waitFor(() => expect(services.listModelEndpointsService).toHaveBeenLastCalledWith({ pageSize: 100, includeDisabled: true }));

  await userEvent.click(screen.getByRole("tab", { name: "Models" }));
  await userEvent.type(screen.getByLabelText(/operation/i), "embeddings");
  await waitFor(() => expect(services.listModelsService).toHaveBeenLastCalledWith({ pageSize: 100, operation: "embeddings" }));
});

test("loads models, vector stores, and capabilities tabs", async () => {
  const services = renderPage();

  await screen.findByText("standard-openai-chat");
  await userEvent.click(screen.getByRole("tab", { name: "Models" }));
  expect(await screen.findByText("1536")).toBeInTheDocument();
  expect(services.listModelsService).toHaveBeenCalledWith({ pageSize: 100, operation: "" });

  await userEvent.click(screen.getByRole("tab", { name: "Vector stores" }));
  expect(await screen.findByText("local_only")).toBeInTheDocument();
  expect(services.listVectorStoresService).toHaveBeenCalledWith({ pageSize: 100, includeDisabled: false });

  await userEvent.click(screen.getByRole("tab", { name: "Capabilities" }));
  expect(await screen.findByText("ep1")).toBeInTheDocument();
  expect(services.listModelEndpointCapabilitiesService).toHaveBeenCalledWith({ pageSize: 100, operation: "", includeDisabled: false });
});

test("renders empty package state", async () => {
  renderPage({ listInferencePackagesService: jest.fn().mockResolvedValue({ packages: [], nextPageToken: "" }) });

  expect(await screen.findByText(/no inference packages imported yet/i)).toBeInTheDocument();
});

test("loads additional package pages", async () => {
  const listInferencePackagesService = jest
    .fn<Promise<ListInferencePackagesResponse>, [ListInferencePackagesInput | undefined]>()
    .mockResolvedValueOnce({ packages: [packagesResponse.packages[0]], nextPageToken: "next" })
    .mockResolvedValueOnce({
      packages: [{ ...packagesResponse.packages[0], inferencePackageId: "pkg-2", name: "standard-local" }],
      nextPageToken: "",
    });
  renderPage({ listInferencePackagesService });

  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("standard-local")).toBeInTheDocument();
  expect(listInferencePackagesService).toHaveBeenLastCalledWith({ pageSize: 50, pageToken: "next" });
});

test("refresh invokes package list service", async () => {
  const services = renderPage();

  await screen.findByText("standard-openai-chat");
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() => expect(services.listInferencePackagesService).toHaveBeenCalledTimes(2));
});

test("keeps inference catalog readable while hiding package import without manage capability", async () => {
  renderPage({
    principalContext: {
      session: { addr: "127.0.0.1:19091", principalId: "prn_reader", username: "reader" },
      roles: [],
      capabilities: ["CAPABILITY_INFERENCE_CATALOG_READ"],
      capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_INFERENCE_CATALOG_READ" }] },
      warnings: [],
    },
  });

  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /import package json/i })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("tab", { name: "Endpoints" }));
  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
});

test("imports package JSON and shows summary", async () => {
  const services = renderPage();

  await screen.findByText("standard-openai-chat");
  await userEvent.click(screen.getByRole("button", { name: /import package json/i }));
  fireEvent.change(screen.getByLabelText(/or paste package json/i), { target: { value: JSON.stringify({ name: "standard-openai-chat", version: "2026-06", model_endpoints: [{ key: "openai", enabled: true }] }) } });
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  await waitFor(() => expect(services.applyInferencePackageService).toHaveBeenCalledWith(expect.objectContaining({ name: "standard-openai-chat", version: "2026-06" })));
  expect(await screen.findByText(/inference package imported/i)).toBeInTheDocument();
  expect(screen.getByText("Model endpoints")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: /view endpoints/i }));

  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
});

test("renders invalid JSON errors", async () => {
  renderPage();

  await screen.findByText("standard-openai-chat");
  await userEvent.click(screen.getByRole("button", { name: /import package json/i }));
  await userEvent.type(screen.getByLabelText(/or paste package json/i), "not json");
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected token|invalid/i);
});
