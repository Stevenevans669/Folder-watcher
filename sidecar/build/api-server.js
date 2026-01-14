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
exports.startApiServer = startApiServer;
exports.stopApiServer = stopApiServer;
const ws_1 = require("ws");
const http = __importStar(require("http"));
const url = __importStar(require("url"));
const event_bus_1 = require("./event-bus");
const file_service_1 = require("./file-service");
const api_types_1 = require("./api-types");
let httpServer = null;
let wss = null;
let getDirectories = () => [];
const clients = new Map();
/**
 * Send message to a WebSocket client
 */
function sendToClient(ws, message) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}
/**
 * Broadcast event to all subscribed clients
 */
function broadcastEvent(event) {
    const message = {
        type: event.type,
        payload: event.payload,
        timestamp: Date.now(),
    };
    clients.forEach((state, ws) => {
        if (!state.subscribed)
            return;
        // Apply directory filter for file_change events
        if (event.type === 'file_change' && state.directoryFilter) {
            const dirId = event.payload.id;
            if (dirId && !state.directoryFilter.has(dirId))
                return;
        }
        sendToClient(ws, message);
    });
}
/**
 * Handle WebSocket messages from clients
 */
function handleClientMessage(ws, data) {
    try {
        const message = JSON.parse(data);
        const state = clients.get(ws);
        if (!state)
            return;
        switch (message.type) {
            case 'subscribe':
                state.subscribed = true;
                if (message.payload?.directoryIds) {
                    state.directoryFilter = new Set(message.payload.directoryIds);
                }
                else {
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
    }
    catch {
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
function sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
        ...api_types_1.CORS_HEADERS,
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(data));
}
/**
 * Handle HTTP requests
 */
async function handleHttpRequest(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204, api_types_1.CORS_HEADERS);
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
        const directoryId = parsedUrl.query.directoryId;
        const recursiveParam = parsedUrl.query.recursive;
        const recursive = recursiveParam !== 'false';
        if (!directoryId) {
            sendJson(res, 400, {
                success: false,
                error: 'Missing required parameter: directoryId',
            });
            return;
        }
        const result = await (0, file_service_1.listFilesInDirectory)(directoryId, getDirectories(), recursive);
        if (result.success) {
            sendJson(res, 200, { success: true, data: result.data });
        }
        else {
            sendJson(res, result.statusCode, { success: false, error: result.error });
        }
        return;
    }
    // GET /api/file
    if (pathname === '/api/file' && req.method === 'GET') {
        const filePath = parsedUrl.query.path;
        if (!filePath) {
            sendJson(res, 400, {
                success: false,
                error: 'Missing required parameter: path',
            });
            return;
        }
        const result = await (0, file_service_1.readFileSecure)(filePath, getDirectories());
        if (result.success) {
            sendJson(res, 200, { success: true, data: result.data });
        }
        else {
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
function startApiServer(directoriesGetter, port = api_types_1.API_PORT) {
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
        wss = new ws_1.WebSocketServer({ server: httpServer });
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
        event_bus_1.eventBus.subscribe(event => {
            // Only broadcast relevant events to WebSocket clients
            if (event.type === 'file_change' ||
                event.type === 'directory_added' ||
                event.type === 'directory_removed' ||
                event.type === 'error') {
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
function stopApiServer() {
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
        }
        else {
            resolve();
        }
    });
}
