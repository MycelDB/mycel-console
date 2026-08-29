import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  ErrorGroup,
  errorMessage,
  formatEnumLabel,
  Input,
  Select,
  Tabs,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import {
  applyInferencePackage as defaultApplyInferencePackage,
  createInferenceCredential as defaultCreateInferenceCredential,
  createInferenceCredentialGrant as defaultCreateInferenceCredentialGrant,
  createInferencePolicy as defaultCreateInferencePolicy,
  createInferenceProfile as defaultCreateInferenceProfile,
  setInferenceCredentialStatus as defaultSetInferenceCredentialStatus,
  expireInferenceCredentialGrant as defaultExpireInferenceCredentialGrant,
  expireInferencePolicy as defaultExpireInferencePolicy,
  listInferenceCredentialGrants as defaultListInferenceCredentialGrants,
  listInferenceCredentials as defaultListInferenceCredentials,
  listInferencePackages as defaultListInferencePackages,
  listInferencePolicies as defaultListInferencePolicies,
  listInferenceProfiles as defaultListInferenceProfiles,
  listDomains as defaultListDomains,
  listSpaces as defaultListSpaces,
  listModelEndpointCapabilities as defaultListModelEndpointCapabilities,
  listModelEndpoints as defaultListModelEndpoints,
  listModels as defaultListModels,
} from "../../../services/adminService";
import type {
  ApplyInferencePackageResponse,
  CreateCredentialGrantInput,
  CreateCredentialInput,
  CreateInferencePolicyInput,
  CreateInferenceProfileInput,
  CredentialGrantInfo,
  CredentialStatusInput,
  InferenceCredentialInfo,
  InferenceModelInfo,
  InferencePackageDocument,
  InferencePolicyInfo,
  InferenceProfileInfo,
  InferencePackageInfo,
  ListCredentialGrantsInput,
  ListCredentialGrantsResponse,
  ListCredentialsInput,
  ListCredentialsResponse,
  ListInferencePackagesInput,
  ListInferencePackagesResponse,
  ListInferencePoliciesInput,
  ListInferencePoliciesResponse,
  ListInferenceProfilesInput,
  ListInferenceProfilesResponse,
  ListModelEndpointCapabilitiesInput,
  ListModelEndpointCapabilitiesResponse,
  ListModelEndpointsInput,
  ListModelEndpointsResponse,
  ListModelsInput,
  ListModelsResponse,
  ModelEndpointCapabilityInfo,
  ModelEndpointInfo,
} from "../../../types/inference";
import type {
  ListDomainsInput,
  ListDomainsResponse,
  DomainInfo,
} from "../../../types/domains";
import type {
  ListSpacesInput,
  ListSpacesResponse,
  SpaceInfo,
} from "../../../types/spaces";
import { ImportInferencePackageModal } from "../components/ImportInferencePackageModal";
import { ImportInferencePackageSummaryDialog } from "../components/ImportInferencePackageSummaryDialog";
import { InferencePackageTable } from "../components/InferencePackageTable";
import { InferenceModelTable } from "../components/InferenceModelTable";
import { ModelEndpointTable } from "../components/ModelEndpointTable";

type InferenceTab =
  | "packages"
  | "endpoints"
  | "models"
  | "profiles"
  | "credentials"
  | "grants"
  | "policies";

const inferenceOperations = [
  "chat",
  "embeddings",
  "summarize",
  "classify",
  "image_analysis",
];
const inferenceOperationOptions = inferenceOperations.map((operation) => ({
  value: operation,
  label: formatEnumLabel(operation),
}));

type CredentialDraft = {
  key: string;
  modelEndpointId: string;
  secretValue: string;
  isDefault: boolean;
};

type PolicyDraft = {
  spaceId: string;
  domainId: string;
  includeDescendants: boolean;
  effect: string;
  operations: string[];
  reason: string;
};

type ProfileDraft = {
  key: string;
  displayName: string;
  operation: string;
  purpose: string;
  modelRefs: string[];
  endpointRefs: string[];
  maxOutputTokens: string;
};

type GrantDraft = {
  spaceId: string;
  domainId: string;
  modelId: string;
  endpointId: string;
  credentialId: string;
  operations: string[];
  includeDescendants: boolean;
  allowBackgroundUse: boolean;
  isDefault: boolean;
  priority: string;
  includeInactive: boolean;
  advancedOpen: boolean;
  semanticRuleId: string;
  nodeId: string;
  credentialRef: string;
  endpointRef: string;
  modelRef: string;
};

