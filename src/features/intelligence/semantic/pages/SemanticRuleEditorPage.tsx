import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  Alert,
  Button,
  ConfirmationDialog,
  ErrorGroup,
  errorMessage,
  Text,
  themeClasses,
} from "../../../../components/typography";
import {
  canUseCapability,
  type ConsolePrincipalContext,
} from "../../../console";
import {
  createSemanticRule as defaultCreateSemanticRule,
  getSemanticRule as defaultGetSemanticRule,
  listDomains as defaultListDomains,
  listInferenceProfiles as defaultListInferenceProfiles,
  listSemanticRules as defaultListSemanticRules,
  listSpaces as defaultListSpaces,
  listVectorStores as defaultListVectorStores,
  updateSemanticRule as defaultUpdateSemanticRule,
  validateSemanticRule as defaultValidateSemanticRule,
} from "../../../../services/adminService";
import type {
  DomainInfo,
  ListDomainsInput,
  ListDomainsResponse,
} from "../../../../types/domains";
import type {
  InferenceProfileInfo,
  ListInferenceProfilesInput,
  ListInferenceProfilesResponse,
  ListVectorStoresInput,
  ListVectorStoresResponse,
  VectorStoreInfo,
} from "../../../../types/inference";
import type {
  CreateSemanticRuleInput,
  CreateSemanticRuleResponse,
  GetSemanticRuleInput,
  GetSemanticRuleResponse,
  ListSemanticRulesInput,
  ListSemanticRulesResponse,
  UpdateSemanticRuleInput,
  UpdateSemanticRuleResponse,
  ValidateSemanticRuleInput,
  ValidateSemanticRuleResponse,
} from "../../../../types/semantic";
import type {
  ListSpacesInput,
  ListSpacesResponse,
  SpaceInfo,
} from "../../../../types/spaces";
import { RuleEditor } from "../components/SemanticRuleEditor";
import type {
  RuleDraft,
  VectorStoreCatalogState,
} from "../model/pageTypes";
import { draftToRule, ruleToDraft, summaryToRule } from "../model/ruleDraft";
import {
  compareProfiles,
  profileToOption,
} from "../components/SemanticDisplay";

export type SemanticRuleEditorPageProps = {
  mode: "create" | "edit";
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listInferenceProfilesService?: (input?: ListInferenceProfilesInput) => Promise<ListInferenceProfilesResponse>;
  listVectorStoresService?: (input?: ListVectorStoresInput) => Promise<ListVectorStoresResponse>;
  listSemanticRulesService?: (input: ListSemanticRulesInput) => Promise<ListSemanticRulesResponse>;
  getSemanticRuleService?: (input: GetSemanticRuleInput) => Promise<GetSemanticRuleResponse>;
  validateSemanticRuleService?: (input: ValidateSemanticRuleInput) => Promise<ValidateSemanticRuleResponse>;
  createSemanticRuleService?: (input: CreateSemanticRuleInput) => Promise<CreateSemanticRuleResponse>;
  updateSemanticRuleService?: (input: UpdateSemanticRuleInput) => Promise<UpdateSemanticRuleResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function defaultSemanticRuleDraft(spaceId = "", domainId = ""): RuleDraft {
  return {
    semanticRuleId: "",
    spaceId,
    domainId,
    key: "",
    displayName: "",
    description: "",
    enabled: true,
    labels: "Note",
    triggerEvents: ["changed"],
    triggerEventProblem: "",
    dirtyCooldown: "30s",
    selectorMode: "node_type",
    selectorGql: "",
    targetAlias: "",
    maxResults: "100",
    sourceMode: "self",
    includeProperties: "",
    excludeProperties: "",
    contextGql: "",
    bindingKey: "search",
    purpose: "search",
    intelligenceProfile: "",
    vectorStoreId: "",
    vectorStoreLegacyRef: "",
    searchable: true,
    physicalIndex: "exact",
  };
}

function vectorStoreCatalogFailure(error: unknown): VectorStoreCatalogState {
  const message = errorMessage(error, "Failed to load vector-store catalog");
  const normalized = message.toLocaleLowerCase();
  if (
    normalized.includes("unimplemented") ||
    normalized.includes("unknown service") ||
    normalized.includes("unknown method") ||
    normalized.includes("not supported")
  ) {
    return {
      kind: "unsupported",
      message:
        "This daemon does not support vector-store catalog selection. Existing rule references remain preserved.",
    };
  }
  if (
    normalized.includes("permission denied") ||
    normalized.includes("permission_denied") ||
    normalized.includes("not authorized") ||
    normalized.includes("capability")
  ) {
    return {
      kind: "unauthorized",
      message:
        "You are not authorized to read the vector-store catalog. Existing rule references remain preserved.",
    };
  }
  return { kind: "error", message };
}

type PendingNavigation = {
  target: string;
  external: boolean;
};

function useUnsavedChangesWarning(
  dirty: boolean,
  navigationApproved: MutableRefObject<boolean>,
  onNavigationBlocked: (navigation: PendingNavigation) => void,
) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (navigationApproved.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const captureLink = (event: MouseEvent) => {
      if (
        navigationApproved.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      const url = new URL(link.href, window.location.href);
      event.preventDefault();
      event.stopPropagation();
      const external = url.origin !== window.location.origin;
      onNavigationBlocked({
        target: external ? url.href : `${url.pathname}${url.search}${url.hash}`,
        external,
      });
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", captureLink, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", captureLink, true);
    };
  }, [dirty, navigationApproved, onNavigationBlocked]);
}

