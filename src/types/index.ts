export interface WatchedDir {
  id: string;
  path: string;
}

export interface ChangeLog {
  id: string;
  timestamp: number;
  eventType: 'create' | 'modify' | 'delete';
  filePath: string;
}

export interface SidecarEvent {
  type: string;
  payload: {
    id?: string;
    path?: string;
    eventType?: 'create' | 'modify' | 'delete';
    filePath?: string;
    timestamp?: number;
    message?: string;
    directories?: WatchedDir[];
  };
}
