import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import type { DomainInfo } from "../../../types/domains";
import type {
  InferenceCredentialInfo,
  InferenceModelInfo,
  ModelEndpointCapabilityInfo,
  ModelEndpointInfo,
} from "../../../types/inference";
import type { SpaceInfo } from "../../../types/spaces";
import type {
  CredentialDraft,
  GrantDraft,
  PolicyDraft,
} from "../model/pageTypes";
import {
  CredentialCreatePanel,
  GrantCreatePanel,
  PolicyCreatePanel,
} from "./InferenceAccessCreatePanels";

const endpoint = {
  modelEndpointId: "endpoint_1",
  key: "openai",
  name: "OpenAI",
  enabled: true,
  operations: ["chat"],
  privacyClass: "external",
} as ModelEndpointInfo;

const model = {
  modelId: "model_1",
  key: "gpt-mini",
  kind: "MODEL_KIND_CHAT",
  dimensions: 0,
  inputModalities: ["text"],
  outputModalities: ["text"],
} as InferenceModelInfo;

const capability = {
  modelEndpointCapabilityId: "cap_1",
  modelEndpointId: endpoint.modelEndpointId,
  modelId: model.modelId,
  operation: "chat",
  enabled: true,
} as ModelEndpointCapabilityInfo;

const credential = {
  credentialId: "credential_1",
  modelEndpointId: endpoint.modelEndpointId,
  key: "openai-main",
  status: "active",
  ownerType: "system",
  isDefault: true,
} as InferenceCredentialInfo;

const space = {
  spaceId: "space_1",
  name: "Product space",
} as SpaceInfo;

const domain = {
  domainId: "domain_1",
  key: "notes",
  name: "Notes",
} as DomainInfo;

function CredentialHarness({ onCreate }: { onCreate: () => void }) {
  const [draft, setDraft] = useState<CredentialDraft>({
    key: "",
    modelEndpointId: "",
    secretValue: "",
    isDefault: false,
  });
  return (
    <CredentialCreatePanel
      draft={draft}
      setDraft={setDraft}
      endpoints={[endpoint]}
      loading={false}
      onCreateCredential={onCreate}
    />
  );
}

test("CredentialCreatePanel updates draft fields and submits when complete", async () => {
  const user = userEvent.setup();
  const onCreate = jest.fn();
  render(<CredentialHarness onCreate={onCreate} />);

  expect(
    screen.getByRole("button", { name: "Create credential" }),
  ).toBeDisabled();

  await user.type(screen.getByLabelText("Credential key"), "openai-main");
  await user.selectOptions(
    screen.getByLabelText("Endpoint"),
    endpoint.modelEndpointId,
  );
  await user.type(screen.getByLabelText("API key"), "sk-test");
  await user.click(screen.getByLabelText("Make default"));

  await user.click(screen.getByRole("button", { name: "Create credential" }));
  expect(onCreate).toHaveBeenCalledTimes(1);
});

function PolicyHarness({
  onCreate,
  onCancel,
}: {
  onCreate: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PolicyDraft>({
    spaceId: space.spaceId,
    domainId: domain.domainId,
    includeDescendants: false,
    effect: "allow",
    operations: ["chat"],
    reason: "",
  });
  return (
    <PolicyCreatePanel
      draft={draft}
      setDraft={setDraft}
      spaces={[space]}
      domains={[domain]}
      domainError="Domain lookup failed"
      loading={false}
      onCreatePolicy={onCreate}
      onCancel={onCancel}
    />
  );
}

test("PolicyCreatePanel renders validation context and fires callbacks", async () => {
  const user = userEvent.setup();
  const onCreate = jest.fn();
  const onCancel = jest.fn();
  render(<PolicyHarness onCreate={onCreate} onCancel={onCancel} />);

  expect(screen.getByText("Domain lookup failed")).toBeInTheDocument();
  await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
  expect(onCancel).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Create policy" }));
  expect(onCreate).toHaveBeenCalledTimes(1);
});

function GrantHarness({
  onCreate,
  onCancel,
}: {
  onCreate: () => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<GrantDraft>({
    spaceId: space.spaceId,
    domainId: domain.domainId,
    modelId: model.modelId,
    endpointId: endpoint.modelEndpointId,
    credentialId: credential.credentialId,
    operations: ["chat"],
    includeDescendants: false,
    allowBackgroundUse: true,
    isDefault: false,
    priority: "10",
    includeInactive: false,
    advancedOpen: false,
    semanticRuleId: "",
    nodeId: "",
    credentialRef: "",
    endpointRef: "",
    modelRef: "",
  });
  return (
    <GrantCreatePanel
      draft={draft}
      setDraft={setDraft}
      spaces={[space]}
      domains={[domain]}
      domainError=""
      models={[model]}
      endpoints={[endpoint]}
      capabilities={[capability]}
      credentials={[credential]}
      loading={false}
      onCreateGrant={onCreate}
      onCancel={onCancel}
    />
  );
}

test("GrantCreatePanel renders the review summary and fires submit/cancel callbacks", async () => {
  const user = userEvent.setup();
  const onCreate = jest.fn();
  const onCancel = jest.fn();
  render(<GrantHarness onCreate={onCreate} onCancel={onCancel} />);

  expect(screen.getAllByText(/Product space/).length).toBeGreaterThan(0);
  expect(
    screen.getByText(/Background\/automation use allowed/),
  ).toBeInTheDocument();

  await user.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
  expect(onCancel).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Create grant" }));
  expect(onCreate).toHaveBeenCalledTimes(1);
});
