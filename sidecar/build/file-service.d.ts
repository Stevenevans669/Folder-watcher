import { WatchedDir } from './types';
import { FileContentResponse, FilesListResponse } from './api-types';
/**
 * Check if a file path is within any of the watched directories
 */
export declare function isPathInWatchedDirectories(filePath: string, directories: WatchedDir[]): boolean;
/**
 * Get MIME type from file extension
 */
export declare function getMimeType(filePath: string): string;
/**
 * Check if MIME type is text (should use UTF-8 encoding)
 */
export declare function isTextMimeType(mimeType: string): boolean;
/**
 * Read file content securely (only files within watched directories)
 */
export declare function readFileSecure(filePath: string, directories: WatchedDir[]): Promise<{
    success: true;
    data: FileContentResponse;
} | {
    success: false;
    error: string;
    statusCode: number;
}>;
/**
 * List all files in a watched directory
 */
export declare function listFilesInDirectory(directoryId: string, directories: WatchedDir[], recursive?: boolean): Promise<{
    success: true;
    data: FilesListResponse;
} | {
    success: false;
    error: string;
    statusCode: number;
}>;
