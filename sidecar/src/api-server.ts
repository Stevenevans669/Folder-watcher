import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as url from 'url';
import { eventBus } from './event-bus';
import { readFileSecure, listFilesInDirectory } from './file-service';
import { WatchedDir, SidecarEvent } from './types';
import {
  WSClientMessage,
  WSServerMessage,
  APIResponse,
  API_PORT,
  CORS_HEADERS,
} from './api-types';

interface ClientState {
  subscribed: boolean;
  directoryFilter: Set<string> | null; // null = all directories
}

let httpServer: http.Server | null = null;
let wss: WebSocketServer | null = null;
let getDirectories: () => WatchedDir[] = () => [];

const clients = new Map<WebSocket, ClientState>();

/**
 * Send message to a WebSocket client
 */
function sendToClient(ws: WebSocket, message: WSServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/**
 * Broadcast event to all subscribed clients
 */
function broadcastEvent(event: SidecarEvent): void {
  const message: WSServerMessage = {
    type: event.type as WSServerMessage['type'],
    payload: event.payload,
    timestamp: Date.now(),
  };

  clients.forEach((state, ws) => {
    if (!state.subscribed) return;

    // Apply directory filter for file_change events
    if (event.type === 'file_change' && state.directoryFilter) {
      const dirId = event.payload.id;
      if (dirId && !state.directoryFilter.has(dirId)) return;
    }

    sendToClient(ws, message);
  });
}

/**
 * Handle WebSocket messages from clients
 */
function handleClientMessage(ws: WebSocket, data: string): void {
  try {
    const message: WSClientMessage = JSON.parse(data);
    const state = clients.get(ws);
    if (!state) return;

    switch (message.type) {
      case 'subscribe':
        state.subscribed = true;
        if (message.payload?.directoryIds) {
          state.directoryFilter = new Set(message.payload.directoryIds);
        } else {
          state.directoryFilter = null;
        }
        sendToClient(ws, {
          type: 'subscribed',
          payload: { directories: getDirectories() },
          timestamp: Date.now(),
        });
        break;

      case 'unsubscribe':
        state.subscribed = false;
        state.directoryFilter = null;
        break;

      case 'ping':
        sendToClient(ws, {
          type: 'pong',
          payload: {},
          timestamp: Date.now(),
        });
        break;

      default:
        sendToClient(ws, {
          type: 'error',
          payload: { message: 'Unknown message type' },
          timestamp: Date.now(),
        });
    }
  } catch {
    sendToClient(ws, {
      type: 'error',
      payload: { message: 'Invalid JSON message' },
      timestamp: Date.now(),
    });
  }
}

/**
 * Send JSON response
 */
function sendJson(
  res: http.ServerResponse,
  statusCode: number,
  data: APIResponse<unknown>
): void {
  res.writeHead(statusCode, {
    ...CORS_HEADERS,
    'Content-Type': 'application/json',
  });
  res.end(JSON.stringify(data));
}

/**
 * Handle HTTP requests
 */
async function handleHttpRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): Promise<void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url || '', true);
  const pathname = parsedUrl.pathname;

  // GET /api/health
  if (pathname === '/api/health' && req.method === 'GET') {
    sendJson(res, 200, { success: true, data: { status: 'ok' } });
    return;
  }

  // GET /api/directories
  if (pathname === '/api/directories' && req.method === 'GET') {
    sendJson(res, 200, {
      success: true,
      data: { directories: getDirectories() },
    });
    return;
  }

  // GET /api/files
  if (pathname === '/api/files' && req.method === 'GET') {
    const directoryId = parsedUrl.query.directoryId as string;
    const recursiveParam = parsedUrl.query.recursive as string;
    const recursive = recursiveParam !== 'false';

    if (!directoryId) {
      sendJson(res, 400, {
        success: false,
        error: 'Missing required parameter: directoryId',
      });
      return;
    }

    const result = await listFilesInDirectory(
      directoryId,
      getDirectories(),
      recursive
    );

    if (result.success) {
      sendJson(res, 200, { success: true, data: result.data });
    } else {
      sendJson(res, result.statusCode, { success: false, error: result.error });
    }
    return;
  }

  // GET /api/file
  if (pathname === '/api/file' && req.method === 'GET') {
    const filePath = parsedUrl.query.path as string;

    if (!filePath) {
      sendJson(res, 400, {
        success: false,
        error: 'Missing required parameter: path',
      });
      return;
    }

    const result = await readFileSecure(filePath, getDirectories());

    if (result.success) {
      sendJson(res, 200, { success: true, data: result.data });
    } else {
      sendJson(res, result.statusCode, { success: false, error: result.error });
    }
    return;
  }

  // 404 for unknown routes
  sendJson(res, 404, { success: false, error: 'Not found' });
}

/**
 * Initialize the API server
 */
export function startApiServer(
  directoriesGetter: () => WatchedDir[],
  port: number = API_PORT
): Promise<number> {
  return new Promise((resolve, reject) => {
    getDirectories = directoriesGetter;

    // Create HTTP server
    httpServer = http.createServer((req, res) => {
      handleHttpRequest(req, res).catch(err => {
        console.error('HTTP handler error:', err);
        sendJson(res, 500, { success: false, error: 'Internal server error' });
      });
    });

    // Create WebSocket server
    wss = new WebSocketServer({ server: httpServer });

    wss.on('connection', ws => {
      // Initialize client state
      clients.set(ws, {
        subscribed: false,
        directoryFilter: null,
      });

      ws.on('message', data => {
        handleClientMessage(ws, data.toString());
      });

      ws.on('close', () => {
        clients.delete(ws);
      });

      ws.on('error', err => {
        console.error('WebSocket error:', err);
        clients.delete(ws);
      });
    });

    // Subscribe to event bus for broadcasting
    eventBus.subscribe(event => {
      // Only broadcast relevant events to WebSocket clients
      if (
        event.type === 'file_change' ||
        event.type === 'directory_added' ||
        event.type === 'directory_removed' ||
        event.type === 'error'
      ) {
        broadcastEvent(event);
      }
    });

    // Start listening
    httpServer.listen(port, () => {
      const addr = httpServer?.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve(actualPort);
    });

    httpServer.on('error', err => {
      reject(err);
    });
  });
}

/**
 * Stop the API server
 */
export function stopApiServer(): Promise<void> {
  return new Promise(resolve => {
    // Close all WebSocket connections
    clients.forEach((_, ws) => {
      ws.close();
    });
    clients.clear();

    // Close WebSocket server
    if (wss) {
      wss.close();
      wss = null;
    }

    // Close HTTP server
    if (httpServer) {
      httpServer.close(() => {
        httpServer = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}