export function SemanticRuleEditorPage({
  mode,
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  listInferenceProfilesService = defaultListInferenceProfiles,
  listVectorStoresService = defaultListVectorStores,
  listSemanticRulesService = defaultListSemanticRules,
  getSemanticRuleService = defaultGetSemanticRule,
  validateSemanticRuleService = defaultValidateSemanticRule,
  createSemanticRuleService = defaultCreateSemanticRule,
  updateSemanticRuleService = defaultUpdateSemanticRule,
  principalContext,
}: SemanticRuleEditorPageProps) {
  const navigate = useNavigate();
  const { ruleId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const requestedSpaceId = searchParams.get("spaceId") || "";
  const requestedDomainId = searchParams.get("domainId") || "";
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [profiles, setProfiles] = useState<InferenceProfileInfo[]>([]);
  const [vectorStores, setVectorStores] = useState<VectorStoreInfo[]>([]);
  const [vectorStoreCatalog, setVectorStoreCatalog] = useState<VectorStoreCatalogState>({
    kind: "loading",
    message: "Loading vector-store catalog…",
  });
  const [draft, setDraft] = useState<RuleDraft | null>(null);
  const [baseline, setBaseline] = useState("");
  const [validation, setValidation] = useState<ValidateSemanticRuleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [pendingNavigation, setPendingNavigation] =
    useState<PendingNavigation | null>(null);
  const mounted = useRef(true);
  const navigationApproved = useRef(false);
  const canManage = canUseCapability(principalContext, "semantic.manage");
  const canReadVectorStores = canUseCapability(principalContext, "inference.catalog.read");
  const dirty = Boolean(draft && baseline && JSON.stringify(draft) !== baseline);
  const blockNavigation = useCallback((navigation: PendingNavigation) => {
    setPendingNavigation(navigation);
  }, []);
  useUnsavedChangesWarning(dirty, navigationApproved, blockNavigation);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const resolveEditSpace = useCallback(async (availableSpaces: SpaceInfo[]) => {
    if (requestedSpaceId) return requestedSpaceId;
    for (const space of availableSpaces) {
      const seenPageTokens = new Set<string>();
      let pageToken = "";
      do {
        const response = await listSemanticRulesService({
          spaceId: space.spaceId,
          pageSize: 500,
          includeDisabled: true,
          ...(pageToken ? { pageToken } : {}),
        });
        if (response.rules.some((rule) => rule.semanticRuleId === ruleId)) {
          return space.spaceId;
        }
        pageToken = response.nextPageToken;
        if (pageToken && seenPageTokens.has(pageToken)) {
          throw new Error("Semantic rule pagination returned a repeated page token");
        }
        if (pageToken) seenPageTokens.add(pageToken);
      } while (pageToken);
    }
    return "";
  }, [listSemanticRulesService, requestedSpaceId, ruleId]);

  useEffect(() => {
    let cancelled = false;
    async function loadEditor() {
      setLoading(true);
      setError("");
      setNotFound(false);
      try {
        const availableSpaces: SpaceInfo[] = [];
        const seenSpacePageTokens = new Set<string>();
        let spacePageToken = "";
        do {
          const spaceResponse = await listSpacesService({
            pageSize: 100,
            includeArchived: false,
            ...(spacePageToken ? { pageToken: spacePageToken } : {}),
          });
          availableSpaces.push(...spaceResponse.spaces);
          spacePageToken = spaceResponse.nextPageToken;
          if (spacePageToken && seenSpacePageTokens.has(spacePageToken)) {
            throw new Error("Space pagination returned a repeated page token");
          }
          if (spacePageToken) seenSpacePageTokens.add(spacePageToken);
        } while (spacePageToken);
        if (cancelled) return;
        setSpaces(availableSpaces);
        const domainResults = await Promise.all(
          availableSpaces.map(async (space) =>
            (await listDomainsService({
              spaceId: space.spaceId,
              pageSize: 100,
              includeSystem: false,
            })).domains,
          ),
        );
        if (cancelled) return;
        const availableDomains = domainResults.flat();
        setDomains(availableDomains);

        const editSpaceId = mode === "edit" ? await resolveEditSpace(availableSpaces) : "";
        if (cancelled) return;
        if (mode === "edit" && (!ruleId || !editSpaceId)) {
          setNotFound(true);
          return;
        }
        const initialSpaceId = editSpaceId || requestedSpaceId || availableSpaces[0]?.spaceId || "";
        const initialDomainId = requestedDomainId || availableDomains.find(
          (domain) => domain.spaceId === initialSpaceId,
        )?.domainId || "";

        const profileResults = await Promise.all(
          availableSpaces.map(async (space) =>
            (await listInferenceProfilesService({
              spaceId: space.spaceId,
              operation: "embeddings",
              includeDisabled: false,
              pageSize: 100,
            })).inferenceProfiles,
          ),
        );
        if (cancelled) return;
        setProfiles(profileResults.flat().sort(compareProfiles));

        if (canReadVectorStores) {
          try {
            const catalog: VectorStoreInfo[] = [];
            let pageToken: string | undefined;
            do {
              const response = await listVectorStoresService({
                pageSize: 500,
                pageToken,
                includeDisabled: true,
              });
              catalog.push(...response.vectorStores);
              pageToken = response.nextPageToken || undefined;
            } while (pageToken);
            if (cancelled) return;
            setVectorStores(catalog);
            setVectorStoreCatalog(catalog.length
              ? { kind: "ready", message: "" }
              : {
                  kind: "empty",
                  message: "No vector stores are available. Create or import one before creating a semantic rule.",
                });
          } catch (catalogError) {
            if (cancelled) return;
            setVectorStores([]);
            setVectorStoreCatalog(vectorStoreCatalogFailure(catalogError));
          }
        } else {
          setVectorStores([]);
          setVectorStoreCatalog({
            kind: "unauthorized",
            message: "The authenticated principal does not have inference.catalog.read. Existing rule references remain preserved.",
          });
        }

        let nextDraft: RuleDraft;
        if (mode === "edit") {
          const response = await getSemanticRuleService({
            spaceId: editSpaceId,
            semanticRuleId: ruleId,
          });
          const rule = response.rule ?? (response.summary ? summaryToRule(response.summary) : null);
          if (!rule) {
            setNotFound(true);
            return;
          }
          nextDraft = ruleToDraft(rule);
        } else {
          nextDraft = defaultSemanticRuleDraft(initialSpaceId, initialDomainId);
        }
        if (cancelled) return;
        setDraft(nextDraft);
        setBaseline(JSON.stringify(nextDraft));
      } catch (loadError) {
        if (cancelled) return;
        const message = errorMessage(loadError, "Failed to load semantic rule editor");
        if (mode === "edit" && message.toLocaleLowerCase().includes("not found")) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (canManage) void loadEditor();
    else setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [
    canManage,
    canReadVectorStores,
    getSemanticRuleService,
    listDomainsService,
    listInferenceProfilesService,
    listSpacesService,
    listVectorStoresService,
    mode,
    requestedDomainId,
    requestedSpaceId,
    resolveEditSpace,
    ruleId,
  ]);

  const profileOptions = useMemo(() => profiles.map(profileToOption), [profiles]);

  function leaveEditor() {
    if (dirty) {
      setPendingNavigation({
        target: "/intelligence/semantic-rules",
        external: false,
      });
      return;
    }
    navigate("/intelligence/semantic-rules");
  }

  function discardChangesAndLeave() {
    if (!pendingNavigation) return;
    navigationApproved.current = true;
    const navigation = pendingNavigation;
    setPendingNavigation(null);
    if (navigation.external) {
      window.location.assign(navigation.target);
      return;
    }
    navigate(navigation.target);
  }

  async function validateDraft() {
    if (!draft) return null;
    setActionLoading(true);
    setError("");
    try {
      const result = await validateSemanticRuleService({ rule: draftToRule(draft) });
      if (mounted.current) setValidation(result);
      return result;
    } catch (validationError) {
      if (mounted.current) setError(errorMessage(validationError, "Failed to validate semantic rule"));
      return null;
    } finally {
      if (mounted.current) setActionLoading(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    const result = await validateDraft();
    if (!result?.valid) return;
    setActionLoading(true);
    setError("");
    try {
      const rule = draftToRule(draft);
      if (mode === "edit") {
        await updateSemanticRuleService({
          spaceId: draft.spaceId,
          semanticRuleId: ruleId,
          rule,
        });
      } else {
        await createSemanticRuleService({ rule });
      }
      setBaseline(JSON.stringify(draft));
      navigate("/intelligence/semantic-rules", {
        replace: true,
        state: {
          notice: `${mode === "create" ? "Created" : "Updated"} semantic rule ${draft.key}.`,
        },
      });
    } catch (saveError) {
      setError(errorMessage(saveError, "Failed to save semantic rule"));
    } finally {
      if (mounted.current) setActionLoading(false);
    }
  }

  const title = mode === "create" ? "Add Semantic Rule" : "Edit Semantic Rule";
  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Intelligence / Semantic Rules"
        title={title}
        description={
          mode === "create"
            ? "Define a new semantic generation rule. Nothing changes until you explicitly create it."
            : "Edit the selected semantic generation rule by authoritative rule identity."
        }
        backLink={{
          to: "/intelligence/semantic-rules",
          label: "← Back to Semantic Rules",
        }}
      />
      {!canManage ? (
        <Alert>You are not authorized to create or edit semantic rules. The semantic.manage capability is required.</Alert>
      ) : null}
      {error ? (
        <ErrorGroup errors={[{ id: "semantic-rule-editor", source: "Semantic rule editor", message: error }]} />
      ) : null}
      {loading ? (
        <div className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}>
          <Text intent="muted">Loading semantic rule editor…</Text>
        </div>
      ) : null}
      {notFound ? (
        <div className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-6`}>
          <Text as="h2" intent="primary" className="text-lg font-semibold">Semantic rule not found</Text>
          <Text intent="muted" size="sm" className="mt-2">
            No semantic rule with identity {ruleId || "(missing)"} is available in the selected scope.
          </Text>
          <Button className="mt-4" variant="secondary" onClick={() => navigate("/intelligence/semantic-rules")}>Back to Semantic Rules</Button>
        </div>
      ) : null}
      {canManage && !loading && !notFound && draft ? (
        <RuleEditor
          mode={mode}
          draft={draft}
          setDraft={(next) => {
            setDraft(next);
            setValidation(null);
          }}
          spaces={spaces}
          domains={domains}
          profiles={profileOptions}
          vectorStores={vectorStores}
          vectorStoreCatalog={vectorStoreCatalog}
          validation={validation}
          loading={actionLoading}
          onValidate={() => void validateDraft()}
          onSave={() => void saveDraft()}
          onCancel={leaveEditor}
        />
      ) : null}
      {pendingNavigation ? (
        <ConfirmationDialog
          eyebrow="Unsaved changes"
          title="Discard unsaved changes?"
          confirmLabel="Discard changes"
          cancelLabel="Keep editing"
          intent="danger"
          onCancel={() => setPendingNavigation(null)}
          onConfirm={discardChangesAndLeave}
        >
          Your semantic rule changes have not been saved. Discard them and leave this page?
        </ConfirmationDialog>
      ) : null}
    </section>
  );
}
