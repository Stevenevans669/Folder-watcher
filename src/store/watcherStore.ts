import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import type { WatchedDir, ChangeLog, SidecarEvent } from '../types';

interface WatcherState {
  directories: WatchedDir[];
  logs: ChangeLog[];
  status: 'starting' | 'ready' | 'error';
  error: string | null;

  addDirectory: () => Promise<void>;
  removeDirectory: (id: string) => Promise<void>;
  clearLogs: () => void;
  initSidecarListener: () => Promise<UnlistenFn>;
  clearError: () => void;
}

const MAX_LOGS = 1000;

export const useWatcherStore = create<WatcherState>((set) => ({
  directories: [],
  logs: [],
  status: 'starting',
  error: null,

  addDirectory: async () => {
    try {
      const path = await invoke<string | null>('open_directory_picker');
      if (path) {
        await invoke('add_directory', { path });
      }
    } catch (err) {
      set({ error: String(err) });
    }
  },

  removeDirectory: async (id: string) => {
    try {
      await invoke('remove_directory', { id });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  clearLogs: () => set({ logs: [] }),

  clearError: () => set({ error: null }),

  initSidecarListener: async () => {
    const unlisten = await listen<string>('sidecar-event', (event) => {
      try {
        const data: SidecarEvent = JSON.parse(event.payload);

        switch (data.type) {
          case 'ready':
            set({ status: 'ready' });
            break;

          case 'directories_loaded':
            if (data.payload.directories) {
              set({ directories: data.payload.directories, status: 'ready' });
            }
            break;

          case 'directory_added':
            if (data.payload.id && data.payload.path) {
              set((state) => ({
                directories: [
                  ...state.directories,
                  { id: data.payload.id!, path: data.payload.path! },
                ],
              }));
            }
            break;

          case 'directory_removed':
            if (data.payload.id) {
              set((state) => ({
                directories: state.directories.filter(
                  (d) => d.id !== data.payload.id
                ),
              }));
            }
            break;

          case 'file_change':
            if (
              data.payload.eventType &&
              data.payload.filePath &&
              data.payload.timestamp
            ) {
              const log: ChangeLog = {
                id: crypto.randomUUID(),
                timestamp: data.payload.timestamp,
                eventType: data.payload.eventType,
                filePath: data.payload.filePath,
              };
              set((state) => {
                const newLogs = [...state.logs, log];
                // Limit the number of logs to prevent memory issues
                if (newLogs.length > MAX_LOGS) {
                  return { logs: newLogs.slice(-MAX_LOGS) };
                }
                return { logs: newLogs };
              });
            }
            break;

          case 'error':
            if (data.payload.message) {
              set({ error: data.payload.message });
            }
            break;
        }
      } catch (e) {
        console.error('Failed to parse sidecar event:', e);
      }
    });

    // Request directories after listener is set up to avoid race condition
    try {
      await invoke('request_directories');
    } catch (e) {
      console.error('Failed to request initial data:', e);
    }

    return unlisten;
  },
}));
