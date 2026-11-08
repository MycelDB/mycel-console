import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import type { DomainInfo } from "../../../../types/domains";
import type { VectorStoreInfo } from "../../../../types/inference";
import type { ValidateSemanticRuleResponse } from "../../../../types/semantic";
import type { SpaceInfo } from "../../../../types/spaces";
import type {
  DraftMode,
  RuleDraft,
  VectorStoreCatalogState,
} from "../model/pageTypes";
import { RuleEditor } from "./SemanticRuleEditor";

const draft: RuleDraft = {
  semanticRuleId: "",
  spaceId: "space_1",
  domainId: "domain_1",
  key: "notes-search",
  displayName: "Notes search",
  description: "",
  enabled: true,
  labels: "note",
  triggerEvents: ["changed"],
  triggerEventProblem: "",
  dirtyCooldown: "30s",
  selectorMode: "node_type",
  selectorGql: "",
  targetAlias: "",
  maxResults: "100",
  sourceMode: "self",
  includeProperties: "title",
  excludeProperties: "",
  contextGql: "",
  bindingKey: "body",
  purpose: "search",
  intelligenceProfile: "embed-small",
  vectorStoreId: "store_1",
  vectorStoreLegacyRef: "",
  searchable: true,
  physicalIndex: "exact",
};

const spaces = [{ spaceId: "space_1", name: "Knowledge" }] as SpaceInfo[];
const domains = [
  { spaceId: "space_1", domainId: "domain_1", key: "notes", name: "Notes" },
] as DomainInfo[];
const profiles = [
  {
    value: "embed-small",
    label: "Embed small",
    spaceId: "space_1",
    domainIds: [],
  },
];

const vectorStores: VectorStoreInfo[] = [
  {
    vectorStoreId: "store_1",
    key: "mycel-file",
    name: "Embedded vectors",
    type: "mycel-file",
    privacyClass: "local_only",
    enabled: true,
  },
];

function RuleEditorHarness({
  validation = null,
  onSave = jest.fn(),
  mode = "create",
  initialDraft = draft,
  stores = vectorStores,
  catalog = { kind: "ready", message: "" },
}: {
  validation?: ValidateSemanticRuleResponse | null;
  onSave?: () => void;
  mode?: DraftMode;
  initialDraft?: RuleDraft;
  stores?: VectorStoreInfo[];
  catalog?: VectorStoreCatalogState;
}) {
  const [value, setValue] = useState(initialDraft);
  return (
    <MemoryRouter>
      <RuleEditor
      mode={mode}
      draft={value}
      setDraft={setValue}
      spaces={spaces}
      domains={domains}
      profiles={profiles}
      vectorStores={stores}
      vectorStoreCatalog={catalog}
      validation={validation}
      loading={false}
      onValidate={jest.fn()}
      onSave={onSave}
      onCancel={jest.fn()}
      />
    </MemoryRouter>
  );
}

test("RuleEditor renders controlled fields and forwards save", async () => {
  const user = userEvent.setup();
  const onSave = jest.fn();
  render(<RuleEditorHarness onSave={onSave} />);

  expect(
    screen.getByRole("heading", { name: "Create semantic rule" }),
  ).toBeInTheDocument();
  await user.clear(screen.getByLabelText("Key"));
  await user.type(screen.getByLabelText("Key"), "daily-notes");
  expect(screen.getByLabelText("Key")).toHaveValue("daily-notes");

  await user.click(screen.getByRole("button", { name: "Create rule" }));
  expect(onSave).toHaveBeenCalledTimes(1);
});

