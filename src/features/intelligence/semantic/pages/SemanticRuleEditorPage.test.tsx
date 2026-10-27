import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { SemanticRuleEditorPage } from "./SemanticRuleEditorPage";

const space = { spaceId: "sp1", name: "Research" };
const domain = {
  spaceId: "sp1",
  domainId: "dom1",
  key: "main",
  name: "Main",
  description: "",
  state: "active",
  isDefault: true,
  system: false,
};
const fullRule = {
  semanticRuleId: "rule1",
  spaceId: "sp1",
  domainId: "dom1",
  key: "page-summary",
  displayName: "Page summary",
  description: "Summaries for pages",
  enabled: true,
  trigger: { events: ["changed"], eventTypes: ["changed"], labels: ["Note"], debounce: "30s" },
  selector: { mode: "node_type", labels: ["Note"], gql: "", targetAlias: "", maxResults: 100, nodeIds: [] },
  source: { mode: "self", includeProperties: [], excludeProperties: [], minimumTextLength: 0, contextGql: "" },
  embeddings: [{
    key: "search",
    purpose: "search",
    intelligenceProfile: "embedding-default",
    intelligenceProfileId: "prof1",
    vectorStore: "local",
    vectorStoreId: "store1",
    enabled: true,
  }],
  maintenance: { dirtyCooldown: "30s", maxBatchSize: 0, workerConcurrency: 0 },
  storage: { searchable: true, physicalIndex: "exact" },
};

function LocationView() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function principal(capabilities = ["semantic.manage", "inference.catalog.read"]) {
  return {
    session: { addr: "", principalId: "alice", username: "alice" },
    roles: [],
    capabilities,
    capabilityState: {
      kind: "complete" as const,
      capabilities: capabilities.map((capability) => ({ capability })),
    },
    warnings: [],
  };
}

function renderEditor(
  mode: "create" | "edit",
  overrides: Partial<Parameters<typeof SemanticRuleEditorPage>[0]> = {},
  path = mode === "create"
    ? "/intelligence/semantic-rules/new?spaceId=sp1&domainId=dom1"
    : "/intelligence/semantic-rules/rule1?spaceId=sp1",
) {
  const services = {
    listSpacesService: jest.fn().mockResolvedValue({ spaces: [space], nextPageToken: "" }),
    listDomainsService: jest.fn().mockResolvedValue({ domains: [domain], nextPageToken: "" }),
    listInferenceProfilesService: jest.fn().mockResolvedValue({
      inferenceProfiles: [{
        inferenceProfileId: "prof1",
        spaceId: "sp1",
        key: "embedding-default",
        displayName: "Embedding Default",
        description: "",
        operation: "embeddings",
        purpose: "semantic",
        domainIds: [],
        capabilityRefs: [],
        endpointRefs: [],
        modelRefs: [],
        requiredFeatures: [],
        enabled: true,
        createdBy: "",
        createTime: "",
        updateTime: "",
      }],
      nextPageToken: "",
    }),
    listVectorStoresService: jest.fn().mockResolvedValue({
      vectorStores: [{
        vectorStoreId: "store1",
        key: "local",
        name: "Embedded vectors",
        type: "mycel-file",
        privacyClass: "local_only",
        enabled: true,
      }],
      nextPageToken: "",
    }),
    listSemanticRulesService: jest.fn().mockResolvedValue({ rules: [], nextPageToken: "" }),
    getSemanticRuleService: jest.fn().mockResolvedValue({ rule: fullRule, summary: null }),
    validateSemanticRuleService: jest.fn().mockResolvedValue({ valid: true, diagnostics: [] }),
    createSemanticRuleService: jest.fn().mockResolvedValue({ rule: fullRule, summary: null }),
    updateSemanticRuleService: jest.fn().mockResolvedValue({ rule: fullRule, summary: null }),
    principalContext: principal(),
    ...overrides,
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/intelligence/semantic-rules/new"
          element={<SemanticRuleEditorPage mode="create" {...services} />}
        />
        <Route
          path="/intelligence/semantic-rules/:ruleId"
          element={<SemanticRuleEditorPage mode="edit" {...services} />}
        />
        <Route path="/intelligence/semantic-rules" element={<LocationView />} />
      </Routes>
    </MemoryRouter>,
  );
  return services;
}

