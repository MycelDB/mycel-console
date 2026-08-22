import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import type { AutomationActionInput, AutomationDefinitionInfo, AutomationDefinitionInput, DomainAutomationInput, GetAutomationRunInput, ListAutomationInvocationsInput, ListAutomationInvocationsResponseInfo, ListAutomationsResponseInfo, AutomationRunInfo, UpdateAutomationInput, ValidateAutomationInfo } from "../types/automations";
import type {
  BackupPolicyInfo,
  BackupStatusResponse,
  DeleteBackupResponse,
  ListBackupsInput,
  ListBackupsResponse,
  TriggerBackupInput,
  TriggerBackupResponse,
} from "../types/backups";
import type { GetMyAccessInput, GrantPrincipalCapabilityInput, GrantPrincipalCapabilityResponse, GrantPrincipalRoleInput, GrantPrincipalRoleResponse, ListPrincipalCapabilitiesResponse, ListPrincipalRolesResponse, MyAccessInfo, RevokePrincipalCapabilityInput, RevokePrincipalCapabilityResponse, RevokePrincipalRoleInput, RevokePrincipalRoleResponse, SetPrincipalCapabilitiesForScopeInput, SetPrincipalCapabilitiesForScopeResponse, SetPrincipalRolesForScopeInput, SetPrincipalRolesForScopeResponse } from "../types/access";
import type { ConnectionDiagnosticsResponse, LoginInput, PrincipalSession } from "../types/auth";
import type { ClientQueryLoginInput, ClientQuerySessionInfo, ExecuteGqlInput, ExecuteGqlResponse, ExecuteGqlScriptInput, ExecuteGqlScriptResponse, ExecuteGraphQueryInput, ExecuteGraphQueryResponse } from "../types/clientQuery";
import type { ClusterHealthInfo, ClusterRuntimeStatusInfo, ClusterStatusInfo, GraphConsistencyInput, GraphConsistencyReport, GraphForensicExportInput, GraphForensicExportResponse, ListClusterMembersResponse, ListRaftGroupsResponse, LocalGraphConsistencyResponse, LookupSpaceRouteInput, LookupSpaceRouteResult } from "../types/cluster";
import type { ListDomainsInput, ListDomainsResponse } from "../types/domains";
import type {
  ApplyInferencePackageResponse,
  CreateCredentialGrantInput,
  CreateCredentialInput,
  CreateInferencePolicyInput,
  CreateInferenceProfileInput,
  CredentialGrantActionInput,
  CredentialGrantResponse,
  CredentialResponse,
  CredentialStatusInput,
  DeleteCredentialGrantResponse,
  DeleteCredentialInput,
  DeleteCredentialResponse,
  DeleteInferencePolicyResponse,
  InferencePackageDocument,
  InferencePolicyActionInput,
  InferencePolicyResponse,
  InferenceProfileActionInput,
  InferenceProfileResponse,
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
  ListUsageEventsInput,
  ListUsageEventsResponse,
  ListVectorStoresInput,
  ListVectorStoresResponse,
  RotateCredentialInput,
  SummarizeUsageInput,
  SummarizeUsageResponse,
} from "../types/inference";
import type { DeleteDomainSchemaInput, GetDomainSchemaInput, DomainSchemaInfo } from "../types/schemas";
import type { CreateSemanticRuleInput, CreateSemanticRuleResponse, DeleteSemanticRuleInput, DeleteSemanticRuleResponse, GetSemanticRuleInput, GetSemanticRuleResponse, ListSemanticRulesInput, ListSemanticRulesResponse, SemanticSearchInput, SemanticSearchResponse, SetSemanticRuleEnabledInput, SetSemanticRuleEnabledResponse, UpdateSemanticRuleInput, UpdateSemanticRuleResponse, ValidateSemanticRuleInput, ValidateSemanticRuleResponse } from "../types/semantic";
import type { AnalyzeSemanticDirtyWorkInput, AnalyzeSemanticDirtyWorkResponse, BackfillSemanticRuleInput, BackfillSemanticRuleResponse, GetSemanticMaintenanceStatusInput, ListSemanticMaintenanceWorkInput, ListSemanticMaintenanceWorkResponse, ProcessSemanticDirtyWorkInput, ProcessSemanticDirtyWorkResponse, SemanticMaintenanceStatusInfo, SemanticMaintenanceWorkActionInput, SemanticMaintenanceWorkItemInfo } from "../types/semanticMaintenance";
import type { CreateSpaceInput, CreateSpaceResponse, ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../types/spaces";
import type {
  CreatePrincipalInput,
  DeletePrincipalInput,
  DisablePrincipalInput,
  ListPrincipalSessionsInput,
  ListPrincipalSessionsResponse,
  ListPrincipalsInput,
  ListPrincipalsResponse,
  PrincipalInfo,
  RevokePrincipalSessionInput,
  RevokePrincipalSessionsResponse,
  SetPrincipalPasswordInput,
} from "../types/users";

export const AUTH_EXPIRED_EVENT = "mycel-console:auth-expired";

type InvokeArgs = Record<string, unknown>;

async function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  try {
    return args === undefined ? await tauriInvoke<T>(command) : await tauriInvoke<T>(command, args);
  } catch (err) {
    if (shouldEmitAuthExpired(command, err) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { message: errorMessage(err) } }));
    }
    throw err;
  }
}

