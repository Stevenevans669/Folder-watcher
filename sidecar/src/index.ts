import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import { createProtocol, sendEvent } from './protocol';
import { addWatcher, removeWatcher, closeAllWatchers } from './watcher';
import { loadDirectories, saveDirectories } from './storage';
import { WatchedDir, SidecarCommand } from './types';
import { startApiServer, stopApiServer } from './api-server';
import { API_PORT } from './api-types';

let directories: WatchedDir[] = [];

/**
 * Getter function for API server to access current directories
 */
function getDirectories(): WatchedDir[] {
  return directories;
}

async function initialize(): Promise<void> {
  directories = loadDirectories();

  // Start API server
  try {
    const port = await startApiServer(getDirectories, API_PORT);
    sendEvent({ type: 'api_server_started', payload: { port } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    sendEvent({ type: 'error', payload: { message: `API server failed to start: ${message}` } });
  }

  // Start watching saved directories
  const validDirectories: WatchedDir[] = [];

  for (const dir of directories) {
    if (fs.existsSync(dir.path)) {
      await addWatcher(dir.id, dir.path);
      validDirectories.push(dir);
    } else {
      sendEvent({
        type: 'error',
        payload: { id: dir.id, message: `Directory not found: ${dir.path}` }
      });
    }
  }

  directories = validDirectories;
  saveDirectories(directories);

  sendEvent({ type: 'directories_loaded', payload: { directories } });
  sendEvent({ type: 'ready', payload: {} });
}

async function handleCommand(cmd: SidecarCommand): Promise<void> {
  switch (cmd.type) {
    case 'add_directory': {
      const dirPath = cmd.payload?.path;
      if (!dirPath) {
        sendEvent({ type: 'error', payload: { message: 'No path provided' } });
        return;
      }

      // Check for duplicates
      if (directories.some(d => d.path === dirPath)) {
        sendEvent({ type: 'error', payload: { message: 'Directory already added' } });
        return;
      }

      // Verify path exists and is accessible
      try {
        fs.accessSync(dirPath, fs.constants.R_OK);
        const stats = fs.statSync(dirPath);
        if (!stats.isDirectory()) {
          sendEvent({ type: 'error', payload: { message: 'Path is not a directory' } });
          return;
        }
      } catch {
        sendEvent({ type: 'error', payload: { message: 'Permission denied or directory not found' } });
        return;
      }

      const id = uuidv4();
      const newDir: WatchedDir = { id, path: dirPath };
      directories.push(newDir);
      await addWatcher(id, dirPath);
      saveDirectories(directories);
      sendEvent({ type: 'directory_added', payload: { id, path: dirPath } });
      break;
    }

    case 'remove_directory': {
      const id = cmd.payload?.id;
      if (!id) {
        sendEvent({ type: 'error', payload: { message: 'No directory id provided' } });
        return;
      }

      removeWatcher(id);
      directories = directories.filter(d => d.id !== id);
      saveDirectories(directories);
      sendEvent({ type: 'directory_removed', payload: { id } });
      break;
    }

    case 'get_directories': {
      sendEvent({ type: 'directories_loaded', payload: { directories } });
      break;
    }

    case 'shutdown': {
      await stopApiServer();
      closeAllWatchers();
      process.exit(0);
    }
  }
}

// Handle process termination
async function gracefulShutdown(): Promise<void> {
  await stopApiServer();
  closeAllWatchers();
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown());
process.on('SIGTERM', () => gracefulShutdown());

// Start the sidecar
createProtocol(handleCommand);
initialize().catch((error) => {
  sendEvent({ type: 'error', payload: { message: `Initialization error: ${error.message}` } });
});
