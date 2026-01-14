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
exports.addWatcher = addWatcher;
exports.removeWatcher = removeWatcher;
exports.closeAllWatchers = closeAllWatchers;
const chokidar = __importStar(require("chokidar"));
const protocol_1 = require("./protocol");
const watchers = new Map();
const watcherPaths = new Map();
async function addWatcher(id, dirPath) {
    if (watchers.has(id)) {
        return false;
    }
    const watcher = chokidar.watch(dirPath, {
        persistent: true,
        ignoreInitial: true,
        followSymlinks: true,
        awaitWriteFinish: {
            stabilityThreshold: 300,
            pollInterval: 100
        }
    });
    watcher
        .on('add', (filePath) => emitChange(id, 'create', filePath))
        .on('change', (filePath) => emitChange(id, 'modify', filePath))
        .on('unlink', (filePath) => emitChange(id, 'delete', filePath))
        .on('error', (error) => {
        const message = error instanceof Error ? error.message : String(error);
        (0, protocol_1.sendEvent)({
            type: 'error',
            payload: { id, message }
        });
    });
    watchers.set(id, watcher);
    watcherPaths.set(id, dirPath);
    return true;
}
function removeWatcher(id) {
    const watcher = watchers.get(id);
    if (watcher) {
        watcher.close();
        watchers.delete(id);
        watcherPaths.delete(id);
        return true;
    }
    return false;
}
function closeAllWatchers() {
    for (const [, watcher] of watchers) {
        watcher.close();
    }
    watchers.clear();
    watcherPaths.clear();
}
function emitChange(dirId, eventType, filePath) {
    const timestamp = Date.now();
    (0, protocol_1.sendEvent)({
        type: 'file_change',
        payload: {
            id: dirId,
            eventType,
            filePath,
            timestamp
        }
    });
}
