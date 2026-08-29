import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DomainInfo } from "../../../../types/domains";
import type { ValidateSemanticRuleResponse } from "../../../../types/semantic";
import type { SpaceInfo } from "../../../../types/spaces";
import type { RuleDraft } from "../model/pageTypes";
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
  triggerEvents: "changed",
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
  vectorStore: "mycel-file",
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

function RuleEditorHarness({
  validation = null,
  onSave = jest.fn(),
}: {
  validation?: ValidateSemanticRuleResponse | null;
  onSave?: () => void;
}) {
  const [value, setValue] = useState(draft);
  return (
    <RuleEditor
      mode="create"
      draft={value}
      setDraft={setValue}
      spaces={spaces}
      domains={domains}
      profiles={profiles}
      validation={validation}
      loading={false}
      onValidate={jest.fn()}
      onSave={onSave}
      onCancel={jest.fn()}
    />
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