async function prepareCreate() {
  await screen.findByRole("heading", { name: "Create semantic rule" });
  await userEvent.type(screen.getByLabelText("Key"), "new-rule");
  await userEvent.selectOptions(screen.getByLabelText("Vector store"), "store1");
}

test("renders deterministic create defaults and loads editor-only catalogs", async () => {
  const services = renderEditor("create");

  await screen.findByRole("heading", { name: "Create semantic rule" });
  expect(screen.getByLabelText("Space")).toHaveValue("sp1");
  expect(screen.getByLabelText("Domain")).toHaveValue("dom1");
  expect(screen.getByLabelText("Dirty cooldown")).toHaveValue("30s");
  expect(services.listInferenceProfilesService).toHaveBeenCalled();
  expect(services.listVectorStoresService).toHaveBeenCalled();
  expect(services.createSemanticRuleService).not.toHaveBeenCalled();
});

test("loads edit values by authoritative route identity", async () => {
  const services = renderEditor("edit");

  await screen.findByRole("heading", { name: "Edit semantic rule" });
  expect(screen.getByLabelText("Key")).toHaveValue("page-summary");
  expect(screen.getByLabelText("Vector store")).toHaveValue("store1");
  expect(services.getSemanticRuleService).toHaveBeenCalledWith({
    spaceId: "sp1",
    semanticRuleId: "rule1",
  });
});

test("saves a new rule and returns to the list", async () => {
  const services = renderEditor("create");
  await prepareCreate();

  await userEvent.click(screen.getByRole("button", { name: "Create rule" }));

  expect(services.createSemanticRuleService).toHaveBeenCalledWith({
    rule: expect.objectContaining({
      key: "new-rule",
      embeddings: [expect.objectContaining({ vectorStoreId: "store1" })],
    }),
  });
  expect(await screen.findByTestId("location")).toHaveTextContent("/intelligence/semantic-rules");
});

test("keeps the editor open and reports save failures", async () => {
  renderEditor("create", {
    createSemanticRuleService: jest.fn().mockRejectedValue(new Error("save rejected")),
  });
  await prepareCreate();

  await userEvent.click(screen.getByRole("button", { name: "Create rule" }));

  expect(await screen.findByText(/save rejected/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Create semantic rule" })).toBeInTheDocument();
});

test("renders an explicit not-found state", async () => {
  renderEditor("edit", {
    getSemanticRuleService: jest.fn().mockResolvedValue({ rule: null, summary: null }),
  });

  expect(await screen.findByRole("heading", { name: "Semantic rule not found" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Edit semantic rule" })).not.toBeInTheDocument();
});

test("renders an explicit authorization failure without loading editor dependencies", async () => {
  const listVectorStoresService = jest.fn();
  renderEditor("create", {
    principalContext: principal(["semantic.search"]),
    listVectorStoresService,
  });

  expect(await screen.findByText(/not authorized to create or edit semantic rules/i)).toBeInTheDocument();
  expect(listVectorStoresService).not.toHaveBeenCalled();
  expect(screen.queryByRole("heading", { name: "Create semantic rule" })).not.toBeInTheDocument();
});

test("leaves immediately when the create draft is unchanged", async () => {
  renderEditor("create");
  await screen.findByRole("heading", { name: "Create semantic rule" });

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(await screen.findByTestId("location")).toHaveTextContent("/intelligence/semantic-rules");
});

test("uses an in-app dialog before canceling unsaved changes", async () => {
  const nativeConfirm = jest.spyOn(window, "confirm");
  renderEditor("create");
  await screen.findByRole("heading", { name: "Create semantic rule" });
  await userEvent.type(screen.getByLabelText("Key"), "changed");

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(
    screen.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeInTheDocument();
  expect(nativeConfirm).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Create semantic rule" })).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await userEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(await screen.findByTestId("location")).toHaveTextContent("/intelligence/semantic-rules");
  nativeConfirm.mockRestore();
});

test("uses the same in-app dialog for the Back to Semantic Rules link", async () => {
  renderEditor("create");
  await screen.findByRole("heading", { name: "Create semantic rule" });
  await userEvent.type(screen.getByLabelText("Key"), "changed");

  await userEvent.click(screen.getByRole("link", { name: /back to semantic rules/i }));

  expect(
    screen.getByRole("dialog", { name: "Discard unsaved changes?" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Create semantic rule" })).toBeInTheDocument();
});
