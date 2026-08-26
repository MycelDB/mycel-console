import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, Alert, H2, Select, Text } from "../../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../../console";
import {
  createAutomation as defaultCreateAutomation,
  deleteAutomation as defaultDeleteAutomation,
  disableAutomation as defaultDisableAutomation,
  disableGraphAutomationBinding as defaultDisableGraphAutomationBinding,
  enableAutomation as defaultEnableAutomation,
  enableGraphAutomationBinding as defaultEnableGraphAutomationBinding,
  getAutomation as defaultGetAutomation,
  getAutomationRun as defaultGetAutomationRun,
  getGraphAutomationBinding as defaultGetGraphAutomationBinding,
  getGraphProcedure as defaultGetGraphProcedure,
  listAutomationInvocations as defaultListAutomationInvocations,
  listAutomations as defaultListAutomations,
  listGraphAutomationBindings as defaultListGraphAutomationBindings,
  listGraphProcedures as defaultListGraphProcedures,
  listDomains as defaultListDomains,
  listInferenceProfiles as defaultListInferenceProfiles,
  listSpaces as defaultListSpaces,
  summarizeInferenceUsage as defaultSummarizeInferenceUsage,
  updateAutomation as defaultUpdateAutomation,
  validateAutomation as defaultValidateAutomation,
} from "../../../../services/adminService";
import type {
  AutomationActionInput,
  AutomationDefinitionInfo,
  AutomationDefinitionInput,
  AutomationDefinitionSummaryInfo,
  AutomationInvocationSummaryInfo,
  AutomationRunInfo,
  DomainAutomationInput,
  GetAutomationRunInput,
  GraphAutomationBindingActionInput,
  GraphAutomationBindingInfo,
  GraphAutomationBindingSummaryInfo,
  GraphProcedureActionInput,
  GraphProcedureInfo,
  GraphProcedureSummaryInfo,
  ListAutomationInvocationsInput,
  ListAutomationInvocationsResponseInfo,
  ListAutomationsResponseInfo,
  ListGraphAutomationBindingsResponseInfo,
  ListGraphProceduresResponseInfo,
  UpdateAutomationInput,
  ValidateAutomationInfo,
} from "../../../../types/automations";
import type { DomainInfo, ListDomainsInput, ListDomainsResponse } from "../../../../types/domains";
import type { InferenceProfileInfo, ListInferenceProfilesInput, ListInferenceProfilesResponse, SummarizeUsageInput, SummarizeUsageResponse } from "../../../../types/inference";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../../../../types/spaces";

type AutomationRow = {
  space: SpaceInfo;
  domain: DomainInfo;
  automation: AutomationDefinitionSummaryInfo;
  invocations: AutomationInvocationSummaryInfo[];
};

type UsageByAutomation = Record<string, { requestCount: number; failedCount: number; deniedCount: number; inputTokens: number; outputTokens: number; totalTokens: number }>;

type ProcedureRow = { space: SpaceInfo; domain: DomainInfo; procedure: GraphProcedureSummaryInfo };
type BindingRow = { space: SpaceInfo; domain: DomainInfo; binding: GraphAutomationBindingSummaryInfo };
type RunRow = { space: SpaceInfo; domain: DomainInfo; automation: AutomationDefinitionSummaryInfo; invocation: AutomationInvocationSummaryInfo };
type AutomationTab = "procedures" | "automations" | "runs";

type AutomationEditorState = {
  mode: "create" | "edit";
  spaceId: string;
  domainId: string;
  automationId?: string;
  definitionJson: string;
  selectedProfile: string;
  profiles: InferenceProfileInfo[];
};

