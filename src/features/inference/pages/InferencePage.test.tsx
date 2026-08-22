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
    listModelEndpointCapabilitiesService: jest.fn().mockResolvedValue({ modelEndpointCapabilities: [{ modelEndpointCapabilityId: "cap1", modelEndpointId: "ep1", modelEndpointKey: "openai", modelId: "m1", modelKey: "openai/text-embedding-3-small", operation: "embeddings", enabled: true }], nextPageToken: "" }),
    ...overrides,
  };
  render(<InferencePage {...services} />);
  return services;
}

test("renders import history as the last tab", async () => {
  renderPage();

  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
  expect(tabs).toEqual(["Endpoints", "Models", "Credentials", "Grants", "Policies", "Profiles", "Vector stores", "Usage", "Import history"]);

  await userEvent.click(screen.getByRole("tab", { name: "Import history" }));

  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  expect(screen.getByText("2026-06")).toBeInTheDocument();
  expect(screen.getByText(/model_endpoints: 1/)).toBeInTheDocument();
});

test("renders catalog tabs and loads endpoint section", async () => {
  const services = renderPage();

  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Endpoints" })).toHaveAttribute("aria-selected", "true");
  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(services.listModelEndpointsService).toHaveBeenCalledWith({ pageSize: 100, includeDisabled: false });
});

test("sends catalog filter inputs", async () => {
  const services = renderPage();

  await screen.findByText("openai-compatible");
  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByLabelText(/include disabled/i));
  await waitFor(() => expect(services.listModelEndpointsService).toHaveBeenLastCalledWith({ pageSize: 100, includeDisabled: true }));

  await userEvent.click(screen.getByRole("tab", { name: "Models" }));
  await userEvent.selectOptions(screen.getByLabelText(/operation/i), "embeddings");
  await waitFor(() => expect(services.listModelsService).toHaveBeenLastCalledWith({ pageSize: 100, operation: "embeddings" }));
  expect(services.listModelEndpointCapabilitiesService).toHaveBeenLastCalledWith({ pageSize: 500, operation: "embeddings", includeDisabled: true });
});

test("loads models with capability chips and vector stores", async () => {
  const services = renderPage();

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Models" }));
  expect(await screen.findByText("1536")).toBeInTheDocument();
  expect(screen.getByText("embeddings · openai")).toBeInTheDocument();
  expect(services.listModelsService).toHaveBeenCalledWith({ pageSize: 100, operation: "" });
  expect(services.listModelEndpointCapabilitiesService).toHaveBeenCalledWith({ pageSize: 500, operation: "", includeDisabled: false });

  await userEvent.click(screen.getByRole("tab", { name: "Vector stores" }));
  expect(await screen.findByText("local_only")).toBeInTheDocument();
  expect(services.listVectorStoresService).toHaveBeenCalledWith({ pageSize: 100, includeDisabled: false });
});

