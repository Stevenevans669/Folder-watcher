"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPathInWatchedDirectories = isPathInWatchedDirectories;
exports.getMimeType = getMimeType;
exports.isTextMimeType = isTextMimeType;
exports.readFileSecure = readFileSecure;
exports.listFilesInDirectory = listFilesInDirectory;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_types_1 = require("./api-types");
/**
 * Check if a file path is within any of the watched directories
 */
function isPathInWatchedDirectories(filePath, directories) {
    const normalizedPath = path.resolve(filePath);
    return directories.some(dir => {
        const normalizedDir = path.resolve(dir.path);
        const relative = path.relative(normalizedDir, normalizedPath);
        // Path is inside if relative path doesn't start with '..' and isn't absolute
        return !relative.startsWith('..') && !path.isAbsolute(relative);
    });
}
/**
 * Get MIME type from file extension
 */
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return api_types_1.MIME_TYPES[ext] || 'application/octet-stream';
}
/**
 * Check if MIME type is text (should use UTF-8 encoding)
 */
function isTextMimeType(mimeType) {
    return api_types_1.TEXT_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}
/**
 * Read file content securely (only files within watched directories)
 */
async function readFileSecure(filePath, directories) {
    // Validate path is within watched directories
    if (!isPathInWatchedDirectories(filePath, directories)) {
        return {
            success: false,
            error: 'File path is not within any watched directory',
            statusCode: 403,
        };
    }
    const normalizedPath = path.resolve(filePath);
    try {
        const stats = await fs.promises.stat(normalizedPath);
        if (!stats.isFile()) {
            return { success: false, error: 'Path is not a file', statusCode: 400 };
        }
        if (stats.size > api_types_1.MAX_FILE_SIZE) {
            return {
                success: false,
                error: `File exceeds maximum size of ${api_types_1.MAX_FILE_SIZE} bytes`,
                statusCode: 400,
            };
        }
        const mimeType = getMimeType(normalizedPath);
        const isText = isTextMimeType(mimeType);
        const encoding = isText ? 'utf-8' : 'base64';
        const content = await fs.promises.readFile(normalizedPath, {
            encoding: isText ? 'utf-8' : 'base64',
        });
        return {
            success: true,
            data: {
                path: normalizedPath,
                content,
                encoding,
                size: stats.size,
                mimeType,
            },
        };
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        if (err.code === 'ENOENT') {
            return { success: false, error: 'File not found', statusCode: 404 };
        }
        return { success: false, error: message, statusCode: 400 };
    }
}
/**
 * List all files in a watched directory
 */
async function listFilesInDirectory(directoryId, directories, recursive = true) {
    const dir = directories.find(d => d.id === directoryId);
    if (!dir) {
        return { success: false, error: 'Directory not found', statusCode: 404 };
    }
    const dirPath = path.resolve(dir.path);
    try {
        await fs.promises.access(dirPath, fs.constants.R_OK);
    }
    catch {
        return { success: false, error: 'Directory not accessible', statusCode: 400 };
    }
    const files = [];
    async function scanDirectory(currentPath) {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isFile()) {
                try {
                    const stats = await fs.promises.stat(fullPath);
                    const relativePath = path.relative(dirPath, fullPath);
                    const mimeType = getMimeType(fullPath);
                    files.push({
                        path: fullPath,
                        relativePath,
                        size: stats.size,
                        mimeType,
                        modifiedAt: stats.mtimeMs,
                    });
                }
                catch {
                    // Skip files we can't stat
                }
            }
            else if (entry.isDirectory() && recursive) {
                await scanDirectory(fullPath);
            }
        }
    }
    try {
        await scanDirectory(dirPath);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        return { success: false, error: message, statusCode: 400 };
    }
    return {
        success: true,
        data: {
            directoryId: dir.id,
            directoryPath: dirPath,
            files,
            totalCount: files.length,
        },
    };
}
