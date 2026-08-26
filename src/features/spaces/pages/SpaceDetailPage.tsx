import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button, Alert, Select, Text } from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import { analyzeSemanticDirtyWork as defaultAnalyzeSemanticDirtyWork, backfillSemanticRule as defaultBackfillSemanticRule, cancelSemanticMaintenanceWork as defaultCancelSemanticMaintenanceWork, createAutomation as defaultCreateAutomation, deleteAutomation as defaultDeleteAutomation, disableAutomation as defaultDisableAutomation, enableAutomation as defaultEnableAutomation, executeGql, executeGqlScript, getAutomation as defaultGetAutomation, getAutomationRun as defaultGetAutomationRun, getDomainSchema as defaultGetDomainSchema, getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus, getSpace as defaultGetSpace, listAutomationInvocations as defaultListAutomationInvocations, listAutomations as defaultListAutomations, listDomains as defaultListDomains, listInferenceProfiles as defaultListInferenceProfiles, listSemanticRules as defaultListSemanticRules, listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork, lookupSpaceRoute as defaultLookupSpaceRoute, processSemanticDirtyWork as defaultProcessSemanticDirtyWork, retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork, updateAutomation as defaultUpdateAutomation, validateAutomation as defaultValidateAutomation } from "../../../services/adminService";
import type { AutomationActionInput, AutomationDefinitionInfo, AutomationDefinitionInput, AutomationDefinitionSummaryInfo, AutomationInvocationSummaryInfo, AutomationRunInfo, DomainAutomationInput, GetAutomationRunInput, ListAutomationInvocationsInput, ListAutomationInvocationsResponseInfo, ListAutomationsResponseInfo, UpdateAutomationInput, ValidateAutomationInfo } from "../../../types/automations";
import type { PrincipalSession } from "../../../types/auth";
import type { LookupSpaceRouteInput, LookupSpaceRouteResult } from "../../../types/cluster";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../types/domains";
import type { DomainSchemaInfo, GetDomainSchemaInput } from "../../../types/schemas";
import type { InferenceProfileInfo, ListInferenceProfilesInput, ListInferenceProfilesResponse } from "../../../types/inference";
import type { ListSemanticRulesInput, ListSemanticRulesResponse, SemanticGenerationRuleSummary } from "../../../types/semantic";
import type { AnalyzeSemanticDirtyWorkInput, BackfillSemanticRuleInput, GetSemanticMaintenanceStatusInput, ListSemanticMaintenanceWorkInput, ListSemanticMaintenanceWorkResponse, ProcessSemanticDirtyWorkInput, SemanticMaintenanceStatusInfo, SemanticMaintenanceWorkActionInput, SemanticMaintenanceWorkItemInfo } from "../../../types/semanticMaintenance";
import type { SpaceInfo } from "../../../types/spaces";
import { GraphResultCanvas } from "../components/GraphResultCanvas";
import { aggregateRowsFromQueryResponse, diagnosticsFromQueryResponse, diagnosticsMessage, graphFromQueryResponse, pathGraphsFromQueryResponse } from "../components/graphResultExtraction";
import { SpaceStateBadge } from "../components/SpaceStateBadge";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err || fallback;
  return fallback;
}

