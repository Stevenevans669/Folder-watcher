import * as chokidar from 'chokidar';
import { sendEvent } from './protocol';

const watchers = new Map<string, chokidar.FSWatcher>();
const watcherPaths = new Map<string, string>();

export async function addWatcher(id: string, dirPath: string): Promise<boolean> {
  if (watchers.has(id)) {
    return false;
  }

  const watcher = chokidar.watch(dirPath, {
    persistent: true,
    ignoreInitial: true,
    followSymlinks: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher
    .on('add', (filePath) => emitChange(id, 'create', filePath))
    .on('change', (filePath) => emitChange(id, 'modify', filePath))
    .on('unlink', (filePath) => emitChange(id, 'delete', filePath))
    .on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      sendEvent({
        type: 'error',
        payload: { id, message }
      });
    });

  watchers.set(id, watcher);
  watcherPaths.set(id, dirPath);
  return true;
}

export function removeWatcher(id: string): boolean {
  const watcher = watchers.get(id);
  if (watcher) {
    watcher.close();
    watchers.delete(id);
    watcherPaths.delete(id);
    return true;
  }
  return false;
}

export function closeAllWatchers(): void {
  for (const [, watcher] of watchers) {
    watcher.close();
  }
  watchers.clear();
  watcherPaths.clear();
}

function emitChange(
  dirId: string,
  eventType: 'create' | 'modify' | 'delete',
  filePath: string
): void {
  const timestamp = Date.now();

  sendEvent({
    type: 'file_change',
    payload: {
      id: dirId,
      eventType,
      filePath,
      timestamp
    }
  });
}