function CatalogDetailDrawer({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60">
      <aside
        className={`h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              {title}
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Inference catalog detail and raw diagnostic payload.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <pre
          className={`mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs ${themeClasses.text.parts.inverseSoft}`}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      </aside>
    </div>
  );
}

const inferenceTabs: Array<{
  id: InferenceTab;
  label: string;
  description: string;
}> = [
  {
    id: "endpoints",
    label: "Endpoints",
    description: "Reachable model service endpoints.",
  },
  {
    id: "models",
    label: "Models",
    description: "Inference models and their endpoint operations.",
  },
  {
    id: "credentials",
    label: "Credentials",
    description:
      "Credential records and secret references. Secret values are never displayed.",
  },
  {
    id: "grants",
    label: "Grants",
    description: "Credential grant scopes for spaces and workloads.",
  },
  {
    id: "policies",
    label: "Policies",
    description: "Inference allow/deny/restrict policy records.",
  },
  {
    id: "profiles",
    label: "Profiles",
    description:
      "Space-scoped inference profiles used by automation and semantic work.",
  },
  {
    id: "packages",
    label: "Import history",
    description: "Install-only package records and import history.",
  },
];

const modelTabs = inferenceTabs.filter((tab) =>
  ["endpoints", "models", "packages"].includes(tab.id),
);
const accessTabs = inferenceTabs.filter((tab) =>
  ["credentials", "grants", "policies", "profiles"].includes(tab.id),
);

type InferenceSection = "models" | "access";

export type InferencePageProps = {
  listInferencePackagesService?: (
    input?: ListInferencePackagesInput,
  ) => Promise<ListInferencePackagesResponse>;
  listModelEndpointsService?: (
    input?: ListModelEndpointsInput,
  ) => Promise<ListModelEndpointsResponse>;
  listModelsService?: (input?: ListModelsInput) => Promise<ListModelsResponse>;
  listModelEndpointCapabilitiesService?: (
    input?: ListModelEndpointCapabilitiesInput,
  ) => Promise<ListModelEndpointCapabilitiesResponse>;
  applyInferencePackageService?: (
    input: InferencePackageDocument,
  ) => Promise<ApplyInferencePackageResponse>;
  listInferenceProfilesService?: (
    input?: ListInferenceProfilesInput,
  ) => Promise<ListInferenceProfilesResponse>;
  createInferenceProfileService?: (
    input: CreateInferenceProfileInput,
  ) => Promise<unknown>;
  listInferenceCredentialsService?: (
    input?: ListCredentialsInput,
  ) => Promise<ListCredentialsResponse>;
  createInferenceCredentialService?: (
    input: CreateCredentialInput,
  ) => Promise<unknown>;
  setInferenceCredentialStatusService?: (
    input: CredentialStatusInput,
  ) => Promise<unknown>;
  listInferenceCredentialGrantsService?: (
    input: ListCredentialGrantsInput,
  ) => Promise<ListCredentialGrantsResponse>;
  createInferenceCredentialGrantService?: (
    input: CreateCredentialGrantInput,
  ) => Promise<unknown>;
  expireInferenceCredentialGrantService?: (input: {
    spaceId: string;
    credentialGrantId: string;
  }) => Promise<unknown>;
  listInferencePoliciesService?: (
    input: ListInferencePoliciesInput,
  ) => Promise<ListInferencePoliciesResponse>;
  createInferencePolicyService?: (
    input: CreateInferencePolicyInput,
  ) => Promise<unknown>;
  expireInferencePolicyService?: (input: {
    spaceId: string;
    inferencePolicyId: string;
  }) => Promise<unknown>;
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (
    input: ListDomainsInput,
  ) => Promise<ListDomainsResponse>;
  principalContext?: ConsolePrincipalContext | null;
  section?: InferenceSection;
};

export function InferencePage({
  listInferencePackagesService = defaultListInferencePackages,
  listModelEndpointsService = defaultListModelEndpoints,
  listModelsService = defaultListModels,
  listModelEndpointCapabilitiesService = defaultListModelEndpointCapabilities,
  applyInferencePackageService = defaultApplyInferencePackage,
  listInferenceProfilesService = defaultListInferenceProfiles,
  createInferenceProfileService = defaultCreateInferenceProfile,
  listInferenceCredentialsService = defaultListInferenceCredentials,
  createInferenceCredentialService = defaultCreateInferenceCredential,
  setInferenceCredentialStatusService = defaultSetInferenceCredentialStatus,
  listInferenceCredentialGrantsService = defaultListInferenceCredentialGrants,
  createInferenceCredentialGrantService = defaultCreateInferenceCredentialGrant,
  expireInferenceCredentialGrantService = defaultExpireInferenceCredentialGrant,
  listInferencePoliciesService = defaultListInferencePolicies,
  createInferencePolicyService = defaultCreateInferencePolicy,
  expireInferencePolicyService = defaultExpireInferencePolicy,
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  principalContext,
  section = "models",
}: InferencePageProps) {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<InferencePackageInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [summary, setSummary] = useState<ApplyInferencePackageResponse | null>(
    null,
  );
  const availableTabs = section === "access" ? accessTabs : modelTabs;
  const [activeTab, setActiveTab] = useState<InferenceTab>(
    section === "access" ? "credentials" : "endpoints",
  );
  const [endpoints, setEndpoints] = useState<ModelEndpointInfo[]>([]);
  const [models, setModels] = useState<InferenceModelInfo[]>([]);
  const [capabilities, setCapabilities] = useState<
    ModelEndpointCapabilityInfo[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const [includeDisabledCatalog, setIncludeDisabledCatalog] = useState(false);
  const [operationFilter, setOperationFilter] = useState("");
  const [detail, setDetail] = useState<{ title: string; data: unknown } | null>(
    null,
  );
  const [spaceFilter, setSpaceFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [profileSpaces, setProfileSpaces] = useState<SpaceInfo[]>([]);
  const [profileFilterDomains, setProfileFilterDomains] = useState<
    DomainInfo[]
  >([]);
  const [profileFilterLoadError, setProfileFilterLoadError] = useState("");
  const [grantFilter, setGrantFilter] = useState({ spaceId: "", domainId: "" });
  const [grantFilterDomains, setGrantFilterDomains] = useState<DomainInfo[]>(
    [],
  );
  const [grantFilterLoadError, setGrantFilterLoadError] = useState("");
  const [profiles, setProfiles] = useState<InferenceProfileInfo[]>([]);
  const [credentials, setCredentials] = useState<InferenceCredentialInfo[]>([]);
  const [grants, setGrants] = useState<CredentialGrantInfo[]>([]);
  const [policies, setPolicies] = useState<InferencePolicyInfo[]>([]);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    key: "summarize-page",
    displayName: "Summarize page",
    operation: "chat",
    purpose: "automation",
    modelRefs: ["openai/gpt-5.6-mini"],
    endpointRefs: ["openai"],
    maxOutputTokens: "512",
  });
  const [credentialForm, setCredentialForm] = useState<CredentialDraft>({
    key: "openai-default",
    modelEndpointId: "",
    secretValue: "",
    isDefault: true,
  });
  const [grantDraft, setGrantDraft] = useState<GrantDraft>({
    spaceId: "",
    domainId: "",
    modelId: "",
    endpointId: "",
    credentialId: "",
    operations: [],
    includeDescendants: true,
    allowBackgroundUse: true,
    isDefault: true,
    priority: "0",
    includeInactive: false,
    advancedOpen: false,
    semanticRuleId: "",
    nodeId: "",
    credentialRef: "",
    endpointRef: "",
    modelRef: "",
  });
  const [grantSpaces, setGrantSpaces] = useState<SpaceInfo[]>([]);
  const [grantDomains, setGrantDomains] = useState<DomainInfo[]>([]);
  const [grantLoadError, setGrantLoadError] = useState("");
  const [grantCreateOpen, setGrantCreateOpen] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<PolicyDraft>({
    spaceId: "",
    domainId: "",
    includeDescendants: true,
    effect: "allow",
    operations: ["chat", "summarize", "classify"],
    reason: "allow automation inference profile use",
  });
  const [policySpaces, setPolicySpaces] = useState<SpaceInfo[]>([]);
  const [policyDomains, setPolicyDomains] = useState<DomainInfo[]>([]);
  const [policyLoadError, setPolicyLoadError] = useState("");
  const [policyFilter, setPolicyFilter] = useState({
    spaceId: "",
    domainId: "",
  });
  const [policyFilterDomains, setPolicyFilterDomains] = useState<DomainInfo[]>(
    [],
  );
  const [policyFilterLoadError, setPolicyFilterLoadError] = useState("");
  const [policyCreateOpen, setPolicyCreateOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardForm, setWizardForm] = useState({
    spaceId: "",
    domainId: "",
    profileKey: "summarize-page",
    credentialKey: "openai-default",
    secretValue: "",
    modelRef: "openai/gpt-5.6-mini",
    operation: "chat",
    purpose: "automation",
  });
  const canImportPackages = canUseCapability(
    principalContext,
    "inference.catalog.manage",
  );
  const canManageProfiles =
    canUseCapability(principalContext, "inference.profile.manage") ||
    canUseCapability(principalContext, "inference.admin");
  const canManageCredentials =
    canUseCapability(principalContext, "inference.credential.manage") ||
    canUseCapability(principalContext, "inference.admin");
  const canManageGrants =
    canUseCapability(principalContext, "inference.grant.manage") ||
    canUseCapability(principalContext, "inference.admin");
  const canManagePolicies =
    canUseCapability(principalContext, "inference.policy.manage") ||
    canUseCapability(principalContext, "inference.admin");

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(availableTabs[0]?.id ?? "endpoints");
    }
  }, [activeTab, availableTabs]);

  const loadPackages = useCallback(
    async ({
      append = false,
      pageToken = "",
    }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const response = await listInferencePackagesService({
          pageSize: 50,
          pageToken,
        });
        setPackages((current) =>
          append ? [...current, ...response.packages] : response.packages,
        );
        setNextPageToken(response.nextPageToken);
      } catch (err) {
        setError(errorMessage(err, "Failed to load inference packages"));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [listInferencePackagesService],
  );

  useEffect(() => {
    void loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (activeTab === "packages") return;
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        if (activeTab === "endpoints") {
          const response = await listModelEndpointsService({
            pageSize: 100,
            includeDisabled: includeDisabledCatalog,
          });
          if (!cancelled) setEndpoints(response.modelEndpoints);
        } else if (activeTab === "models") {
          const [modelsResponse, capabilitiesResponse] = await Promise.all([
            listModelsService({ pageSize: 100 }),
            listModelEndpointCapabilitiesService({
              pageSize: 500,
              operation: operationFilter,
              includeDisabled: includeDisabledCatalog,
            }),
          ]);
          if (!cancelled) {
            setModels(modelsResponse.models);
            setCapabilities(capabilitiesResponse.modelEndpointCapabilities);
          }
        }
      } catch (err) {
        if (!cancelled)
          setCatalogError(
            errorMessage(err, "Failed to load inference catalog"),
          );
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [
    activeTab,
    catalogRefreshKey,
    includeDisabledCatalog,
    listModelEndpointCapabilitiesService,
    listModelEndpointsService,
    listModelsService,
    operationFilter,
  ]);

  const loadSetupTab = useCallback(async () => {
    setSetupError("");
    if (!["profiles", "credentials", "grants", "policies"].includes(activeTab))
      return;
    setSetupLoading(true);
    try {
      if (activeTab === "profiles") {
        const [
          spacesResponse,
          profilesResponse,
          endpointsResponse,
          modelsResponse,
          capabilitiesResponse,
        ] = await Promise.all([
          listSpacesService({ pageSize: 100 }),
          spaceFilter.trim()
            ? listInferenceProfilesService({
                spaceId: spaceFilter,
                domainId: domainFilter,
                operation: operationFilter,
                includeDisabled: includeDisabledCatalog,
                pageSize: 100,
              })
            : Promise.resolve({ inferenceProfiles: [], nextPageToken: "" }),
          listModelEndpointsService({ pageSize: 500, includeDisabled: true }),
          listModelsService({ pageSize: 500 }),
          listModelEndpointCapabilitiesService({
            pageSize: 500,
            includeDisabled: true,
          }),
        ]);
        setProfileSpaces(spacesResponse.spaces);
        setProfiles(profilesResponse.inferenceProfiles);
        setEndpoints(endpointsResponse.modelEndpoints);
        setModels(modelsResponse.models);
        setCapabilities(capabilitiesResponse.modelEndpointCapabilities);
      } else if (activeTab === "credentials") {
        const [credentialsResponse, endpointsResponse] = await Promise.all([
          listInferenceCredentialsService({
            pageSize: 100,
            includeInactive: includeDisabledCatalog,
          }),
          listModelEndpointsService({ pageSize: 500, includeDisabled: true }),
        ]);
        setCredentials(credentialsResponse.credentials);
        setEndpoints(endpointsResponse.modelEndpoints);
      } else if (activeTab === "grants") {
        const [
          grantResponse,
          spacesResponse,
          modelsResponse,
          endpointsResponse,
          capabilitiesResponse,
          credentialsResponse,
        ] = await Promise.all([
          grantFilter.spaceId
            ? listInferenceCredentialGrantsService({
                spaceId: grantFilter.spaceId,
                includeExpired: includeDisabledCatalog,
                pageSize: 100,
              })
            : Promise.resolve({ credentialGrants: [], nextPageToken: "" }),
          listSpacesService({ pageSize: 100 }),
          listModelsService({ pageSize: 500 }),
          listModelEndpointsService({ pageSize: 500, includeDisabled: true }),
          listModelEndpointCapabilitiesService({
            pageSize: 500,
            includeDisabled: true,
          }),
          listInferenceCredentialsService({
            pageSize: 500,
            includeInactive: grantDraft.includeInactive,
          }),
        ]);
        setGrants(
          grantFilter.domainId
            ? grantResponse.credentialGrants.filter(
                (grant) => grant.scope?.domainId === grantFilter.domainId,
              )
            : grantResponse.credentialGrants,
        );
        setGrantSpaces(spacesResponse.spaces);
        setModels(modelsResponse.models);
        setEndpoints(endpointsResponse.modelEndpoints);
        setCapabilities(capabilitiesResponse.modelEndpointCapabilities);
        setCredentials(credentialsResponse.credentials);
      } else if (activeTab === "policies") {
        const [spacesResponse, policiesResponse] = await Promise.all([
          listSpacesService({ pageSize: 100 }),
          policyFilter.spaceId
            ? listInferencePoliciesService({
                spaceId: policyFilter.spaceId,
                includeExpired: includeDisabledCatalog,
                pageSize: 100,
              })
            : Promise.resolve({ inferencePolicies: [], nextPageToken: "" }),
        ]);
        setPolicySpaces(spacesResponse.spaces);
        setPolicies(
          policyFilter.domainId
            ? policiesResponse.inferencePolicies.filter(
                (policy) => policy.scope?.domainId === policyFilter.domainId,
              )
            : policiesResponse.inferencePolicies,
        );
      }
    } catch (err) {
      setSetupError(
        errorMessage(err, "Failed to load inference setup resources"),
      );
    } finally {
      setSetupLoading(false);
    }
  }, [
    activeTab,
    domainFilter,
    grantDraft.includeInactive,
    grantFilter.domainId,
    grantFilter.spaceId,
    includeDisabledCatalog,
    listInferenceCredentialGrantsService,
    listInferenceCredentialsService,
    listInferencePoliciesService,
    listInferenceProfilesService,
    listModelEndpointCapabilitiesService,
    listModelEndpointsService,
    listModelsService,
    listSpacesService,
    operationFilter,
    policyFilter.domainId,
    policyFilter.spaceId,
    spaceFilter,
  ]);

  useEffect(() => {
    void loadSetupTab();
  }, [loadSetupTab, catalogRefreshKey]);

  useEffect(() => {
    if (activeTab !== "grants") setGrantCreateOpen(false);
    if (activeTab !== "policies") setPolicyCreateOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (
      activeTab !== "credentials" ||
      credentialForm.modelEndpointId ||
      endpoints.length === 0
    )
      return;
    const preferred =
      endpoints.find(
        (endpoint) => endpoint.enabled && endpoint.key === "openai",
      ) || endpoints.find((endpoint) => endpoint.enabled);
    if (preferred)
      setCredentialForm((current) => ({
        ...current,
        modelEndpointId: preferred.modelEndpointId,
      }));
  }, [activeTab, credentialForm.modelEndpointId, endpoints]);

  useEffect(() => {
    if (activeTab !== "profiles" || !spaceFilter) {
      setProfileFilterDomains([]);
      return;
    }
    let cancelled = false;
    async function loadProfileFilterDomains() {
      setProfileFilterLoadError("");
      try {
        const response = await listDomainsService({
          spaceId: spaceFilter,
          pageSize: 100,
          includeSystem: false,
        });
        if (!cancelled) setProfileFilterDomains(response.domains);
      } catch (err) {
        if (!cancelled)
          setProfileFilterLoadError(
            errorMessage(err, "Failed to load domains"),
          );
      }
    }
    void loadProfileFilterDomains();
    return () => {
      cancelled = true;
    };
  }, [activeTab, listDomainsService, spaceFilter]);

  useEffect(() => {
    if (activeTab !== "grants" || !grantFilter.spaceId) {
      setGrantFilterDomains([]);
      return;
    }
    let cancelled = false;
    async function loadGrantFilterDomains() {
      setGrantFilterLoadError("");
      try {
        const response = await listDomainsService({
          spaceId: grantFilter.spaceId,
          pageSize: 100,
          includeSystem: false,
        });
        if (!cancelled) setGrantFilterDomains(response.domains);
      } catch (err) {
        if (!cancelled)
          setGrantFilterLoadError(errorMessage(err, "Failed to load domains"));
      }
    }
    void loadGrantFilterDomains();
    return () => {
      cancelled = true;
    };
  }, [activeTab, grantFilter.spaceId, listDomainsService]);

  useEffect(() => {
    if (activeTab !== "grants" || !grantDraft.spaceId) {
      setGrantDomains([]);
      return;
    }
    let cancelled = false;
    async function loadGrantDomains() {
      setGrantLoadError("");
      try {
        const response = await listDomainsService({
          spaceId: grantDraft.spaceId,
          pageSize: 100,
          includeSystem: false,
        });
        if (!cancelled) setGrantDomains(response.domains);
      } catch (err) {
        if (!cancelled)
          setGrantLoadError(errorMessage(err, "Failed to load domains"));
      }
    }
    void loadGrantDomains();
    return () => {
      cancelled = true;
    };
  }, [activeTab, grantDraft.spaceId, listDomainsService]);

  useEffect(() => {
    if (activeTab !== "policies" || !policyFilter.spaceId) {
      setPolicyFilterDomains([]);
      return;
    }
    let cancelled = false;
    async function loadPolicyFilterDomains() {
      setPolicyFilterLoadError("");
      try {
        const response = await listDomainsService({
          spaceId: policyFilter.spaceId,
          pageSize: 100,
          includeSystem: false,
        });
        if (!cancelled) setPolicyFilterDomains(response.domains);
      } catch (err) {
        if (!cancelled)
          setPolicyFilterLoadError(errorMessage(err, "Failed to load domains"));
      }
    }
    void loadPolicyFilterDomains();
    return () => {
      cancelled = true;
    };
  }, [activeTab, policyFilter.spaceId, listDomainsService]);

  useEffect(() => {
    if (activeTab !== "policies" || !policyDraft.spaceId) {
      setPolicyDomains([]);
      return;
    }
    let cancelled = false;
    async function loadPolicyDomains() {
      setPolicyLoadError("");
      try {
        const response = await listDomainsService({
          spaceId: policyDraft.spaceId,
          pageSize: 100,
          includeSystem: false,
        });
        if (!cancelled) setPolicyDomains(response.domains);
      } catch (err) {
        if (!cancelled)
          setPolicyLoadError(errorMessage(err, "Failed to load domains"));
      }
    }
    void loadPolicyDomains();
    return () => {
      cancelled = true;
    };
  }, [activeTab, policyDraft.spaceId, listDomainsService]);

  async function handleCreateProfile() {
    if (!spaceFilter.trim()) {
      setSetupError("Space ID is required");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      await createInferenceProfileService({
        spaceId: spaceFilter,
        key: profileForm.key,
        displayName: profileForm.displayName,
        operation: profileForm.operation,
        purpose: profileForm.purpose,
        domainIds: domainFilter ? [domainFilter] : [],
        endpointRefs: profileForm.endpointRefs,
        modelRefs: profileForm.modelRefs,
        defaultParameters: {
          maxOutputTokens: Number(profileForm.maxOutputTokens) || 0,
          responseFormat: "text",
        },
        enabled: true,
      });
      setSetupMessage("Inference profile created.");
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to create inference profile"));
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleCreateCredential() {
    if (!credentialForm.key.trim()) {
      setSetupError("Credential key is required");
      return;
    }
    if (!credentialForm.modelEndpointId.trim()) {
      setSetupError("Endpoint is required");
      return;
    }
    if (!credentialForm.secretValue.trim()) {
      setSetupError("API key is required");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      await createInferenceCredentialService({
        key: credentialForm.key,
        displayName: credentialForm.key,
        modelEndpointId: credentialForm.modelEndpointId,
        ownerType: "system",
        ownerId: "system",
        authType: "api_key",
        secretValue: credentialForm.secretValue,
        isDefault: credentialForm.isDefault,
      });
      setCredentialForm((current) => ({ ...current, secretValue: "" }));
      setSetupMessage(
        "Credential created. API keys are not shown in Console after submission.",
      );
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to create credential"));
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleRevokeCredential(credential: InferenceCredentialInfo) {
    const label = credential.key || credential.credentialId;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Revoke credential ${label}? Existing grants will no longer be able to use it.`,
      )
    )
      return;
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      await setInferenceCredentialStatusService({
        credentialId: credential.credentialId,
        status: "revoked",
      });
      setSetupMessage(`Credential ${label} revoked.`);
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to revoke credential"));
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleCreateGrant() {
    const selectedSpaceId = grantDraft.spaceId || spaceFilter;
    if (!selectedSpaceId.trim()) {
      setSetupError("Space is required");
      return;
    }
    if (!grantDraft.credentialId && !grantDraft.credentialRef.trim()) {
      setSetupError("Credential is required");
      return;
    }
    if (!grantDraft.endpointId && !grantDraft.endpointRef.trim()) {
      setSetupError("Endpoint is required");
      return;
    }
    if (!grantDraft.modelId && !grantDraft.modelRef.trim()) {
      setSetupError("Model is required");
      return;
    }
    if (grantDraft.operations.length === 0) {
      setSetupError("At least one operation is required");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      await createInferenceCredentialGrantService({
        spaceId: selectedSpaceId,
        credentialId: grantDraft.credentialId,
        credential: grantDraft.credentialRef,
        scope: {
          spaceId: selectedSpaceId,
          domainId: grantDraft.domainId || domainFilter,
          includeDescendants: grantDraft.includeDescendants,
          semanticRuleId: grantDraft.semanticRuleId,
          nodeId: grantDraft.nodeId,
        },
        operations: grantDraft.operations,
        modelEndpointId: grantDraft.endpointId,
        modelEndpoint: grantDraft.endpointRef,
        modelId: grantDraft.modelId,
        model: grantDraft.modelRef,
        priority: Number(grantDraft.priority) || 0,
        allowBackgroundUse: grantDraft.allowBackgroundUse,
        isDefault: grantDraft.isDefault,
      });
      setSetupMessage("Credential grant created.");
      setGrantCreateOpen(false);
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to create credential grant"));
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleCreatePolicy() {
    if (!policyDraft.spaceId.trim()) {
      setSetupError("Space is required");
      return;
    }
    if (policyDraft.operations.length === 0) {
      setSetupError("At least one operation is required");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      await createInferencePolicyService({
        spaceId: policyDraft.spaceId,
        scope: {
          spaceId: policyDraft.spaceId,
          domainId: policyDraft.domainId,
          includeDescendants: policyDraft.includeDescendants,
        },
        effect: policyDraft.effect,
        operations: policyDraft.operations,
        reason: policyDraft.reason,
      });
      setSetupMessage("Inference policy created.");
      setPolicyCreateOpen(false);
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to create inference policy"));
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleConfigureOpenAI() {
    if (!wizardForm.spaceId.trim()) {
      setSetupError("Space ID is required");
      return;
    }
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      if (!wizardForm.secretValue.trim()) {
        setSetupError("OpenAI API key is required");
        setSetupLoading(false);
        return;
      }
      await createInferenceCredentialService({
        key: wizardForm.credentialKey,
        displayName: "OpenAI default",
        modelEndpoint: "openai",
        ownerType: "system",
        authType: "api_key",
        secretValue: wizardForm.secretValue,
        isDefault: true,
      });
      await createInferenceCredentialGrantService({
        spaceId: wizardForm.spaceId,
        credential: wizardForm.credentialKey,
        scope: { spaceId: wizardForm.spaceId, domainId: wizardForm.domainId },
        operations: [wizardForm.operation, "summarize", "classify"],
        modelEndpoint: "openai",
        model: wizardForm.modelRef,
        allowBackgroundUse: true,
        isDefault: true,
      });
      await createInferencePolicyService({
        spaceId: wizardForm.spaceId,
        scope: { spaceId: wizardForm.spaceId, domainId: wizardForm.domainId },
        effect: "allow",
        operations: [wizardForm.operation, "summarize", "classify"],
        reason: "allow OpenAI inference profile use",
      });
      await createInferenceProfileService({
        spaceId: wizardForm.spaceId,
        key: wizardForm.profileKey,
        displayName: wizardForm.profileKey,
        operation: wizardForm.operation,
        purpose: wizardForm.purpose,
        domainIds: wizardForm.domainId ? [wizardForm.domainId] : [],
        endpointRefs: ["openai"],
        modelRefs: [wizardForm.modelRef],
        defaultParameters: { maxOutputTokens: 512, responseFormat: "text" },
        enabled: true,
      });
      setWizardForm((current) => ({ ...current, secretValue: "" }));
      setSpaceFilter(wizardForm.spaceId);
      setDomainFilter(wizardForm.domainId);
      setWizardOpen(false);
      setActiveTab("profiles");
      setSetupMessage(
        "OpenAI credential, grant, policy, and profile configured.",
      );
      await loadSetupTab();
    } catch (err) {
      setSetupError(errorMessage(err, "Failed to configure OpenAI"));
    } finally {
      setSetupLoading(false);
    }
  }

  function handleRefresh() {
    if (activeTab === "packages") {
      void loadPackages();
      return;
    }
    setCatalogRefreshKey((current) => current + 1);
  }

  async function handleImport(document: InferencePackageDocument) {
    setImporting(true);
    setError("");
    try {
      const result = await applyInferencePackageService(document);
      setImportOpen(false);
      setSummary(result);
      await loadPackages();
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error("Failed to import inference package");
    } finally {
      setImporting(false);
    }
  }

  const pageTitle = section === "access" ? "Access" : "Models";
  const pageDescription =
    section === "access"
      ? "Manage provider credentials, credential grants, inference policies, and space-scoped profiles used by graph automations and semantic generation."
      : "Inspect model endpoints, models, and import package history. Import packages are install-only deployment units; their committed resources appear in the catalog tabs.";
  const tabListLabel =
    section === "access" ? "Model access sections" : "Model catalog sections";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title={pageTitle}
        description={pageDescription}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={
                (activeTab === "packages"
                  ? loading || loadingMore
                  : catalogLoading || setupLoading) || importing
              }
            >
              Refresh
            </Button>
            {section === "access" &&
              (canManageProfiles ||
                canManageCredentials ||
                canManageGrants ||
                canManagePolicies) && (
                <Button variant="secondary" onClick={() => setWizardOpen(true)}>
                  Configure OpenAI
                </Button>
              )}
            {section === "models" && canImportPackages && (
              <Button
                variant="secondary"
                onClick={() => setImportOpen(true)}
                disabled={importing}
              >
                Import package JSON
              </Button>
            )}
          </>
        }
      />

      <Tabs
        ariaLabel={tabListLabel}
        tabs={availableTabs}
        active={activeTab}
        onChange={setActiveTab}
      />

      <ErrorGroup
        errors={
          error
            ? [
                {
                  id: `${section}.load`,
                  source:
                    section === "models" ? "Model catalog" : "Inference access",
                  message: error,
                },
              ]
            : []
        }
      />

      {activeTab !== "packages" && (
        <div
          className={`flex flex-wrap items-end gap-4 rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
        >
          {activeTab === "profiles" && (
            <>
              <div className="min-w-60">
                <SelectField
                  label="Filter space"
                  value={spaceFilter}
                  onChange={(spaceId) => {
                    setSpaceFilter(spaceId);
                    setDomainFilter("");
                  }}
                  options={profileSpaces.map((space) => ({
                    value: space.spaceId,
                    label: space.name || space.spaceId,
                    hint: space.spaceId,
                  }))}
                  placeholder="Choose a space"
                />
              </div>
              <div className="min-w-60">
                <SelectField
                  label="Filter domain"
                  value={domainFilter}
                  onChange={setDomainFilter}
                  options={profileFilterDomains.map((domain) => ({
                    value: domain.domainId,
                    label: domain.name || domain.key || domain.domainId,
                    hint: domain.domainId,
                  }))}
                  placeholder={
                    spaceFilter ? "All domains" : "Select a space first"
                  }
                  disabled={!spaceFilter}
                />
              </div>
              {profileFilterLoadError && (
                <span className="text-sm text-rose-600 dark:text-rose-300">
                  {profileFilterLoadError}
                </span>
              )}
            </>
          )}
          {activeTab === "grants" && !grantCreateOpen && (
            <>
              <div className="min-w-60">
                <SelectField
                  label="Filter space"
                  value={grantFilter.spaceId}
                  onChange={(spaceId) =>
                    setGrantFilter({ spaceId, domainId: "" })
                  }
                  options={grantSpaces.map((space) => ({
                    value: space.spaceId,
                    label: space.name || space.spaceId,
                    hint: space.spaceId,
                  }))}
                  placeholder="Choose a space"
                />
              </div>
              <div className="min-w-60">
                <SelectField
                  label="Filter domain"
                  value={grantFilter.domainId}
                  onChange={(domainId) =>
                    setGrantFilter((current) => ({ ...current, domainId }))
                  }
                  options={grantFilterDomains.map((domain) => ({
                    value: domain.domainId,
                    label: domain.name || domain.key || domain.domainId,
                    hint: domain.domainId,
                  }))}
                  placeholder={
                    grantFilter.spaceId ? "All domains" : "Select a space first"
                  }
                  disabled={!grantFilter.spaceId}
                />
              </div>
              {grantFilterLoadError && (
                <span className="text-sm text-rose-600 dark:text-rose-300">
                  {grantFilterLoadError}
                </span>
              )}
            </>
          )}
          {activeTab === "policies" && !policyCreateOpen && (
            <>
              <div className="min-w-60">
                <SelectField
                  label="Filter space"
                  value={policyFilter.spaceId}
                  onChange={(spaceId) =>
                    setPolicyFilter({ spaceId, domainId: "" })
                  }
                  options={policySpaces.map((space) => ({
                    value: space.spaceId,
                    label: space.name || space.spaceId,
                    hint: space.spaceId,
                  }))}
                  placeholder="Choose a space"
                />
              </div>
              <div className="min-w-60">
                <SelectField
                  label="Filter domain"
                  value={policyFilter.domainId}
                  onChange={(domainId) =>
                    setPolicyFilter((current) => ({ ...current, domainId }))
                  }
                  options={policyFilterDomains.map((domain) => ({
                    value: domain.domainId,
                    label: domain.name || domain.key || domain.domainId,
                    hint: domain.domainId,
                  }))}
                  placeholder={
                    policyFilter.spaceId
                      ? "All domains"
                      : "Select a space first"
                  }
                  disabled={!policyFilter.spaceId}
                />
              </div>
              {policyFilterLoadError && (
                <span className="text-sm text-rose-600 dark:text-rose-300">
                  {policyFilterLoadError}
                </span>
              )}
            </>
          )}
          {(activeTab === "models" || activeTab === "profiles") && (
            <div className="min-w-48">
              <SelectField
                label="Filter operation"
                value={operationFilter}
                onChange={setOperationFilter}
                options={inferenceOperationOptions}
                placeholder="All operations"
              />
            </div>
          )}
          {(activeTab === "endpoints" ||
            activeTab === "models" ||
            activeTab === "profiles" ||
            activeTab === "credentials" ||
            activeTab === "grants" ||
            activeTab === "policies") && (
            <label
              className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600"
                checked={includeDisabledCatalog}
                onChange={(event) =>
                  setIncludeDisabledCatalog(event.target.checked)
                }
              />
              {activeTab === "credentials"
                ? "Include inactive"
                : activeTab === "grants" || activeTab === "policies"
                  ? "Include expired"
                  : "Include disabled"}
            </label>
          )}
        </div>
      )}

      {activeTab === "packages" ? (
        loading ? (
          <div
            className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-8 text-center`}
          >
            <Text intent="muted">Loading inference packages…</Text>
          </div>
        ) : (
          <>
            <InferencePackageTable packages={packages} />
            {nextPageToken && (
              <div className="flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() =>
                    void loadPackages({
                      append: true,
                      pageToken: nextPageToken,
                    })
                  }
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading more…" : "Load more"}
                </Button>
              </div>
            )}
          </>
        )
      ) : ["profiles", "credentials", "grants", "policies"].includes(
          activeTab,
        ) ? (
        <InferenceSetupSection
          activeTab={activeTab}
          loading={setupLoading}
          error={setupError}
          message={setupMessage}
          spaceId={spaceFilter}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          credentialForm={credentialForm}
          setCredentialForm={setCredentialForm}
          grantDraft={grantDraft}
          setGrantDraft={setGrantDraft}
          grantSpaces={grantSpaces}
          grantDomains={grantDomains}
          grantLoadError={grantLoadError}
          grantCreateOpen={grantCreateOpen}
          endpoints={endpoints}
          models={models}
          capabilities={capabilities}
          policyDraft={policyDraft}
          setPolicyDraft={setPolicyDraft}
          policySpaces={policySpaces}
          policyDomains={policyDomains}
          policyLoadError={policyLoadError}
          policyCreateOpen={policyCreateOpen}
          profiles={profiles}
          credentials={credentials}
          grants={grants}
          policies={policies}
          canManageProfiles={canManageProfiles}
          canManageCredentials={canManageCredentials}
          canManageGrants={canManageGrants}
          canManagePolicies={canManagePolicies}
          onCreateProfile={() => void handleCreateProfile()}
          onCreateCredential={() => void handleCreateCredential()}
          onRevokeCredential={(credential) =>
            void handleRevokeCredential(credential)
          }
          onStartCreateGrant={() => {
            setGrantDraft((current) => ({
              ...current,
              spaceId: grantFilter.spaceId || current.spaceId,
              domainId: grantFilter.domainId || current.domainId,
            }));
            setGrantCreateOpen(true);
          }}
          onCancelCreateGrant={() => setGrantCreateOpen(false)}
          onCreateGrant={() => void handleCreateGrant()}
          onStartCreatePolicy={() => {
            setPolicyDraft((current) => ({
              ...current,
              spaceId: policyFilter.spaceId || current.spaceId,
              domainId: policyFilter.domainId || current.domainId,
            }));
            setPolicyCreateOpen(true);
          }}
          onCancelCreatePolicy={() => setPolicyCreateOpen(false)}
          onCreatePolicy={() => void handleCreatePolicy()}
          onExpireGrant={(grantId) =>
            void expireInferenceCredentialGrantService({
              spaceId: grantFilter.spaceId || grantDraft.spaceId || spaceFilter,
              credentialGrantId: grantId,
            })
              .then(loadSetupTab)
              .catch((err) =>
                setSetupError(
                  errorMessage(err, "Failed to expire credential grant"),
                ),
              )
          }
          onExpirePolicy={(policyId) =>
            void expireInferencePolicyService({
              spaceId:
                policyFilter.spaceId || policyDraft.spaceId || spaceFilter,
              inferencePolicyId: policyId,
            })
              .then(loadSetupTab)
              .catch((err) =>
                setSetupError(
                  errorMessage(err, "Failed to expire inference policy"),
                ),
              )
          }
          onViewDetails={(title, data) => setDetail({ title, data })}
        />
      ) : catalogLoading ? (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-8 text-center`}
        >
          <Text intent="muted">Loading inference catalog…</Text>
        </div>
      ) : catalogError ? (
        <Alert>{catalogError}</Alert>
      ) : activeTab === "endpoints" ? (
        <ModelEndpointTable
          endpoints={endpoints}
          onViewDetails={(item) =>
            setDetail({
              title: item.key || item.name || "Model endpoint",
              data: item,
            })
          }
        />
      ) : activeTab === "models" ? (
        <InferenceModelTable
          models={models}
          capabilities={capabilities}
          onViewDetails={(item) =>
            setDetail({
              title: item.key || item.modelName || "Model",
              data: item,
            })
          }
        />
      ) : null}

      <ImportInferencePackageModal
        open={importOpen && canImportPackages}
        loading={importing}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      {wizardOpen && (
        <OpenAIWizard
          form={wizardForm}
          setForm={setWizardForm}
          loading={setupLoading}
          onClose={() => setWizardOpen(false)}
          onSubmit={() => void handleConfigureOpenAI()}
        />
      )}
      {detail && (
        <CatalogDetailDrawer
          title={detail.title}
          data={detail.data}
          onClose={() => setDetail(null)}
        />
      )}

      <ImportInferencePackageSummaryDialog
        result={summary}
        onClose={() => setSummary(null)}
        onViewCatalog={(target) => {
          setSummary(null);
          if (target === "vectorStores") {
            navigate("/intelligence/vector-stores");
            return;
          }
          setActiveTab(target);
        }}
      />
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label
      className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
    >
      {label}
      <Input
        type={type}
        className="mt-1 block text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

function MultiSelectChecklist({
  label,
  values,
  options,
  emptyText,
  onToggle,
}: {
  label: string;
  values: string[];
  options: Array<{ value: string; label: string; hint?: string }>;
  emptyText: string;
  onToggle: (value: string, checked: boolean) => void;
}) {
  return (
    <fieldset className="rounded-md border border-slate-200 p-3 dark:border-slate-800">
      <legend
        className={`px-1 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {label}
      </legend>
      {options.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-2">
          {emptyText}
        </Text>
      ) : (
        <div className="mt-2 max-h-40 space-y-2 overflow-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={values.includes(option.value)}
                onChange={(event) =>
                  onToggle(option.value, event.target.checked)
                }
                aria-label={`${label}: ${option.label}`}
              />
              <span>
                <span
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  {option.label}
                </span>
                {option.hint && (
                  <span
                    className={`block text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
                    {option.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}

function uniqueOptions(
  options: Array<{ value: string; label: string; hint?: string }>,
) {
  return Array.from(
    new Map(options.map((option) => [option.value, option])).values(),
  );
}

function InferenceSetupSection({
  activeTab,
  loading,
  error,
  message,
  spaceId,
  profileForm,
  setProfileForm,
  credentialForm,
  setCredentialForm,
  grantDraft,
  setGrantDraft,
  grantSpaces,
  grantDomains,
  grantLoadError,
  grantCreateOpen,
  endpoints,
  models,
  capabilities,
  policyDraft,
  setPolicyDraft,
  policySpaces,
  policyDomains,
  policyLoadError,
  policyCreateOpen,
  profiles,
  credentials,
  grants,
  policies,
  canManageProfiles,
  canManageCredentials,
  canManageGrants,
  canManagePolicies,
  onCreateProfile,
  onCreateCredential,
  onRevokeCredential,
  onStartCreateGrant,
  onCancelCreateGrant,
  onCreateGrant,
  onStartCreatePolicy,
  onCancelCreatePolicy,
  onCreatePolicy,
  onExpireGrant,
  onExpirePolicy,
  onViewDetails,
}: {
  activeTab: InferenceTab;
  loading: boolean;
  error: string;
  message: string;
  spaceId: string;
  profileForm: ProfileDraft;
  setProfileForm: (
    value: ProfileDraft | ((current: ProfileDraft) => ProfileDraft),
  ) => void;
  credentialForm: CredentialDraft;
  setCredentialForm: (
    value: CredentialDraft | ((current: CredentialDraft) => CredentialDraft),
  ) => void;
  grantDraft: GrantDraft;
  setGrantDraft: (
    value: GrantDraft | ((current: GrantDraft) => GrantDraft),
  ) => void;
  grantSpaces: SpaceInfo[];
  grantDomains: DomainInfo[];
  grantLoadError: string;
  grantCreateOpen: boolean;
  endpoints: ModelEndpointInfo[];
  models: InferenceModelInfo[];
  capabilities: ModelEndpointCapabilityInfo[];
  policyDraft: PolicyDraft;
  setPolicyDraft: (
    value: PolicyDraft | ((current: PolicyDraft) => PolicyDraft),
  ) => void;
  policySpaces: SpaceInfo[];
  policyDomains: DomainInfo[];
  policyLoadError: string;
  policyCreateOpen: boolean;
  profiles: InferenceProfileInfo[];
  credentials: InferenceCredentialInfo[];
  grants: CredentialGrantInfo[];
  policies: InferencePolicyInfo[];
  canManageProfiles: boolean;
  canManageCredentials: boolean;
  canManageGrants: boolean;
  canManagePolicies: boolean;
  onCreateProfile: () => void;
  onCreateCredential: () => void;
  onRevokeCredential: (credential: InferenceCredentialInfo) => void;
  onStartCreateGrant: () => void;
  onCancelCreateGrant: () => void;
  onCreateGrant: () => void;
  onStartCreatePolicy: () => void;
  onCancelCreatePolicy: () => void;
  onCreatePolicy: () => void;
  onExpireGrant: (grantId: string) => void;
  onExpirePolicy: (policyId: string) => void;
  onViewDetails: (title: string, data: unknown) => void;
}) {
  const profileOperation = profileForm.operation.trim().toLowerCase();
  const capableModelIds = new Set(
    capabilities
      .filter(
        (capability) =>
          capability.enabled &&
          (!profileOperation ||
            capability.operation.toLowerCase() === profileOperation),
      )
      .map((capability) => capability.modelId),
  );
  const profileModelOptionsFromModels = models
    .filter(
      (model) =>
        capableModelIds.size === 0 || capableModelIds.has(model.modelId),
    )
    .map((model) => ({
      value: model.key || model.modelId,
      label: model.key || model.modelName || model.modelId,
      hint: [
        model.kind,
        model.inputModalities?.length
          ? `in:${model.inputModalities.map((value) => formatEnumLabel(value)).join("+")}`
          : "",
        model.outputModalities?.length
          ? `out:${model.outputModalities.map((value) => formatEnumLabel(value)).join("+")}`
          : "",
        model.dimensions ? `${model.dimensions} dims` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const profileModelOptions =
    profileModelOptionsFromModels.length > 0
      ? profileModelOptionsFromModels
      : uniqueOptions(
          capabilities
            .filter(
              (capability) =>
                capability.enabled &&
                (!profileOperation ||
                  capability.operation.toLowerCase() === profileOperation) &&
                (capability.modelKey || capability.modelId),
            )
            .map((capability) => ({
              value: capability.modelKey || capability.modelId,
              label: capability.modelKey || capability.modelId,
              hint: formatEnumLabel(capability.operation),
            })),
        );
  const selectedProfileModelIds = new Set(
    models
      .filter((model) =>
        profileForm.modelRefs.includes(model.key || model.modelId),
      )
      .map((model) => model.modelId),
  );
  const capableEndpointIds = new Set(
    capabilities
      .filter(
        (capability) =>
          capability.enabled &&
          (!profileOperation ||
            capability.operation.toLowerCase() === profileOperation) &&
          (selectedProfileModelIds.size === 0 ||
            selectedProfileModelIds.has(capability.modelId)),
      )
      .map((capability) => capability.modelEndpointId),
  );
  const profileEndpointOptions = endpoints
    .filter(
      (endpoint) =>
        endpoint.enabled &&
        (!profileOperation ||
          endpoint.operations.some(
            (operation) => operation.toLowerCase() === profileOperation,
          )) &&
        (capabilities.length === 0 ||
          capableEndpointIds.has(endpoint.modelEndpointId)),
    )
    .map((endpoint) => ({
      value: endpoint.key || endpoint.modelEndpointId,
      label: endpoint.key || endpoint.name || endpoint.modelEndpointId,
      hint: [endpoint.name, endpoint.privacyClass].filter(Boolean).join(" · "),
    }));
  const toggleProfileRef = (
    field: "endpointRefs" | "modelRefs",
    value: string,
    checked: boolean,
  ) =>
    setProfileForm((current) => ({
      ...current,
      [field]: checked
        ? Array.from(new Set([...current[field], value]))
        : current[field].filter((item) => item !== value),
    }));
  return (
    <div className="space-y-4">
      <ErrorGroup
        errors={
          error
            ? [
                {
                  id: "inference.access.form",
                  source: "Access changes",
                  message: error,
                },
              ]
            : []
        }
      />
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          {message}
        </div>
      )}
      {activeTab === "profiles" && canManageProfiles && (
        <div
          className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
        >
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create profile
          </Text>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <Field
              label="Key"
              value={profileForm.key}
              onChange={(key) =>
                setProfileForm((current) => ({ ...current, key }))
              }
            />
            <Field
              label="Display name"
              value={profileForm.displayName}
              onChange={(displayName) =>
                setProfileForm((current) => ({ ...current, displayName }))
              }
            />
            <SelectField
              label="Operation"
              value={profileForm.operation}
              onChange={(operation) =>
                setProfileForm((current) => ({
                  ...current,
                  operation,
                  endpointRefs: [],
                  modelRefs: [],
                }))
              }
              options={inferenceOperationOptions}
              placeholder="Choose an operation"
            />
            <Field
              label="Purpose"
              value={profileForm.purpose}
              onChange={(purpose) =>
                setProfileForm((current) => ({ ...current, purpose }))
              }
            />
            <MultiSelectChecklist
              label="Endpoint refs"
              values={profileForm.endpointRefs}
              options={profileEndpointOptions}
              emptyText="No matching enabled endpoints."
              onToggle={(value, checked) =>
                toggleProfileRef("endpointRefs", value, checked)
              }
            />
            <MultiSelectChecklist
              label="Model refs"
              values={profileForm.modelRefs}
              options={profileModelOptions}
              emptyText="No matching models for the selected operation."
              onToggle={(value, checked) =>
                toggleProfileRef("modelRefs", value, checked)
              }
            />
            <Field
              label="Max output tokens"
              value={profileForm.maxOutputTokens}
              onChange={(maxOutputTokens) =>
                setProfileForm((current) => ({ ...current, maxOutputTokens }))
              }
            />
          </div>
          <Button
            className="mt-3"
            onClick={onCreateProfile}
            disabled={loading || !spaceId}
          >
            Create profile
          </Button>
        </div>
      )}
      {activeTab === "credentials" && canManageCredentials && (
        <CredentialCreatePanel
          draft={credentialForm}
          setDraft={setCredentialForm}
          endpoints={endpoints}
          loading={loading}
          onCreateCredential={onCreateCredential}
        />
      )}
      {activeTab === "grants" && canManageGrants && grantCreateOpen && (
        <GrantCreatePanel
          draft={grantDraft}
          setDraft={setGrantDraft}
          spaces={grantSpaces}
          domains={grantDomains}
          domainError={grantLoadError}
          models={models}
          endpoints={endpoints}
          capabilities={capabilities}
          credentials={credentials}
          loading={loading}
          onCreateGrant={onCreateGrant}
          onCancel={onCancelCreateGrant}
        />
      )}
      {activeTab === "policies" && canManagePolicies && policyCreateOpen && (
        <PolicyCreatePanel
          draft={policyDraft}
          setDraft={setPolicyDraft}
          spaces={policySpaces}
          domains={policyDomains}
          domainError={policyLoadError}
          loading={loading}
          onCreatePolicy={onCreatePolicy}
          onCancel={onCancelCreatePolicy}
        />
      )}
      {!(
        (activeTab === "grants" && grantCreateOpen) ||
        (activeTab === "policies" && policyCreateOpen)
      ) && (
        <div
          className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
        >
          {activeTab === "grants" && canManageGrants && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <Text
                  as="h3"
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  Credential grants
                </Text>
                <Text intent="muted" size="sm" className="mt-1">
                  Filter existing grants, or create a new credential grant on a
                  dedicated form.
                </Text>
              </div>
              <Button onClick={onStartCreateGrant}>Create grant</Button>
            </div>
          )}
          {activeTab === "policies" && canManagePolicies && (
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <div>
                <Text
                  as="h3"
                  className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                >
                  Inference policies
                </Text>
                <Text intent="muted" size="sm" className="mt-1">
                  Filter existing policies, or create a new inference policy on
                  a dedicated form.
                </Text>
              </div>
              <Button onClick={onStartCreatePolicy}>Create policy</Button>
            </div>
          )}
          {loading ? (
            <Text intent="muted" className="p-6">
              Loading inference setup resources…
            </Text>
          ) : activeTab === "profiles" ? (
            <SimpleTable
              rows={profiles}
              columns={["key", "operation", "purpose", "enabled"]}
              idKey="inferenceProfileId"
              onView={onViewDetails}
            />
          ) : activeTab === "credentials" ? (
            <SimpleTable
              rows={credentials}
              columns={[
                "key",
                "modelEndpointKey",
                "ownerType",
                "authType",
                "status",
                "secretSuffix",
              ]}
              idKey="credentialId"
              onView={onViewDetails}
              onRevokeCredential={
                canManageCredentials ? onRevokeCredential : undefined
              }
            />
          ) : activeTab === "grants" ? (
            <SimpleTable
              rows={grants}
              columns={[
                "credentialId",
                "operations",
                "modelEndpointKey",
                "modelKey",
                "state",
              ]}
              idKey="credentialGrantId"
              onView={onViewDetails}
              onExpire={canManageGrants ? onExpireGrant : undefined}
            />
          ) : activeTab === "policies" ? (
            <SimpleTable
              rows={policies}
              columns={["effect", "operations", "action", "state", "reason"]}
              idKey="inferencePolicyId"
              onView={onViewDetails}
              onExpire={canManagePolicies ? onExpirePolicy : undefined}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function CredentialCreatePanel({
  draft,
  setDraft,
  endpoints,
  loading,
  onCreateCredential,
}: {
  draft: CredentialDraft;
  setDraft: (
    value: CredentialDraft | ((current: CredentialDraft) => CredentialDraft),
  ) => void;
  endpoints: ModelEndpointInfo[];
  loading: boolean;
  onCreateCredential: () => void;
}) {
  const enabledEndpoints = endpoints.filter((endpoint) => endpoint.enabled);
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <Text
        as="h3"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        Create credential
      </Text>
      <Text intent="muted" size="sm" className="mt-1">
        Paste the API key once. The key is sent to the daemon and will not be
        displayed again.
      </Text>
      {enabledEndpoints.length === 0 && (
        <div className="mt-3">
          <Alert>
            No enabled endpoints are available. Import an inference package
            before creating a credential.
          </Alert>
        </div>
      )}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Field
          label="Credential key"
          value={draft.key}
          onChange={(key) => setDraft((current) => ({ ...current, key }))}
        />
        <SelectField
          label="Endpoint"
          value={draft.modelEndpointId}
          onChange={(modelEndpointId) =>
            setDraft((current) => ({ ...current, modelEndpointId }))
          }
          options={enabledEndpoints.map((endpoint) => ({
            value: endpoint.modelEndpointId,
            label: endpoint.key || endpoint.modelEndpointId,
          }))}
          placeholder="Choose an endpoint"
          disabled={enabledEndpoints.length === 0}
        />
        <Field
          label="API key"
          type="password"
          value={draft.secretValue}
          onChange={(secretValue) =>
            setDraft((current) => ({ ...current, secretValue }))
          }
        />
      </div>
      <label
        className={`mt-3 flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
      >
        <input
          type="checkbox"
          checked={draft.isDefault}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              isDefault: event.target.checked,
            }))
          }
        />
        Make default
      </label>
      <Button
        className="mt-3"
        onClick={onCreateCredential}
        disabled={
          loading ||
          !draft.key.trim() ||
          !draft.modelEndpointId ||
          !draft.secretValue.trim()
        }
      >
        Create credential
      </Button>
    </div>
  );
}

function PolicyCreatePanel({
  draft,
  setDraft,
  spaces,
  domains,
  domainError,
  loading,
  onCreatePolicy,
  onCancel,
}: {
  draft: PolicyDraft;
  setDraft: (
    value: PolicyDraft | ((current: PolicyDraft) => PolicyDraft),
  ) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  domainError: string;
  loading: boolean;
  onCreatePolicy: () => void;
  onCancel: () => void;
}) {
  const operationOptions = ["chat", "summarize", "classify", "embeddings"];
  function update(patch: Partial<PolicyDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function toggleOperation(operation: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      operations: checked
        ? Array.from(new Set([...current.operations, operation]))
        : current.operations.filter((item) => item !== operation),
    }));
  }
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create policy
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Choose the scope where inference is allowed, denied, or restricted.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      {domainError && (
        <div className="mt-3">
          <Alert>{domainError}</Alert>
        </div>
      )}
      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Scope
          </Text>
          <SelectField
            label="Space"
            value={draft.spaceId}
            onChange={(spaceId) => update({ spaceId, domainId: "" })}
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
              hint: space.spaceId,
            }))}
            placeholder="Choose a space"
          />
          <SelectField
            label="Domain"
            value={draft.domainId}
            onChange={(domainId) => update({ domainId })}
            options={domains.map((domain) => ({
              value: domain.domainId,
              label: domain.name || domain.key || domain.domainId,
              hint: domain.domainId,
            }))}
            placeholder={
              draft.spaceId ? "Choose a domain" : "Select a space first"
            }
            disabled={!draft.spaceId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeDescendants}
              onChange={(event) =>
                update({ includeDescendants: event.target.checked })
              }
            />
            Include descendants
          </label>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Policy
          </Text>
          <SelectField
            label="Effect"
            value={draft.effect}
            onChange={(effect) => update({ effect })}
            options={["allow", "deny", "restrict"].map((effect) => ({
              value: effect,
              label: effect,
            }))}
            placeholder="Choose an effect"
          />
          <div>
            <Text
              size="sm"
              className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              Operations
            </Text>
            <div className="mt-2 flex flex-wrap gap-2">
              {operationOptions.map((operation) => (
                <label
                  key={operation}
                  className={`flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm ${themeClasses.text.parts.bodyLight} dark:border-slate-800 dark:bg-slate-950 ${themeClasses.text.parts.darkSecondary}`}
                >
                  <input
                    type="checkbox"
                    checked={draft.operations.includes(operation)}
                    onChange={(event) =>
                      toggleOperation(operation, event.target.checked)
                    }
                  />
                  {operation}
                </label>
              ))}
            </div>
          </div>
          <Field
            label="Reason"
            value={draft.reason}
            onChange={(reason) => update({ reason })}
          />
        </div>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onCreatePolicy}
          disabled={
            loading ||
            !draft.spaceId ||
            !draft.effect ||
            draft.operations.length === 0
          }
        >
          Create policy
        </Button>
      </div>
    </div>
  );
}

