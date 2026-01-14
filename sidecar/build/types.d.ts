export interface WatchedDir {
    id: string;
    path: string;
}
export interface SidecarCommand {
    type: 'add_directory' | 'remove_directory' | 'get_directories' | 'shutdown';
    payload?: {
        id?: string;
        path?: string;
    };
}
export interface SidecarEvent {
    type: 'file_change' | 'error' | 'directory_added' | 'directory_removed' | 'directories_loaded' | 'ready';
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
