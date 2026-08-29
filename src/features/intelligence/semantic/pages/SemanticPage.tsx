import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  Button,
  Alert,
  DomainLabel,
  ErrorGroup,
  errorMessage,
  EnumBadge,
  formatEnumLabel,
  Input,
  ResourceIdText,
  Select,
  SpaceLabel,
  Tabs,
  Text,
  themeClasses,
  TableHead,
} from "../../../../components/typography";
import {
  canUseCapability,
  type ConsolePrincipalContext,
} from "../../../console";
import {
  analyzeSemanticDirtyWork as defaultAnalyzeSemanticDirtyWork,
  backfillSemanticRule as defaultBackfillSemanticRule,
  cancelSemanticMaintenanceWork as defaultCancelSemanticMaintenanceWork,
  createSemanticRule as defaultCreateSemanticRule,
  deleteSemanticRule as defaultDeleteSemanticRule,
  getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus,
  getSemanticRule as defaultGetSemanticRule,
  listDomains as defaultListDomains,
  listInferenceProfiles as defaultListInferenceProfiles,
  listSemanticRules as defaultListSemanticRules,
  listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork,
  listSpaces as defaultListSpaces,
  processSemanticDirtyWork as defaultProcessSemanticDirtyWork,
  retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork,
  semanticSearch as defaultSemanticSearch,
  setSemanticRuleEnabled as defaultSetSemanticRuleEnabled,
  summarizeInferenceUsage as defaultSummarizeInferenceUsage,
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
  SummarizeUsageInput,
  SummarizeUsageResponse,
} from "../../../../types/inference";
import type {
  CreateSemanticRuleInput,
  CreateSemanticRuleResponse,
  DeleteSemanticRuleInput,
  DeleteSemanticRuleResponse,
  GetSemanticRuleInput,
  GetSemanticRuleResponse,
  ListSemanticRulesInput,
  ListSemanticRulesResponse,
  SemanticGenerationRule,
  SemanticGenerationRuleSummary,
  SemanticRuleValidationDiagnostic,
  SemanticSearchInput,
  SemanticSearchResponse,
  SetSemanticRuleEnabledInput,
  SetSemanticRuleEnabledResponse,
  UpdateSemanticRuleInput,
  UpdateSemanticRuleResponse,
  ValidateSemanticRuleInput,
  ValidateSemanticRuleResponse,
} from "../../../../types/semantic";
import type {
  AnalyzeSemanticDirtyWorkInput,
  AnalyzeSemanticDirtyWorkResponse,
  BackfillSemanticRuleInput,
  BackfillSemanticRuleResponse,
  GetSemanticMaintenanceStatusInput,
  ListSemanticMaintenanceWorkInput,
  ListSemanticMaintenanceWorkResponse,
  ProcessSemanticDirtyWorkInput,
  ProcessSemanticDirtyWorkResponse,
  SemanticMaintenanceStatusInfo,
  SemanticMaintenanceWorkActionInput,
  SemanticMaintenanceWorkItemInfo,
} from "../../../../types/semanticMaintenance";
import type {
  ListSpacesInput,
  ListSpacesResponse,
  SpaceInfo,
} from "../../../../types/spaces";

type SemanticRow = {
  space: SpaceInfo;
  domain?: DomainInfo;
  rule: SemanticGenerationRuleSummary;
};
type SpaceMaintenance = {
  status: SemanticMaintenanceStatusInfo | null;
  work: SemanticMaintenanceWorkItemInfo[];
  error: string;
};
type UsageByRule = Record<
  string,
  {
    requestCount: number;
    failedCount: number;
    deniedCount: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }
>;
type ProfileOption = {
  value: string;
  label: string;
  spaceId: string;
  domainIds: string[];
};
type DraftMode = "create" | "edit";
type RuleDraft = {
  semanticRuleId: string;
  spaceId: string;
  domainId: string;
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  labels: string;
  triggerEvents: string;
  dirtyCooldown: string;
  selectorMode: string;
  selectorGql: string;
  targetAlias: string;
  maxResults: string;
  sourceMode: string;
  includeProperties: string;
  excludeProperties: string;
  contextGql: string;
  bindingKey: string;
  purpose: string;
  intelligenceProfile: string;
  vectorStore: string;
  searchable: boolean;
  physicalIndex: string;
};
type SearchDraft = {
  spaceId: string;
  domainId: string;
  semanticRuleId: string;
  embeddingBindingKey: string;
  query: string;
  limit: string;
  minScore: string;
};
type SemanticTab = "rules" | "activity";