function shouldEmitAuthExpired(command: string, err: unknown): boolean {
  if (["admin_login", "admin_connection_diagnostics", "admin_whoami", "admin_logout"].includes(command)) return false;
  return isAuthExpiredError(err);
}

export function isAuthExpiredError(err: unknown): boolean {
  const lower = errorMessage(err).toLowerCase();
  return lower.includes("authorization token is expired") || lower.includes("access token is expired") || lower.includes("token is expired") || (lower.includes("unauthenticated") && lower.includes("expired"));
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export async function login(input: LoginInput): Promise<PrincipalSession> {
  return invoke<PrincipalSession>("admin_login", { input });
}

export async function connectionDiagnostics(input: LoginInput): Promise<ConnectionDiagnosticsResponse> {
  return invoke<ConnectionDiagnosticsResponse>("admin_connection_diagnostics", { input });
}

export async function logout(): Promise<void> {
  await invoke<void>("admin_logout");
}

export async function clientQueryLogin(input: ClientQueryLoginInput): Promise<ClientQuerySessionInfo> {
  return invoke<ClientQuerySessionInfo>("admin_console_client_query_login", { input });
}

export async function clientQueryLogout(): Promise<void> {
  return invoke<void>("admin_console_client_query_logout");
}

export async function executeGql(input: ExecuteGqlInput): Promise<ExecuteGqlResponse> {
  return invoke<ExecuteGqlResponse>("admin_console_execute_gql", { input });
}

export async function executeGqlScript(input: ExecuteGqlScriptInput): Promise<ExecuteGqlScriptResponse> {
  return invoke<ExecuteGqlScriptResponse>("admin_console_execute_gql_script", { input });
}

export async function executeGraphQuery(input: ExecuteGraphQueryInput): Promise<ExecuteGraphQueryResponse> {
  return invoke<ExecuteGraphQueryResponse>("admin_console_execute_graph_query", { input });
}

export async function whoAmI(): Promise<PrincipalSession | null> {
  return invoke<PrincipalSession | null>("admin_whoami");
}

export async function getMyAccess(input: GetMyAccessInput = {}): Promise<MyAccessInfo> {
  return invoke<MyAccessInfo>("admin_get_my_access", { input });
}

export async function getClusterStatus(): Promise<ClusterStatusInfo> {
  return invoke<ClusterStatusInfo>("admin_get_cluster_status");
}

export async function getClusterRuntimeStatus(): Promise<ClusterRuntimeStatusInfo> {
  return invoke<ClusterRuntimeStatusInfo>("admin_get_cluster_runtime_status");
}

export async function listRaftGroups(): Promise<ListRaftGroupsResponse> {
  return invoke<ListRaftGroupsResponse>("admin_list_raft_groups");
}

export async function lookupSpaceRoute(input: LookupSpaceRouteInput): Promise<LookupSpaceRouteResult> {
  return invoke<LookupSpaceRouteResult>("admin_lookup_space_route", { input });
}

export async function getLocalGraphConsistency(input: GraphConsistencyInput): Promise<LocalGraphConsistencyResponse> {
  return invoke<LocalGraphConsistencyResponse>("admin_get_local_graph_consistency", { input });
}

export async function getGraphConsistencyReport(input: GraphConsistencyInput): Promise<GraphConsistencyReport> {
  return invoke<GraphConsistencyReport>("admin_get_graph_consistency_report", { input });
}

export async function getLocalGraphForensicExport(input: GraphForensicExportInput): Promise<GraphForensicExportResponse> {
  return invoke<GraphForensicExportResponse>("admin_get_local_graph_forensic_export", { input });
}

export async function listClusterMembers(): Promise<ListClusterMembersResponse> {
  return invoke<ListClusterMembersResponse>("admin_list_cluster_members");
}

export async function getClusterHealth(): Promise<ClusterHealthInfo> {
  return invoke<ClusterHealthInfo>("admin_get_cluster_health");
}

export async function listPrincipals(input: ListPrincipalsInput = {}): Promise<ListPrincipalsResponse> {
  return invoke<ListPrincipalsResponse>("admin_list_principals", { input });
}


export async function getPrincipal(principalId: string): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_get_principal", { principalId });
}

