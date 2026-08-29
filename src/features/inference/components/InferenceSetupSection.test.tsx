import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import type {
  CredentialGrantInfo,
  InferenceCredentialInfo,
} from "../../../types/inference";
import { InferenceSetupSection } from "./InferenceSetupSection";

type Props = ComponentProps<typeof InferenceSetupSection>;

const credential = {
  credentialId: "credential_1",
  key: "openai-main",
  modelEndpointKey: "openai",
  modelEndpointId: "endpoint_1",
  ownerType: "system",
  authType: "bearer",
  status: "active",
  secretSuffix: "1234",
} as InferenceCredentialInfo;

const grant = {
  credentialGrantId: "grant_1",
  credentialId: credential.credentialId,
  operations: ["chat"],
  modelEndpointKey: "openai",
  modelKey: "gpt-mini",
  state: "active",
} as CredentialGrantInfo;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    activeTab: "credentials",
    loading: false,
    error: "",
    message: "",
    spaceId: "space_1",
    profileForm: {
      key: "",
      displayName: "",
      operation: "chat",
      purpose: "",
      modelRefs: [],
      endpointRefs: [],
      maxOutputTokens: "",
    },
    setProfileForm: jest.fn(),
    credentialForm: {
      key: "",
      modelEndpointId: "",
      secretValue: "",
      isDefault: false,
    },
    setCredentialForm: jest.fn(),
    grantDraft: {
      spaceId: "",
      domainId: "",
      modelId: "",
      endpointId: "",
      credentialId: "",
      operations: [],
      includeDescendants: false,
      allowBackgroundUse: false,
      isDefault: false,
      priority: "",
      includeInactive: false,
      advancedOpen: false,
      semanticRuleId: "",
      nodeId: "",
      credentialRef: "",
      endpointRef: "",
      modelRef: "",
    },
    setGrantDraft: jest.fn(),
    grantSpaces: [],
    grantDomains: [],
    grantLoadError: "",
    grantCreateOpen: false,
    endpoints: [],
    models: [],
    capabilities: [],
    policyDraft: {
      spaceId: "",
      domainId: "",
      includeDescendants: false,
      effect: "",
      operations: [],
      reason: "",
    },
    setPolicyDraft: jest.fn(),
    policySpaces: [],
    policyDomains: [],
    policyLoadError: "",
    policyCreateOpen: false,
    profiles: [],
    credentials: [credential],
    grants: [grant],
    policies: [],
    canManageProfiles: false,
    canManageCredentials: true,
    canManageGrants: true,
    canManagePolicies: true,
    onCreateProfile: jest.fn(),
    onCreateCredential: jest.fn(),
    onRevokeCredential: jest.fn(),
    onStartCreateGrant: jest.fn(),
    onCancelCreateGrant: jest.fn(),
    onCreateGrant: jest.fn(),
    onStartCreatePolicy: jest.fn(),
    onCancelCreatePolicy: jest.fn(),
    onCreatePolicy: jest.fn(),
    onExpireGrant: jest.fn(),
    onExpirePolicy: jest.fn(),
    onViewDetails: jest.fn(),
    ...overrides,
  };
}

test("renders setup errors and messages", () => {
  render(
    <InferenceSetupSection
      {...baseProps({
        error: "Credential update failed",
        message: "Credential saved",
        canManageCredentials: false,
      })}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent(
    "Credential update failed",
  );
  expect(screen.getByText("Credential saved")).toBeInTheDocument();
});

test("renders credential rows and forwards view/revoke actions", async () => {
  const user = userEvent.setup();
  const props = baseProps();
  render(<InferenceSetupSection {...props} />);

  expect(screen.getByText("openai-main")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View" }));
  expect(props.onViewDetails).toHaveBeenCalledWith("credential_1", credential);

  await user.click(screen.getByRole("button", { name: "Revoke" }));
  expect(props.onRevokeCredential).toHaveBeenCalledWith(credential);
});

test("renders grant list controls and forwards create/expire callbacks", async () => {
  const user = userEvent.setup();
  const props = baseProps({ activeTab: "grants" });
  render(<InferenceSetupSection {...props} />);

  await user.click(screen.getByRole("button", { name: "Create grant" }));
  expect(props.onStartCreateGrant).toHaveBeenCalledTimes(1);

  await user.click(screen.getByRole("button", { name: "Expire" }));
  expect(props.onExpireGrant).toHaveBeenCalledWith("grant_1");
});
