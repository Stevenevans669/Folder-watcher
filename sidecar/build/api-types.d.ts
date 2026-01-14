export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface FileInfo {
    path: string;
    relativePath: string;
    size: number;
    mimeType: string;
    modifiedAt: number;
}
export interface FilesListResponse {
    directoryId: string;
    directoryPath: string;
    files: FileInfo[];
    totalCount: number;
}
export interface FileContentResponse {
    path: string;
    content: string;
    encoding: 'utf-8' | 'base64';
    size: number;
    mimeType: string;
}
export interface WSClientMessage {
    type: 'subscribe' | 'unsubscribe' | 'ping';
    payload?: {
        directoryIds?: string[];
    };
}
export interface WSServerMessage {
    type: 'file_change' | 'directory_added' | 'directory_removed' | 'error' | 'pong' | 'subscribed';
    payload: Record<string, unknown>;
    timestamp: number;
}
export declare const MIME_TYPES: Record<string, string>;
export declare const TEXT_MIME_PREFIXES: string[];
export declare const MAX_FILE_SIZE: number;
export declare const API_PORT = 3456;
export declare const CORS_HEADERS: {
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Methods': string;
    'Access-Control-Allow-Headers': string;
};