export type AutomationsPageProps = {
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listAutomationsService?: (input: DomainAutomationInput) => Promise<ListAutomationsResponseInfo>;
  listAutomationInvocationsService?: (input: ListAutomationInvocationsInput) => Promise<ListAutomationInvocationsResponseInfo>;
  listGraphProceduresService?: (input: DomainAutomationInput) => Promise<ListGraphProceduresResponseInfo>;
  getGraphProcedureService?: (input: GraphProcedureActionInput) => Promise<GraphProcedureInfo>;
  listGraphAutomationBindingsService?: (input: DomainAutomationInput) => Promise<ListGraphAutomationBindingsResponseInfo>;
  getGraphAutomationBindingService?: (input: GraphAutomationBindingActionInput) => Promise<GraphAutomationBindingInfo>;
  enableGraphAutomationBindingService?: (input: GraphAutomationBindingActionInput) => Promise<GraphAutomationBindingInfo>;
  disableGraphAutomationBindingService?: (input: GraphAutomationBindingActionInput) => Promise<GraphAutomationBindingInfo>;
  getAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  getAutomationRunService?: (input: GetAutomationRunInput) => Promise<AutomationRunInfo>;
  validateAutomationService?: (input: AutomationDefinitionInput) => Promise<ValidateAutomationInfo>;
  createAutomationService?: (input: AutomationDefinitionInput) => Promise<AutomationDefinitionInfo>;
  updateAutomationService?: (input: UpdateAutomationInput) => Promise<AutomationDefinitionInfo>;
  deleteAutomationService?: (input: AutomationActionInput) => Promise<void>;
  enableAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  disableAutomationService?: (input: AutomationActionInput) => Promise<AutomationDefinitionInfo>;
  listInferenceProfilesService?: (input?: ListInferenceProfilesInput) => Promise<ListInferenceProfilesResponse>;
  summarizeInferenceUsageService?: (input: SummarizeUsageInput) => Promise<SummarizeUsageResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function AutomationsPage({
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  listAutomationsService = defaultListAutomations,
  listAutomationInvocationsService = defaultListAutomationInvocations,
  listGraphProceduresService = defaultListGraphProcedures,
  getGraphProcedureService = defaultGetGraphProcedure,
  listGraphAutomationBindingsService = defaultListGraphAutomationBindings,
  getGraphAutomationBindingService = defaultGetGraphAutomationBinding,
  enableGraphAutomationBindingService = defaultEnableGraphAutomationBinding,
  disableGraphAutomationBindingService = defaultDisableGraphAutomationBinding,
  getAutomationService = defaultGetAutomation,
  getAutomationRunService = defaultGetAutomationRun,
  validateAutomationService = defaultValidateAutomation,
  createAutomationService = defaultCreateAutomation,
  updateAutomationService = defaultUpdateAutomation,
  deleteAutomationService = defaultDeleteAutomation,
  enableAutomationService = defaultEnableAutomation,
  disableAutomationService = defaultDisableAutomation,
  listInferenceProfilesService = defaultListInferenceProfiles,
  summarizeInferenceUsageService = defaultSummarizeInferenceUsage,
  principalContext,
}: AutomationsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [rows, setRows] = useState<AutomationRow[]>([]);
  const [procedureRows, setProcedureRows] = useState<ProcedureRow[]>([]);
  const [bindingRows, setBindingRows] = useState<BindingRow[]>([]);
  const [usageByAutomation, setUsageByAutomation] = useState<UsageByAutomation>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [usageError, setUsageError] = useState("");
  const [detail, setDetail] = useState<{ title: string; json: string } | null>(null);
  const [editor, setEditor] = useState<AutomationEditorState | null>(null);
  const [editorError, setEditorError] = useState("");

  const selectedSpaceId = searchParams.get("spaceId") || "";
  const selectedDomainId = searchParams.get("domainId") || "";
  const statusFilter = searchParams.get("status") || "";
  const activeTab = automationTab(searchParams.get("tab"));
  const canManage = canUseCapability(principalContext, "automation.manage");

  const setTab = useCallback((tab: AutomationTab) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    next.delete("status");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const setFilter = useCallback((key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "spaceId") next.delete("domainId");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setUsageError("");
    try {
      const spaceResponse = await listSpacesService({ pageSize: 100, includeArchived: false });
      setSpaces(spaceResponse.spaces);

      const domainResults = await Promise.all(spaceResponse.spaces.map(async (space) => {
        const response = await listDomainsService({ spaceId: space.spaceId, pageSize: 100, includeSystem: false });
        return response.domains;
      }));
      const allDomains = domainResults.flat();
      setDomains(allDomains);

      const spaceById = new Map(spaceResponse.spaces.map((space) => [space.spaceId, space]));
      const domainCandidates = allDomains.filter((domain) => (!selectedSpaceId || domain.spaceId === selectedSpaceId) && (!selectedDomainId || domain.domainId === selectedDomainId));
      const automationRows = await Promise.all(domainCandidates.map(async (domain) => {
        const automations = await listAutomationsService({ domainId: domain.domainId });
        const invocationPairs = await Promise.all(automations.automations.map(async (automation) => {
          try {
            const history = await listAutomationInvocationsService({ domainId: domain.domainId, automationId: automation.id, limit: 3 });
            return [automation.id, history.invocations] as const;
          } catch {
            return [automation.id, [] as AutomationInvocationSummaryInfo[]] as const;
          }
        }));
        const invocationsByAutomation = new Map(invocationPairs);
        return automations.automations.map((automation) => ({
          space: spaceById.get(domain.spaceId) ?? { spaceId: domain.spaceId, name: domain.spaceId },
          domain,
          automation,
          invocations: invocationsByAutomation.get(automation.id) ?? [],
        }));
      }));
      setRows(automationRows.flat().sort(compareAutomationRows));

      const procedureAndBindingRows = await Promise.all(domainCandidates.map(async (domain) => {
        const space = spaceById.get(domain.spaceId) ?? { spaceId: domain.spaceId, name: domain.spaceId };
        const [procedures, bindings] = await Promise.all([
          listGraphProceduresService({ domainId: domain.domainId }).catch(() => ({ procedures: [] as GraphProcedureSummaryInfo[] })),
          listGraphAutomationBindingsService({ domainId: domain.domainId }).catch(() => ({ bindings: [] as GraphAutomationBindingSummaryInfo[] })),
        ]);
        return {
          procedures: procedures.procedures.map((procedure) => ({ space, domain, procedure })),
          bindings: bindings.bindings.map((binding) => ({ space, domain, binding })),
        };
      }));
      setProcedureRows(procedureAndBindingRows.flatMap((item) => item.procedures).sort((a, b) => a.procedure.id.localeCompare(b.procedure.id)));
      setBindingRows(procedureAndBindingRows.flatMap((item) => item.bindings).sort((a, b) => a.binding.id.localeCompare(b.binding.id)));

      const usage: UsageByAutomation = {};
      const usageSpaces = selectedSpaceId ? spaceResponse.spaces.filter((space) => space.spaceId === selectedSpaceId) : spaceResponse.spaces;
      await Promise.all(usageSpaces.map(async (space) => {
        try {
          const summary = await summarizeInferenceUsageService({ spaceId: space.spaceId, groupBy: ["automation_id", "domain_id"] });
          for (const item of summary.summaries) {
            const automationId = groupValue(item.group, "automation_id", "automationId", "automation");
            const domainId = groupValue(item.group, "domain_id", "domainId", "domain");
            if (!automationId || !domainId || (selectedDomainId && domainId !== selectedDomainId)) continue;
            const key = automationUsageKey(domainId, automationId);
            const current = usage[key] ?? { requestCount: 0, failedCount: 0, deniedCount: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
            usage[key] = {
              requestCount: current.requestCount + item.requestCount,
              failedCount: current.failedCount + item.failedCount,
              deniedCount: current.deniedCount + item.deniedCount,
              inputTokens: current.inputTokens + item.inputTokens,
              outputTokens: current.outputTokens + item.outputTokens,
              totalTokens: current.totalTokens + item.totalTokens,
            };
          }
        } catch (err) {
          setUsageError(errorMessage(err, "Failed to load automation usage summaries"));
        }
      }));
      setUsageByAutomation(usage);
    } catch (err) {
      setError(errorMessage(err, "Failed to load graph automations"));
    } finally {
      setLoading(false);
    }
  }, [listAutomationInvocationsService, listAutomationsService, listDomainsService, listGraphAutomationBindingsService, listGraphProceduresService, listSpacesService, selectedDomainId, selectedSpaceId, summarizeInferenceUsageService]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDomains = useMemo(() => domains.filter((domain) => !selectedSpaceId || domain.spaceId === selectedSpaceId), [domains, selectedSpaceId]);
  const filteredRows = useMemo(() => rows.filter((row) => !statusFilter || row.automation.status === statusFilter), [rows, statusFilter]);
  const filteredProcedureRows = useMemo(() => procedureRows.filter((row) => !statusFilter || row.procedure.status === statusFilter), [procedureRows, statusFilter]);
  const filteredBindingRows = useMemo(() => bindingRows.filter((row) => !statusFilter || row.binding.status === statusFilter), [bindingRows, statusFilter]);
  const runRows = useMemo(() => rows.flatMap((row) => row.invocations.map((invocation) => ({ space: row.space, domain: row.domain, automation: row.automation, invocation }))), [rows]);
  const filteredRunRows = useMemo(() => runRows.filter((row) => !statusFilter || row.invocation.status === statusFilter), [runRows, statusFilter]);
  const statusOptions = activeTab === "runs"
    ? [{ value: "pending", label: "Pending" }, { value: "succeeded", label: "Succeeded" }, { value: "skipped", label: "Skipped" }, { value: "failed", label: "Failed" }, { value: "error", label: "Error" }]
    : [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }];
  const totals = useMemo(() => {
    const usage = rows.reduce((sum, row) => sum + (usageByAutomation[automationUsageKey(row.domain.domainId, row.automation.id)]?.totalTokens ?? 0), 0);
    return {
      procedures: filteredProcedureRows.length,
      automations: filteredBindingRows.length || filteredRows.length,
      runs: filteredRunRows.length,
      totalTokens: usage,
    };
  }, [filteredBindingRows.length, filteredProcedureRows.length, filteredRows.length, filteredRunRows.length, rows, usageByAutomation]);

  async function showAutomation(domainId: string, automationId: string) {
    setError("");
    try {
      const response = await getAutomationService({ domainId, automationId });
      setDetail({ title: `Automation ${automationId}`, json: response.definitionJson });
    } catch (err) {
      setError(errorMessage(err, "Failed to load automation"));
    }
  }

  async function showRun(domainId: string, runId: string) {
    setError("");
    try {
      const response = await getAutomationRunService({ domainId, runId });
      setDetail({ title: `Run ${runId}`, json: response.runJson });
    } catch (err) {
      setError(errorMessage(err, "Failed to load run"));
    }
  }

  async function showProcedure(domainId: string, procedureId: string) {
    setError("");
    try {
      const response = await getGraphProcedureService({ domainId, procedureId });
      setDetail({ title: `Procedure ${procedureId}`, json: response.procedureJson });
    } catch (err) {
      setError(errorMessage(err, "Failed to load procedure"));
    }
  }

  async function showBinding(domainId: string, bindingId: string) {
    setError("");
    try {
      const response = await getGraphAutomationBindingService({ domainId, bindingId });
      setDetail({ title: `Binding ${bindingId}`, json: response.bindingJson });
    } catch (err) {
      setError(errorMessage(err, "Failed to load binding"));
    }
  }

  async function openCreate(domainId = selectedDomainId || filteredDomains[0]?.domainId || domains[0]?.domainId || "") {
    const domain = domains.find((candidate) => candidate.domainId === domainId);
    const spaceId = domain?.spaceId || selectedSpaceId || spaces[0]?.spaceId || "";
    const profiles = await loadProfiles(spaceId, domainId);
    const definition = {
      id: "new-automation",
      name: "New automation",
      version: 1,
      enabled: true,
      on: { events: ["node.updated"], labels: [] },
      inference: { operation: "chat", profile: profiles[0]?.key || "" },
      actions: [],
    };
    setEditor({ mode: "create", spaceId, domainId, definitionJson: JSON.stringify(definition, null, 2), selectedProfile: profiles[0]?.key || "", profiles });
    setEditorError("");
  }

  async function openEdit(row: AutomationRow) {
    setError("");
    try {
      const [detailResponse, profiles] = await Promise.all([
        getAutomationService({ domainId: row.domain.domainId, automationId: row.automation.id }),
        loadProfiles(row.space.spaceId, row.domain.domainId),
      ]);
      let selectedProfile = "";
      try {
        const parsed = JSON.parse(detailResponse.definitionJson) as { inference?: { profile?: string; profileId?: string } };
        selectedProfile = parsed.inference?.profile || parsed.inference?.profileId || "";
      } catch { selectedProfile = ""; }
      setEditor({ mode: "edit", spaceId: row.space.spaceId, domainId: row.domain.domainId, automationId: row.automation.id, definitionJson: detailResponse.definitionJson, selectedProfile, profiles });
      setEditorError("");
    } catch (err) {
      setError(errorMessage(err, "Failed to open automation editor"));
    }
  }

  async function loadProfiles(spaceId: string, domainId: string) {
    if (!spaceId) return [];
    try {
      const response = await listInferenceProfilesService({ spaceId, domainId, purpose: "automation", includeDisabled: false, pageSize: 100 });
      return response.inferenceProfiles;
    } catch {
      return [];
    }
  }

  async function saveEditor() {
    if (!editor) return;
    setActionLoading(true);
    setEditorError("");
    try {
      const validation = await validateAutomationService({ domainId: editor.domainId, definitionJson: editor.definitionJson });
      if (!validation.valid) throw new Error(validation.error || "Automation definition is invalid");
      const definitionJson = validation.normalizedDefinitionJson || editor.definitionJson;
      if (editor.mode === "create") await createAutomationService({ domainId: editor.domainId, definitionJson });
      else await updateAutomationService({ domainId: editor.domainId, automationId: editor.automationId || "", definitionJson });
      setEditor(null);
      await load();
    } catch (err) {
      setEditorError(errorMessage(err, "Failed to save automation"));
    } finally {
      setActionLoading(false);
    }
  }

  function applyProfile(profileKeyOrId: string) {
    setEditor((current) => {
      if (!current) return current;
      try {
        const selected = current.profiles.find((profile) => profile.key === profileKeyOrId || profile.inferenceProfileId === profileKeyOrId);
        const parsed = JSON.parse(current.definitionJson) as Record<string, unknown> & { inference?: Record<string, unknown> };
        parsed.inference = { ...(typeof parsed.inference === "object" && parsed.inference !== null ? parsed.inference : {}), operation: selected?.operation || "chat", profile: selected?.key || profileKeyOrId, profileId: selected?.inferenceProfileId || "" };
        return { ...current, selectedProfile: profileKeyOrId, definitionJson: JSON.stringify(parsed, null, 2) };
      } catch {
        return { ...current, selectedProfile: profileKeyOrId };
      }
    });
  }

  async function toggleAutomation(row: AutomationRow) {
    setActionLoading(true);
    setError("");
    try {
      const input = { domainId: row.domain.domainId, automationId: row.automation.id };
      if (row.automation.status === "enabled") await disableAutomationService(input);
      else await enableAutomationService(input);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update automation"));
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleBinding(row: BindingRow) {
    setActionLoading(true);
    setError("");
    try {
      const input = { domainId: row.domain.domainId, bindingId: row.binding.id };
      if (row.binding.status === "enabled") await disableGraphAutomationBindingService(input);
      else await enableGraphAutomationBindingService(input);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to update automation binding"));
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteAutomation(row: AutomationRow) {
    if (!window.confirm(`Delete automation ${row.automation.id}?`)) return;
    setActionLoading(true);
    setError("");
    try {
      await deleteAutomationService({ domainId: row.domain.domainId, automationId: row.automation.id });
      await load();
    } catch (err) {
      setError(errorMessage(err, "Failed to delete automation"));
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Intelligence</Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Graph automations</H2>
          <Text intent="muted" className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
            Manage graph-triggered automations across spaces and domains, inspect recent runs, and monitor inference token usage.
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={loading}>{loading ? "Refreshing…" : "Refresh"}</Button>
          {canManage && <Button onClick={() => void openCreate()} disabled={domains.length === 0}>Create automation</Button>}
        </div>
      </div>

      {error && <Alert>{error}</Alert>}
      {usageError && <Alert>{usageError}</Alert>}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Procedures" value={totals.procedures} />
        <SummaryCard label="Automations" value={totals.automations} />
        <SummaryCard label="Recent runs" value={totals.runs} />
        <SummaryCard label="Usage tokens" value={totals.totalTokens} />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:grid-cols-3">
        <Select label="Space" value={selectedSpaceId} onChange={(value) => setFilter("spaceId", value)} options={spaces.map((space) => ({ value: space.spaceId, label: space.name || space.spaceId }))} placeholder="All spaces" disabled={loading} />
        <Select label="Domain" value={selectedDomainId} onChange={(value) => setFilter("domainId", value)} options={filteredDomains.map((domain) => ({ value: domain.domainId, label: `${domain.name || domain.key} (${domain.spaceId})` }))} placeholder="All domains" disabled={loading || filteredDomains.length === 0} />
        <Select label="Status" value={statusFilter} onChange={(value) => setFilter("status", value)} options={statusOptions} placeholder="All statuses" disabled={loading} />
      </div>


      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3 dark:border-slate-800" role="tablist" aria-label="Graph automation sections">
          <TabButton active={activeTab === "procedures"} onClick={() => setTab("procedures")}>Procedures</TabButton>
          <TabButton active={activeTab === "automations"} onClick={() => setTab("automations")}>Automations</TabButton>
          <TabButton active={activeTab === "runs"} onClick={() => setTab("runs")}>Runs</TabButton>
        </div>

        {activeTab === "procedures" && <div>
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">Procedures</Text>
            <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Reusable graph work: context assembly, inference defaults, output actions, and safety ceilings.</Text>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Procedure</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Inference</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={5}>Loading procedures…</td></tr> : filteredProcedureRows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={5}>No graph procedures found.</td></tr> : filteredProcedureRows.map((row) => <tr key={`${row.domain.domainId}:${row.procedure.id}`}>
                <td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.procedure.name || row.procedure.id}</div><div className="font-mono text-xs text-slate-500">{row.procedure.id} · v{row.procedure.version}</div></td>
                <td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="text-xs text-slate-500">{row.domain.name || row.domain.key}</div></td>
                <td className="px-4 py-3"><StatusPill value={row.procedure.status} /></td>
                <td className="px-4 py-3"><div>{row.procedure.operation || "—"}</div><div className="font-mono text-xs text-slate-500">{row.procedure.inferenceProfile || row.procedure.inferenceProfileId || "No default profile"}</div></td>
                <td className="px-4 py-3"><Button variant="secondary" onClick={() => void showProcedure(row.domain.domainId, row.procedure.id)}>View JSON</Button></td>
              </tr>)}
            </tbody>
          </table>
        </div>}

        {activeTab === "automations" && <div>
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">Automations</Text>
            <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Bindings that connect procedures to triggers, scopes, runtime principals, and inference profiles.</Text>
          </div>
          {filteredBindingRows.length > 0 ? <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Automation</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Runtime</th><th className="px-4 py-3">Trigger</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredBindingRows.map((row) => <tr key={`${row.domain.domainId}:${row.binding.id}`}>
                <td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.binding.name || row.binding.id}</div><div className="font-mono text-xs text-slate-500">{row.binding.id} · <StatusPill value={row.binding.status} /></div><div className="mt-1 font-mono text-xs text-slate-500">→ {row.binding.procedureId} v{row.binding.procedureVersion}</div></td>
                <td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="text-xs text-slate-500">{row.domain.name || row.domain.key}</div></td>
                <td className="px-4 py-3"><div className="text-xs">actor <span className="font-mono">{row.binding.actorPrincipalId || "automation"}</span></div><div className="text-xs">on behalf <span className="font-mono">{row.binding.onBehalfOfPrincipalId || "—"}</span></div><div className="text-xs">owner <span className="font-mono">{row.binding.ownerPrincipalId || "—"}</span></div></td>
                <td className="px-4 py-3"><div>{row.binding.triggerType}</div><div className="text-xs text-slate-500">{row.binding.events.join(", ") || "No events"}</div><div className="text-xs text-slate-500">{row.binding.labels.join(", ") || "No labels"}</div></td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void showBinding(row.domain.domainId, row.binding.id)}>View JSON</Button>{canManage && <Button variant="secondary" disabled={actionLoading} onClick={() => void toggleBinding(row)}>{row.binding.status === "enabled" ? "Disable" : "Enable"}</Button>}</div></td>
              </tr>)}
            </tbody>
          </table> : <LegacyAutomationTable rows={filteredRows} loading={loading} usageByAutomation={usageByAutomation} canManage={canManage} actionLoading={actionLoading} onShowAutomation={showAutomation} onEdit={openEdit} onToggle={toggleAutomation} onDelete={deleteAutomation} />}
        </div>}

        {activeTab === "runs" && <div>
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">Runs</Text>
            <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Recent invocation/run attempts with status, trigger event, target, and run detail links.</Text>
          </div>
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Run</th><th className="px-4 py-3">Automation</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>Loading runs…</td></tr> : filteredRunRows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>No recent runs found.</td></tr> : filteredRunRows.map((row) => <tr key={`${row.domain.domainId}:${row.invocation.id}`}>
                <td className="px-4 py-3"><div className="font-mono text-xs text-slate-900 dark:text-slate-100">{row.invocation.id}</div><div className="text-xs text-slate-500">{row.invocation.updatedAt || row.invocation.createdAt || "—"}</div></td>
                <td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.automation.name || row.automation.id}</div><div className="font-mono text-xs text-slate-500">{row.invocation.automationId} · v{row.invocation.automationVersion}</div></td>
                <td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="text-xs text-slate-500">{row.domain.name || row.domain.key}</div></td>
                <td className="px-4 py-3"><div>{row.invocation.eventType || "—"}</div><div className="font-mono text-xs text-slate-500">{row.invocation.changedElementId || row.invocation.eventId || "—"}</div></td>
                <td className="px-4 py-3"><StatusPill value={row.invocation.status} />{row.invocation.skipReason ? <div className="mt-1 text-xs text-slate-500">{row.invocation.skipReason}</div> : null}</td>
                <td className="px-4 py-3"><Button variant="secondary" onClick={() => void showRun(row.domain.domainId, row.invocation.id)}>View JSON</Button></td>
              </tr>)}
            </tbody>
          </table>
        </div>}
      </div>

      {detail && <DetailDrawer title={detail.title} json={detail.json} onClose={() => setDetail(null)} />}
      {editor && <AutomationEditorDialog editor={editor} domains={domains} loading={actionLoading} error={editorError} onClose={() => setEditor(null)} onSave={() => void saveEditor()} onDefinitionChange={(definitionJson) => setEditor((current) => current ? { ...current, definitionJson } : current)} onDomainChange={async (domainId) => { const domain = domains.find((item) => item.domainId === domainId); const profiles = await loadProfiles(domain?.spaceId || editor.spaceId, domainId); setEditor((current) => current ? { ...current, spaceId: domain?.spaceId || current.spaceId, domainId, profiles } : current); }} onProfileChange={applyProfile} />}
    </section>
  );
}