export async function listPrincipalRoles(principalId: string): Promise<ListPrincipalRolesResponse> {
  return invoke<ListPrincipalRolesResponse>("admin_list_principal_roles", { principalId });
}

export async function listPrincipalCapabilities(principalId: string): Promise<ListPrincipalCapabilitiesResponse> {
  return invoke<ListPrincipalCapabilitiesResponse>("admin_list_principal_capabilities", { principalId });
}

export async function grantPrincipalRole(input: GrantPrincipalRoleInput): Promise<GrantPrincipalRoleResponse> {
  return invoke<GrantPrincipalRoleResponse>("admin_grant_principal_role", { input });
}

export async function revokePrincipalRole(input: RevokePrincipalRoleInput): Promise<RevokePrincipalRoleResponse> {
  return invoke<RevokePrincipalRoleResponse>("admin_revoke_principal_role", { input });
}

export async function setPrincipalRolesForScope(input: SetPrincipalRolesForScopeInput): Promise<SetPrincipalRolesForScopeResponse> {
  return invoke<SetPrincipalRolesForScopeResponse>("admin_set_principal_roles_for_scope", { input });
}

export async function grantPrincipalCapability(input: GrantPrincipalCapabilityInput): Promise<GrantPrincipalCapabilityResponse> {
  return invoke<GrantPrincipalCapabilityResponse>("admin_grant_principal_capability", { input });
}

export async function revokePrincipalCapability(input: RevokePrincipalCapabilityInput): Promise<RevokePrincipalCapabilityResponse> {
  return invoke<RevokePrincipalCapabilityResponse>("admin_revoke_principal_capability", { input });
}

export async function setPrincipalCapabilitiesForScope(input: SetPrincipalCapabilitiesForScopeInput): Promise<SetPrincipalCapabilitiesForScopeResponse> {
  return invoke<SetPrincipalCapabilitiesForScopeResponse>("admin_set_principal_capabilities_for_scope", { input });
}


export async function listPrincipalSessions(input: ListPrincipalSessionsInput): Promise<ListPrincipalSessionsResponse> {
  return invoke<ListPrincipalSessionsResponse>("admin_list_principal_sessions", { input });
}


export async function listSpaces(input: ListSpacesInput = {}): Promise<ListSpacesResponse> {
  return invoke<ListSpacesResponse>("admin_list_spaces", { input });
}

export async function getSpace(spaceId: string): Promise<SpaceInfo> {
  return invoke<SpaceInfo>("admin_get_space", { spaceId });
}

export async function createSpace(input: CreateSpaceInput): Promise<CreateSpaceResponse> {
  return invoke<CreateSpaceResponse>("admin_create_space", { input });
}

export async function listDomains(input: ListDomainsInput): Promise<ListDomainsResponse> {
  return invoke<ListDomainsResponse>("admin_list_domains", { input });
}

export async function getDomainSchema(input: GetDomainSchemaInput): Promise<DomainSchemaInfo> {
  return invoke<DomainSchemaInfo>("admin_get_domain_schema", { input });
}

export async function deleteDomainSchema(input: DeleteDomainSchemaInput): Promise<void> {
  return invoke<void>("admin_delete_domain_schema", { input });
}

