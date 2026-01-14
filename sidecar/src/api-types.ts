import { WatchedDir } from './types';

// ============================================
// HTTP API Types
// ============================================

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

// ============================================
// WebSocket API Types
// ============================================

export interface WSClientMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  payload?: {
    directoryIds?: string[];
  };
}

export interface WSServerMessage {
  type: 'file_change' | 'directory_added' | 'directory_removed' |
        'error' | 'pong' | 'subscribed';
  payload: Record<string, unknown>;
  timestamp: number;
}

// ============================================
// MIME Types
// ============================================

export const MIME_TYPES: Record<string, string> = {
  // Text types (UTF-8 encoding)
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.js': 'application/javascript',
  '.ts': 'application/typescript',
  '.html': 'text/html',
  '.css': 'text/css',
  '.md': 'text/markdown',
  '.xml': 'application/xml',
  '.yaml': 'text/yaml',
  '.yml': 'text/yaml',
  // Binary types (Base64 encoding)
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

export const TEXT_MIME_PREFIXES = [
  'text/',
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/xml',
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const API_PORT = 3456;

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
