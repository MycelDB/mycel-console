mod commands;
mod state;

use commands::auth::{admin_login, admin_logout, admin_whoami};
use commands::spaces::admin_list_spaces;
use commands::users::{
    admin_create_user, admin_delete_user, admin_disable_user, admin_enable_user, admin_list_users,
    admin_set_user_password,
};
use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            admin_login,
            admin_logout,
            admin_whoami,
            admin_list_users,
            admin_list_spaces,
            admin_create_user,
            admin_disable_user,
            admin_enable_user,
            admin_delete_user,
            admin_set_user_password
        ])
        .run(tauri::generate_context!())
        .expect("error while running Mycel Admin");
}