test("creates credentials from pasted API keys", async () => {
  const createInferenceCredentialService = jest.fn().mockResolvedValue({});
  renderPage({
    listInferenceCredentialsService: jest.fn().mockResolvedValue({ credentials: [], nextPageToken: "" }),
    createInferenceCredentialService,
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Credentials" }));
  expect(await screen.findByLabelText(/^Endpoint$/i)).toHaveValue("ep1");
  expect(screen.getByLabelText(/^Credential key$/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^Display name$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Owner type$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Owner ID$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Auth type$/i)).not.toBeInTheDocument();
  expect(screen.getByLabelText(/^Make default$/i)).toBeChecked();
  await userEvent.type(await screen.findByLabelText(/^API key$/i), "sk-test-secret");
  await userEvent.click(screen.getByRole("button", { name: "Create credential" }));

  await waitFor(() => expect(createInferenceCredentialService).toHaveBeenCalledWith(expect.objectContaining({
    key: "openai-default",
    displayName: "openai-default",
    modelEndpointId: "ep1",
    ownerType: "system",
    ownerId: "system",
    authType: "api_key",
    secretValue: "sk-test-secret",
    isDefault: true,
  })));
  expect(screen.getByLabelText(/^API key$/i)).toHaveValue("");
});

test("revokes credentials from the credentials table", async () => {
  const setInferenceCredentialStatusService = jest.fn().mockResolvedValue({});
  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  renderPage({
    listInferenceCredentialsService: jest.fn().mockResolvedValue({ credentials: [{ credentialId: "cred1", key: "wrong-key", displayName: "Wrong key", modelEndpointId: "ep1", modelEndpointKey: "openai", ownerType: "system", ownerId: "system", authType: "api_key", secretId: "sec1", status: "active", isDefault: false, createTime: "", updateTime: "", lastUsedTime: "", secretVersion: "", secretSuffix: "bad1", rotatedAt: "" }], nextPageToken: "" }),
    setInferenceCredentialStatusService,
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Credentials" }));
  expect(await screen.findByText("wrong-key")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

  await waitFor(() => expect(setInferenceCredentialStatusService).toHaveBeenCalledWith({ credentialId: "cred1", status: "revoked" }));
  expect(await screen.findByText("Credential wrong-key revoked.")).toBeInTheDocument();
  confirmSpy.mockRestore();
});

test("prompts for package import when no credential endpoints are available", async () => {
  renderPage({
    listModelEndpointsService: jest.fn().mockResolvedValue({ modelEndpoints: [], nextPageToken: "" }),
    listInferenceCredentialsService: jest.fn().mockResolvedValue({ credentials: [], nextPageToken: "" }),
  });

  await screen.findByRole("tab", { name: "Endpoints" });
  await userEvent.click(screen.getByRole("tab", { name: "Credentials" }));

  expect(await screen.findByText(/No enabled endpoints are available/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/^Endpoint$/i)).toBeDisabled();
  expect(screen.getByRole("button", { name: "Create credential" })).toBeDisabled();
});

test("creates grants with dynamic resource selectors", async () => {
  const createInferenceCredentialGrantService = jest.fn().mockResolvedValue({});
  const services = renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false }], nextPageToken: "" }),
    listInferenceCredentialsService: jest.fn().mockResolvedValue({ credentials: [{ credentialId: "cred1", key: "openai-default", displayName: "OpenAI default", modelEndpointId: "ep1", modelEndpointKey: "openai", ownerType: "system", ownerId: "", authType: "api_key", secretId: "sec1", status: "active", isDefault: true, createTime: "", updateTime: "", lastUsedTime: "", secretVersion: "", secretSuffix: "test", rotatedAt: "" }], nextPageToken: "" }),
    listInferenceCredentialGrantsService: jest.fn().mockResolvedValue({ credentialGrants: [], nextPageToken: "" }),
    createInferenceCredentialGrantService,
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Grants" }));
  expect(screen.queryByLabelText(/^Space$/i)).not.toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: /^Create grant$/i }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Space$/i), "sp1");
  await waitFor(() => expect(services.listDomainsService).toHaveBeenCalledWith({ spaceId: "sp1", pageSize: 100, includeSystem: false }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Domain$/i), "dom1");
  await userEvent.selectOptions(screen.getByLabelText(/^Model$/i), "m1");
  await userEvent.selectOptions(screen.getByLabelText(/^Endpoint$/i), "ep1");
  await userEvent.selectOptions(screen.getByLabelText(/^Credential$/i), "cred1");
  expect(screen.getByLabelText(/embeddings/i)).toBeChecked();

  await userEvent.click(screen.getByRole("button", { name: /^create grant$/i }));

  await waitFor(() => expect(createInferenceCredentialGrantService).toHaveBeenCalledWith(expect.objectContaining({
    spaceId: "sp1",
    credentialId: "cred1",
    modelEndpointId: "ep1",
    modelId: "m1",
    operations: ["embeddings"],
    scope: expect.objectContaining({ spaceId: "sp1", domainId: "dom1", includeDescendants: true }),
  })));
});