function GrantCreatePanel({
  draft,
  setDraft,
  spaces,
  domains,
  domainError,
  models,
  endpoints,
  capabilities,
  credentials,
  loading,
  onCreateGrant,
  onCancel,
}: {
  draft: GrantDraft;
  setDraft: (value: GrantDraft | ((current: GrantDraft) => GrantDraft)) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  domainError: string;
  models: InferenceModelInfo[];
  endpoints: ModelEndpointInfo[];
  capabilities: ModelEndpointCapabilityInfo[];
  credentials: InferenceCredentialInfo[];
  loading: boolean;
  onCreateGrant: () => void;
  onCancel: () => void;
}) {
  const selectedModel = models.find((model) => model.modelId === draft.modelId);
  const endpointIdsForModel = new Set(
    capabilities
      .filter((capability) => capability.modelId === draft.modelId)
      .map((capability) => capability.modelEndpointId),
  );
  const filteredEndpoints = draft.modelId
    ? endpoints.filter((endpoint) =>
        endpointIdsForModel.has(endpoint.modelEndpointId),
      )
    : endpoints;
  const operationCapabilities = capabilities.filter(
    (capability) =>
      capability.modelId === draft.modelId &&
      capability.modelEndpointId === draft.endpointId,
  );
  const operationOptions = Array.from(
    new Map(
      operationCapabilities.map((capability) => [
        capability.operation,
        capability,
      ]),
    ).values(),
  );
  const filteredCredentials = credentials.filter(
    (credential) =>
      (!draft.endpointId || credential.modelEndpointId === draft.endpointId) &&
      (draft.includeInactive ||
        credential.status === "active" ||
        credential.status === "ACTIVE"),
  );
  const selectedSpace = spaces.find((space) => space.spaceId === draft.spaceId);
  const selectedDomain = domains.find(
    (domain) => domain.domainId === draft.domainId,
  );
  const selectedEndpoint = endpoints.find(
    (endpoint) => endpoint.modelEndpointId === draft.endpointId,
  );
  const selectedCredential = credentials.find(
    (credential) => credential.credentialId === draft.credentialId,
  );

  function update(patch: Partial<GrantDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }
  function toggleOperation(operation: string, checked: boolean) {
    setDraft((current) => ({
      ...current,
      operations: checked
        ? Array.from(new Set([...current.operations, operation]))
        : current.operations.filter((item) => item !== operation),
    }));
  }

  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Create grant
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Select readable resources; Console sends stable IDs/refs to mycel.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
      </div>
      {domainError && (
        <div className="mt-3">
          <Alert>{domainError}</Alert>
        </div>
      )}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Scope
          </Text>
          <SelectField
            label="Space"
            value={draft.spaceId}
            onChange={(spaceId) => update({ spaceId, domainId: "" })}
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
              hint: space.spaceId,
            }))}
            placeholder="Choose a space"
          />
          <SelectField
            label="Domain"
            value={draft.domainId}
            onChange={(domainId) => update({ domainId })}
            options={domains.map((domain) => ({
              value: domain.domainId,
              label: domain.name || domain.key || domain.domainId,
              hint: domain.domainId,
            }))}
            placeholder={
              draft.spaceId ? "Choose a domain" : "Select a space first"
            }
            disabled={!draft.spaceId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeDescendants}
              onChange={(event) =>
                update({ includeDescendants: event.target.checked })
              }
            />
            Include descendants
          </label>
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Model binding
          </Text>
          <SelectField
            label="Model"
            value={draft.modelId}
            onChange={(modelId) =>
              update({
                modelId,
                endpointId: "",
                credentialId: "",
                operations: [],
              })
            }
            options={models.map((model) => ({
              value: model.modelId,
              label: model.key || model.modelId,
              hint: [
                model.kind,
                model.inputModalities?.length
                  ? `in:${model.inputModalities.map((value) => formatEnumLabel(value)).join("+")}`
                  : "",
                model.outputModalities?.length
                  ? `out:${model.outputModalities.map((value) => formatEnumLabel(value)).join("+")}`
                  : "",
                model.dimensions ? `${model.dimensions} dims` : "",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder="Choose a model"
          />
          <SelectField
            label="Endpoint"
            value={draft.endpointId}
            onChange={(endpointId) => {
              const ops = capabilities
                .filter(
                  (capability) =>
                    capability.modelId === draft.modelId &&
                    capability.modelEndpointId === endpointId &&
                    capability.enabled,
                )
                .map((capability) => capability.operation)
                .filter(Boolean);
              update({
                endpointId,
                credentialId: "",
                operations: Array.from(new Set(ops)),
              });
            }}
            options={filteredEndpoints.map((endpoint) => ({
              value: endpoint.modelEndpointId,
              label: endpoint.key || endpoint.modelEndpointId,
              hint: [
                endpoint.name,
                endpoint.enabled ? "enabled" : "disabled",
                endpoint.privacyClass,
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder={
              draft.modelId ? "Choose an endpoint" : "Select a model first"
            }
            disabled={!draft.modelId}
          />
          <OperationCheckboxGroup
            capabilities={operationOptions}
            selected={draft.operations}
            onToggle={toggleOperation}
          />
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Credential
          </Text>
          <SelectField
            label="Credential"
            value={draft.credentialId}
            onChange={(credentialId) => update({ credentialId })}
            options={filteredCredentials.map((credential) => ({
              value: credential.credentialId,
              label:
                credential.key ||
                credential.displayName ||
                credential.credentialId,
              hint: [
                credential.displayName,
                credential.ownerType,
                credential.status,
                credential.isDefault ? "default" : "",
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
            placeholder={
              draft.endpointId
                ? "Choose a credential"
                : "Select an endpoint first"
            }
            disabled={!draft.endpointId}
          />
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.includeInactive}
              onChange={(event) =>
                update({ includeInactive: event.target.checked })
              }
            />
            Include inactive credentials
          </label>
          {draft.endpointId && filteredCredentials.length === 0 && (
            <Text intent="muted" size="sm">
              No credential is available for this endpoint. Create a credential
              first, then return to Grants.
            </Text>
          )}
        </div>
        <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <Text
            as="h4"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            Grant options
          </Text>
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.allowBackgroundUse}
              onChange={(event) =>
                update({ allowBackgroundUse: event.target.checked })
              }
            />
            Allow automation/background use
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
          >
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(event) => update({ isDefault: event.target.checked })}
            />
            Default grant
          </label>
          <Field
            label="Priority"
            value={draft.priority}
            type="number"
            onChange={(priority) => update({ priority })}
          />
        </div>
      </div>
      <details
        className="mt-4 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700"
        open={draft.advancedOpen}
        onToggle={(event) => update({ advancedOpen: event.currentTarget.open })}
      >
        <summary
          className={`cursor-pointer text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
        >
          Advanced IDs/refs
        </summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Field
            label="Credential ref"
            value={draft.credentialRef}
            onChange={(credentialRef) => update({ credentialRef })}
          />
          <Field
            label="Endpoint ref"
            value={draft.endpointRef}
            onChange={(endpointRef) => update({ endpointRef })}
          />
          <Field
            label="Model ref"
            value={draft.modelRef}
            onChange={(modelRef) => update({ modelRef })}
          />
          <Field
            label="Semantic rule ID"
            value={draft.semanticRuleId}
            onChange={(semanticRuleId) => update({ semanticRuleId })}
          />
          <Field
            label="Node ID"
            value={draft.nodeId}
            onChange={(nodeId) => update({ nodeId })}
          />
        </div>
      </details>
      <GrantReviewSummary
        space={selectedSpace}
        domain={selectedDomain}
        model={selectedModel}
        endpoint={selectedEndpoint}
        credential={selectedCredential}
        operations={draft.operations}
        allowBackgroundUse={draft.allowBackgroundUse}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={onCreateGrant}
          disabled={
            loading ||
            !draft.spaceId ||
            (!draft.credentialId && !draft.credentialRef) ||
            (!draft.endpointId && !draft.endpointRef) ||
            (!draft.modelId && !draft.modelRef) ||
            draft.operations.length === 0
          }
        >
          Create grant
        </Button>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; hint?: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <Select
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}

function OperationCheckboxGroup({
  capabilities,
  selected,
  onToggle,
}: {
  capabilities: ModelEndpointCapabilityInfo[];
  selected: string[];
  onToggle: (operation: string, checked: boolean) => void;
}) {
  if (capabilities.length === 0)
    return (
      <Text intent="muted" size="sm">
        Select a model and endpoint to choose operations.
      </Text>
    );
  return (
    <div>
      <Text
        size="sm"
        className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        Operations
      </Text>
      <div className="mt-2 flex flex-wrap gap-2">
        {capabilities.map((capability) => (
          <label
            key={capability.modelEndpointCapabilityId}
            title={capability.modelEndpointCapabilityId}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${capability.enabled ? "border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100" : `border-slate-200 bg-slate-100 ${themeClasses.text.parts.mutedLight} dark:border-slate-800 dark:bg-slate-900 ${themeClasses.text.parts.darkMuted}`}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(capability.operation)}
              disabled={!capability.enabled}
              onChange={(event) =>
                onToggle(capability.operation, event.target.checked)
              }
            />
            {formatEnumLabel(capability.operation, "Unspecified")}
          </label>
        ))}
      </div>
    </div>
  );
}

function GrantReviewSummary({
  space,
  domain,
  model,
  endpoint,
  credential,
  operations,
  allowBackgroundUse,
}: {
  space?: SpaceInfo;
  domain?: DomainInfo;
  model?: InferenceModelInfo;
  endpoint?: ModelEndpointInfo;
  credential?: InferenceCredentialInfo;
  operations: string[];
  allowBackgroundUse: boolean;
}) {
  return (
    <div
      className={`mt-4 rounded-lg bg-slate-50 p-3 text-sm ${themeClasses.text.parts.bodyLight} dark:bg-slate-950 ${themeClasses.text.parts.darkSecondary}`}
    >
      <strong>Review:</strong> Grant credential{" "}
      <span className="font-medium">{credential?.key || "—"}</span> for space{" "}
      <span className="font-medium">
        {space?.name || space?.spaceId || "—"}
      </span>
      {domain ? (
        <>
          {" "}
          / domain{" "}
          <span className="font-medium">{domain.name || domain.key}</span>
        </>
      ) : null}
      . Endpoint <span className="font-medium">{endpoint?.key || "—"}</span>,
      model <span className="font-medium">{model?.key || "—"}</span>, operations{" "}
      <span className="font-medium">{operations.join(", ") || "—"}</span>.{" "}
      {allowBackgroundUse
        ? "Background/automation use allowed."
        : "Background/automation use not allowed."}
    </div>
  );
}

function SimpleTable({
  rows,
  columns,
  idKey,
  onView,
  onExpire,
  onRevokeCredential,
}: {
  rows: any[];
  columns: string[];
  idKey: string;
  onView: (title: string, data: unknown) => void;
  onExpire?: (id: string) => void;
  onRevokeCredential?: (credential: InferenceCredentialInfo) => void;
}) {
  if (rows.length === 0)
    return (
      <Text intent="muted" className="p-6">
        No resources found.
      </Text>
    );
  return (
    <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
      <thead className="bg-slate-50 dark:bg-slate-950">
        <tr>
          {columns.map((column) => (
            <TableHead
              key={column}
              className={`px-4 py-3 text-left font-medium ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
            >
              {displayColumn(column)}
            </TableHead>
          ))}
          <TableHead
            className={`px-4 py-3 text-left font-medium ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
          >
            Actions
          </TableHead>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {rows.map((row, index) => {
          const id = String(row[idKey] ?? index);
          const status = String(row.status ?? "").toLowerCase();
          return (
            <tr key={`${id}-${index}`}>
              {columns.map((column) => (
                <td
                  key={column}
                  className={`px-4 py-3 ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkSecondary}`}
                >
                  {formatCell(row, column)}
                </td>
              ))}
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => onView(id, row)}>
                    View
                  </Button>
                  {onExpire && (
                    <Button variant="secondary" onClick={() => onExpire(id)}>
                      Expire
                    </Button>
                  )}
                  {onRevokeCredential && status !== "revoked" && (
                    <Button
                      variant="secondary"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                      onClick={() =>
                        onRevokeCredential(row as InferenceCredentialInfo)
                      }
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function formatCell(row: Record<string, unknown>, column: string): string {
  const value =
    row[column] ||
    (column === "modelEndpointKey"
      ? row.modelEndpointId
      : column === "modelKey"
        ? row.modelId
        : undefined);
  if (column === "secretSuffix") return value ? `••••${value}` : "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value ?? "—");
}

function displayColumn(column: string): string {
  const labels: Record<string, string> = {
    modelEndpointKey: "Endpoint",
    modelKey: "Model",
    credentialId: "Credential ID",
    secretSuffix: "Key suffix",
  };
  return labels[column] || column;
}

function OpenAIWizard({
  form,
  setForm,
  loading,
  onClose,
  onSubmit,
}: {
  form: {
    spaceId: string;
    domainId: string;
    profileKey: string;
    credentialKey: string;
    secretValue: string;
    modelRef: string;
    operation: string;
    purpose: string;
  };
  setForm: (
    value: typeof form | ((current: typeof form) => typeof form),
  ) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className={`w-full max-w-2xl rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              Configure OpenAI
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Creates a credential from a pasted API key, grant, policy, and
              automation profile. The API key is never stored in package
              metadata or displayed after submission.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field
            label="Space ID"
            value={form.spaceId}
            onChange={(spaceId) =>
              setForm((current) => ({ ...current, spaceId }))
            }
          />
          <Field
            label="Domain ID"
            value={form.domainId}
            onChange={(domainId) =>
              setForm((current) => ({ ...current, domainId }))
            }
          />
          <Field
            label="Profile key"
            value={form.profileKey}
            onChange={(profileKey) =>
              setForm((current) => ({ ...current, profileKey }))
            }
          />
          <Field
            label="Credential key"
            value={form.credentialKey}
            onChange={(credentialKey) =>
              setForm((current) => ({ ...current, credentialKey }))
            }
          />
          <Field
            label="OpenAI API key"
            type="password"
            value={form.secretValue}
            onChange={(secretValue) =>
              setForm((current) => ({ ...current, secretValue }))
            }
          />
          <Field
            label="Model ref"
            value={form.modelRef}
            onChange={(modelRef) =>
              setForm((current) => ({ ...current, modelRef }))
            }
          />
          <Field
            label="Operation"
            value={form.operation}
            onChange={(operation) =>
              setForm((current) => ({ ...current, operation }))
            }
          />
          <Field
            label="Purpose"
            value={form.purpose}
            onChange={(purpose) =>
              setForm((current) => ({ ...current, purpose }))
            }
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || !form.secretValue.trim()}
          >
            {loading ? "Configuring…" : "Create OpenAI setup"}
          </Button>
        </div>
      </div>
    </div>
  );
}
