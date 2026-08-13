mod commands;
mod state;

use commands::auth::{admin_connection_diagnostics, admin_login, admin_logout, admin_whoami};
use commands::automations::{
    admin_disable_automation, admin_enable_automation, admin_get_automation,
    admin_get_automation_run, admin_list_automation_invocations, admin_list_automations,
};
use commands::backups::{
    admin_delete_backup, admin_get_backup_policy, admin_get_backup_status, admin_list_backups,
    admin_trigger_backup, admin_update_backup_policy,
};
use commands::client_query::{
    admin_console_client_query_login, admin_console_client_query_logout, admin_console_execute_gql,
    admin_console_execute_gql_script, admin_console_execute_graph_query,
};
use commands::cluster::{
    admin_get_cluster_health, admin_get_cluster_runtime_status, admin_get_cluster_status,
    admin_get_graph_consistency_report, admin_get_local_graph_consistency,
    admin_get_local_graph_forensic_export, admin_list_cluster_members, admin_list_raft_groups,
    admin_lookup_space_route,
};
use commands::domains::admin_list_domains;
use commands::inference::{
    admin_apply_inference_package, admin_list_inference_packages,
    admin_list_model_endpoint_capabilities, admin_list_model_endpoints, admin_list_models,
    admin_list_vector_stores,
};
use commands::schemas::{admin_delete_domain_schema, admin_get_domain_schema};
use commands::semantic::admin_list_semantic_indexes;
use commands::semantic_maintenance::{
    admin_analyze_semantic_dirty_work, admin_backfill_semantic_index,
    admin_cancel_semantic_maintenance_work, admin_get_semantic_maintenance_status,
    admin_list_semantic_maintenance_work, admin_process_semantic_dirty_work,
    admin_retry_semantic_maintenance_work,
};
use commands::spaces::{admin_create_space, admin_get_space, admin_list_spaces};
use commands::users::{
    admin_create_principal, admin_create_user, admin_delete_principal, admin_delete_user,
    admin_disable_principal, admin_disable_user, admin_enable_principal, admin_enable_user,
    admin_get_principal, admin_get_user, admin_list_principal_sessions, admin_list_principals,
    admin_list_user_sessions, admin_list_users, admin_revoke_principal_session,
    admin_revoke_principal_sessions, admin_revoke_user_session, admin_revoke_user_sessions,
    admin_set_principal_password, admin_set_user_password,
};
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            admin_login,
            admin_connection_diagnostics,
            admin_logout,
            admin_whoami,
            admin_console_client_query_login,
            admin_console_client_query_logout,
            admin_console_execute_graph_query,
            admin_console_execute_gql,
            admin_console_execute_gql_script,
            admin_list_principals,
            admin_get_principal,
            admin_list_principal_sessions,
            admin_revoke_principal_session,
            admin_revoke_principal_sessions,
            admin_list_users,
            admin_get_user,
            admin_list_user_sessions,
            admin_revoke_user_session,
            admin_revoke_user_sessions,
            admin_list_spaces,
            admin_get_space,
            admin_create_space,
            admin_get_domain_schema,
            admin_delete_domain_schema,
            admin_list_automations,
            admin_get_automation,
            admin_enable_automation,
            admin_disable_automation,
            admin_list_automation_invocations,
            admin_get_automation_run,
            admin_list_domains,
            admin_list_semantic_indexes,
            admin_get_semantic_maintenance_status,
            admin_list_semantic_maintenance_work,
            admin_retry_semantic_maintenance_work,
            admin_cancel_semantic_maintenance_work,
            admin_analyze_semantic_dirty_work,
            admin_process_semantic_dirty_work,
            admin_backfill_semantic_index,
            admin_create_principal,
            admin_disable_principal,
            admin_enable_principal,
            admin_delete_principal,
            admin_set_principal_password,
            admin_create_user,
            admin_disable_user,
            admin_enable_user,
            admin_delete_user,
            admin_set_user_password,
            admin_get_backup_policy,
            admin_update_backup_policy,
            admin_get_backup_status,
            admin_list_backups,
            admin_trigger_backup,
            admin_delete_backup,
            admin_get_cluster_status,
            admin_get_cluster_health,
            admin_get_cluster_runtime_status,
            admin_list_raft_groups,
            admin_lookup_space_route,
            admin_get_local_graph_consistency,
            admin_get_graph_consistency_report,
            admin_get_local_graph_forensic_export,
            admin_list_cluster_members,
            admin_list_inference_packages,
            admin_list_model_endpoints,
            admin_list_models,
            admin_list_vector_stores,
            admin_list_model_endpoint_capabilities,
            admin_apply_inference_package
        ])
        .run(tauri::generate_context!())
        .expect("error while running Mycel Admin");
}