test("filters grants with dynamic scope dropdowns", async () => {
  const services = renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [
      { spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false },
      { spaceId: "sp1", domainId: "dom2", key: "archive", name: "Archive", description: "", state: "active", isDefault: false, system: false },
    ], nextPageToken: "" }),
    listInferenceCredentialsService: jest.fn().mockResolvedValue({ credentials: [], nextPageToken: "" }),
    listInferenceCredentialGrantsService: jest.fn().mockResolvedValue({ credentialGrants: [
      { credentialGrantId: "grant1", credentialId: "cred-main", scope: { spaceId: "sp1", domainId: "dom1" }, operations: ["chat"], modelEndpointKey: "openai", modelKey: "gpt", state: "active" },
      { credentialGrantId: "grant2", credentialId: "cred-archive", scope: { spaceId: "sp1", domainId: "dom2" }, operations: ["chat"], modelEndpointKey: "openai", modelKey: "gpt", state: "active" },
    ], nextPageToken: "" }),
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Grants" }));
  expect(screen.queryByLabelText(/^Space ID$/i)).not.toBeInTheDocument();
  await userEvent.selectOptions(await screen.findByLabelText(/^Filter space$/i), "sp1");
  await waitFor(() => expect(services.listInferenceCredentialGrantsService).toHaveBeenCalledWith({ spaceId: "sp1", includeExpired: false, pageSize: 100 }));
  expect(await screen.findByText("cred-main")).toBeInTheDocument();
  expect(screen.getByText("cred-archive")).toBeInTheDocument();

  await userEvent.selectOptions(await screen.findByLabelText(/^Filter domain$/i), "dom1");
  await waitFor(() => expect(screen.queryByText("cred-archive")).not.toBeInTheDocument());
  expect(screen.getByText("cred-main")).toBeInTheDocument();
});

test("creates profiles with dynamic scope and operation selectors", async () => {
  const createInferenceProfileService = jest.fn().mockResolvedValue({});
  const services = renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false }], nextPageToken: "" }),
    listInferenceProfilesService: jest.fn().mockResolvedValue({ inferenceProfiles: [], nextPageToken: "" }),
    createInferenceProfileService,
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Profiles" }));
  expect(screen.queryByLabelText(/^Space ID$/i)).not.toBeInTheDocument();
  await userEvent.selectOptions(await screen.findByLabelText(/^Filter space$/i), "sp1");
  await waitFor(() => expect(services.listDomainsService).toHaveBeenCalledWith({ spaceId: "sp1", pageSize: 100, includeSystem: false }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Filter domain$/i), "dom1");
  await userEvent.selectOptions(screen.getByLabelText(/^Operation$/i), "embeddings");
  await userEvent.click(await screen.findByLabelText("Endpoint refs: openai"));
  await userEvent.click(await screen.findByLabelText("Model refs: openai/text-embedding-3-small"));

  await userEvent.click(screen.getByRole("button", { name: /^Create profile$/i }));

  await waitFor(() => expect(createInferenceProfileService).toHaveBeenCalledWith(expect.objectContaining({
    spaceId: "sp1",
    operation: "embeddings",
    domainIds: ["dom1"],
    endpointRefs: ["openai"],
    modelRefs: ["openai/text-embedding-3-small"],
  })));
});

test("uses multi-select endpoint and model refs for profile creation", async () => {
  const listModelsService = jest.fn().mockResolvedValue({ models: [
      { modelId: "m-chat", key: "openai/gpt-5.6-mini", operation: "chat", modelName: "gpt-5.6-mini", connectorTypes: ["openai-compatible"], dimensions: 0, modality: "text", vectorSpaceKey: "" },
      { modelId: "m-embed", key: "openai/text-embedding-3-small", operation: "embeddings", modelName: "text-embedding-3-small", connectorTypes: ["openai-compatible"], dimensions: 1536, modality: "text", vectorSpaceKey: "openai/text-embedding-3-small" },
    ], nextPageToken: "" });
  renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [], nextPageToken: "" }),
    listInferenceProfilesService: jest.fn().mockResolvedValue({ inferenceProfiles: [], nextPageToken: "" }),
    listModelsService,
    listModelEndpointCapabilitiesService: jest.fn().mockResolvedValue({ modelEndpointCapabilities: [
      { modelEndpointCapabilityId: "cap-chat", modelEndpointId: "ep1", modelEndpointKey: "openai", modelId: "m-chat", modelKey: "openai/gpt-5.6-mini", operation: "chat", enabled: true },
      { modelEndpointCapabilityId: "cap-embed", modelEndpointId: "ep1", modelEndpointKey: "openai", modelId: "m-embed", modelKey: "openai/text-embedding-3-small", operation: "embeddings", enabled: true },
    ], nextPageToken: "" }),
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Profiles" }));
  await waitFor(() => expect(listModelsService).toHaveBeenCalledWith({ pageSize: 500 }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Operation$/i), "embeddings");

  expect(screen.queryByText("openai/gpt-5.6-mini")).not.toBeInTheDocument();
  expect(await screen.findByText("openai/text-embedding-3-small")).toBeInTheDocument();
  expect(screen.getByText("openai")).toBeInTheDocument();
});