function compareAutomationRows(a: AutomationRow, b: AutomationRow) {
  return `${a.space.name || a.space.spaceId}:${a.domain.name || a.domain.key}:${a.automation.name || a.automation.id}`.localeCompare(`${b.space.name || b.space.spaceId}:${b.domain.name || b.domain.key}:${b.automation.name || b.automation.id}`);
}

function automationTab(value: string | null): AutomationTab {
  return value === "procedures" || value === "runs" ? value : "automations";
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return <button type="button" role="tab" aria-selected={active} className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`} onClick={onClick}>{children}</button>;
}

function LegacyAutomationTable({ rows, loading, usageByAutomation, canManage, actionLoading, onShowAutomation, onEdit, onToggle, onDelete }: { rows: AutomationRow[]; loading: boolean; usageByAutomation: UsageByAutomation; canManage: boolean; actionLoading: boolean; onShowAutomation: (domainId: string, automationId: string) => void | Promise<void>; onEdit: (row: AutomationRow) => void | Promise<void>; onToggle: (row: AutomationRow) => void | Promise<void>; onDelete: (row: AutomationRow) => void | Promise<void> }) {
  return <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
    <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400"><tr><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Automation</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Actions</th></tr></thead>
    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
      {loading ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={5}>Loading automations…</td></tr> : rows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={5}>No graph automations found.</td></tr> : rows.map((row) => {
        const usage = usageByAutomation[automationUsageKey(row.domain.domainId, row.automation.id)];
        return <tr key={`${row.domain.domainId}:${row.automation.id}`} className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40">
          <td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="mt-1 text-slate-600 dark:text-slate-400">{row.domain.name || row.domain.key}</div><div className="mt-1 font-mono text-xs text-slate-500">{row.domain.domainId}</div></td>
          <td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.automation.name || row.automation.id}</div><div className="font-mono text-xs text-slate-500">{row.automation.id} · v{row.automation.version}</div><div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{row.automation.events.join(", ") || "No event filter"}</div></td>
          <td className="px-4 py-3"><StatusPill value={row.automation.status} /></td>
          <td className="px-4 py-3">{usage ? <div><div className="font-medium">{usage.totalTokens.toLocaleString()} tokens</div><div className="text-xs text-slate-500">{usage.requestCount} requests · {usage.failedCount + usage.deniedCount} failed/denied</div></div> : <span className="text-slate-500 dark:text-slate-400">No usage reported</span>}</td>
          <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void onShowAutomation(row.domain.domainId, row.automation.id)}>View JSON</Button>{canManage ? <><Button variant="secondary" onClick={() => void onEdit(row)}>Edit</Button><Button variant="secondary" disabled={actionLoading} onClick={() => void onToggle(row)}>{row.automation.status === "enabled" ? "Disable" : "Enable"}</Button><Button variant="secondary" disabled={actionLoading} onClick={() => void onDelete(row)}>Delete</Button></> : <span className="self-center text-slate-500 dark:text-slate-400">Read-only</span>}</div></td>
        </tr>;
      })}
    </tbody>
  </table>;
}

function automationUsageKey(domainId: string, automationId: string) {
  return `${domainId}:${automationId}`;
}

function groupValue(group: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (group[key]) return group[key];
  }
  return "";
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/70"><Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">{label}</Text><div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">{value.toLocaleString()}</div></div>;
}

function StatusPill({ value }: { value: string }) {
  const enabled = value === "enabled";
  return <span className={`rounded-full px-2 py-1 text-xs ${enabled ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}>{value || "unknown"}</span>;
}