export async function listAutomations(input: DomainAutomationInput): Promise<ListAutomationsResponseInfo> {
  return invoke<ListAutomationsResponseInfo>("admin_list_automations", { input });
}

export async function getAutomation(input: AutomationActionInput): Promise<AutomationDefinitionInfo> {
  return invoke<AutomationDefinitionInfo>("admin_get_automation", { input });
}

export async function validateAutomation(input: AutomationDefinitionInput): Promise<ValidateAutomationInfo> {
  return invoke<ValidateAutomationInfo>("admin_validate_automation", { input });
}

export async function createAutomation(input: AutomationDefinitionInput): Promise<AutomationDefinitionInfo> {
  return invoke<AutomationDefinitionInfo>("admin_create_automation", { input });
}

export async function updateAutomation(input: UpdateAutomationInput): Promise<AutomationDefinitionInfo> {
  return invoke<AutomationDefinitionInfo>("admin_update_automation", { input });
}

export async function deleteAutomation(input: AutomationActionInput): Promise<void> {
  return invoke<void>("admin_delete_automation", { input });
}

export async function enableAutomation(input: AutomationActionInput): Promise<AutomationDefinitionInfo> {
  return invoke<AutomationDefinitionInfo>("admin_enable_automation", { input });
}

export async function disableAutomation(input: AutomationActionInput): Promise<AutomationDefinitionInfo> {
  return invoke<AutomationDefinitionInfo>("admin_disable_automation", { input });
}

export async function listAutomationInvocations(input: ListAutomationInvocationsInput): Promise<ListAutomationInvocationsResponseInfo> {
  return invoke<ListAutomationInvocationsResponseInfo>("admin_list_automation_invocations", { input });
}

export async function getAutomationRun(input: GetAutomationRunInput): Promise<AutomationRunInfo> {
  return invoke<AutomationRunInfo>("admin_get_automation_run", { input });
}

export async function listSemanticRules(input: ListSemanticRulesInput): Promise<ListSemanticRulesResponse> {
  return invoke<ListSemanticRulesResponse>("admin_list_semantic_rules", { input });
}

export async function getSemanticRule(input: GetSemanticRuleInput): Promise<GetSemanticRuleResponse> {
  return invoke<GetSemanticRuleResponse>("admin_get_semantic_rule", { input });
}

export async function validateSemanticRule(input: ValidateSemanticRuleInput): Promise<ValidateSemanticRuleResponse> {
  return invoke<ValidateSemanticRuleResponse>("admin_validate_semantic_rule", { input });
}

export async function createSemanticRule(input: CreateSemanticRuleInput): Promise<CreateSemanticRuleResponse> {
  return invoke<CreateSemanticRuleResponse>("admin_create_semantic_rule", { input });
}

export async function updateSemanticRule(input: UpdateSemanticRuleInput): Promise<UpdateSemanticRuleResponse> {
  return invoke<UpdateSemanticRuleResponse>("admin_update_semantic_rule", { input });
}

export async function setSemanticRuleEnabled(input: SetSemanticRuleEnabledInput): Promise<SetSemanticRuleEnabledResponse> {
  return invoke<SetSemanticRuleEnabledResponse>("admin_set_semantic_rule_enabled", { input });
}

export async function deleteSemanticRule(input: DeleteSemanticRuleInput): Promise<DeleteSemanticRuleResponse> {
  return invoke<DeleteSemanticRuleResponse>("admin_delete_semantic_rule", { input });
}

export async function semanticSearch(input: SemanticSearchInput): Promise<SemanticSearchResponse> {
  return invoke<SemanticSearchResponse>("client_semantic_search", { input });
}

export async function getSemanticMaintenanceStatus(input: GetSemanticMaintenanceStatusInput): Promise<SemanticMaintenanceStatusInfo> {
  return invoke<SemanticMaintenanceStatusInfo>("admin_get_semantic_maintenance_status", { input });
}

export async function listSemanticMaintenanceWork(input: ListSemanticMaintenanceWorkInput): Promise<ListSemanticMaintenanceWorkResponse> {
  return invoke<ListSemanticMaintenanceWorkResponse>("admin_list_semantic_maintenance_work", { input });
}