export type SemanticPageProps = {
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (
    input: ListDomainsInput,
  ) => Promise<ListDomainsResponse>;
  listInferenceProfilesService?: (
    input?: ListInferenceProfilesInput,
  ) => Promise<ListInferenceProfilesResponse>;
  listSemanticRulesService?: (
    input: ListSemanticRulesInput,
  ) => Promise<ListSemanticRulesResponse>;
  getSemanticRuleService?: (
    input: GetSemanticRuleInput,
  ) => Promise<GetSemanticRuleResponse>;
  validateSemanticRuleService?: (
    input: ValidateSemanticRuleInput,
  ) => Promise<ValidateSemanticRuleResponse>;
  createSemanticRuleService?: (
    input: CreateSemanticRuleInput,
  ) => Promise<CreateSemanticRuleResponse>;
  updateSemanticRuleService?: (
    input: UpdateSemanticRuleInput,
  ) => Promise<UpdateSemanticRuleResponse>;
  setSemanticRuleEnabledService?: (
    input: SetSemanticRuleEnabledInput,
  ) => Promise<SetSemanticRuleEnabledResponse>;
  deleteSemanticRuleService?: (
    input: DeleteSemanticRuleInput,
  ) => Promise<DeleteSemanticRuleResponse>;
  getSemanticMaintenanceStatusService?: (
    input: GetSemanticMaintenanceStatusInput,
  ) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (
    input: ListSemanticMaintenanceWorkInput,
  ) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (
    input: SemanticMaintenanceWorkActionInput,
  ) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (
    input: SemanticMaintenanceWorkActionInput,
  ) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (
    input: AnalyzeSemanticDirtyWorkInput,
  ) => Promise<AnalyzeSemanticDirtyWorkResponse>;
  processSemanticDirtyWorkService?: (
    input: ProcessSemanticDirtyWorkInput,
  ) => Promise<ProcessSemanticDirtyWorkResponse>;
  backfillSemanticRuleService?: (
    input: BackfillSemanticRuleInput,
  ) => Promise<BackfillSemanticRuleResponse>;
  summarizeInferenceUsageService?: (
    input: SummarizeUsageInput,
  ) => Promise<SummarizeUsageResponse>;
  semanticSearchService?: (
    input: SemanticSearchInput,
  ) => Promise<SemanticSearchResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

const ruleStates = [
  "SEMANTIC_RULE_STATE_ACTIVE",
  "SEMANTIC_RULE_STATE_BUILDING",
  "SEMANTIC_RULE_STATE_STALE",
  "SEMANTIC_RULE_STATE_DISABLED",
  "SEMANTIC_RULE_STATE_ERROR",
];

function defaultDraft(spaceId = "", domainId = ""): RuleDraft {
  return {
    semanticRuleId: "",
    spaceId,
    domainId,
    key: "",
    displayName: "",
    description: "",
    enabled: true,
    labels: "Note",
    triggerEvents: "changed",
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
    vectorStore: "mycel-file",
    searchable: true,
    physicalIndex: "exact",
  };
}

function defaultSearchDraft(spaceId = "", domainId = ""): SearchDraft {
  return {
    spaceId,
    domainId,
    semanticRuleId: "",
    embeddingBindingKey: "",
    query: "",
    limit: "10",
    minScore: "",
  };
}

export function SemanticPage({
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  listInferenceProfilesService = defaultListInferenceProfiles,
  listSemanticRulesService = defaultListSemanticRules,
  getSemanticRuleService = defaultGetSemanticRule,
  validateSemanticRuleService = defaultValidateSemanticRule,
  createSemanticRuleService = defaultCreateSemanticRule,
  updateSemanticRuleService = defaultUpdateSemanticRule,
  setSemanticRuleEnabledService = defaultSetSemanticRuleEnabled,
  deleteSemanticRuleService = defaultDeleteSemanticRule,
  getSemanticMaintenanceStatusService = defaultGetSemanticMaintenanceStatus,
  listSemanticMaintenanceWorkService = defaultListSemanticMaintenanceWork,
  retrySemanticMaintenanceWorkService = defaultRetrySemanticMaintenanceWork,
  cancelSemanticMaintenanceWorkService = defaultCancelSemanticMaintenanceWork,
  analyzeSemanticDirtyWorkService = defaultAnalyzeSemanticDirtyWork,
  processSemanticDirtyWorkService = defaultProcessSemanticDirtyWork,
  backfillSemanticRuleService = defaultBackfillSemanticRule,
  summarizeInferenceUsageService = defaultSummarizeInferenceUsage,
  semanticSearchService = defaultSemanticSearch,
  principalContext,
}: SemanticPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [profiles, setProfiles] = useState<InferenceProfileInfo[]>([]);
  const [rows, setRows] = useState<SemanticRow[]>([]);
  const [maintenanceBySpace, setMaintenanceBySpace] = useState<
    Record<string, SpaceMaintenance>
  >({});
  const [usageByRule, setUsageByRule] = useState<UsageByRule>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [actionResult, setActionResult] = useState("");
  const [detail, setDetail] = useState<{ title: string; data: unknown } | null>(
    null,
  );
  const [draftMode, setDraftMode] = useState<DraftMode | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(() => defaultDraft());
  const [validation, setValidation] =
    useState<ValidateSemanticRuleResponse | null>(null);
  const [searchDraft, setSearchDraft] = useState<SearchDraft>(() =>
    defaultSearchDraft(),
  );
  const [searchResult, setSearchResult] =
    useState<SemanticSearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const selectedSpaceId = searchParams.get("spaceId") || "";
  const selectedDomainId = searchParams.get("domainId") || "";
  const stateFilter = searchParams.get("state") || "";
  const includeDisabled = searchParams.get("includeDisabled") === "true";
  const activeTab = semanticTab(searchParams.get("tab"));
  const canManage = canUseCapability(principalContext, "semantic.manage");

  const setTab = useCallback(
    (tab: SemanticTab) => {
      const next = new URLSearchParams(searchParams);
      next.set("tab", tab);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key === "spaceId") next.delete("domainId");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setUsageError("");
    try {
      const spaceResponse = await listSpacesService({
        pageSize: 100,
        includeArchived: false,
      });
      setSpaces(spaceResponse.spaces);
      const visibleSpaces = selectedSpaceId
        ? spaceResponse.spaces.filter(
            (space) => space.spaceId === selectedSpaceId,
          )
        : spaceResponse.spaces;
      const domainResults = await Promise.all(
        spaceResponse.spaces.map(
          async (space) =>
            (
              await listDomainsService({
                spaceId: space.spaceId,
                pageSize: 100,
                includeSystem: false,
              })
            ).domains,
        ),
      );
      const allDomains = domainResults.flat();
      setDomains(allDomains);
      try {
        const profileResults = await Promise.all(
          visibleSpaces.map(
            async (space) =>
              (
                await listInferenceProfilesService({
                  spaceId: space.spaceId,
                  domainId: selectedDomainId || undefined,
                  operation: "embeddings",
                  includeDisabled: false,
                  pageSize: 100,
                })
              ).inferenceProfiles,
          ),
        );
        setProfiles(profileResults.flat().sort(compareProfiles));
      } catch (err) {
        setProfiles([]);
        setUsageError(
          errorMessage(err, "Failed to load Intelligence profiles"),
        );
      }
      const domainById = new Map(
        allDomains.map((domain) => [domain.domainId, domain]),
      );
      const rowResults = await Promise.all(
        visibleSpaces.map(async (space) => {
          const response = await listSemanticRulesService({
            spaceId: space.spaceId,
            domainId: selectedDomainId || undefined,
            pageSize: 100,
            includeDisabled,
          });
          return response.rules.map((rule) => ({
            space,
            domain: domainById.get(rule.domainId),
            rule,
          }));
        }),
      );
      setRows(rowResults.flat().sort(compareSemanticRows));
      const maintenancePairs = await Promise.all(
        visibleSpaces.map(async (space) => {
          try {
            const [status, work] = await Promise.all([
              getSemanticMaintenanceStatusService({ spaceId: space.spaceId }),
              listSemanticMaintenanceWorkService({
                spaceId: space.spaceId,
                limit: 100,
              }),
            ]);
            return [
              space.spaceId,
              { status, work: work.items, error: "" },
            ] as const;
          } catch (err) {
            return [
              space.spaceId,
              {
                status: null,
                work: [],
                error: errorMessage(err, "Failed to load semantic maintenance"),
              },
            ] as const;
          }
        }),
      );
      setMaintenanceBySpace(Object.fromEntries(maintenancePairs));
      const usage: UsageByRule = {};
      await Promise.all(
        visibleSpaces.map(async (space) => {
          try {
            const summary = await summarizeInferenceUsageService({
              spaceId: space.spaceId,
              groupBy: ["semantic_rule_id", "domain_id"],
            });
            for (const item of summary.summaries) {
              const semanticRuleId = groupValue(
                item.group,
                "semantic_rule_id",
                "semanticRuleId",
                "semanticRule",
              );
              const domainId = groupValue(
                item.group,
                "domain_id",
                "domainId",
                "domain",
              );
              if (
                !semanticRuleId ||
                (selectedDomainId && domainId !== selectedDomainId)
              )
                continue;
              const current = usage[semanticRuleId] ?? {
                requestCount: 0,
                failedCount: 0,
                deniedCount: 0,
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              };
              usage[semanticRuleId] = {
                requestCount: current.requestCount + item.requestCount,
                failedCount: current.failedCount + item.failedCount,
                deniedCount: current.deniedCount + item.deniedCount,
                inputTokens: current.inputTokens + item.inputTokens,
                outputTokens: current.outputTokens + item.outputTokens,
                totalTokens: current.totalTokens + item.totalTokens,
              };
            }
          } catch (err) {
            setUsageError(
              errorMessage(err, "Failed to load semantic usage summaries"),
            );
          }
        }),
      );
      setUsageByRule(usage);
    } catch (err) {
      setError(errorMessage(err, "Failed to load semantic intelligence"));
    } finally {
      setLoading(false);
    }
  }, [
    getSemanticMaintenanceStatusService,
    includeDisabled,
    listDomainsService,
    listInferenceProfilesService,
    listSemanticMaintenanceWorkService,
    listSemanticRulesService,
    listSpacesService,
    selectedDomainId,
    selectedSpaceId,
    summarizeInferenceUsageService,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft((current) => ({
      ...current,
      spaceId: selectedSpaceId || current.spaceId,
      domainId: selectedDomainId || current.domainId,
    }));
  }, [selectedDomainId, selectedSpaceId]);

  const filteredDomains = useMemo(
    () =>
      domains.filter(
        (domain) => !selectedSpaceId || domain.spaceId === selectedSpaceId,
      ),
    [domains, selectedSpaceId],
  );
  const filteredRows = useMemo(
    () => rows.filter((row) => !stateFilter || row.rule.state === stateFilter),
    [rows, stateFilter],
  );
  const maintenanceTotals = useMemo(
    () =>
      Object.values(maintenanceBySpace).reduce(
        (total, item) => ({
          pending: total.pending + (item.status?.queueDepthPending ?? 0),
          running: total.running + (item.status?.queueDepthRunning ?? 0),
          failed:
            total.failed +
            (item.status?.queueDepthFailedRetryable ?? 0) +
            (item.status?.queueDepthFailedPermanent ?? 0),
        }),
        { pending: 0, running: 0, failed: 0 },
      ),
    [maintenanceBySpace],
  );
  const totalUsage = useMemo(
    () =>
      filteredRows.reduce(
        (sum, row) =>
          sum + (usageByRule[row.rule.semanticRuleId]?.totalTokens ?? 0),
        0,
      ),
    [filteredRows, usageByRule],
  );
  const selectedMaintenanceSpaces = selectedSpaceId
    ? spaces.filter((space) => space.spaceId === selectedSpaceId)
    : spaces;
  const profileOptions = useMemo(
    () => profiles.map(profileToOption),
    [profiles],
  );
  const searchDomains = useMemo(
    () =>
      domains.filter(
        (domain) =>
          !searchDraft.spaceId || domain.spaceId === searchDraft.spaceId,
      ),
    [domains, searchDraft.spaceId],
  );
  const searchRules = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!searchDraft.spaceId || row.space.spaceId === searchDraft.spaceId) &&
          (!searchDraft.domainId ||
            row.rule.domainId === searchDraft.domainId) &&
          row.rule.enabled,
      ),
    [rows, searchDraft.domainId, searchDraft.spaceId],
  );
  const selectedSearchRule = searchRules.find(
    (row) => row.rule.semanticRuleId === searchDraft.semanticRuleId,
  );
  const searchBindings =
    selectedSearchRule?.rule.bindings.filter((binding) => binding.enabled) ??
    [];

  function startCreate() {
    setDraftMode("create");
    setValidation(null);
    setDraft(
      defaultDraft(
        selectedSpaceId || spaces[0]?.spaceId || "",
        selectedDomainId || filteredDomains[0]?.domainId || "",
      ),
    );
  }

  async function startEdit(row: SemanticRow) {
    setActionLoading(true);
    setError("");
    try {
      const response = await getSemanticRuleService({
        spaceId: row.space.spaceId,
        semanticRuleId: row.rule.semanticRuleId,
      });
      setDraft(ruleToDraft(response.rule ?? summaryToRule(row.rule)));
      setDraftMode("edit");
      setValidation(null);
    } catch (err) {
      setError(errorMessage(err, "Failed to load semantic rule"));
    } finally {
      setActionLoading(false);
    }
  }

  async function validateDraft() {
    setActionLoading(true);
    setError("");
    try {
      const result = await validateSemanticRuleService({
        rule: draftToRule(draft),
      });
      setValidation(result);
      return result;
    } catch (err) {
      setError(errorMessage(err, "Failed to validate semantic rule"));
      return null;
    } finally {
      setActionLoading(false);
    }
  }

  async function saveDraft() {
    const result = await validateDraft();
    if (!result?.valid) return;
    setActionLoading(true);
    setError("");
    try {
      const rule = draftToRule(draft);
      if (draftMode === "edit" && draft.semanticRuleId) {
        await updateSemanticRuleService({
          spaceId: draft.spaceId,
          semanticRuleId: draft.semanticRuleId,
          rule,
        });
        setActionResult(`Updated semantic rule ${draft.key}.`);
      } else {
        await createSemanticRuleService({ rule });
        setActionResult(`Created semantic rule ${draft.key}.`);
      }
      setDraftMode(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to save semantic rule"));
    } finally {
      setActionLoading(false);
    }
  }

  async function setRuleEnabled(row: SemanticRow, enabled: boolean) {
    setActionLoading(true);
    setError("");
    try {
      await setSemanticRuleEnabledService({
        spaceId: row.space.spaceId,
        semanticRuleId: row.rule.semanticRuleId,
        enabled,
      });
      setActionResult(
        `${enabled ? "Enabled" : "Disabled"} semantic rule ${row.rule.key}.`,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update semantic rule"));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteRule(row: SemanticRow) {
    if (
      !window.confirm(
        `Delete semantic rule ${row.rule.key || row.rule.semanticRuleId}?`,
      )
    )
      return;
    const purgeVectors = window.confirm(
      "Also purge stored vectors for this rule? This is explicit and cannot be undone.",
    );
    setActionLoading(true);
    setError("");
    try {
      await deleteSemanticRuleService({
        spaceId: row.space.spaceId,
        semanticRuleId: row.rule.semanticRuleId,
        purgeVectors,
      });
      setActionResult(`Deleted semantic rule ${row.rule.key}.`);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to delete semantic rule"));
    } finally {
      setActionLoading(false);
    }
  }

  async function runSpaceAction(
    kind: "analyze" | "process",
    spaceId: string,
    row?: SemanticRow,
    bindingKey?: string,
  ) {
    setActionLoading(true);
    setError("");
    try {
      if (kind === "analyze") {
        const result = await analyzeSemanticDirtyWorkService({
          spaceId,
          semanticRuleId: row?.rule.semanticRuleId,
          embeddingBindingKey: bindingKey,
          limit: 100,
        });
        setActionResult(
          `Analyzed dirty semantic work: ${result.processedEvents} events, ${result.enqueuedItems} items enqueued.`,
        );
      } else {
        const result = await processSemanticDirtyWorkService({
          spaceId,
          limit: 100,
        });
        setActionResult(
          `Processed semantic work: ${result.completedItems} completed, ${result.failedItems} failed.`,
        );
      }
      await load();
    } catch (err) {
      setError(errorMessage(err, `Failed to ${kind} semantic work`));
    } finally {
      setActionLoading(false);
    }
  }

  async function backfill(row: SemanticRow, bindingKey: string) {
    if (!bindingKey) {
      setError("Choose an embedding binding before backfill.");
      return;
    }
    setActionLoading(true);
    setError("");
    setActionResult(
      `Backfilling semantic rule ${row.rule.key || row.rule.semanticRuleId} binding ${bindingKey}…`,
    );
    try {
      const result = await backfillSemanticRuleService({
        spaceId: row.space.spaceId,
        semanticRuleId: row.rule.semanticRuleId,
        embeddingBindingKey: bindingKey,
        limit: 100,
        continueOnError: true,
      });
      const hint =
        result.generatedCount === 0 && result.skippedCount > 0
          ? " Check the rule source policy/include properties if all nodes were skipped."
          : "";
      setActionResult(
        `Backfill selected ${result.selectedCount} nodes, generated ${result.generatedCount}, skipped ${result.skippedCount}, failed ${result.failedCount}.${hint}`,
      );
      await load();
    } catch (err) {
      setActionResult("");
      setError(errorMessage(err, "Failed to backfill semantic rule"));
    } finally {
      setActionLoading(false);
    }
  }

  async function runSemanticSearch() {
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const limit = Number(searchDraft.limit) || 10;
      const minScore = searchDraft.minScore.trim()
        ? Number(searchDraft.minScore)
        : undefined;
      const result = await semanticSearchService({
        spaceId: searchDraft.spaceId,
        domainId: searchDraft.domainId,
        semanticRuleId: searchDraft.semanticRuleId || undefined,
        embeddingBindingKey: searchDraft.embeddingBindingKey || undefined,
        query: searchDraft.query,
        limit,
        minScore: Number.isFinite(minScore) ? minScore : undefined,
      });
      setSearchResult(result);
    } catch (err) {
      setSearchError(errorMessage(err, "Semantic search failed"));
    } finally {
      setSearchLoading(false);
    }
  }

  async function updateWork(
    kind: "retry" | "cancel",
    item: SemanticMaintenanceWorkItemInfo,
  ) {
    setActionLoading(true);
    setError("");
    try {
      if (kind === "retry")
        await retrySemanticMaintenanceWorkService({
          spaceId: item.spaceId,
          workItemId: item.workItemId,
        });
      else
        await cancelSemanticMaintenanceWorkService({
          spaceId: item.spaceId,
          workItemId: item.workItemId,
        });
      setActionResult(
        `${kind === "retry" ? "Retried" : "Canceled"} work item ${item.workItemId}.`,
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, `Failed to ${kind} semantic work item`));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Intelligence"
        title="Semantic"
        description="Author semantic generation rules, inspect per-binding search-index health, run explicit maintenance, and track token usage."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            {canManage && <Button onClick={startCreate}>New rule</Button>}
          </>
        }
      />
      <ErrorGroup
        errors={[
          ...(error
            ? [
                {
                  id: "semantic.rules",
                  source: "Semantic rules",
                  message: error,
                },
              ]
            : []),
          ...(usageError
            ? [
                {
                  id: "semantic.usage",
                  source: "Usage",
                  message: usageError,
                },
              ]
            : []),
        ]}
      />
      {actionResult && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {actionResult}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Semantic rules" value={filteredRows.length} />
        <SummaryCard label="Pending work" value={maintenanceTotals.pending} />
        <SummaryCard label="Failed work" value={maintenanceTotals.failed} />
        <SummaryCard label="Usage tokens" value={totalUsage} />
      </div>
      <>
        <div
          className={`grid gap-4 rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-4 md:grid-cols-4`}
        >
          <Select
            label="Space"
            value={selectedSpaceId}
            onChange={(value) => setFilter("spaceId", value)}
            options={spaces.map((space) => ({
              value: space.spaceId,
              label: space.name || space.spaceId,
            }))}
            placeholder="All spaces"
            disabled={loading}
          />
          <Select
            label="Domain"
            value={selectedDomainId}
            onChange={(value) => setFilter("domainId", value)}
            options={filteredDomains.map((domain) => ({
              value: domain.domainId,
              label: `${domain.name || domain.key} (${domain.spaceId})`,
            }))}
            placeholder="All domains"
            disabled={loading || filteredDomains.length === 0}
          />
          <Select
            label="State"
            value={stateFilter}
            onChange={(value) => setFilter("state", value)}
            options={ruleStates.map((state) => ({
              value: state,
              label: formatEnumLabel(state),
            }))}
            placeholder="All states"
            disabled={loading}
          />
          <label
            className={`flex items-end gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            <input
              type="checkbox"
              checked={includeDisabled}
              onChange={(event) =>
                setFilter("includeDisabled", event.target.checked ? "true" : "")
              }
              disabled={loading}
            />{" "}
            Include disabled
          </label>
        </div>
        <SemanticSearchPanel
          draft={searchDraft}
          setDraft={setSearchDraft}
          spaces={spaces}
          domains={searchDomains}
          rules={searchRules}
          bindings={searchBindings}
          result={searchResult}
          error={searchError}
          loading={searchLoading}
          onSearch={() => void runSemanticSearch()}
        />
        {draftMode && (
          <RuleEditor
            mode={draftMode}
            draft={draft}
            setDraft={setDraft}
            domains={domains}
            spaces={spaces}
            profiles={profileOptions}
            validation={validation}
            loading={actionLoading}
            onValidate={() => void validateDraft()}
            onSave={() => void saveDraft()}
            onCancel={() => setDraftMode(null)}
          />
        )}
      </>
      <div
        className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
      >
        <Tabs
          ariaLabel="Semantic generation sections"
          className="p-3"
          tabs={[
            { id: "rules", label: "Rules" },
            { id: "activity", label: "Activity" },
          ]}
          active={activeTab}
          onChange={setTab}
        />
        {activeTab === "rules" && (
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead
              className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}
            >
              <tr>
                <TableHead className="px-4 py-3">Scope</TableHead>
                <TableHead className="px-4 py-3">Rule</TableHead>
                <TableHead className="px-4 py-3">State</TableHead>
                <TableHead className="px-4 py-3">
                  Bindings / search index
                </TableHead>
                <TableHead className="px-4 py-3">Usage</TableHead>
                <TableHead className="px-4 py-3">Actions</TableHead>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td
                    className={`px-4 py-6 text-center ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
                    colSpan={6}
                  >
                    Loading semantic rules…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td
                    className={`px-4 py-6 text-center ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
                    colSpan={6}
                  >
                    No semantic generation rules found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <RuleRow
                    key={row.rule.semanticRuleId}
                    row={row}
                    usage={usageByRule[row.rule.semanticRuleId]}
                    canManage={canManage}
                    loading={actionLoading}
                    onDetails={() =>
                      setDetail({
                        title: row.rule.displayName || row.rule.key,
                        data: row.rule,
                      })
                    }
                    onEdit={() => void startEdit(row)}
                    onSetEnabled={(enabled) =>
                      void setRuleEnabled(row, enabled)
                    }
                    onDelete={() => void deleteRule(row)}
                    onBackfill={(binding) => void backfill(row, binding)}
                    onAnalyze={(binding) =>
                      void runSpaceAction(
                        "analyze",
                        row.space.spaceId,
                        row,
                        binding,
                      )
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        )}
        {activeTab === "activity" && (
          <div className="space-y-4 p-5">
            <div>
              <Text
                as="h3"
                className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
              >
                Embedding generation activity
              </Text>
              <Text intent="muted" size="sm" className="mt-1">
                Recent dirty-work and backfill activity shows whether a semantic
                rule was triggered, which target node/binding was processed, and
                whether generation succeeded, skipped, queued, or failed.
              </Text>
            </div>
            {selectedMaintenanceSpaces.length === 0 ? (
              <Text intent="muted" size="sm">
                Select or create a space to inspect embedding generation
                activity.
              </Text>
            ) : (
              selectedMaintenanceSpaces.map((space) => {
                const maintenance = maintenanceBySpace[space.spaceId];
                return (
                  <div
                    key={space.spaceId}
                    className="rounded-lg border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <SpaceLabel
                          spaceId={space.spaceId}
                          name={space.name}
                          link
                        />
                        {maintenance?.status && (
                          <Text intent="muted" size="sm" className="mt-1">
                            Triggered{" "}
                            {formatTimestamp(
                              maintenance.status.lastDirtyEventAt,
                            )}{" "}
                            · Last success{" "}
                            {formatTimestamp(
                              maintenance.status.lastWorkerSuccessAt,
                            )}{" "}
                            · Pending {maintenance.status.queueDepthPending} ·
                            Running {maintenance.status.queueDepthRunning} ·
                            Failed{" "}
                            {maintenance.status.queueDepthFailedRetryable +
                              maintenance.status.queueDepthFailedPermanent}
                          </Text>
                        )}
                        {maintenance?.error && (
                          <Text intent="danger" size="sm" className="mt-1">
                            {maintenance.error}
                          </Text>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            disabled={actionLoading}
                            onClick={() =>
                              void runSpaceAction("analyze", space.spaceId)
                            }
                          >
                            Analyze dirty work
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={actionLoading}
                            onClick={() =>
                              void runSpaceAction("process", space.spaceId)
                            }
                          >
                            Process queue
                          </Button>
                        </div>
                      )}
                    </div>
                    <MaintenanceWorkTable
                      items={maintenance?.work ?? []}
                      canManage={canManage}
                      loading={actionLoading}
                      onRetry={(item) => void updateWork("retry", item)}
                      onCancel={(item) => void updateWork("cancel", item)}
                    />
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
      {detail && (
        <DetailDrawer
          title={detail.title}
          data={detail.data}
          onClose={() => setDetail(null)}
        />
      )}
    </section>
  );
}

function compareSemanticRows(a: SemanticRow, b: SemanticRow) {
  return `${a.space.name || a.space.spaceId}:${a.domain?.name || a.domain?.key || a.rule.domainId}:${a.rule.displayName || a.rule.key}`.localeCompare(
    `${b.space.name || b.space.spaceId}:${b.domain?.name || b.domain?.key || b.rule.domainId}:${b.rule.displayName || b.rule.key}`,
  );
}
function semanticTab(value: string | null): SemanticTab {
  return value === "activity" ? value : "rules";
}
function compareProfiles(a: InferenceProfileInfo, b: InferenceProfileInfo) {
  return `${a.spaceId}:${a.displayName || a.key}`.localeCompare(
    `${b.spaceId}:${b.displayName || b.key}`,
  );
}
function profileToOption(profile: InferenceProfileInfo): ProfileOption {
  return {
    value: profile.key || profile.inferenceProfileId,
    label: `${profile.displayName || profile.key} (${profile.key || profile.inferenceProfileId})`,
    spaceId: profile.spaceId,
    domainIds: profile.domainIds || [],
  };
}
function groupValue(group: Record<string, string>, ...keys: string[]) {
  for (const key of keys) if (group[key]) return group[key];
  return "";
}
function formatActionLabel(value?: string) {
  return formatEnumLabel(value, "Embed");
}

function formatTimestamp(value?: string) {
  if (!value) return "—";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className={`rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <Text intent="muted" size="sm">
        {label}
      </Text>
      <div
        className={`mt-2 text-3xl font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
function StatusPill({ value }: { value: string }) {
  return <EnumBadge value={value || "unknown"} />;
}

function RuleRow({
  row,
  usage,
  canManage,
  loading,
  onDetails,
  onEdit,
  onSetEnabled,
  onDelete,
  onBackfill,
  onAnalyze,
}: {
  row: SemanticRow;
  usage?: UsageByRule[string];
  canManage: boolean;
  loading: boolean;
  onDetails: () => void;
  onEdit: () => void;
  onSetEnabled: (enabled: boolean) => void;
  onDelete: () => void;
  onBackfill: (binding: string) => void;
  onAnalyze: (binding: string) => void;
}) {
  const primaryBinding = row.rule.bindings[0]?.key || "";
  const failed =
    (row.rule.status?.queueDepthFailedPermanent ?? 0) +
    (row.rule.status?.queueDepthFailedRetryable ?? 0);
  return (
    <tr className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40">
      <td className="px-4 py-3">
        <SpaceLabel spaceId={row.space.spaceId} name={row.space.name} link />
        <div
          className={`mt-2 ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
        >
          <DomainLabel
            domainId={row.rule.domainId}
            name={row.domain?.name}
            domainKey={row.domain?.key}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <div
          className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          {row.rule.displayName || row.rule.key}
        </div>
        <div
          className={`mt-1 ${themeClasses.text.parts.subtleLight} ${themeClasses.text.parts.darkMuted}`}
        >
          {row.rule.description || "No description"}
        </div>
        <div className="mt-1">
          <ResourceIdText value={row.rule.semanticRuleId} />
        </div>
        {row.rule.status && (
          <div className={`mt-2 text-xs ${themeClasses.text.parts.mutedLight}`}>
            Pending {row.rule.status.queueDepthPending} · Running{" "}
            {row.rule.status.queueDepthRunning} · Failed {failed}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusPill value={row.rule.state} />
        <div className={`mt-2 text-xs ${themeClasses.text.parts.mutedLight}`}>
          {row.rule.enabled ? "Enabled" : "Disabled"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="space-y-2">
          {row.rule.bindings.length === 0 ? (
            <span className={`${themeClasses.text.parts.mutedLight}`}>
              No bindings
            </span>
          ) : (
            row.rule.bindings.map((binding) => (
              <div
                key={binding.key}
                className="rounded-md border border-slate-200 p-2 dark:border-slate-800"
              >
                <div className="font-medium">
                  {binding.key}{" "}
                  <span
                    className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                  >
                    {binding.purpose}
                  </span>
                </div>
                <div
                  className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  profile={binding.intelligenceProfileKey || "—"}
                  {binding.intelligenceProfileId &&
                  binding.intelligenceProfileKey !==
                    binding.intelligenceProfileId ? (
                    <>
                      {" "}
                      (<ResourceIdText value={binding.intelligenceProfileId} />)
                    </>
                  ) : null}{" "}
                  · store={binding.vectorStoreKey || "—"}
                  {binding.vectorStoreId &&
                  binding.vectorStoreKey !== binding.vectorStoreId ? (
                    <>
                      {" "}
                      (<ResourceIdText value={binding.vectorStoreId} />)
                    </>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <StatusPill
                    value={
                      binding.searchIndex?.state ||
                      "SEARCH_INDEX_STATE_UNSPECIFIED"
                    }
                  />
                  <span>{binding.searchIndex?.liveRecordCount ?? 0} live</span>
                  {binding.searchIndex?.lastError && (
                    <span className="text-red-700 dark:text-red-300">
                      {binding.searchIndex.lastError}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {usage ? (
          <div>
            <div className="font-medium">
              {usage.totalTokens.toLocaleString()} tokens
            </div>
            <div className={`text-xs ${themeClasses.text.parts.mutedLight}`}>
              {usage.requestCount} requests ·{" "}
              {usage.failedCount + usage.deniedCount} failed/denied
            </div>
          </div>
        ) : (
          <span
            className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
          >
            No usage reported
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onDetails}>
            Details
          </Button>
          {canManage ? (
            <>
              <Button variant="secondary" disabled={loading} onClick={onEdit}>
                Edit
              </Button>
              <Button
                variant="secondary"
                disabled={loading}
                onClick={() => onSetEnabled(!row.rule.enabled)}
              >
                {row.rule.enabled ? "Disable" : "Enable"}
              </Button>
              <Button
                variant="secondary"
                disabled={loading || !primaryBinding}
                onClick={() => onBackfill(primaryBinding)}
              >
                Backfill
              </Button>
              <Button
                variant="secondary"
                disabled={loading || !primaryBinding}
                onClick={() => onAnalyze(primaryBinding)}
              >
                Analyze
              </Button>
              <Button variant="secondary" disabled={loading} onClick={onDelete}>
                Delete
              </Button>
            </>
          ) : (
            <span
              className={`self-center ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
            >
              Read-only
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

function SemanticSearchPanel({
  draft,
  setDraft,
  spaces,
  domains,
  rules,
  bindings,
  result,
  error,
  loading,
  onSearch,
}: {
  draft: SearchDraft;
  setDraft: (draft: SearchDraft) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  rules: SemanticRow[];
  bindings: SemanticGenerationRuleSummary["bindings"];
  result: SemanticSearchResponse | null;
  error: string;
  loading: boolean;
  onSearch: () => void;
}) {
  const update = (key: keyof SearchDraft, value: string) =>
    setDraft({
      ...draft,
      [key]: value,
      ...(key === "spaceId"
        ? { domainId: "", semanticRuleId: "", embeddingBindingKey: "" }
        : {}),
      ...(key === "domainId"
        ? { semanticRuleId: "", embeddingBindingKey: "" }
        : {}),
      ...(key === "semanticRuleId" ? { embeddingBindingKey: "" } : {}),
    });
  return (
    <div
      className={`space-y-4 rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel} p-5`}
    >
      <div>
        <Text
          as="h3"
          className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          Semantic search
        </Text>
        <Text intent="muted" size="sm" className="mt-1">
          Search committed semantic rule binding state. Rule, binding, limit,
          and minimum score are optional.
        </Text>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="grid gap-3 md:grid-cols-3">
        <Select
          label="Search space"
          value={draft.spaceId}
          onChange={(value) => update("spaceId", value)}
          options={spaces.map((space) => ({
            value: space.spaceId,
            label: space.name || space.spaceId,
          }))}
          placeholder="Select space"
        />
        <Select
          label="Search domain"
          value={draft.domainId}
          onChange={(value) => update("domainId", value)}
          options={domains.map((domain) => ({
            value: domain.domainId,
            label: domain.name || domain.key,
          }))}
          placeholder="Select domain"
          disabled={!draft.spaceId}
        />
        <Select
          label="Rule"
          value={draft.semanticRuleId}
          onChange={(value) => update("semanticRuleId", value)}
          options={rules.map((row) => ({
            value: row.rule.semanticRuleId,
            label: row.rule.displayName || row.rule.key,
            hint: row.rule.key,
          }))}
          placeholder="All searchable rules"
          disabled={!draft.domainId}
        />
        <Select
          label="Binding"
          value={draft.embeddingBindingKey}
          onChange={(value) => update("embeddingBindingKey", value)}
          options={bindings.map((binding) => ({
            value: binding.key,
            label: binding.key,
            hint: binding.searchIndex?.state || binding.purpose,
          }))}
          placeholder="All bindings"
          disabled={!draft.semanticRuleId}
        />
        <Field
          label="Limit"
          value={draft.limit}
          onChange={(value) => update("limit", value)}
        />
        <Field
          label="Minimum score"
          value={draft.minScore}
          onChange={(value) => update("minScore", value)}
        />
      </div>
      <label
        className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
      >
        Search text
        <Input
          className="mt-1 w-full"
          value={draft.query}
          onChange={(event) => update("query", event.target.value)}
          placeholder="e.g. embedding profile vector store"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={
            loading || !draft.spaceId || !draft.domainId || !draft.query.trim()
          }
          onClick={onSearch}
        >
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>
      {result && (
        <div className="space-y-3">
          <SearchWarnings warnings={result.warnings} />
          {result.results.length === 0 ? (
            <Text intent="muted" size="sm">
              No semantic search results.
            </Text>
          ) : (
            result.results.map((item) => (
              <div
                key={`${item.recordId}-${item.nodeId}`}
                className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Text
                      className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
                    >
                      {searchResultTitle(item.node)}
                    </Text>
                    <Text intent="muted" size="sm" className="mt-1">
                      {item.snippet || "Matched graph node"}
                    </Text>
                  </div>
                  <span className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    score {item.score.toFixed(4)}
                  </span>
                </div>
                <div
                  className={`mt-2 text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  rule=
                  <ResourceIdText value={item.semanticRuleId} /> · binding=
                  {item.embeddingBindingKey || "—"} · node=
                  <ResourceIdText value={item.nodeId} />
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SearchWarnings({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      <div className="font-medium">Search warnings</div>
      <ul className="mt-1 list-disc pl-5">
        {warnings.map((warning, index) => (
          <li key={index}>{warning}</li>
        ))}
      </ul>
    </div>
  );
}
function searchResultTitle(
  node: Record<string, unknown> | null | undefined,
): string {
  const props = node?.properties as Record<string, unknown> | undefined;
  const payload = node?.payload as Record<string, unknown> | undefined;
  return String(
    props?.title ||
      payload?.title ||
      props?.name ||
      payload?.name ||
      node?.nodeId ||
      "Semantic result",
  );
}

function RuleEditor({
  mode,
  draft,
  setDraft,
  spaces,
  domains,
  profiles,
  validation,
  loading,
  onValidate,
  onSave,
  onCancel,
}: {
  mode: DraftMode;
  draft: RuleDraft;
  setDraft: (draft: RuleDraft) => void;
  spaces: SpaceInfo[];
  domains: DomainInfo[];
  profiles: ProfileOption[];
  validation: ValidateSemanticRuleResponse | null;
  loading: boolean;
  onValidate: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const update = (key: keyof RuleDraft, value: string | boolean) =>
    setDraft({ ...draft, [key]: value });
  const updateSelectorMode = (value: string) =>
    setDraft({
      ...draft,
      selectorMode: value,
      selectorGql: value === "gql" ? draft.selectorGql : "",
      targetAlias: value === "gql" ? draft.targetAlias.trim() || "n" : "",
    });
  const domainsForSpace = domains.filter(
    (domain) => !draft.spaceId || domain.spaceId === draft.spaceId,
  );
  const profileOptions = profiles.filter(
    (profile) =>
      (!draft.spaceId || profile.spaceId === draft.spaceId) &&
      (!draft.domainId ||
        profile.domainIds.length === 0 ||
        profile.domainIds.includes(draft.domainId)),
  );
  const profileOptionsWithCurrent =
    draft.intelligenceProfile &&
    !profileOptions.some(
      (profile) => profile.value === draft.intelligenceProfile,
    )
      ? [
          {
            value: draft.intelligenceProfile,
            label: `${draft.intelligenceProfile} (current)`,
            spaceId: draft.spaceId,
            domainIds: [],
          },
          ...profileOptions,
        ]
      : profileOptions;
  const selectorMode = draft.selectorMode || "node_type";
  return (
    <div className="rounded-xl border border-cyan-200 bg-cyan-50/60 p-5 dark:border-cyan-900 dark:bg-cyan-950/20">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Text
            as="h3"
            className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
          >
            {mode === "create" ? "Create semantic rule" : "Edit semantic rule"}
          </Text>
          <Text intent="muted" size="sm" className="mt-1">
            Validate the rule before saving. GQL selectors should be bounded
            with max results.
          </Text>
        </div>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Select
          label="Space"
          value={draft.spaceId}
          onChange={(value) => update("spaceId", value)}
          options={spaces.map((space) => ({
            value: space.spaceId,
            label: space.name || space.spaceId,
          }))}
        />
        <Select
          label="Domain"
          value={draft.domainId}
          onChange={(value) => update("domainId", value)}
          options={domainsForSpace.map((domain) => ({
            value: domain.domainId,
            label: domain.name || domain.key,
          }))}
        />
        <Field
          label="Key"
          value={draft.key}
          onChange={(value) => update("key", value)}
        />
        <Field
          label="Display name"
          value={draft.displayName}
          onChange={(value) => update("displayName", value)}
        />
        <Field
          label="Description"
          value={draft.description}
          onChange={(value) => update("description", value)}
        />
        <Field
          label="Labels"
          value={draft.labels}
          onChange={(value) => update("labels", value)}
        />
        <Field
          label="Trigger events"
          value={draft.triggerEvents}
          onChange={(value) => update("triggerEvents", value)}
        />
        <Field
          label="Dirty cooldown"
          value={draft.dirtyCooldown}
          onChange={(value) => update("dirtyCooldown", value)}
        />
        <Select
          label="Selector"
          value={selectorMode}
          onChange={updateSelectorMode}
          options={["node_type", "gql", "explicit_nodes"].map((value) => ({
            value,
            label: value,
          }))}
        />
        {selectorMode === "gql" && (
          <>
            <Field
              label="GQL selector"
              value={draft.selectorGql}
              onChange={(value) => update("selectorGql", value)}
            />
            <Field
              label="Target alias"
              value={draft.targetAlias}
              onChange={(value) => update("targetAlias", value)}
            />
          </>
        )}
        <Field
          label="Max results"
          value={draft.maxResults}
          onChange={(value) => update("maxResults", value)}
        />
        <Select
          label="Source"
          value={draft.sourceMode}
          onChange={(value) => update("sourceMode", value)}
          options={["self", "subtree", "context_query"].map((value) => ({
            value,
            label: value,
          }))}
        />
        <Field
          label="Include properties"
          value={draft.includeProperties}
          onChange={(value) => update("includeProperties", value)}
        />
        <Field
          label="Exclude properties"
          value={draft.excludeProperties}
          onChange={(value) => update("excludeProperties", value)}
        />
        <Field
          label="Context GQL"
          value={draft.contextGql}
          onChange={(value) => update("contextGql", value)}
        />
        <Field
          label="Binding key"
          value={draft.bindingKey}
          onChange={(value) => update("bindingKey", value)}
        />
        <Field
          label="Purpose"
          value={draft.purpose}
          onChange={(value) => update("purpose", value)}
        />
        <Select
          label="Intelligence profile"
          value={draft.intelligenceProfile}
          onChange={(value) => update("intelligenceProfile", value)}
          options={profileOptionsWithCurrent.map(({ value, label }) => ({
            value,
            label,
          }))}
          placeholder={
            profileOptions.length === 0
              ? "No embedding profiles available"
              : "Select profile"
          }
        />
        <Field
          label="Vector store"
          value={draft.vectorStore}
          onChange={(value) => update("vectorStore", value)}
        />
        <Field
          label="Physical index"
          value={draft.physicalIndex}
          onChange={(value) => update("physicalIndex", value)}
        />
        <label
          className={`flex items-end gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
          />{" "}
          Enabled
        </label>
        <label
          className={`flex items-end gap-2 text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
        >
          <input
            type="checkbox"
            checked={draft.searchable}
            onChange={(event) => update("searchable", event.target.checked)}
          />{" "}
          Searchable
        </label>
      </div>
      {validation && <ValidationPanel validation={validation} />}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={loading} onClick={onValidate}>
          Validate
        </Button>
        <Button disabled={loading} onClick={onSave}>
          {mode === "create" ? "Create rule" : "Save rule"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`block text-sm font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
    >
      {label}
      <Input
        className="mt-1 w-full"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
function ValidationPanel({
  validation,
}: {
  validation: ValidateSemanticRuleResponse;
}) {
  return (
    <div
      className={`mt-4 rounded-md border p-3 text-sm ${validation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"}`}
    >
      <div className="font-medium">
        {validation.valid ? "Rule is valid" : "Rule has validation errors"}
      </div>
      {validation.diagnostics.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {validation.diagnostics.map(
            (diag: SemanticRuleValidationDiagnostic, index) => (
              <li key={`${diag.path}-${index}`}>
                {diag.severity} {diag.path}: {diag.message}
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
function csv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
function draftToRule(draft: RuleDraft): SemanticGenerationRule {
  const labels = csv(draft.labels);
  const selectorMode = draft.selectorMode || "node_type";
  const maxResults = Number(draft.maxResults) || 0;
  const selector =
    selectorMode === "gql"
      ? {
          mode: "gql",
          labels: [],
          gql: draft.selectorGql,
          targetAlias: draft.targetAlias.trim() || "n",
          maxResults,
          nodeIds: [],
        }
      : selectorMode === "explicit_nodes"
        ? {
            mode: "explicit_nodes",
            labels: [],
            gql: "",
            targetAlias: "",
            maxResults,
            nodeIds: [],
          }
        : {
            mode: "node_type",
            labels,
            gql: "",
            targetAlias: "",
            maxResults,
            nodeIds: [],
          };
  return {
    semanticRuleId: draft.semanticRuleId || undefined,
    spaceId: draft.spaceId,
    domainId: draft.domainId,
    key: draft.key,
    displayName: draft.displayName || draft.key,
    description: draft.description,
    enabled: draft.enabled,
    trigger: {
      events: csv(draft.triggerEvents).length
        ? csv(draft.triggerEvents)
        : ["changed"],
      labels,
      debounce: draft.dirtyCooldown,
    },
    selector,
    source: {
      mode: draft.sourceMode,
      includeProperties: csv(draft.includeProperties),
      excludeProperties: csv(draft.excludeProperties),
      maxDepth: null,
      minimumTextLength: 0,
      contextGql: draft.contextGql,
    },
    embeddings: [
      {
        key: draft.bindingKey,
        purpose: draft.purpose,
        intelligenceProfile: draft.intelligenceProfile,
        intelligenceProfileId: "",
        vectorStore: draft.vectorStore,
        vectorStoreId: "",
        enabled: true,
      },
    ],
    maintenance: {
      dirtyCooldown: draft.dirtyCooldown,
      maxBatchSize: 0,
      workerConcurrency: 0,
    },
    storage: {
      searchable: draft.searchable,
      physicalIndex: draft.physicalIndex || "exact",
    },
  };
}
function ruleToDraft(rule: SemanticGenerationRule): RuleDraft {
  const binding = rule.embeddings[0];
  return {
    semanticRuleId: rule.semanticRuleId || "",
    spaceId: rule.spaceId,
    domainId: rule.domainId,
    key: rule.key,
    displayName: rule.displayName,
    description: rule.description,
    enabled: rule.enabled,
    labels: (rule.selector?.labels || rule.trigger?.labels || []).join(","),
    triggerEvents: (rule.trigger?.events || ["changed"]).join(","),
    dirtyCooldown:
      rule.maintenance?.dirtyCooldown || rule.trigger?.debounce || "30s",
    selectorMode: rule.selector?.mode || "node_type",
    selectorGql: rule.selector?.mode === "gql" ? rule.selector?.gql || "" : "",
    targetAlias:
      rule.selector?.mode === "gql" ? rule.selector?.targetAlias || "n" : "",
    maxResults: String(rule.selector?.maxResults || 100),
    sourceMode: rule.source?.mode || "self",
    includeProperties: (rule.source?.includeProperties || []).join(","),
    excludeProperties: (rule.source?.excludeProperties || []).join(","),
    contextGql: rule.source?.contextGql || "",
    bindingKey: binding?.key || "search",
    purpose: binding?.purpose || "search",
    intelligenceProfile:
      binding?.intelligenceProfile || binding?.intelligenceProfileId || "",
    vectorStore: binding?.vectorStore || binding?.vectorStoreId || "mycel-file",
    searchable: rule.storage?.searchable ?? true,
    physicalIndex: rule.storage?.physicalIndex || "exact",
  };
}
function summaryToRule(
  summary: SemanticGenerationRuleSummary,
): SemanticGenerationRule {
  return {
    semanticRuleId: summary.semanticRuleId,
    spaceId: summary.spaceId,
    domainId: summary.domainId,
    key: summary.key,
    displayName: summary.displayName,
    description: summary.description,
    enabled: summary.enabled,
    embeddings: summary.bindings.map((binding) => ({
      key: binding.key,
      purpose: binding.purpose,
      intelligenceProfile: binding.intelligenceProfileKey,
      intelligenceProfileId: binding.intelligenceProfileId,
      vectorStore: binding.vectorStoreKey,
      vectorStoreId: binding.vectorStoreId,
      enabled: binding.enabled,
    })),
    storage: { searchable: true, physicalIndex: "exact" },
  };
}
function MaintenanceWorkTable({
  items,
  canManage,
  loading,
  onRetry,
  onCancel,
}: {
  items: SemanticMaintenanceWorkItemInfo[];
  canManage: boolean;
  loading: boolean;
  onRetry: (item: SemanticMaintenanceWorkItemInfo) => void;
  onCancel: (item: SemanticMaintenanceWorkItemInfo) => void;
}) {
  if (items.length === 0)
    return (
      <Text intent="muted" size="sm" className="mt-4">
        No recent embedding generation work items found.
      </Text>
    );
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
        <thead
          className={`bg-slate-100 text-left text-xs uppercase tracking-wide ${themeClasses.text.parts.subtleLight} dark:bg-slate-950/60 ${themeClasses.text.parts.darkMuted}`}
        >
          <tr>
            <TableHead className="px-3 py-2">Triggered work</TableHead>
            <TableHead className="px-3 py-2">Rule / binding</TableHead>
            <TableHead className="px-3 py-2">Target</TableHead>
            <TableHead className="px-3 py-2">Result</TableHead>
            <TableHead className="px-3 py-2">Updated</TableHead>
            <TableHead className="px-3 py-2">Actions</TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {items.map((item) => (
            <tr key={item.workItemId}>
              <td className="px-3 py-2">
                <div>{formatActionLabel(item.action || "embed")}</div>
                <div>
                  <ResourceIdText value={item.workItemId} />
                </div>
                <div
                  className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  {formatTimestamp(item.createdAt)}
                </div>
              </td>
              <td className="px-3 py-2">
                <ResourceIdText value={item.semanticRuleId} />
                <div
                  className={`text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  {item.embeddingBindingKey || "—"}
                </div>
              </td>
              <td className="px-3 py-2">
                <ResourceIdText value={item.targetNodeId} />
              </td>
              <td className="px-3 py-2">
                <StatusPill value={item.status || "unknown"} />
                <div
                  className={`mt-1 text-xs ${themeClasses.text.parts.mutedLight}`}
                >
                  Attempts {item.attemptCount}
                </div>
                {(item.lastErrorCategory || item.lastErrorMessageSanitized) && (
                  <div
                    className="mt-1 max-w-md truncate text-xs text-red-700 dark:text-red-300"
                    title={item.lastErrorMessageSanitized}
                  >
                    {item.lastErrorCategory || item.lastErrorMessageSanitized}
                  </div>
                )}
              </td>
              <td
                className={`px-3 py-2 text-xs ${themeClasses.text.parts.mutedLight}`}
              >
                {formatTimestamp(
                  item.updatedAt || item.claimedUntil || item.notBefore,
                )}
              </td>
              <td className="px-3 py-2">
                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      disabled={loading}
                      onClick={() => onRetry(item)}
                    >
                      Retry
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={loading}
                      onClick={() => onCancel(item)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}
                  >
                    Read-only
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function DetailDrawer({
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
              Semantic rule diagnostic payload.
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