test("RuleEditor presents typed trigger events as an accessible checkbox group", async () => {
  const user = userEvent.setup();
  render(<RuleEditorHarness />);

  expect(
    screen.getByRole("group", { name: "Trigger events" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Any event")).toBeChecked();
  await user.click(screen.getByLabelText("Node updated"));
  expect(screen.getByLabelText("Node updated")).toBeChecked();
  expect(screen.getByLabelText("Any event")).not.toBeChecked();
});

test("RuleEditor blocks unresolved trigger projections until the operator resolves them", async () => {
  const user = userEvent.setup();
  function ProblemHarness() {
    const [value, setValue] = useState({
      ...draft,
      triggerEvents: ["unsupported:99"],
      triggerEventProblem: "Unsupported trigger event values: unsupported:99",
    });
    return (
      <MemoryRouter>
        <RuleEditor
        mode="edit"
        draft={value}
        setDraft={setValue}
        spaces={spaces}
        domains={domains}
        profiles={profiles}
        vectorStores={[]}
        vectorStoreCatalog={{
          kind: "unsupported",
          message: "Catalog unsupported; preserving existing references.",
        }}
        validation={null}
        loading={false}
        onValidate={jest.fn()}
        onSave={jest.fn()}
        onCancel={jest.fn()}
        />
      </MemoryRouter>
    );
  }

  render(<ProblemHarness />);
  expect(
    screen.getByText(/Unsupported trigger event values/i),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save rule" })).toBeDisabled();

  await user.click(screen.getByLabelText("Unsupported: unsupported:99"));
  expect(
    screen.queryByText(/Unsupported trigger event values/i),
  ).not.toBeInTheDocument();
  expect(screen.getByLabelText("Any event")).toBeChecked();
  expect(screen.getByRole("button", { name: "Save rule" })).toBeEnabled();
});

test("RuleEditor disambiguates legacy duplicate display names with key and UUID", () => {
  render(
    <RuleEditorHarness
      stores={[
        { ...vectorStores[0], name: "Shared name" },
        {
          ...vectorStores[0],
          vectorStoreId: "store_2",
          key: "other",
          name: " shared name ",
        },
      ]}
    />,
  );

  expect(
    screen.getByRole("option", {
      name: /Shared name.*mycel-file.*store_1/i,
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(
    /duplicate display names/i,
  );
});

test("RuleEditor preserves unavailable UUID and legacy references during edits", () => {
  render(
    <RuleEditorHarness
      mode="edit"
      initialDraft={{
        ...draft,
        vectorStoreId: "deleted-store",
        vectorStoreLegacyRef: "",
      }}
      stores={[]}
      catalog={{ kind: "error", message: "Catalog request failed" }}
    />,
  );

  expect(screen.getByLabelText("Vector store")).toHaveValue("deleted-store");
  expect(screen.getByRole("alert")).toHaveTextContent(/UUID will be preserved/i);
  expect(screen.getByRole("button", { name: "Save rule" })).toBeEnabled();
});

test("RuleEditor provides catalog search and an empty management route", async () => {
  const manyStores = Array.from({ length: 10 }, (_, index) => ({
    ...vectorStores[0],
    vectorStoreId: `store_${index}`,
    key: `key-${index}`,
    name: `Vector store ${index}`,
  }));
  const user = userEvent.setup();
  const { unmount } = render(<RuleEditorHarness stores={manyStores} />);

  await user.type(screen.getByLabelText("Search vector stores"), "store 9");
  expect(screen.getByRole("option", { name: "Vector store 9" })).toBeInTheDocument();
  unmount();

  render(
    <RuleEditorHarness
      initialDraft={{ ...draft, vectorStoreId: "" }}
      stores={[]}
      catalog={{ kind: "empty", message: "No vector stores are available." }}
    />,
  );
  expect(screen.getByLabelText("Vector store")).toBeDisabled();
  expect(screen.getByRole("link", { name: "Manage vector stores" })).toHaveAttribute(
    "href",
    "/intelligence/vector-stores",
  );
  expect(screen.getByRole("button", { name: "Create rule" })).toBeDisabled();
});

test("RuleEditor keeps provider budgeting optional and blocks incomplete policies", async () => {
  const user = userEvent.setup();
  render(<RuleEditorHarness />);

  expect(screen.getByText(/No budget policy is sent/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create rule" })).toBeEnabled();

  await user.click(
    screen.getByLabelText("Enable daemon-owned provider budgeting for this binding"),
  );
  expect(screen.getByRole("alert")).toHaveTextContent(/correlationId/i);
  expect(screen.getByRole("button", { name: "Create rule" })).toBeDisabled();

  await user.click(
    screen.getByLabelText("Enable daemon-owned provider budgeting for this binding"),
  );
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create rule" })).toBeEnabled();
});

test("RuleEditor accepts a complete provider budget policy", () => {
  render(
    <RuleEditorHarness
      initialDraft={{
        ...draft,
        providerBudget: {
          correlationId: "semantic-budget-1",
          maxRequests: "128",
          maxRetryAttempts: "4",
          maxRetriesPerRequest: "1",
          maxConcurrentProviderCalls: "2",
          batchingMode: 1,
          maxBatchItems: "1",
          maxInputTokensPerRequest: "2048",
          maxInputTokens: "20000",
          requestTimeout: { seconds: "30", nanos: 0 },
          totalTimeout: { seconds: "300", nanos: 0 },
          cost: {
            currency: "USD",
            priceDefinitionVersion: "2026-10-01",
            inputMicrosPerMillionTokens: "20",
            maxEstimatedCostMicros: "1000000",
          },
        },
      }}
    />,
  );

  expect(screen.getByLabelText("Enable daemon-owned provider budgeting for this binding")).toBeChecked();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Create rule" })).toBeEnabled();
});

test("RuleEditor renders validation diagnostics", () => {
  render(
    <RuleEditorHarness
      validation={{
        valid: false,
        diagnostics: [
          {
            path: "selector.gql",
            severity: "error",
            message: "Missing selector",
          },
        ],
      }}
    />,
  );

  expect(screen.getByText("Rule has validation errors")).toBeInTheDocument();
  expect(screen.getByText(/Missing selector/)).toBeInTheDocument();
});