export type SpaceDetailPageProps = {
  getSpaceService?: (spaceId: string) => Promise<SpaceInfo>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listSemanticRulesService?: (input: ListSemanticRulesInput) => Promise<ListSemanticRulesResponse>;
  getDomainSchemaService?: (input: GetDomainSchemaInput) => Promise<DomainSchemaInfo>;
  getSemanticMaintenanceStatusService?: (input: GetSemanticMaintenanceStatusInput) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (input: ListSemanticMaintenanceWorkInput) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (input: AnalyzeSemanticDirtyWorkInput) => Promise<unknown>;
  processSemanticDirtyWorkService?: (input: ProcessSemanticDirtyWorkInput) => Promise<unknown>;
  backfillSemanticRuleService?: (input: BackfillSemanticRuleInput) => Promise<unknown>;
  lookupSpaceRouteService?: (input: LookupSpaceRouteInput) => Promise<LookupSpaceRouteResult>;
  listAutomationsService?: (input: DomainAutomationInput) => Promise<ListAutomationsResponseInfo>;
  getAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  enableAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  disableAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  validateAutomationService?: (input: AutomationDefinitionInput) => Promise<ValidateAutomationInfo>;
  createAutomationService?: (input: AutomationDefinitionInput) => Promise<AutomationDefinitionInfo>;
  updateAutomationService?: (input: UpdateAutomationInput) => Promise<AutomationDefinitionInfo>;
  deleteAutomationService?: (input: AutomationActionInput) => Promise<void>;
  listAutomationInvocationsService?: (input: ListAutomationInvocationsInput) => Promise<ListAutomationInvocationsResponseInfo>;
  getAutomationRunService?: (input: GetAutomationRunInput) => Promise<AutomationRunInfo>;
  listInferenceProfilesService?: (input: ListInferenceProfilesInput) => Promise<ListInferenceProfilesResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function SpaceDetailPage({ getSpaceService = defaultGetSpace, listDomainsService = defaultListDomains, listSemanticRulesService = defaultListSemanticRules, getDomainSchemaService = defaultGetDomainSchema, getSemanticMaintenanceStatusService = defaultGetSemanticMaintenanceStatus, listSemanticMaintenanceWorkService = defaultListSemanticMaintenanceWork, retrySemanticMaintenanceWorkService = defaultRetrySemanticMaintenanceWork, cancelSemanticMaintenanceWorkService = defaultCancelSemanticMaintenanceWork, analyzeSemanticDirtyWorkService = defaultAnalyzeSemanticDirtyWork, processSemanticDirtyWorkService = defaultProcessSemanticDirtyWork, backfillSemanticRuleService = defaultBackfillSemanticRule, lookupSpaceRouteService = defaultLookupSpaceRoute, listAutomationsService = defaultListAutomations, getAutomationService = defaultGetAutomation, enableAutomationService = defaultEnableAutomation, disableAutomationService = defaultDisableAutomation, validateAutomationService = defaultValidateAutomation, createAutomationService = defaultCreateAutomation, updateAutomationService = defaultUpdateAutomation, deleteAutomationService = defaultDeleteAutomation, listAutomationInvocationsService = defaultListAutomationInvocations, getAutomationRunService = defaultGetAutomationRun, listInferenceProfilesService = defaultListInferenceProfiles, principalContext }: SpaceDetailPageProps) {
  const { spaceId = "" } = useParams();
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [domainsLoadingMore, setDomainsLoadingMore] = useState(false);
  const [domainsError, setDomainsError] = useState("");
  const [domainsNextPageToken, setDomainsNextPageToken] = useState("");
  const [includeSystemDomains, setIncludeSystemDomains] = useState(false);
  const [semanticRules, setSemanticRules] = useState<SemanticGenerationRuleSummary[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(true);
  const [semanticError, setSemanticError] = useState("");
  const [includeDisabledRules, setIncludeDisabledRules] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState<SemanticMaintenanceStatusInfo | null>(null);
  const [maintenanceWork, setMaintenanceWork] = useState<SemanticMaintenanceWorkItemInfo[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);
  const [maintenanceError, setMaintenanceError] = useState("");
  const [maintenanceWorkStatus, setMaintenanceWorkStatus] = useState("");
  const [confirmMaintenanceAction, setConfirmMaintenanceAction] = useState<{ kind: "retry" | "cancel"; item: SemanticMaintenanceWorkItemInfo } | null>(null);
  const [maintenanceActionLoading, setMaintenanceActionLoading] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState("");
  const [activeTab, setActiveTab] = useState<"general" | "domains" | "schemas" | "automations" | "semantic" | "query">("general");
  const [spaceRoute, setSpaceRoute] = useState<LookupSpaceRouteResult | null>(null);
  const [spaceRouteError, setSpaceRouteError] = useState("");
  const [domainSchemas, setDomainSchemas] = useState<Record<string, DomainSchemaInfo | null>>({});
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState("");
  const [automationRows, setAutomationRows] = useState<Array<{ domain: DomainInfo; automation: AutomationDefinitionSummaryInfo }>>([]);
  const [automationInvocations, setAutomationInvocations] = useState<Record<string, AutomationInvocationSummaryInfo[]>>({});
  const [automationDetail, setAutomationDetail] = useState("");
  const [automationRunDetail, setAutomationRunDetail] = useState("");
  const [automationEditor, setAutomationEditor] = useState<{ mode: "create" | "edit"; domainId: string; automationId?: string; definitionJson: string } | null>(null);
  const [automationProfiles, setAutomationProfiles] = useState<InferenceProfileInfo[]>([]);
  const [automationProfileId, setAutomationProfileId] = useState("");
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationLoading, setAutomationLoading] = useState(false);
  const [automationError, setAutomationError] = useState("");
  const canManageSemantic = canUseCapability(principalContext, "semantic.manage");
  const canManageAutomations = canUseCapability(principalContext, "automation.manage");

  const loadDomains = useCallback(
    async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
      if (!spaceId) return;
      setDomainsError("");
      if (append) setDomainsLoadingMore(true);
      else setDomainsLoading(true);

      try {
        const response = await listDomainsService({
          spaceId,
          pageSize: 100,
          pageToken,
          includeSystem: includeSystemDomains,
        });
        setDomains((current) => (append ? [...current, ...response.domains] : response.domains));
        setDomainsNextPageToken(response.nextPageToken);
      } catch (err) {
        setDomainsError(err instanceof Error ? err.message : "Failed to load domains");
      } finally {
        if (append) setDomainsLoadingMore(false);
        else setDomainsLoading(false);
      }
    },
    [includeSystemDomains, listDomainsService, spaceId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSpace() {
      if (!spaceId) {
        setError("Space ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await getSpaceService(spaceId);
        if (!cancelled) setSpace(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load space");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSpace();

    return () => {
      cancelled = true;
    };
  }, [getSpaceService, spaceId]);

  useEffect(() => {
    void loadDomains();
  }, [loadDomains]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoute() {
      if (!spaceId) return;
      setSpaceRouteError("");
      try {
        const route = await lookupSpaceRouteService({ spaceId });
        if (!cancelled) setSpaceRoute(route);
      } catch (err) {
        if (!cancelled) {
          setSpaceRoute(null);
          setSpaceRouteError(err instanceof Error ? err.message : "Raft route unavailable");
        }
      }
    }
    void loadRoute();
    return () => { cancelled = true; };
  }, [lookupSpaceRouteService, spaceId]);

  const loadSchemas = useCallback(async () => {
    setSchemaLoading(true);
    setSchemaError("");
    try {
      const pairs = await Promise.all(domains.map(async (domain) => {
        try {
          const schema = await getDomainSchemaService({ domainId: domain.domainId });
          return [domain.domainId, schema] as const;
        } catch {
          return [domain.domainId, null] as const;
        }
      }));
      setDomainSchemas(Object.fromEntries(pairs));
    } catch (err) {
      setSchemaError(err instanceof Error ? err.message : "Failed to load schemas");
    } finally {
      setSchemaLoading(false);
    }
  }, [domains, getDomainSchemaService]);

  useEffect(() => {
    if (activeTab === "schemas") void loadSchemas();
  }, [activeTab, loadSchemas]);

  const loadAutomations = useCallback(async () => {
    setAutomationLoading(true);
    setAutomationError("");
    try {
      const rows: Array<{ domain: DomainInfo; automation: AutomationDefinitionSummaryInfo }> = [];
      const invocations: Record<string, AutomationInvocationSummaryInfo[]> = {};
      await Promise.all(domains.map(async (domain) => {
        const response = await listAutomationsService({ domainId: domain.domainId });
        for (const automation of response.automations) {
          rows.push({ domain, automation });
          const history = await listAutomationInvocationsService({ domainId: domain.domainId, automationId: automation.id, limit: 5 });
          invocations[`${domain.domainId}:${automation.id}`] = history.invocations;
        }
      }));
      setAutomationRows(rows.sort((a, b) => `${a.domain.name}:${a.automation.id}`.localeCompare(`${b.domain.name}:${b.automation.id}`)));
      setAutomationInvocations(invocations);
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to load automations"));
    } finally {
      setAutomationLoading(false);
    }
  }, [domains, listAutomationInvocationsService, listAutomationsService]);

  useEffect(() => {
    if (activeTab === "automations") void loadAutomations();
  }, [activeTab, loadAutomations]);

  const loadAutomationProfiles = useCallback(async (domainId = "") => {
    if (!spaceId) return;
    try {
      const response = await listInferenceProfilesService({ spaceId, domainId, purpose: "automation", includeDisabled: false, pageSize: 100 });
      setAutomationProfiles(response.inferenceProfiles);
    } catch {
      setAutomationProfiles([]);
    }
  }, [listInferenceProfilesService, spaceId]);

  function openCreateAutomation(domainId = domains[0]?.domainId || "") {
    const definition = {
      id: "new-automation",
      name: "New automation",
      version: 1,
      enabled: true,
      labels: [],
      events: ["node.updated"],
      inference: { operation: "chat", profile: "" },
      actions: [],
    };
    setAutomationProfileId("");
    setAutomationEditor({ mode: "create", domainId, definitionJson: JSON.stringify(definition, null, 2) });
    void loadAutomationProfiles(domainId);
  }

  async function openEditAutomation(domainId: string, automationId: string) {
    setAutomationError("");
    try {
      const detail = await getAutomationService({ domainId, automationId });
      setAutomationEditor({ mode: "edit", domainId, automationId, definitionJson: detail.definitionJson });
      try {
        const parsed = JSON.parse(detail.definitionJson) as { inference?: { profile?: string; profileId?: string } };
        setAutomationProfileId(parsed.inference?.profile || parsed.inference?.profileId || "");
      } catch { setAutomationProfileId(""); }
      await loadAutomationProfiles(domainId);
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to load automation"));
    }
  }

  function applyAutomationProfile(profileKeyOrId: string) {
    setAutomationProfileId(profileKeyOrId);
    setAutomationEditor((current) => {
      if (!current) return current;
      try {
        const parsed = JSON.parse(current.definitionJson) as Record<string, unknown>;
        const selected = automationProfiles.find((profile) => profile.key === profileKeyOrId || profile.inferenceProfileId === profileKeyOrId);
        parsed.inference = { ...(typeof parsed.inference === "object" && parsed.inference !== null ? parsed.inference : {}), operation: selected?.operation || "chat", profile: selected?.key || profileKeyOrId, profileId: selected?.inferenceProfileId || "" };
        return { ...current, definitionJson: JSON.stringify(parsed, null, 2) };
      } catch { return current; }
    });
  }

  async function deleteAutomationRow(domainId: string, automationId: string) {
    if (!window.confirm(`Delete automation ${automationId}?`)) return;
    setAutomationSaving(true);
    setAutomationError("");
    try {
      await deleteAutomationService({ domainId, automationId });
      await loadAutomations();
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to delete automation"));
    } finally {
      setAutomationSaving(false);
    }
  }

  async function saveAutomationEditor() {
    if (!automationEditor) return;
    setAutomationSaving(true);
    setAutomationError("");
    try {
      const validation = await validateAutomationService({ domainId: automationEditor.domainId, definitionJson: automationEditor.definitionJson });
      if (!validation.valid) throw new Error(validation.error || "Automation definition is invalid");
      const definitionJson = validation.normalizedDefinitionJson || automationEditor.definitionJson;
      if (automationEditor.mode === "create") await createAutomationService({ domainId: automationEditor.domainId, definitionJson });
      else await updateAutomationService({ domainId: automationEditor.domainId, automationId: automationEditor.automationId || "", definitionJson });
      setAutomationEditor(null);
      await loadAutomations();
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to save automation"));
    } finally {
      setAutomationSaving(false);
    }
  }

  async function toggleAutomation(domainId: string, automationId: string, enabled: boolean) {
    setAutomationError("");
    try {
      if (enabled) await disableAutomationService({ domainId, automationId });
      else await enableAutomationService({ domainId, automationId });
      await loadAutomations();
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to update automation"));
    }
  }

  async function showAutomation(domainId: string, automationId: string) {
    setAutomationError("");
    try {
      const detail = await getAutomationService({ domainId, automationId });
      setAutomationDetail(detail.definitionJson);
    } catch (err) {
      setAutomationError(errorMessage(err, "Failed to load automation"));
    }
  }

  async function showAutomationRun(domainId: string, runId: string) {
    setAutomationError("");
    try {
      const detail = await getAutomationRunService({ domainId, runId });
      setAutomationRunDetail(detail.runJson);
    } catch (err) {
      setAutomationError(err instanceof Error ? err.message : "Failed to load run");
    }
  }

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    async function loadSemanticRules() {
      setSemanticLoading(true);
      setSemanticError("");
      try {
        const response = await listSemanticRulesService({
          spaceId,
          pageSize: 100,
          includeDisabled: includeDisabledRules,
        });
        if (!cancelled) setSemanticRules(response.rules);
      } catch (err) {
        if (!cancelled) setSemanticError(err instanceof Error ? err.message : "Failed to load semantic rules");
      } finally {
        if (!cancelled) setSemanticLoading(false);
      }
    }
    void loadSemanticRules();
    return () => {
      cancelled = true;
    };
  }, [includeDisabledRules, listSemanticRulesService, spaceId]);

  useEffect(() => {
    if (!spaceId) return;
    let cancelled = false;
    async function loadMaintenance() {
      setMaintenanceLoading(true);
      setMaintenanceError("");
      try {
        const [status, work] = await Promise.all([
          getSemanticMaintenanceStatusService({ spaceId }),
          listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 }),
        ]);
        if (!cancelled) {
          setMaintenanceStatus(status);
          setMaintenanceWork(work.items);
        }
      } catch (err) {
        if (!cancelled) setMaintenanceError(err instanceof Error ? err.message : "Failed to load semantic maintenance data");
      } finally {
        if (!cancelled) setMaintenanceLoading(false);
      }
    }
    void loadMaintenance();
    return () => {
      cancelled = true;
    };
  }, [getSemanticMaintenanceStatusService, listSemanticMaintenanceWorkService, maintenanceWorkStatus, spaceId]);

  async function confirmSemanticMaintenanceAction() {
    if (!confirmMaintenanceAction || !spaceId) return;
    setMaintenanceActionLoading(true);
    setMaintenanceError("");
    try {
      const input = { spaceId, workItemId: confirmMaintenanceAction.item.workItemId };
      if (confirmMaintenanceAction.kind === "retry") await retrySemanticMaintenanceWorkService(input);
      else await cancelSemanticMaintenanceWorkService(input);
      const [status, work] = await Promise.all([
        getSemanticMaintenanceStatusService({ spaceId }),
        listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 }),
      ]);
      setMaintenanceStatus(status);
      setMaintenanceWork(work.items);
      setConfirmMaintenanceAction(null);
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : "Failed to update maintenance work item");
    } finally {
      setMaintenanceActionLoading(false);
    }
  }

  async function runBulkMaintenanceAction(kind: "analyze" | "process" | "backfill", semanticRuleId?: string, embeddingBindingKey?: string) {
    if (!spaceId) return;
    setMaintenanceActionLoading(true);
    setMaintenanceError("");
    setMaintenanceResult("");
    try {
      if (kind === "analyze") await analyzeSemanticDirtyWorkService({ spaceId, semanticRuleId, limit: 100 });
      if (kind === "process") await processSemanticDirtyWorkService({ spaceId, limit: 100 });
      if (kind === "backfill" && semanticRuleId && embeddingBindingKey) await backfillSemanticRuleService({ spaceId, semanticRuleId, embeddingBindingKey, limit: 100, continueOnError: true });
      const [status, work] = await Promise.all([getSemanticMaintenanceStatusService({ spaceId }), listSemanticMaintenanceWorkService({ spaceId, status: maintenanceWorkStatus, limit: 100 })]);
      setMaintenanceStatus(status);
      setMaintenanceWork(work.items);
      setMaintenanceResult(`${kind} completed; refreshed maintenance status.`);
    } catch (err) {
      setMaintenanceError(err instanceof Error ? err.message : `Failed to ${kind} semantic maintenance`);
    } finally {
      setMaintenanceActionLoading(false);
    }
  }

  const title = space?.name || spaceId || "Space";

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Data / Spaces"
        title={title}
        backLink={{ to: "/spaces", label: "← Back to spaces" }}
        badge={space?.state ? <SpaceStateBadge state={space.state} /> : null}
        description="Inspect this space's general properties, domains, semantic maintenance, schemas, and query tools."
      />

      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Space detail sections">
          {[
            ["general", "General"],
            ["domains", "Domains"],
            ["schemas", "Schemas"],
            ["automations", "Automations"],
            ["semantic", "Semantic"],
            ["query", "Graph query"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              className={[
                "rounded-t-md px-4 py-2 text-sm font-medium transition",
                activeTab === tab
                  ? "border border-b-white border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
              ].join(" ")}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900/70">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading space…
          </Text>
        </div>
      ) : space && activeTab === "general" ? (
        <div className="grid gap-4 lg:grid-cols-2" role="tabpanel" aria-label="General">
          <DetailCard title="Identity">
            <DetailRow label="Space ID" value={space.spaceId} />
            <DetailRow label="Name" value={space.name} />
          </DetailCard>

          <DetailCard title="Ownership">
            <DetailRow label="Owner type" value={space.owner?.principalType || "Not reported"} />
            <DetailRow label="Owner ID" value={space.owner?.id || "Not reported"} />
            <DetailRow label="Owner display name" value={space.owner?.displayName || "Not reported"} />
          </DetailCard>

          <DetailCard title="Raft placement">
            {spaceRoute ? (
              <>
                <DetailRow label="Partition" value={String(spaceRoute.partitionId)} />
                <DetailRow label="Leader node" value={spaceRoute.leaderNodeId ? String(spaceRoute.leaderNodeId) : "No leader reported"} />
                <DetailList label="Replicas" values={spaceRoute.replicaNodeIds.map(String)} />
              </>
            ) : (
              <DetailRow label="Status" value={spaceRouteError || "Route unavailable or static engine"} />
            )}
          </DetailCard>

          <DetailCard title="Timestamps">
            <DetailRow label="Created" value={formatTimestamp(space.createTime)} />
            <DetailRow label="Updated" value={formatTimestamp(space.updateTime)} />
          </DetailCard>

          <DetailCard title="Caller access">
            <DetailList label="Roles" values={space.callerAccess?.roles} />
            <DetailList label="Capabilities" values={space.callerAccess?.capabilities} />
          </DetailCard>
        </div>
      ) : null}

      {activeTab === "semantic" && <div className="space-y-6" role="tabpanel" aria-label="Semantic">
        <ContextualIntelligenceLink
          title="Manage semantic generation globally"
          description="Open Intelligence / Semantic with this space preselected to compare rules, backlog, failures, and token usage across scopes."
          to={`/intelligence/semantic?spaceId=${encodeURIComponent(spaceId)}`}
        />
        <SemanticMaintenanceSection
        status={maintenanceStatus}
        workItems={maintenanceWork}
        loading={maintenanceLoading}
        error={maintenanceError}
        workStatus={maintenanceWorkStatus}
        onWorkStatusChange={setMaintenanceWorkStatus}
        onRetry={(item) => setConfirmMaintenanceAction({ kind: "retry", item })}
        onCancel={(item) => setConfirmMaintenanceAction({ kind: "cancel", item })}
        onAnalyze={() => void runBulkMaintenanceAction("analyze")}
        onProcess={() => void runBulkMaintenanceAction("process")}
        actionLoading={maintenanceActionLoading}
        result={maintenanceResult}
        canMutate={canManageSemantic}
        />

        <SemanticRulesSection
        indexes={semanticRules}
        loading={semanticLoading}
        error={semanticError}
        includeDisabled={includeDisabledRules}
        onIncludeDisabledChange={setIncludeDisabledRules}
        onBackfill={(rule) => void runBulkMaintenanceAction("backfill", rule.semanticRuleId, rule.bindings[0]?.key)}
        actionLoading={maintenanceActionLoading}
        canMutate={canManageSemantic}
        />
      </div>}

      {activeTab === "query" && <div role="tabpanel" aria-label="Graph query"><GraphQueryConsolePreview spaceId={spaceId} domains={domains} currentPrincipal={principalContext?.session} /></div>}

      {activeTab === "domains" && <div role="tabpanel" aria-label="Domains"><DomainSection
        domains={domains}
        loading={domainsLoading}
        loadingMore={domainsLoadingMore}
        error={domainsError}
        nextPageToken={domainsNextPageToken}
        includeSystem={includeSystemDomains}
        onIncludeSystemChange={setIncludeSystemDomains}
        onLoadMore={() => void loadDomains({ append: true, pageToken: domainsNextPageToken })}
      /></div>}
      {activeTab === "schemas" && <div role="tabpanel" aria-label="Schemas"><SchemaSection domains={domains} schemas={domainSchemas} loading={schemaLoading || domainsLoading} error={schemaError || domainsError} onRefresh={() => void loadSchemas()} /></div>}

      {activeTab === "automations" && <div className="space-y-6" role="tabpanel" aria-label="Automations">
        <ContextualIntelligenceLink
          title="Manage graph automations globally"
          description="Open Intelligence / Automations with this space preselected to compare automation status, run failures, and token usage across scopes."
          to={`/intelligence/automations?spaceId=${encodeURIComponent(spaceId)}`}
        />
        <AutomationSection rows={automationRows} domains={domains} invocations={automationInvocations} loading={automationLoading || domainsLoading} error={automationError || domainsError} detail={automationDetail} runDetail={automationRunDetail} canManage={canManageAutomations} onCreate={openCreateAutomation} onEdit={(domainId, automationId) => void openEditAutomation(domainId, automationId)} onDelete={(domainId, automationId) => void deleteAutomationRow(domainId, automationId)} onRefresh={() => void loadAutomations()} onToggle={(domainId, automationId, enabled) => void toggleAutomation(domainId, automationId, enabled)} onShow={(domainId, automationId) => void showAutomation(domainId, automationId)} onShowRun={(domainId, runId) => void showAutomationRun(domainId, runId)} />
      </div>}

      {automationEditor && <AutomationEditorDialog editor={automationEditor} domains={domains} profiles={automationProfiles} selectedProfile={automationProfileId} loading={automationSaving} onProfileChange={applyAutomationProfile} onChange={(definitionJson) => setAutomationEditor((current) => current ? { ...current, definitionJson } : current)} onDomainChange={(domainId) => { setAutomationEditor((current) => current ? { ...current, domainId } : current); void loadAutomationProfiles(domainId); }} onClose={() => setAutomationEditor(null)} onSave={() => void saveAutomationEditor()} />}

      {confirmMaintenanceAction && (
        <ConfirmMaintenanceActionDialog
          kind={confirmMaintenanceAction.kind}
          item={confirmMaintenanceAction.item}
          loading={maintenanceActionLoading}
          onCancel={() => setConfirmMaintenanceAction(null)}
          onConfirm={() => void confirmSemanticMaintenanceAction()}
        />
      )}
    </section>
  );
}

