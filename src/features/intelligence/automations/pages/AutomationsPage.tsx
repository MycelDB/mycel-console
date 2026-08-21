import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button, ErrorBox, H2, Select, Text } from "../../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../../console";
import {
  createAutomation as defaultCreateAutomation,
  deleteAutomation as defaultDeleteAutomation,
  disableAutomation as defaultDisableAutomation,
  enableAutomation as defaultEnableAutomation,
  getAutomation as defaultGetAutomation,
  getAutomationRun as defaultGetAutomationRun,
  listAutomationInvocations as defaultListAutomationInvocations,
  listAutomations as defaultListAutomations,
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
  ListAutomationInvocationsInput,
  ListAutomationInvocationsResponseInfo,
  ListAutomationsResponseInfo,
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
  const canManage = canUseCapability(principalContext, "automation.manage");

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
  }, [listAutomationInvocationsService, listAutomationsService, listDomainsService, listSpacesService, selectedDomainId, selectedSpaceId, summarizeInferenceUsageService]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDomains = useMemo(() => domains.filter((domain) => !selectedSpaceId || domain.spaceId === selectedSpaceId), [domains, selectedSpaceId]);
  const filteredRows = useMemo(() => rows.filter((row) => !statusFilter || row.automation.status === statusFilter), [rows, statusFilter]);
  const totals = useMemo(() => {
    const usage = filteredRows.reduce((sum, row) => sum + (usageByAutomation[automationUsageKey(row.domain.domainId, row.automation.id)]?.totalTokens ?? 0), 0);
    return {
      automations: filteredRows.length,
      enabled: filteredRows.filter((row) => row.automation.status === "enabled").length,
      failedRuns: filteredRows.reduce((sum, row) => sum + row.invocations.filter((invocation) => invocation.status === "failed" || invocation.status === "error").length, 0),
      totalTokens: usage,
    };
  }, [filteredRows, usageByAutomation]);

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
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">Intelligence</Text>
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

      {error && <ErrorBox>{error}</ErrorBox>}
      {usageError && <ErrorBox>{usageError}</ErrorBox>}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Automations" value={totals.automations} />
        <SummaryCard label="Enabled" value={totals.enabled} />
        <SummaryCard label="Recent failed runs" value={totals.failedRuns} />
        <SummaryCard label="Usage tokens" value={totals.totalTokens} />
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/70 md:grid-cols-3">
        <Select label="Space" value={selectedSpaceId} onChange={(value) => setFilter("spaceId", value)} options={spaces.map((space) => ({ value: space.spaceId, label: space.name || space.spaceId }))} placeholder="All spaces" disabled={loading} />
        <Select label="Domain" value={selectedDomainId} onChange={(value) => setFilter("domainId", value)} options={filteredDomains.map((domain) => ({ value: domain.domainId, label: `${domain.name || domain.key} (${domain.spaceId})` }))} placeholder="All domains" disabled={loading || filteredDomains.length === 0} />
        <Select label="Status" value={statusFilter} onChange={(value) => setFilter("status", value)} options={[{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }]} placeholder="All statuses" disabled={loading} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
            <tr><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Automation</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Recent runs</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {loading ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>Loading automations…</td></tr> : filteredRows.length === 0 ? <tr><td className="px-4 py-6 text-center text-slate-600 dark:text-slate-400" colSpan={6}>No graph automations found.</td></tr> : filteredRows.map((row) => {
              const usage = usageByAutomation[automationUsageKey(row.domain.domainId, row.automation.id)];
              return <tr key={`${row.domain.domainId}:${row.automation.id}`} className="align-top hover:bg-slate-100 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3"><Link className="font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/spaces/${encodeURIComponent(row.space.spaceId)}`}>{row.space.name || row.space.spaceId}</Link><div className="mt-1 text-slate-600 dark:text-slate-400">{row.domain.name || row.domain.key}</div><div className="mt-1 font-mono text-xs text-slate-500">{row.domain.domainId}</div></td>
                <td className="px-4 py-3"><div className="font-medium text-slate-900 dark:text-slate-100">{row.automation.name || row.automation.id}</div><div className="font-mono text-xs text-slate-500">{row.automation.id} · v{row.automation.version}</div><div className="mt-2 text-xs text-slate-600 dark:text-slate-400">{row.automation.events.join(", ") || "No event filter"}</div></td>
                <td className="px-4 py-3"><StatusPill value={row.automation.status} /></td>
                <td className="px-4 py-3"><RecentInvocations domainId={row.domain.domainId} invocations={row.invocations} onShowRun={showRun} /></td>
                <td className="px-4 py-3">{usage ? <div><div className="font-medium">{usage.totalTokens.toLocaleString()} tokens</div><div className="text-xs text-slate-500">{usage.requestCount} requests · {usage.failedCount + usage.deniedCount} failed/denied</div></div> : <span className="text-slate-500 dark:text-slate-400">No usage reported</span>}</td>
                <td className="px-4 py-3"><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => void showAutomation(row.domain.domainId, row.automation.id)}>View JSON</Button>{canManage ? <><Button variant="secondary" onClick={() => void openEdit(row)}>Edit</Button><Button variant="secondary" disabled={actionLoading} onClick={() => void toggleAutomation(row)}>{row.automation.status === "enabled" ? "Disable" : "Enable"}</Button><Button variant="secondary" disabled={actionLoading} onClick={() => void deleteAutomation(row)}>Delete</Button></> : <span className="self-center text-slate-500 dark:text-slate-400">Read-only</span>}</div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      {detail && <DetailDrawer title={detail.title} json={detail.json} onClose={() => setDetail(null)} />}
      {editor && <AutomationEditorDialog editor={editor} domains={domains} loading={actionLoading} error={editorError} onClose={() => setEditor(null)} onSave={() => void saveEditor()} onDefinitionChange={(definitionJson) => setEditor((current) => current ? { ...current, definitionJson } : current)} onDomainChange={async (domainId) => { const domain = domains.find((item) => item.domainId === domainId); const profiles = await loadProfiles(domain?.spaceId || editor.spaceId, domainId); setEditor((current) => current ? { ...current, spaceId: domain?.spaceId || current.spaceId, domainId, profiles } : current); }} onProfileChange={applyProfile} />}
    </section>
  );
}

