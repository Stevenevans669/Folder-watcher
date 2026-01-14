use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_shell::{process::CommandChild, ShellExt};

// State to hold the sidecar child process
pub struct SidecarState(pub Mutex<Option<CommandChild>>);

// Send a command to the sidecar via stdin
fn send_to_sidecar(state: &SidecarState, message: &str) -> Result<(), String> {
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    if let Some(ref mut child) = *guard {
        child
            .write((message.to_string() + "\n").as_bytes())
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Spawn the sidecar process
fn spawn_sidecar(app: &AppHandle) -> Result<(), String> {
    let sidecar_cmd = app
        .shell()
        .sidecar("watcher-sidecar")
        .map_err(|e| e.to_string())?;

    let (mut rx, child) = sidecar_cmd.spawn().map_err(|e| e.to_string())?;

    // Store child process in state
    let state = app.state::<SidecarState>();
    *state.0.lock().unwrap() = Some(child);

    // Forward stdout events to frontend
    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        use tauri_plugin_shell::process::CommandEvent;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    if let Ok(line_str) = String::from_utf8(line) {
                        let trimmed = line_str.trim();
                        if !trimmed.is_empty() {
                            let _ = app_handle.emit("sidecar-event", trimmed);
                        }
                    }
                }
                CommandEvent::Stderr(line) => {
                    if let Ok(line_str) = String::from_utf8(line) {
                        eprintln!("Sidecar stderr: {}", line_str);
                    }
                }
                CommandEvent::Error(err) => {
                    eprintln!("Sidecar error: {}", err);
                }
                CommandEvent::Terminated(payload) => {
                    eprintln!("Sidecar terminated: {:?}", payload);
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[tauri::command]
async fn add_directory(state: tauri::State<'_, SidecarState>, path: String) -> Result<(), String> {
    let cmd = serde_json::json!({
        "type": "add_directory",
        "payload": { "path": path }
    });
    send_to_sidecar(&state, &cmd.to_string())
}

#[tauri::command]
async fn remove_directory(state: tauri::State<'_, SidecarState>, id: String) -> Result<(), String> {
    let cmd = serde_json::json!({
        "type": "remove_directory",
        "payload": { "id": id }
    });
    send_to_sidecar(&state, &cmd.to_string())
}

#[tauri::command]
async fn request_directories(state: tauri::State<'_, SidecarState>) -> Result<(), String> {
    let cmd = serde_json::json!({
        "type": "get_directories"
    });
    send_to_sidecar(&state, &cmd.to_string())
}

#[tauri::command]
async fn open_directory_picker(app: AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = std::sync::mpsc::channel();

    app.dialog().file().pick_folder(move |folder_path| {
        let result = folder_path.map(|p| p.to_string());
        let _ = tx.send(result);
    });

    rx.recv().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(SidecarState(Mutex::new(None)))
        .setup(|app| {
            spawn_sidecar(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            add_directory,
            remove_directory,
            request_directories,
            open_directory_picker,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
