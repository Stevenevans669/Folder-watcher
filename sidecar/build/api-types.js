"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_HEADERS = exports.API_PORT = exports.MAX_FILE_SIZE = exports.TEXT_MIME_PREFIXES = exports.MIME_TYPES = void 0;
// ============================================
// MIME Types
// ============================================
exports.MIME_TYPES = {
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
exports.TEXT_MIME_PREFIXES = [
    'text/',
    'application/json',
    'application/javascript',
    'application/typescript',
    'application/xml',
];
exports.MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
exports.API_PORT = 3456;
exports.CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};