function compareAutomationRows(a: AutomationRow, b: AutomationRow) {
  return `${a.space.name || a.space.spaceId}:${a.domain.name || a.domain.key}:${a.automation.name || a.automation.id}`.localeCompare(`${b.space.name || b.space.spaceId}:${b.domain.name || b.domain.key}:${b.automation.name || b.automation.id}`);
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
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-start justify-between gap-4"><div><Text as="h3" className="font-semibold text-slate-900 dark:text-slate-100">{editor.mode === "create" ? "Create automation" : "Edit automation"}</Text><Text intent="muted" size="sm" className="mt-1 text-slate-600 dark:text-slate-400">Definitions reference inference profiles and model access configured in Intelligence / Access.</Text></div><Button variant="secondary" onClick={onClose}>Close</Button></div>{error && <ErrorBox className="mt-4">{error}</ErrorBox>}<div className="mt-4 grid gap-4 md:grid-cols-2"><Select label="Domain" value={editor.domainId} onChange={onDomainChange} options={domains.map((domain) => ({ value: domain.domainId, label: `${domain.name || domain.key} (${domain.spaceId})` }))} disabled={loading || editor.mode === "edit"} /><Select label="Inference profile" value={editor.selectedProfile} onChange={onProfileChange} options={editor.profiles.map((profile) => ({ value: profile.key || profile.inferenceProfileId, label: `${profile.displayName || profile.key} (${profile.operation})` }))} placeholder="No profile selected" disabled={loading} /></div><label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200" htmlFor="automation-definition-json">Definition JSON</label><textarea id="automation-definition-json" className="mt-2 min-h-[28rem] w-full rounded-lg border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={editor.definitionJson} onChange={(event) => onDefinitionChange(event.target.value)} disabled={loading} /><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button><Button onClick={onSave} disabled={loading || !editor.domainId}>{loading ? "Saving…" : "Save automation"}</Button></div></div></div>;
}
