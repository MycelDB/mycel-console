import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "../../../../components/layout/PageHeader";
import {
  Button,
  ErrorGroup,
  errorMessage,
  formatEnumLabel,
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
  deleteSemanticRule as defaultDeleteSemanticRule,
  getSemanticMaintenanceStatus as defaultGetSemanticMaintenanceStatus,
  listDomains as defaultListDomains,
  listSemanticRules as defaultListSemanticRules,
  listSemanticMaintenanceWork as defaultListSemanticMaintenanceWork,
  listSpaces as defaultListSpaces,
  processSemanticDirtyWork as defaultProcessSemanticDirtyWork,
  retrySemanticMaintenanceWork as defaultRetrySemanticMaintenanceWork,
  setSemanticRuleEnabled as defaultSetSemanticRuleEnabled,
  summarizeInferenceUsage as defaultSummarizeInferenceUsage,
} from "../../../../services/adminService";
import type {
  DomainInfo,
  ListDomainsInput,
  ListDomainsResponse,
} from "../../../../types/domains";
import type {
  SummarizeUsageInput,
  SummarizeUsageResponse,
} from "../../../../types/inference";
import type {
  DeleteSemanticRuleInput,
  DeleteSemanticRuleResponse,
  ListSemanticRulesInput,
  ListSemanticRulesResponse,
  SetSemanticRuleEnabledInput,
  SetSemanticRuleEnabledResponse,
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
import type {
  SemanticRow,
  SemanticTab,
  SpaceMaintenance,
  UsageByRule,
} from "../model/pageTypes";
import {
  compareSemanticRows,
  DetailDrawer,
  formatTimestamp,
  groupValue,
  MaintenanceWorkTable,
  semanticScopeDisambiguation,
  SemanticRuleScope,
  semanticTab,
  StatusPill,
  SummaryCard,
} from "../components/SemanticDisplay";

export type SemanticRulesPageProps = {
  listSpacesService?: (input?: ListSpacesInput) => Promise<ListSpacesResponse>;
  listDomainsService?: (input: ListDomainsInput) => Promise<ListDomainsResponse>;
  listSemanticRulesService?: (input: ListSemanticRulesInput) => Promise<ListSemanticRulesResponse>;
  setSemanticRuleEnabledService?: (input: SetSemanticRuleEnabledInput) => Promise<SetSemanticRuleEnabledResponse>;
  deleteSemanticRuleService?: (input: DeleteSemanticRuleInput) => Promise<DeleteSemanticRuleResponse>;
  getSemanticMaintenanceStatusService?: (input: GetSemanticMaintenanceStatusInput) => Promise<SemanticMaintenanceStatusInfo>;
  listSemanticMaintenanceWorkService?: (input: ListSemanticMaintenanceWorkInput) => Promise<ListSemanticMaintenanceWorkResponse>;
  retrySemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  cancelSemanticMaintenanceWorkService?: (input: SemanticMaintenanceWorkActionInput) => Promise<SemanticMaintenanceWorkItemInfo>;
  analyzeSemanticDirtyWorkService?: (input: AnalyzeSemanticDirtyWorkInput) => Promise<AnalyzeSemanticDirtyWorkResponse>;
  processSemanticDirtyWorkService?: (input: ProcessSemanticDirtyWorkInput) => Promise<ProcessSemanticDirtyWorkResponse>;
  backfillSemanticRuleService?: (input: BackfillSemanticRuleInput) => Promise<BackfillSemanticRuleResponse>;
  summarizeInferenceUsageService?: (input: SummarizeUsageInput) => Promise<SummarizeUsageResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

const ruleStates = [
  "SEMANTIC_RULE_STATE_ACTIVE",
  "SEMANTIC_RULE_STATE_BUILDING",
  "SEMANTIC_RULE_STATE_STALE",
  "SEMANTIC_RULE_STATE_DISABLED",
  "SEMANTIC_RULE_STATE_ERROR",
];

export function SemanticRulesPage({
  listSpacesService = defaultListSpaces,
  listDomainsService = defaultListDomains,
  listSemanticRulesService = defaultListSemanticRules,
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
  principalContext,
}: SemanticRulesPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [domains, setDomains] = useState<DomainInfo[]>([]);
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
    const notice = (location.state as { notice?: string } | null)?.notice;
    if (!notice) return;
    setActionResult(notice);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.pathname, location.search, location.state, navigate]);

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
  const scopeDisambiguation = useMemo(
    () => semanticScopeDisambiguation(filteredRows),
    [filteredRows],
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
        title="Semantic Rules"
        description="Define and manage semantic generation rules, inspect per-binding index health, run explicit maintenance, and track token usage."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void load()}
              disabled={loading}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
            {canManage && (
              <Button
                onClick={() => {
                  const params = new URLSearchParams();
                  if (selectedSpaceId) params.set("spaceId", selectedSpaceId);
                  if (selectedDomainId) params.set("domainId", selectedDomainId);
                  navigate(`/intelligence/semantic-rules/new${params.size ? `?${params}` : ""}`);
                }}
              >
                Add Rule
              </Button>
            )}
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
                    scopeDisambiguation={scopeDisambiguation}
                    usage={usageByRule[row.rule.semanticRuleId]}
                    canManage={canManage}
                    loading={actionLoading}
                    onDetails={() =>
                      setDetail({
                        title: row.rule.displayName || row.rule.key,
                        data: row.rule,
                      })
                    }
                    onEdit={() =>
                      navigate(
                        `/intelligence/semantic-rules/${encodeURIComponent(row.rule.semanticRuleId)}?spaceId=${encodeURIComponent(row.space.spaceId)}`,
                      )
                    }
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

function RuleRow({
  row,
  scopeDisambiguation,
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
  scopeDisambiguation: ReturnType<typeof semanticScopeDisambiguation>;
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
        <SemanticRuleScope
          row={row}
          disambiguation={scopeDisambiguation}
        />
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