export async function analyzeSemanticDirtyWork(input: AnalyzeSemanticDirtyWorkInput): Promise<AnalyzeSemanticDirtyWorkResponse> {
  return invoke<AnalyzeSemanticDirtyWorkResponse>("admin_analyze_semantic_dirty_work", { input });
}

export async function processSemanticDirtyWork(input: ProcessSemanticDirtyWorkInput): Promise<ProcessSemanticDirtyWorkResponse> {
  return invoke<ProcessSemanticDirtyWorkResponse>("admin_process_semantic_dirty_work", { input });
}

export async function backfillSemanticRule(input: BackfillSemanticRuleInput): Promise<BackfillSemanticRuleResponse> {
  return invoke<BackfillSemanticRuleResponse>("admin_backfill_semantic_rule", { input });
}

export async function retrySemanticMaintenanceWork(input: SemanticMaintenanceWorkActionInput): Promise<SemanticMaintenanceWorkItemInfo> {
  return invoke<SemanticMaintenanceWorkItemInfo>("admin_retry_semantic_maintenance_work", { input });
}

export async function cancelSemanticMaintenanceWork(input: SemanticMaintenanceWorkActionInput): Promise<SemanticMaintenanceWorkItemInfo> {
  return invoke<SemanticMaintenanceWorkItemInfo>("admin_cancel_semantic_maintenance_work", { input });
}

export async function createPrincipal(input: CreatePrincipalInput): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_create_principal", { input });
}


export async function disablePrincipal(input: DisablePrincipalInput): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_disable_principal", { input });
}


export async function enablePrincipal(principalId: string): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_enable_principal", { principalId });
}


export async function deletePrincipal(input: DeletePrincipalInput): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_delete_principal", { input });
}


export async function setPrincipalPassword(input: SetPrincipalPasswordInput): Promise<PrincipalInfo> {
  return invoke<PrincipalInfo>("admin_set_principal_password", { input });
}


export async function revokePrincipalSession(input: RevokePrincipalSessionInput): Promise<void> {
  await invoke<void>("admin_revoke_principal_session", { input });
}


export async function revokePrincipalSessions(principalId: string): Promise<RevokePrincipalSessionsResponse> {
  return invoke<RevokePrincipalSessionsResponse>("admin_revoke_principal_sessions", { principalId });
}


export async function getBackupPolicy(): Promise<BackupPolicyInfo> {
  return invoke<BackupPolicyInfo>("admin_get_backup_policy");
}

export async function updateBackupPolicy(input: BackupPolicyInfo): Promise<BackupPolicyInfo> {
  return invoke<BackupPolicyInfo>("admin_update_backup_policy", { input });
}

export async function getBackupStatus(): Promise<BackupStatusResponse> {
  return invoke<BackupStatusResponse>("admin_get_backup_status");
}

export async function listBackups(
  input: ListBackupsInput = {},
): Promise<ListBackupsResponse> {
  return invoke<ListBackupsResponse>("admin_list_backups", { input });
}

export async function triggerBackup(
  input: TriggerBackupInput = {},
): Promise<TriggerBackupResponse> {
  return invoke<TriggerBackupResponse>("admin_trigger_backup", { input });
}

export async function deleteBackup(backupId: string): Promise<DeleteBackupResponse> {
  return invoke<DeleteBackupResponse>("admin_delete_backup", { backupId });
}

export async function listInferencePackages(
  input: ListInferencePackagesInput = {},
): Promise<ListInferencePackagesResponse> {
  return invoke<ListInferencePackagesResponse>("admin_list_inference_packages", { input });
}

export async function listModelEndpoints(input: ListModelEndpointsInput = {}): Promise<ListModelEndpointsResponse> {
  return invoke<ListModelEndpointsResponse>("admin_list_model_endpoints", { input });
}

export async function listModels(input: ListModelsInput = {}): Promise<ListModelsResponse> {
  return invoke<ListModelsResponse>("admin_list_models", { input });
}

export async function listVectorStores(input: ListVectorStoresInput = {}): Promise<ListVectorStoresResponse> {
  return invoke<ListVectorStoresResponse>("admin_list_vector_stores", { input });
}

export async function listModelEndpointCapabilities(
  input: ListModelEndpointCapabilitiesInput = {},
): Promise<ListModelEndpointCapabilitiesResponse> {
  return invoke<ListModelEndpointCapabilitiesResponse>("admin_list_model_endpoint_capabilities", { input });
}