function ContextualIntelligenceLink({ title, description, to }: { title: string; description: string; to: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/70 dark:bg-sky-950/30">
      <div>
        <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">{title}</Text>
        <Text intent="muted" size="sm" className="mt-1 max-w-3xl text-slate-700 dark:text-slate-300">{description}</Text>
      </div>
      <Link className="rounded-md border border-sky-300 px-3 py-2 text-sm font-medium text-sky-800 transition hover:bg-sky-100 dark:border-sky-800 dark:text-sky-200 dark:hover:bg-sky-900/60" to={to}>Open Intelligence view</Link>
    </div>
  );
}

function ConfirmMaintenanceActionDialog({ kind, item, loading, onCancel, onConfirm }: { kind: "retry" | "cancel"; item: SemanticMaintenanceWorkItemInfo; loading: boolean; onCancel: () => void; onConfirm: () => void }) {
  const isRetry = kind === "retry";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{isRetry ? "Retry maintenance work item" : "Cancel maintenance work item"}</Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">{isRetry ? "Retry will make this item eligible for processing again." : "Cancel will stop this queued item from being processed."} Review the target before continuing.</Text>
        <div className="mt-4 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-950/60"><div><strong>Work item:</strong> {item.workItemId}</div><div><strong>Action:</strong> {item.action || "—"}</div><div><strong>Status:</strong> {item.status || "—"}</div><div><strong>Rule:</strong> {item.semanticRuleId || "—"} / {item.embeddingBindingKey || "—"}</div></div>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onCancel} disabled={loading}>Keep item unchanged</Button><Button onClick={onConfirm} disabled={loading}>{loading ? "Working…" : isRetry ? "Retry item" : "Cancel item"}</Button></div>
      </div>
    </div>
  );
}

