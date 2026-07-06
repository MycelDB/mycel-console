#[tauri::command]
fn hello_world() -> &'static str {
    "Hello World"
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![hello_world])
        .run(tauri::generate_context!())
        .expect("error while running Mycel Admin");
}