export async function applyInferencePackage(
  input: InferencePackageDocument,
): Promise<ApplyInferencePackageResponse> {
  return invoke<ApplyInferencePackageResponse>("admin_apply_inference_package", { input });
}

export async function listInferenceProfiles(input: ListInferenceProfilesInput = {}): Promise<ListInferenceProfilesResponse> {
  return invoke<ListInferenceProfilesResponse>("admin_list_inference_profiles", { input });
}

export async function createInferenceProfile(input: CreateInferenceProfileInput): Promise<InferenceProfileResponse> {
  return invoke<InferenceProfileResponse>("admin_create_inference_profile", { input });
}

export async function setInferenceProfileEnabled(input: InferenceProfileActionInput): Promise<InferenceProfileResponse> {
  return invoke<InferenceProfileResponse>("admin_set_inference_profile_enabled", { input });
}

export async function deleteInferenceProfile(input: InferenceProfileActionInput): Promise<Record<string, string>> {
  return invoke<Record<string, string>>("admin_delete_inference_profile", { input });
}

export async function listInferenceCredentials(input: ListCredentialsInput = {}): Promise<ListCredentialsResponse> {
  return invoke<ListCredentialsResponse>("admin_list_inference_credentials", { input });
}

export async function createInferenceCredential(input: CreateCredentialInput): Promise<CredentialResponse> {
  return invoke<CredentialResponse>("admin_create_inference_credential", { input });
}

export async function setInferenceCredentialStatus(input: CredentialStatusInput): Promise<CredentialResponse> {
  return invoke<CredentialResponse>("admin_set_inference_credential_status", { input });
}

export async function rotateInferenceCredential(input: RotateCredentialInput): Promise<CredentialResponse> {
  return invoke<CredentialResponse>("admin_rotate_inference_credential", { input });
}

export async function deleteInferenceCredential(input: DeleteCredentialInput): Promise<DeleteCredentialResponse> {
  return invoke<DeleteCredentialResponse>("admin_delete_inference_credential", { input });
}

export async function listInferenceCredentialGrants(input: ListCredentialGrantsInput): Promise<ListCredentialGrantsResponse> {
  return invoke<ListCredentialGrantsResponse>("admin_list_inference_credential_grants", { input });
}

export async function createInferenceCredentialGrant(input: CreateCredentialGrantInput): Promise<CredentialGrantResponse> {
  return invoke<CredentialGrantResponse>("admin_create_inference_credential_grant", { input });
}

export async function expireInferenceCredentialGrant(input: CredentialGrantActionInput): Promise<CredentialGrantResponse> {
  return invoke<CredentialGrantResponse>("admin_expire_inference_credential_grant", { input });
}

export async function deleteInferenceCredentialGrant(input: CredentialGrantActionInput): Promise<DeleteCredentialGrantResponse> {
  return invoke<DeleteCredentialGrantResponse>("admin_delete_inference_credential_grant", { input });
}

export async function listInferencePolicies(input: ListInferencePoliciesInput): Promise<ListInferencePoliciesResponse> {
  return invoke<ListInferencePoliciesResponse>("admin_list_inference_policies", { input });
}

export async function createInferencePolicy(input: CreateInferencePolicyInput): Promise<InferencePolicyResponse> {
  return invoke<InferencePolicyResponse>("admin_create_inference_policy", { input });
}

export async function expireInferencePolicy(input: InferencePolicyActionInput): Promise<InferencePolicyResponse> {
  return invoke<InferencePolicyResponse>("admin_expire_inference_policy", { input });
}

export async function deleteInferencePolicy(input: InferencePolicyActionInput): Promise<DeleteInferencePolicyResponse> {
  return invoke<DeleteInferencePolicyResponse>("admin_delete_inference_policy", { input });
}

export async function listInferenceUsageEvents(input: ListUsageEventsInput): Promise<ListUsageEventsResponse> {
  return invoke<ListUsageEventsResponse>("admin_list_inference_usage_events", { input });
}

export async function summarizeInferenceUsage(input: SummarizeUsageInput): Promise<SummarizeUsageResponse> {
  return invoke<SummarizeUsageResponse>("admin_summarize_inference_usage", { input });
}