function SemanticMaintenanceSection({ status, workItems, loading, error, workStatus, onWorkStatusChange, onRetry, onCancel, onAnalyze, onProcess, actionLoading, result, canMutate }: { status: SemanticMaintenanceStatusInfo | null; workItems: SemanticMaintenanceWorkItemInfo[]; loading: boolean; error: string; workStatus: string; onWorkStatusChange: (value: string) => void; onRetry: (item: SemanticMaintenanceWorkItemInfo) => void; onCancel: (item: SemanticMaintenanceWorkItemInfo) => void; onAnalyze: () => void; onProcess: () => void; actionLoading: boolean; result: string; canMutate: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic maintenance</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Daemon maintenance status and dirty-work queue for this space.</Text>
        </div>
        {canMutate ? <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onAnalyze} disabled={actionLoading}>Analyze dirty work</Button><Button variant="secondary" onClick={onProcess} disabled={actionLoading}>Process work</Button></div> : <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Read-only</Text>}
        <label className="text-sm text-slate-700 dark:text-slate-300">Work status <select className="ml-2 rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950" value={workStatus} onChange={(event) => onWorkStatusChange(event.target.value)}><option value="">Any</option><option value="pending">Pending</option><option value="running">Running</option><option value="failed_retryable">Failed retryable</option><option value="failed_permanent">Failed permanent</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></label>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {result && <div className="mt-4 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{result}</div>}
      {loading ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading semantic maintenance…</Text> : (
        <>
          {status && <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Enabled" value={status.enabled ? "Yes" : "No"} /><Metric label="Degraded" value={status.degraded ? "Yes" : "No"} tone={status.degraded ? "danger" : "default"} /><Metric label="Pending" value={status.queueDepthPending} /><Metric label="Running" value={status.queueDepthRunning} /><Metric label="Retryable failed" value={status.queueDepthFailedRetryable} tone={status.queueDepthFailedRetryable > 0 ? "warning" : "default"} /><Metric label="Permanent failed" value={status.queueDepthFailedPermanent} tone={status.queueDepthFailedPermanent > 0 ? "danger" : "default"} /><Metric label="Oldest pending" value={`${status.oldestPendingAgeSeconds}s`} /><Metric label="Throttle" value={status.throttleState || "None"} /></div>}
          {status?.degradedReason && <Alert className="mt-4">{status.degradedReason}</Alert>}
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Attempts</th><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Index</th><th className="px-4 py-3">Last error</th><th className="px-4 py-3">Safe actions</th></tr></thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{workItems.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={7}>No maintenance work items found.</td></tr> : workItems.map((item) => <tr key={item.workItemId}><td className="px-4 py-3">{item.action || "—"}</td><td className="px-4 py-3">{item.status || "—"}</td><td className="px-4 py-3">{item.attemptCount}</td><td className="px-4 py-3 font-mono text-xs">{item.domainId || "—"}</td><td className="px-4 py-3 font-mono text-xs">{item.semanticRuleId || "—"}</td><td className="px-4 py-3 max-w-md truncate" title={item.lastErrorMessageSanitized}>{item.lastErrorCategory || item.lastErrorMessageSanitized || "—"}</td><td className="px-4 py-3">{canMutate ? <div className="flex gap-2"><Button variant="secondary" onClick={() => onRetry(item)}>Retry</Button><Button variant="secondary" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40" onClick={() => onCancel(item)}>Cancel</Button></div> : <span className="text-slate-500 dark:text-slate-400">Read-only</span>}</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: ReactNode; tone?: "default" | "warning" | "danger" }) {
  const valueClass = tone === "danger" ? "text-red-700 dark:text-red-300" : tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-slate-900 dark:text-slate-100";
  return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><Text className={`mt-1 font-semibold ${valueClass}`}>{value}</Text></div>;
}

function SemanticRulesSection({ indexes, loading, error, includeDisabled, onIncludeDisabledChange, onBackfill, actionLoading, canMutate }: { indexes: SemanticGenerationRuleSummary[]; loading: boolean; error: string; includeDisabled: boolean; onIncludeDisabledChange: (value: boolean) => void; onBackfill: (index: SemanticGenerationRuleSummary) => void; actionLoading: boolean; canMutate: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Semantic rules</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Space/domain-scoped semantic generation rules and binding health.</Text>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-sky-600" checked={includeDisabled} onChange={(event) => onIncludeDisabledChange(event.target.checked)} />
          Include disabled rules
        </label>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading semantic rules…</Text>
      ) : indexes.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No semantic rules found for this space.</Text>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Domain ID</th><th className="px-4 py-3">State</th><th className="px-4 py-3">Bindings</th><th className="px-4 py-3">Rule ID</th><th className="px-4 py-3">Safe actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{indexes.map((index) => <tr key={index.semanticRuleId}><td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{index.displayName || index.key}</td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{index.domainId}</td><td className="px-4 py-3">{index.state}</td><td className="px-4 py-3">{index.bindings.map((binding) => `${binding.key} (${binding.intelligenceProfileKey || binding.intelligenceProfileId || "profile?"} / ${binding.vectorStoreKey || binding.vectorStoreId || "store?"})`).join(", ") || "—"}</td><td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{index.semanticRuleId}</td><td className="px-4 py-3">{canMutate ? <Button variant="secondary" disabled={actionLoading || index.bindings.length === 0} onClick={() => onBackfill(index)}>Backfill</Button> : <span className="text-slate-500 dark:text-slate-400">Read-only</span>}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GraphQueryConsolePreview({ spaceId, domains, currentPrincipal }: { spaceId: string; domains: DomainInfo[]; currentPrincipal?: PrincipalSession }) {
  const [domainId, setDomainId] = useState("");
  const exampleQuery = "MATCH (n) RETURN n";
  const [queryText, setQueryText] = useState(exampleQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [resultView, setResultView] = useState<"rows" | "graph" | "raw">("rows");
  const readWrite = true;
  const [confirmWrite, setConfirmWrite] = useState(false);
  const [alwaysConfirmWrite, setAlwaysConfirmWrite] = useState(() => localStorage.getItem("mycelConsole.gql.alwaysConfirmWrite") !== "false");
  const [stopOnError, setStopOnError] = useState(true);

  useEffect(() => {
    if (domainId || domains.length === 0) return;
    const sorted = [...domains].sort((left, right) => (left.name || left.key || left.domainId).localeCompare(right.name || right.key || right.domainId));
    const defaultDomain = sorted.find((domain) => domain.key === "default" || domain.name?.toLowerCase() === "default");
    setDomainId((defaultDomain ?? sorted[0]).domainId);
  }, [domainId, domains]);

  useEffect(() => {
    localStorage.setItem("mycelConsole.gql.alwaysConfirmWrite", alwaysConfirmWrite ? "true" : "false");
  }, [alwaysConfirmWrite]);

  function requestRunQuery() {
    if (alwaysConfirmWrite) {
      setConfirmWrite(true);
      return;
    }
    void runQuery();
  }

  async function runQuery() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const isScript = queryText.includes(";");
      const response = isScript
        ? await executeGqlScript({ spaceId, domainId, script: queryText, pageSize: 100, readWrite, stopOnError })
        : await executeGql({ spaceId, domainId, query: queryText, pageSize: 100, readWrite });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : typeof err === "string" ? err : "Query failed");
    } finally {
      setLoading(false);
    }
  }

  const canRun = Boolean(domainId && queryText.trim() && !loading);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Graph query console</Text>
          <Text intent="muted" size="sm" className="mt-1 max-w-3xl text-slate-600 dark:text-slate-400">Execute GQL against this space using the currently logged-in console principal.</Text>
        </div>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
          <div><span className="font-medium">Principal:</span> {currentPrincipal ? `${currentPrincipal.username} @ ${currentPrincipal.addr}` : "Current console principal"}</div>
          <div><span className="font-medium">Space:</span> <span className="font-mono text-xs">{spaceId}</span></div>
          <label className="block font-medium">Domain<select className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-2 dark:border-slate-700 dark:bg-slate-950" value={domainId} onChange={(event) => setDomainId(event.target.value)}><option value="">Select domain…</option>{domains.map((domain) => <option key={domain.domainId} value={domain.domainId}>{domain.name || domain.key || domain.domainId}</option>)}</select></label>
          <div><span className="font-medium">Transaction:</span> Read-write, subject to daemon authorization</div>
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600" checked={stopOnError} onChange={(event) => setStopOnError(event.target.checked)} />Stop script on first error</label>
          <label className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600" checked={alwaysConfirmWrite} onChange={(event) => setAlwaysConfirmWrite(event.target.checked)} />Confirm before running queries</label>
        </div>
        <div>
          <Text as="p" size="sm" className="font-medium text-slate-900 dark:text-slate-100">GQL query</Text>
          <textarea className="mt-2 h-52 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={queryText} onChange={(event) => setQueryText(event.target.value)} onKeyDown={(event) => event.stopPropagation()} spellCheck={false} />
          <div className="mt-3 flex flex-wrap gap-2"><Button disabled={!canRun} onClick={requestRunQuery}>{loading ? "Running…" : "Run query"}</Button><Button variant="secondary" disabled={!result} onClick={() => void navigator.clipboard?.writeText(JSON.stringify(result ?? null, null, 2))}>Copy result</Button></div>
        </div>
      </div>
      {Boolean(result) && <div className="mt-4 flex gap-2" role="tablist" aria-label="Query result views">{(["rows", "graph", "raw"] as const).map((view) => <button key={view} type="button" className={`rounded-md px-3 py-1 text-sm ${resultView === view ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100" : "text-slate-600 dark:text-slate-400"}`} onClick={() => setResultView(view)}>{view === "rows" ? "Rows" : view === "graph" ? "Graph" : "Raw JSON"}</button>)}</div>}
      <QueryResultView result={result} view={resultView} />
      {confirmWrite && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><Text as="h3" className="font-semibold">Run GQL?</Text><Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">This will execute in a read-write transaction and commit if the query succeeds. Daemon authorization remains authoritative. Target: {spaceId} / {domainId}.</Text><pre className="mt-4 max-h-40 overflow-auto rounded-md bg-slate-950 p-3 text-xs text-slate-100">{queryText}</pre><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setConfirmWrite(false)} disabled={loading}>Cancel</Button><Button onClick={() => { setConfirmWrite(false); void runQuery(); }} disabled={loading}>Run and commit</Button></div></div></div>}
    </div>
  );
}

function QueryResultView({ result, view }: { result: any; view: "rows" | "graph" | "raw" }) {
  if (!result) return <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-400">No query run yet.</div>;
  const payload = result.result ?? result;
  const statements = payload?.statements ?? result?.statements;
  const diagnostics = diagnosticsFromQueryResponse(result);
  const message = diagnosticsMessage(diagnostics);
  const diagnosticsBanner = message ? <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">{message}</div> : null;
  if (view === "graph") return <><GraphResultCanvas graph={graphFromQueryResponse(result)} />{diagnosticsBanner}</>;
  if (Array.isArray(statements)) {
    return <div className="mt-3 space-y-3">{diagnosticsBanner}<div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"><table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800"><thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">#</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Statement</th><th className="px-4 py-3">Error</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{statements.map((statement: any) => <tr key={statement.index}><td className="px-4 py-3">{statement.index}</td><td className="px-4 py-3">{statement.success ? "✓" : "✗"}</td><td className="px-4 py-3 font-mono text-xs">{statement.statement}</td><td className="px-4 py-3 text-red-600 dark:text-red-300">{statement.error || "—"}</td></tr>)}</tbody></table></div>{view === "raw" ? <pre className="max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{JSON.stringify(result, null, 2)}</pre> : null}</div>;
  }
  if (view === "rows") {
    const rows = payload?.rows ?? [];
    const aggregateRows = aggregateRowsFromQueryResponse(result);
    const pathCount = pathGraphsFromQueryResponse(result).length;
    const renderedRows = aggregateRows.length ? aggregateRows : rows;
    return <div className="mt-3 space-y-3">{diagnosticsBanner}{pathCount > 0 ? <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-100">{pathCount} path value{pathCount === 1 ? "" : "s"} available in returned rows.</div> : null}<pre className="max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{renderedRows.length ? JSON.stringify(renderedRows, null, 2) : "No rows returned."}</pre></div>;
  }
  return <div className="mt-3 space-y-3">{diagnosticsBanner}<pre className="max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{JSON.stringify(result, null, 2)}</pre></div>;
}

function DomainSection({
  domains,
  loading,
  loadingMore,
  error,
  nextPageToken,
  includeSystem,
  onIncludeSystemChange,
  onLoadMore,
}: {
  domains: DomainInfo[];
  loading: boolean;
  loadingMore: boolean;
  error: string;
  nextPageToken: string;
  includeSystem: boolean;
  onIncludeSystemChange: (value: boolean) => void;
  onLoadMore: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">
            Domains
          </Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">
            Space-scoped domains available to admin workflows.
          </Text>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-sky-600"
            checked={includeSystem}
            onChange={(event) => onIncludeSystemChange(event.target.checked)}
          />
          Include system domains
        </label>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {loading ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading domains…</Text>
      ) : domains.length === 0 ? (
        <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No domains found for this space.</Text>
      ) : (
        <>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Domain ID</th>
                  <th className="px-4 py-3">Flags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {domains.map((domain) => (
                  <tr key={domain.domainId}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{domain.name}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{domain.key || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{domain.domainId}</td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{domainFlags(domain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextPageToken && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
                {loadingMore ? "Loading more…" : "Load more domains"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function domainFlags(domain: DomainInfo) {
  const flags = [];
  if (domain.isDefault) flags.push("default");
  if (domain.system) flags.push("system");
  return flags.length ? flags.join(", ") : "—";
}

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">
        {title}
      </Text>
      <dl className="mt-4 space-y-3">{children}</dl>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function DetailList({ label, values }: { label: string; values?: string[] }) {
  const displayValues = values?.length ? values : ["Not reported"];
  return <DetailRow label={label} value={displayValues.join(", ")} />;
}

function formatTimestamp(value?: string) {
  if (!value) return "Not reported";
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return value;
  return new Date(seconds * 1000).toLocaleString();
}

function AutomationSection({ rows, domains, invocations, loading, error, detail, runDetail, canManage, onCreate, onEdit, onDelete, onRefresh, onToggle, onShow, onShowRun }: { rows: Array<{ domain: DomainInfo; automation: AutomationDefinitionSummaryInfo }>; domains: DomainInfo[]; invocations: Record<string, AutomationInvocationSummaryInfo[]>; loading: boolean; error: string; detail: string; runDetail: string; canManage: boolean; onCreate: (domainId?: string) => void; onEdit: (domainId: string, automationId: string) => void; onDelete: (domainId: string, automationId: string) => void; onRefresh: () => void; onToggle: (domainId: string, automationId: string, enabled: boolean) => void; onShow: (domainId: string, automationId: string) => void; onShowRun: (domainId: string, runId: string) => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Graph automations</Text>
          <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Inspect definitions, toggle status, and review recent invocation history.</Text>
        </div>
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Loading…" : "Refresh automations"}</Button>{canManage && <Button onClick={() => onCreate(domains[0]?.domainId)}>Create automation</Button>}</div>
      </div>
      {error && <Alert>{error}</Alert>}
      {rows.length === 0 ? <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{loading ? "Loading automations…" : "No automations found for this space."}</Text> : (
        <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Domain</th><th className="px-4 py-3">Automation</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Triggers</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map(({ domain, automation }) => {
                const enabled = automation.status === "enabled";
                const key = `${domain.domainId}:${automation.id}`;
                return <tr key={key} className="align-top"><td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{domain.name || domain.key}</div><div className="font-mono text-xs text-slate-500">{domain.domainId}</div></td><td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{automation.name || automation.id}</div><div className="font-mono text-xs text-slate-500">{automation.id} · v{automation.version}</div><RecentInvocations domainId={domain.domainId} items={invocations[key] || []} onShowRun={onShowRun} /></td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs ${enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{automation.status}</span></td><td className="px-4 py-3"><div>{automation.events.join(", ") || "—"}</div><div className="text-xs text-slate-500">{automation.labels.join(", ") || "No label filter"}</div></td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => onShow(domain.domainId, automation.id)}>View JSON</Button>{canManage ? <><Button variant="secondary" onClick={() => onEdit(domain.domainId, automation.id)}>Edit</Button><Button variant="secondary" onClick={() => onToggle(domain.domainId, automation.id, enabled)}>{enabled ? "Disable" : "Enable"}</Button><Button variant="secondary" onClick={() => onDelete(domain.domainId, automation.id)}>Delete</Button></> : <span className="self-center text-slate-500 dark:text-slate-400">Read-only</span>}</div></td></tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      {detail && <pre className="max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{detail}</pre>}
      {runDetail && <pre className="max-h-96 overflow-auto rounded-lg border border-dashed border-slate-300 p-4 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">{runDetail}</pre>}
    </div>
  );
}

function AutomationEditorDialog({ editor, domains, profiles, selectedProfile, loading, onProfileChange, onChange, onDomainChange, onClose, onSave }: { editor: { mode: "create" | "edit"; domainId: string; automationId?: string; definitionJson: string }; domains: DomainInfo[]; profiles: InferenceProfileInfo[]; selectedProfile: string; loading: boolean; onProfileChange: (profile: string) => void; onChange: (definitionJson: string) => void; onDomainChange: (domainId: string) => void; onClose: () => void; onSave: () => void }) {
  const domainOptions = domains.map((domain) => ({
    value: domain.domainId,
    label: domain.name || domain.key || domain.domainId,
    hint: domain.name || domain.key ? domain.domainId : undefined,
  }));
  const profileOptions = profiles.map((profile) => ({
    value: profile.key,
    label: profile.displayName || profile.key,
    hint: `${profile.operation} · ${profile.enabled ? "enabled" : "disabled"}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{editor.mode === "create" ? "Create automation" : "Edit automation"}</Text>
            <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Definitions reference inference profiles/model refs/capabilities, never raw API keys. The daemon validates and authorizes the final JSON.</Text>
          </div>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Close</Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Select label="Domain" value={editor.domainId} onChange={onDomainChange} options={domainOptions} disabled={loading} />
          <Select label="Inference profile" value={selectedProfile} onChange={onProfileChange} options={profileOptions} placeholder="No profile selected" disabled={loading} />
        </div>
        <textarea className="mt-4 h-96 w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={editor.definitionJson} onChange={(event) => onChange(event.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={onSave} disabled={loading}>{loading ? "Saving…" : "Validate and save"}</Button>
        </div>
      </div>
    </div>
  );
}

function RecentInvocations({ domainId, items, onShowRun }: { domainId: string; items: AutomationInvocationSummaryInfo[]; onShowRun: (domainId: string, runId: string) => void }) {
  if (items.length === 0) return <Text intent="muted" size="sm" className="mt-2 text-slate-500">No recent invocations.</Text>;
  return <div className="mt-2 space-y-1">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400"><span>{item.status}</span><span className="font-mono">{item.changedElementId}</span>{item.skipReason && <span>{item.skipReason}</span>}<button type="button" className="text-sky-700 hover:text-sky-900 dark:text-sky-300" onClick={() => onShowRun(domainId, item.id)}>Run detail</button></div>)}</div>;
}

function SchemaSection({ domains, schemas, loading, error, onRefresh }: { domains: DomainInfo[]; schemas: Record<string, DomainSchemaInfo | null>; loading: boolean; error: string; onRefresh: () => void }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="h3" className="font-medium text-slate-900 dark:text-slate-100">Domain schemas</Text>
          <Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Read-only active GWL schema for each domain in this space.</Text>
        </div>
        <Button variant="secondary" onClick={onRefresh} disabled={loading}>{loading ? "Loading…" : "Refresh schemas"}</Button>
      </div>
      {error && <div className="mt-4"><Alert>{error}</Alert></div>}
      {loading && domains.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">Loading schemas…</Text> : domains.length === 0 ? <Text intent="muted" size="sm" className="mt-4 text-slate-600 dark:text-slate-400">No domains found for this space.</Text> : (
        <div className="mt-4 space-y-4">
          {domains.map((domain) => {
            const schema = schemas[domain.domainId];
            return (
              <div key={domain.domainId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <Text as="h4" className="font-medium text-slate-900 dark:text-slate-100">{domain.name || domain.key || domain.domainId}</Text>
                    <Text intent="muted" size="xs" className="mt-1 font-mono text-slate-600 dark:text-slate-400">{domain.domainId}</Text>
                  </div>
                  <Text size="xs" className="rounded-full bg-slate-100 px-2 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-300">{domain.isDefault ? "Default" : domain.key || "Domain"}</Text>
                </div>
                {schema?.gwl ? (
                  <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-relaxed text-slate-100"><code>{schema.gwl}</code></pre>
                ) : (
                  <Text intent="muted" size="sm" className="mt-3 text-slate-600 dark:text-slate-400">No active schema returned for this domain.</Text>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


