import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  ConfirmationDialog,
  ErrorGroup,
  errorMessage,
  Tabs,
  Text,
  themeClasses,
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
  CredentialResponse,
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
import { CatalogDetailDrawer } from "../components/CatalogDetailDrawer";
import { InferenceSetupSection } from "../components/InferenceSetupSection";
import { OpenAIWizard } from "../components/OpenAIWizard";
import { SelectField } from "../components/InferenceFormControls";
import type {
  CredentialDraft,
  GrantDraft,
  InferenceSection,
  InferenceTab,
  ModelCatalogTab,
  PolicyDraft,
  ProfileDraft,
} from "../model/pageTypes";
import {
  generativeInferenceOperationOptions,
  inferenceOperationOptions,
  isModelCatalogKind,
  modelCatalogKind,
  modelCatalogTab,
} from "../model/pageTypes";

const accessTabs: Array<{
  id: InferenceTab;
  label: string;
}> = [
  { id: "credentials", label: "Credentials" },
  { id: "grants", label: "Grants" },
  { id: "policies", label: "Policies" },
  { id: "profiles", label: "Profiles" },
];

const catalogTabs: Array<{
  id: ModelCatalogTab;
  label: string;
}> = [
  { id: "generative", label: "Generative" },
  { id: "embedding", label: "Embedding" },
  { id: "other", label: "Other" },
  { id: "endpoints", label: "Endpoints" },
  { id: "packages", label: "Import history" },
];

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
  ) => Promise<CredentialResponse>;
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
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [postImportRefreshing, setPostImportRefreshing] = useState(false);
  const [postImportRefreshError, setPostImportRefreshError] = useState("");
  const [accessActiveTab, setAccessActiveTab] =
    useState<InferenceTab>("credentials");
  const [endpoints, setEndpoints] = useState<ModelEndpointInfo[]>([]);
  const [models, setModels] = useState<InferenceModelInfo[]>([]);
  const [capabilities, setCapabilities] = useState<
    ModelEndpointCapabilityInfo[]
  >([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [catalogRefreshKey, setCatalogRefreshKey] = useState(0);
  const catalogRequestId = useRef(0);
  const [includeDisabledCatalog, setIncludeDisabledCatalog] = useState(false);
  const [operationFilter, setOperationFilter] = useState("");
  const modelCounts = useMemo(
    () => countModelsByKind(models, includeDisabledCatalog),
    [includeDisabledCatalog, models],
  );
  const selectedCatalogTab = modelCatalogTab(searchParams.get("tab"));
  const activeTab =
    section === "access" ? accessActiveTab : selectedCatalogTab;
  const availableTabs = useMemo(
    () =>
      section === "access"
        ? accessTabs
        : countedCatalogTabs(modelCounts, selectedCatalogTab),
    [modelCounts, section, selectedCatalogTab],
  );
  const setActiveTab = useCallback(
    (tab: InferenceTab) => {
      if (section === "access") {
        setAccessActiveTab(tab);
        return;
      }
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next);
    },
    [searchParams, section, setSearchParams],
  );
  const visibleCapabilities = useMemo(
    () => capabilitiesForCatalogTab(activeTab, capabilities, operationFilter),
    [activeTab, capabilities, operationFilter],
  );
  const visibleModels = useMemo(
    () =>
      modelsForCatalogTab(
        activeTab,
        models,
        visibleCapabilities,
        operationFilter,
        includeDisabledCatalog,
      ),
    [
      activeTab,
      includeDisabledCatalog,
      models,
      operationFilter,
      visibleCapabilities,
    ],
  );
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
  const [revokeCredential, setRevokeCredential] =
    useState<InferenceCredentialInfo | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileDraft>({
    key: "summarize-page",
    displayName: "Summarize page",
    operation: "chat",
    purpose: "automation",
    modelRefs: ["openai/gpt-5.6-terra"],
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
    modelRef: "openai/gpt-5.6-terra",
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
  }, [activeTab, availableTabs, setActiveTab]);

  const loadPackages = useCallback(
    async ({
      append = false,
      pageToken = "",
      reportError = true,
    }: {
      append?: boolean;
      pageToken?: string;
      reportError?: boolean;
    } = {}) => {
      if (reportError) setError("");
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
        return "";
      } catch (err) {
        const message = errorMessage(
          err,
          "Failed to load inference packages",
        );
        if (reportError) setError(message);
        return message;
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

  const loadCatalog = useCallback(
    async (tab: InferenceTab) => {
      const requestId = ++catalogRequestId.current;
      setCatalogLoading(true);
      setCatalogError("");
      try {
        if (tab === "endpoints") {
          const [endpointsResponse, modelsResponse] = await Promise.all([
            listModelEndpointsService({
              pageSize: 100,
              includeDisabled: includeDisabledCatalog,
            }),
            loadAllModels(listModelsService),
          ]);
          if (requestId === catalogRequestId.current) {
            setEndpoints(endpointsResponse.modelEndpoints);
            setModels(modelsResponse.models);
          }
        } else if (isModelCatalogKind(tab)) {
          const capabilityOperation =
            tab === "generative" ? operationFilter : "";
          const [modelsResponse, capabilitiesResponse] = await Promise.all([
            loadAllModels(listModelsService),
            loadAllCapabilities(listModelEndpointCapabilitiesService, {
              operation: capabilityOperation,
              includeDisabled: includeDisabledCatalog,
            }),
          ]);
          if (requestId === catalogRequestId.current) {
            setModels(modelsResponse.models);
            setCapabilities(capabilitiesResponse.modelEndpointCapabilities);
          }
        } else if (tab === "packages") {
          const modelsResponse = await loadAllModels(listModelsService);
          if (requestId === catalogRequestId.current) {
            setModels(modelsResponse.models);
          }
        }
        return "";
      } catch (err) {
        const message = errorMessage(
          err,
          "Failed to load inference catalog",
        );
        if (requestId === catalogRequestId.current) setCatalogError(message);
        return message;
      } finally {
        if (requestId === catalogRequestId.current) setCatalogLoading(false);
      }
    },
    [
      includeDisabledCatalog,
      listModelEndpointCapabilitiesService,
      listModelEndpointsService,
      listModelsService,
      operationFilter,
    ],
  );

  useEffect(() => {
    if (section !== "models") return;
    void loadCatalog(activeTab);
    return () => {
      catalogRequestId.current += 1;
    };
  }, [activeTab, catalogRefreshKey, loadCatalog, section]);

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

  function requestRevokeCredential(credential: InferenceCredentialInfo) {
    setSetupError("");
    setSetupMessage("");
    setRevokeCredential(credential);
  }

  async function confirmRevokeCredential() {
    if (!revokeCredential) return;
    const credential = revokeCredential;
    const label = credential.key || credential.credentialId;
    setSetupLoading(true);
    setSetupError("");
    setSetupMessage("");
    try {
      const response = await setInferenceCredentialStatusService({
        credential: credential.key,
        credentialId: credential.credentialId,
        status: "revoked",
      });
      const responseStatus = response.credential?.status?.toLowerCase();
      if (responseStatus !== "revoked") {
        throw new Error(
          `Daemon did not confirm revoked status for credential ${label}.`,
        );
      }
      setRevokeCredential(null);
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

  async function refreshPostImportData() {
    setPostImportRefreshing(true);
    setPostImportRefreshError("");
    try {
      const [packageError, catalogError] = await Promise.all([
        loadPackages({ reportError: false }),
        loadCatalog(activeTab),
      ]);
      const failures = [
        packageError ? `Package history: ${packageError}` : "",
        catalogError ? `Catalog: ${catalogError}` : "",
      ].filter(Boolean);
      if (failures.length > 0) {
        setPostImportRefreshError(
          `Import succeeded, but the follow-up refresh failed. ${failures.join(" ")}`,
        );
      }
    } catch (err) {
      setPostImportRefreshError(
        `Import succeeded, but the follow-up refresh failed. ${errorMessage(err, "Refresh failed")}`,
      );
    } finally {
      setPostImportRefreshing(false);
    }
  }

  async function handleImport(document: InferencePackageDocument) {
    setImporting(true);
    setError("");
    setPostImportRefreshError("");
    try {
      const result = await applyInferencePackageService(document);
      setImportOpen(false);
      setSummary(result);
      await refreshPostImportData();
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
                  : catalogLoading || setupLoading) ||
                importing ||
                postImportRefreshing
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
                disabled={importing || postImportRefreshing}
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
          {(activeTab === "generative" || activeTab === "profiles") && (
            <div className="min-w-48">
              <SelectField
                label="Filter operation"
                value={operationFilter}
                onChange={setOperationFilter}
                options={
                  activeTab === "generative"
                    ? generativeInferenceOperationOptions
                    : inferenceOperationOptions
                }
                placeholder="All operations"
              />
            </div>
          )}
          {(activeTab === "endpoints" ||
            isModelCatalogKind(activeTab) ||
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
          onRevokeCredential={requestRevokeCredential}
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
          <Text intent="muted">{catalogLoadingMessage(activeTab)}</Text>
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
      ) : isModelCatalogKind(activeTab) ? (
        <InferenceModelTable
          models={visibleModels}
          capabilities={visibleCapabilities}
          kind={activeTab}
          onViewDetails={(item) =>
            setDetail({
              title: item.key || item.modelName || "Model",
              data: item,
            })
          }
        />
      ) : null}

      {revokeCredential && (
        <ConfirmCredentialRevokeDialog
          credential={revokeCredential}
          loading={setupLoading}
          error={setupError}
          onCancel={() => setRevokeCredential(null)}
          onConfirm={() => void confirmRevokeCredential()}
        />
      )}

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
        refreshing={postImportRefreshing}
        refreshError={postImportRefreshError}
        onRetryRefresh={() => void refreshPostImportData()}
        onClose={() => {
          setSummary(null);
          setPostImportRefreshError("");
        }}
        onViewCatalog={(target) => {
          setSummary(null);
          setPostImportRefreshError("");
          if (target === "vectorStores") {
            navigate("/intelligence/vector-stores");
            return;
          }
          setActiveTab(target === "models" ? "generative" : target);
          setCatalogRefreshKey((current) => current + 1);
        }}
      />
    </section>
  );
}

type ModelKindCounts = Record<"generative" | "embedding" | "other", number>;
type ListModelsService = NonNullable<InferencePageProps["listModelsService"]>;
type ListCapabilitiesService = NonNullable<
  InferencePageProps["listModelEndpointCapabilitiesService"]
>;

async function loadAllModels(
  service: ListModelsService,
): Promise<ListModelsResponse> {
  const models: InferenceModelInfo[] = [];
  const seenPageTokens = new Set<string>();
  let pageToken = "";
  do {
    const response = await service({
      pageSize: 100,
      ...(pageToken ? { pageToken } : {}),
    });
    models.push(...response.models);
    pageToken = response.nextPageToken;
    if (pageToken && seenPageTokens.has(pageToken)) {
      throw new Error("Model catalog pagination returned a repeated page token");
    }
    if (pageToken) seenPageTokens.add(pageToken);
  } while (pageToken);
  return { models, nextPageToken: "" };
}

async function loadAllCapabilities(
  service: ListCapabilitiesService,
  input: Pick<
    ListModelEndpointCapabilitiesInput,
    "operation" | "includeDisabled"
  >,
): Promise<ListModelEndpointCapabilitiesResponse> {
  const modelEndpointCapabilities: ModelEndpointCapabilityInfo[] = [];
  const seenPageTokens = new Set<string>();
  let pageToken = "";
  do {
    const response = await service({
      ...input,
      pageSize: 500,
      ...(pageToken ? { pageToken } : {}),
    });
    modelEndpointCapabilities.push(...response.modelEndpointCapabilities);
    pageToken = response.nextPageToken;
    if (pageToken && seenPageTokens.has(pageToken)) {
      throw new Error(
        "Model capability pagination returned a repeated page token",
      );
    }
    if (pageToken) seenPageTokens.add(pageToken);
  } while (pageToken);
  return { modelEndpointCapabilities, nextPageToken: "" };
}

function countModelsByKind(
  models: InferenceModelInfo[],
  includeDisabled: boolean,
): ModelKindCounts {
  const counts: ModelKindCounts = { generative: 0, embedding: 0, other: 0 };
  for (const model of models) {
    if (!includeDisabled && model.enabled === false) continue;
    counts[modelCatalogKind(model.kind)] += 1;
  }
  return counts;
}

function countedCatalogTabs(
  counts: ModelKindCounts,
  selectedTab: ModelCatalogTab,
) {
  return catalogTabs
    .filter(
      (tab) =>
        tab.id !== "other" || counts.other > 0 || selectedTab === "other",
    )
    .map((tab) => {
      if (!isModelCatalogKind(tab.id)) return tab;
      return { ...tab, label: `${tab.label} (${counts[tab.id]})` };
    });
}

function capabilitiesForCatalogTab(
  tab: InferenceTab,
  capabilities: ModelEndpointCapabilityInfo[],
  operationFilter: string,
) {
  if (tab === "embedding") {
    return capabilities.filter(
      (capability) =>
        normalizedOperation(capability.operation) === "embeddings",
    );
  }
  if (tab !== "generative") return capabilities;
  return capabilities.filter((capability) => {
    const operation = normalizedOperation(capability.operation);
    return (
      operation !== "embeddings" &&
      (!operationFilter || operation === operationFilter)
    );
  });
}

function modelsForCatalogTab(
  tab: InferenceTab,
  models: InferenceModelInfo[],
  capabilities: ModelEndpointCapabilityInfo[],
  operationFilter: string,
  includeDisabled: boolean,
) {
  if (!isModelCatalogKind(tab)) return [];
  const matchingKind = models.filter(
    (model) =>
      modelCatalogKind(model.kind) === tab &&
      (includeDisabled || model.enabled !== false),
  );
  if (tab !== "generative" || !operationFilter) return matchingKind;
  const supportedModelIds = new Set(
    capabilities
      .filter((capability) => includeDisabled || capability.enabled)
      .map((capability) => capability.modelId),
  );
  return matchingKind.filter((model) => supportedModelIds.has(model.modelId));
}

function normalizedOperation(operation: string) {
  return operation
    .trim()
    .toLowerCase()
    .replace(/^inference_operation_/, "");
}

function catalogLoadingMessage(tab: InferenceTab) {
  if (tab === "generative") return "Loading generative models…";
  if (tab === "embedding") return "Loading embedding models…";
  if (tab === "other") return "Loading unrecognized model kinds…";
  if (tab === "endpoints") return "Loading model endpoints…";
  return "Loading inference catalog…";
}

function ConfirmCredentialRevokeDialog({
  credential,
  loading,
  error,
  onCancel,
  onConfirm,
}: {
  credential: InferenceCredentialInfo;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const label = credential.key || credential.credentialId;
  return (
    <ConfirmationDialog
      eyebrow="Revoke credential"
      title={`Revoke ${label}?`}
      details={
        <>
          <div>
            <strong>Credential:</strong> {label}
          </div>
          <div>
            <strong>Status:</strong> {credential.status || "—"}
          </div>
          <div>
            <strong>ID:</strong> {credential.credentialId}
          </div>
        </>
      }
      error={error}
      loading={loading}
      confirmLabel="Revoke credential"
      loadingLabel="Revoking…"
      intent="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      Existing grants will no longer be able to use this credential. Secret
      values are not displayed or logged.
    </ConfirmationDialog>
  );
}