test("filters policies with dynamic scope dropdowns", async () => {
  const services = renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [
      { spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false },
      { spaceId: "sp1", domainId: "dom2", key: "archive", name: "Archive", description: "", state: "active", isDefault: false, system: false },
    ], nextPageToken: "" }),
    listInferencePoliciesService: jest.fn().mockResolvedValue({ inferencePolicies: [
      { inferencePolicyId: "policy1", scope: { spaceId: "sp1", domainId: "dom1" }, effect: "allow", operations: ["chat"], action: "allow", state: "active", reason: "main policy" },
      { inferencePolicyId: "policy2", scope: { spaceId: "sp1", domainId: "dom2" }, effect: "deny", operations: ["chat"], action: "deny", state: "active", reason: "archive policy" },
    ], nextPageToken: "" }),
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Policies" }));
  expect(screen.queryByLabelText(/^Space ID$/i)).not.toBeInTheDocument();
  await userEvent.selectOptions(await screen.findByLabelText(/^Filter space$/i), "sp1");
  await waitFor(() => expect(services.listInferencePoliciesService).toHaveBeenCalledWith({ spaceId: "sp1", includeExpired: false, pageSize: 100 }));
  expect(await screen.findByText("main policy")).toBeInTheDocument();
  expect(screen.getByText("archive policy")).toBeInTheDocument();

  await userEvent.selectOptions(await screen.findByLabelText(/^Filter domain$/i), "dom1");
  await waitFor(() => expect(screen.queryByText("archive policy")).not.toBeInTheDocument());
  expect(screen.getByText("main policy")).toBeInTheDocument();
});

test("creates policies with dynamic scope selectors", async () => {
  const createInferencePolicyService = jest.fn().mockResolvedValue({});
  const services = renderPage({
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [{ spaceId: "sp1", name: "Research" }], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [{ spaceId: "sp1", domainId: "dom1", key: "main", name: "Main", description: "", state: "active", isDefault: true, system: false }], nextPageToken: "" }),
    listInferencePoliciesService: jest.fn().mockResolvedValue({ inferencePolicies: [], nextPageToken: "" }),
    createInferencePolicyService,
  });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Policies" }));
  expect(screen.queryByLabelText(/^Space ID$/i)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/^Space$/i)).not.toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: /^Create policy$/i }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Space$/i), "sp1");
  await waitFor(() => expect(services.listDomainsService).toHaveBeenCalledWith({ spaceId: "sp1", pageSize: 100, includeSystem: false }));
  await userEvent.selectOptions(await screen.findByLabelText(/^Domain$/i), "dom1");
  expect(screen.getByLabelText(/^chat$/i)).toBeChecked();
  const createPolicyButtons = screen.getAllByRole("button", { name: "Create policy" });
  await userEvent.click(createPolicyButtons[createPolicyButtons.length - 1]);

  await waitFor(() => expect(createInferencePolicyService).toHaveBeenCalledWith(expect.objectContaining({
    spaceId: "sp1",
    effect: "allow",
    operations: ["chat", "summarize", "classify"],
    reason: "allow automation inference profile use",
    scope: expect.objectContaining({ spaceId: "sp1", domainId: "dom1", includeDescendants: true }),
  })));
});

test("renders empty package state", async () => {
  renderPage({ listInferencePackagesService: jest.fn().mockResolvedValue({ packages: [], nextPageToken: "" }) });

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Import history" }));

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

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("tab", { name: "Import history" }));
  expect(await screen.findByText("standard-openai-chat")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("standard-local")).toBeInTheDocument();
  expect(listInferencePackagesService).toHaveBeenLastCalledWith({ pageSize: 50, pageToken: "next" });
});

test("refresh invokes active catalog service", async () => {
  const services = renderPage();

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("button", { name: /refresh/i }));

  await waitFor(() => expect(services.listModelEndpointsService).toHaveBeenCalledTimes(2));
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

  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /import package json/i })).not.toBeInTheDocument();

  expect(await screen.findByText("openai-compatible")).toBeInTheDocument();
});

test("imports package JSON and shows summary", async () => {
  const services = renderPage();

  await screen.findByText("openai-compatible");
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

  await screen.findByText("openai-compatible");
  await userEvent.click(screen.getByRole("button", { name: /import package json/i }));
  await userEvent.type(screen.getByLabelText(/or paste package json/i), "not json");
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected token|invalid/i);
});
