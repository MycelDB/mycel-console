import { invoke } from "@tauri-apps/api/core";
import type {
  BackupPolicyInfo,
  BackupStatusResponse,
  DeleteBackupResponse,
  ListBackupsInput,
  ListBackupsResponse,
  TriggerBackupInput,
  TriggerBackupResponse,
} from "../types/backups";
import type { ConnectionDiagnosticsResponse, LoginInput, OperatorSession } from "../types/auth";
import type { ClientQueryLoginInput, ClientQuerySessionInfo, ExecuteGqlInput, ExecuteGqlResponse, ExecuteGqlScriptInput, ExecuteGqlScriptResponse, ExecuteGraphQueryInput, ExecuteGraphQueryResponse } from "../types/clientQuery";
import type { ClusterHealthInfo, ClusterRuntimeStatusInfo, ClusterStatusInfo, ListClusterMembersResponse, ListRaftGroupsResponse, LookupSpaceRouteInput, LookupSpaceRouteResult } from "../types/cluster";
import type { ListDomainsInput, ListDomainsResponse } from "../types/domains";
import type {
  ApplyInferencePackageResponse,
  InferencePackageDocument,
  ListInferencePackagesInput,
  ListInferencePackagesResponse,
  ListModelEndpointCapabilitiesInput,
  ListModelEndpointCapabilitiesResponse,
  ListModelEndpointsInput,
  ListModelEndpointsResponse,
  ListModelsInput,
  ListModelsResponse,
  ListVectorStoresInput,
  ListVectorStoresResponse,
} from "../types/inference";
import type { ListSemanticIndexesInput, ListSemanticIndexesResponse } from "../types/semantic";
import type { AnalyzeSemanticDirtyWorkInput, AnalyzeSemanticDirtyWorkResponse, BackfillSemanticIndexInput, BackfillSemanticIndexResponse, GetSemanticMaintenanceStatusInput, ListSemanticMaintenanceWorkInput, ListSemanticMaintenanceWorkResponse, ProcessSemanticDirtyWorkInput, ProcessSemanticDirtyWorkResponse, SemanticMaintenanceStatusInfo, SemanticMaintenanceWorkActionInput, SemanticMaintenanceWorkItemInfo } from "../types/semanticMaintenance";
import type { ListSpacesInput, ListSpacesResponse, SpaceInfo } from "../types/spaces";
import type { GetTemplateInput, ListTemplatesInput, ListTemplatesResponse, TemplateInfo } from "../types/templates";
import type {
  CreateUserInput,
  DeleteUserInput,
  DisableUserInput,
  ListUserSessionsInput,
  ListUserSessionsResponse,
  ListUsersInput,
  ListUsersResponse,
  RevokeUserSessionInput,
  RevokeUserSessionsResponse,
  SetUserPasswordInput,
  UserInfo,
} from "../types/users";

export async function login(input: LoginInput): Promise<OperatorSession> {
  return invoke<OperatorSession>("admin_login", { input });
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

export async function whoAmI(): Promise<OperatorSession | null> {
  return invoke<OperatorSession | null>("admin_whoami");
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

export async function listClusterMembers(): Promise<ListClusterMembersResponse> {
  return invoke<ListClusterMembersResponse>("admin_list_cluster_members");
}

export async function getClusterHealth(): Promise<ClusterHealthInfo> {
  return invoke<ClusterHealthInfo>("admin_get_cluster_health");
}

export async function listUsers(input: ListUsersInput = {}): Promise<ListUsersResponse> {
  return invoke<ListUsersResponse>("admin_list_users", { input });
}

export async function getUser(userId: string): Promise<UserInfo> {
  return invoke<UserInfo>("admin_get_user", { userId });
}

export async function listUserSessions(input: ListUserSessionsInput): Promise<ListUserSessionsResponse> {
  return invoke<ListUserSessionsResponse>("admin_list_user_sessions", { input });
}

export async function listSpaces(input: ListSpacesInput = {}): Promise<ListSpacesResponse> {
  return invoke<ListSpacesResponse>("admin_list_spaces", { input });
}

export async function getSpace(spaceId: string): Promise<SpaceInfo> {
  return invoke<SpaceInfo>("admin_get_space", { spaceId });
}

export async function listTemplates(input: ListTemplatesInput): Promise<ListTemplatesResponse> {
  return invoke<ListTemplatesResponse>("admin_list_templates", { input });
}

export async function getTemplate(input: GetTemplateInput): Promise<TemplateInfo> {
  return invoke<TemplateInfo>("admin_get_template", { input });
}

export async function listDomains(input: ListDomainsInput): Promise<ListDomainsResponse> {
  return invoke<ListDomainsResponse>("admin_list_domains", { input });
}

export async function listSemanticIndexes(input: ListSemanticIndexesInput): Promise<ListSemanticIndexesResponse> {
  return invoke<ListSemanticIndexesResponse>("admin_list_semantic_indexes", { input });
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

export async function backfillSemanticIndex(input: BackfillSemanticIndexInput): Promise<BackfillSemanticIndexResponse> {
  return invoke<BackfillSemanticIndexResponse>("admin_backfill_semantic_index", { input });
}

export async function retrySemanticMaintenanceWork(input: SemanticMaintenanceWorkActionInput): Promise<SemanticMaintenanceWorkItemInfo> {
  return invoke<SemanticMaintenanceWorkItemInfo>("admin_retry_semantic_maintenance_work", { input });
}

export async function cancelSemanticMaintenanceWork(input: SemanticMaintenanceWorkActionInput): Promise<SemanticMaintenanceWorkItemInfo> {
  return invoke<SemanticMaintenanceWorkItemInfo>("admin_cancel_semantic_maintenance_work", { input });
}

export async function createUser(input: CreateUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_create_user", { input });
}

export async function disableUser(input: DisableUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_disable_user", { input });
}

export async function enableUser(userId: string): Promise<UserInfo> {
  return invoke<UserInfo>("admin_enable_user", { userId });
}

export async function deleteUser(input: DeleteUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_delete_user", { input });
}

export async function setUserPassword(input: SetUserPasswordInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_set_user_password", { input });
}

export async function revokeUserSession(input: RevokeUserSessionInput): Promise<void> {
  await invoke<void>("admin_revoke_user_session", { input });
}

export async function revokeUserSessions(userId: string): Promise<RevokeUserSessionsResponse> {
  return invoke<RevokeUserSessionsResponse>("admin_revoke_user_sessions", { userId });
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