function RecentInvocations({ domainId, invocations, onShowRun }: { domainId: string; invocations: AutomationInvocationSummaryInfo[]; onShowRun: (domainId: string, runId: string) => void | Promise<void> }) {
  if (invocations.length === 0) return <span className="text-slate-500 dark:text-slate-400">No recent runs</span>;
  return <div className="space-y-2">{invocations.map((invocation) => <button key={invocation.id} type="button" className="block text-left text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" onClick={() => void onShowRun(domainId, invocation.id)}><span className="font-mono text-xs">{invocation.id}</span><span className="ml-2 text-xs text-slate-500">{invocation.status}</span></button>)}</div>;
}

function DetailDrawer({ title, json, onClose }: { title: string; json: string; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60"><aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{title}</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Raw automation diagnostic payload.</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div><pre className="mt-6 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">{json}</pre></aside></div>;
}

function AutomationEditorDialog({ editor, domains, loading, error, onClose, onSave, onDefinitionChange, onDomainChange, onProfileChange }: { editor: AutomationEditorState; domains: DomainInfo[]; loading: boolean; error: string; onClose: () => void; onSave: () => void; onDefinitionChange: (definitionJson: string) => void; onDomainChange: (domainId: string) => void; onProfileChange: (profile: string) => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{editor.mode === "create" ? "Create automation" : "Edit automation"}</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Definitions reference inference profiles and model access configured in Intelligence / Access.</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div>{error && <Alert className="mt-4">{error}</Alert>}<div className="mt-4 grid gap-4 md:grid-cols-2"><Select label="Domain" value={editor.domainId} onChange={onDomainChange} options={domains.map((domain) => ({ value: domain.domainId, label: `${domain.name || domain.key} (${domain.spaceId})` }))} disabled={loading || editor.mode === "edit"} /><Select label="Inference profile" value={editor.selectedProfile} onChange={onProfileChange} options={editor.profiles.map((profile) => ({ value: profile.key || profile.inferenceProfileId, label: `${profile.displayName || profile.key} (${profile.operation})` }))} placeholder="No profile selected" disabled={loading} /></div><label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="automation-definition-json">Definition JSON</label><textarea id="automation-definition-json" className="mt-2 min-h-[28rem] w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={editor.definitionJson} onChange={(event) => onDefinitionChange(event.target.value)} disabled={loading} /><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={onSave} disabled={loading || !editor.domainId}>{loading ? "Saving…" : "Save automation"}</Button></div></div></div>;
}
