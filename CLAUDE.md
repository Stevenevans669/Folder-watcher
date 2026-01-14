# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Folder Watcher is a lightweight desktop application that monitors specified folders for file changes and logs them in real-time.

**Tech Stack**: Tauri 2.x (shell) + React + TailwindCSS (frontend) + Node.js sidecar (file watching)

## Build Commands

```bash
# Install all dependencies
npm install
cd sidecar && npm install && cd ..

# Development mode
npm run tauri dev

# Build sidecar binary (required before production build)
cd sidecar && npm run build && npx pkg . --target node18-macos-arm64 --output ../src-tauri/binaries/watcher-sidecar-aarch64-apple-darwin

# Production build
npm run tauri build

# Output locations:
# - macOS app: src-tauri/target/release/bundle/macos/Folder Watcher.app
# - DMG installer: src-tauri/target/release/bundle/dmg/
```

## Architecture

```
[User adds directory] → [React Frontend] → [Tauri Commands] → [Node.js Sidecar]
                                                                     ↓
[UI updates] ← [Zustand Store] ← [Tauri Events] ← [stdout JSON events]
```

### Component Communication

1. **Frontend → Sidecar**: React calls Tauri commands (`add_directory`, `remove_directory`, `open_directory_picker`) which write JSON to sidecar's stdin
2. **Sidecar → Frontend**: Sidecar writes JSON events to stdout, Tauri forwards them via `emit("sidecar-event")`, React listens via `@tauri-apps/api/event`

### Key Files

| File | Purpose |
|------|---------|
| `sidecar/src/index.ts` | Main sidecar entry, command handling |
| `sidecar/src/watcher.ts` | Chokidar file watching logic |
| `sidecar/src/storage.ts` | Directory list persistence |
| `src-tauri/src/lib.rs` | Tauri commands & sidecar management |
| `src/store/watcherStore.ts` | Zustand state management |
| `src/App.tsx` | Main React component |

## Data Structures

```typescript
// Watched directory
interface WatchedDir { id: string; path: string }

// File change log entry
interface ChangeLog {
  id: string
  timestamp: number
  eventType: 'create' | 'modify' | 'delete'
  filePath: string
}

// Sidecar command (stdin)
interface SidecarCommand {
  type: 'add_directory' | 'remove_directory' | 'get_directories' | 'shutdown'
  payload?: { id?: string; path?: string }
}

// Sidecar event (stdout)
interface SidecarEvent {
  type: 'ready' | 'file_change' | 'directory_added' | 'directory_removed' | 'directories_loaded' | 'error'
  payload: { ... }
}
```

## Directory Persistence

Directories are saved to user data directory:
- **macOS**: `~/Library/Application Support/com.folder-watcher.app/directories.json`
- **Windows**: `%APPDATA%\com.folder-watcher.app\directories.json`
- **Linux**: `~/.config/com.folder-watcher.app/directories.json`

## MVP Scope

**Included**: Add/remove watch directories, real-time file change logging (create/modify/delete), clear logs, persist directory list, auto-load on startup

**Excluded**: Log search, ignore rules, system notifications, rename events
