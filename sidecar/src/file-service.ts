import * as fs from 'fs';
import * as path from 'path';
import { WatchedDir } from './types';
import {
  FileInfo,
  FileContentResponse,
  FilesListResponse,
  MIME_TYPES,
  TEXT_MIME_PREFIXES,
  MAX_FILE_SIZE,
} from './api-types';

/**
 * Check if a file path is within any of the watched directories
 */
export function isPathInWatchedDirectories(
  filePath: string,
  directories: WatchedDir[]
): boolean {
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
export function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Check if MIME type is text (should use UTF-8 encoding)
 */
export function isTextMimeType(mimeType: string): boolean {
  return TEXT_MIME_PREFIXES.some(prefix => mimeType.startsWith(prefix));
}

/**
 * Read file content securely (only files within watched directories)
 */
export async function readFileSecure(
  filePath: string,
  directories: WatchedDir[]
): Promise<{ success: true; data: FileContentResponse } | { success: false; error: string; statusCode: number }> {
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

    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File exceeds maximum size of ${MAX_FILE_SIZE} bytes`,
        statusCode: 400,
      };
    }

    const mimeType = getMimeType(normalizedPath);
    const isText = isTextMimeType(mimeType);
    const encoding: 'utf-8' | 'base64' = isText ? 'utf-8' : 'base64';

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
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { success: false, error: 'File not found', statusCode: 404 };
    }
    return { success: false, error: message, statusCode: 400 };
  }
}

/**
 * List all files in a watched directory
 */
export async function listFilesInDirectory(
  directoryId: string,
  directories: WatchedDir[],
  recursive: boolean = true
): Promise<{ success: true; data: FilesListResponse } | { success: false; error: string; statusCode: number }> {
  const dir = directories.find(d => d.id === directoryId);

  if (!dir) {
    return { success: false, error: 'Directory not found', statusCode: 404 };
  }

  const dirPath = path.resolve(dir.path);

  try {
    await fs.promises.access(dirPath, fs.constants.R_OK);
  } catch {
    return { success: false, error: 'Directory not accessible', statusCode: 400 };
  }

  const files: FileInfo[] = [];

  async function scanDirectory(currentPath: string): Promise<void> {
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
        } catch {
          // Skip files we can't stat
        }
      } else if (entry.isDirectory() && recursive) {
        await scanDirectory(fullPath);
      }
    }
  }

  try {
    await scanDirectory(dirPath);
  } catch (err) {
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
