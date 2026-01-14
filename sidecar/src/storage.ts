import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WatchedDir } from './types';

function getStorageDir(): string {
  const appName = 'com.folder-watcher.app';
  let base: string;

  switch (process.platform) {
    case 'darwin':
      base = path.join(os.homedir(), 'Library', 'Application Support');
      break;
    case 'win32':
      base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
      break;
    default:
      base = path.join(os.homedir(), '.config');
  }

  const dir = path.join(base, appName);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getDirectoriesPath(): string {
  return path.join(getStorageDir(), 'directories.json');
}

export function loadDirectories(): WatchedDir[] {
  try {
    const data = fs.readFileSync(getDirectoriesPath(), 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveDirectories(dirs: WatchedDir[]): void {
  fs.writeFileSync(getDirectoriesPath(), JSON.stringify(dirs, null, 2));
}
