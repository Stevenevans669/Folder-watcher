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
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
const protocol_1 = require("./protocol");
const watcher_1 = require("./watcher");
const storage_1 = require("./storage");
let directories = [];
async function initialize() {
    directories = (0, storage_1.loadDirectories)();
    // Start watching saved directories
    const validDirectories = [];
    for (const dir of directories) {
        if (fs.existsSync(dir.path)) {
            await (0, watcher_1.addWatcher)(dir.id, dir.path);
            validDirectories.push(dir);
        }
        else {
            (0, protocol_1.sendEvent)({
                type: 'error',
                payload: { id: dir.id, message: `Directory not found: ${dir.path}` }
            });
        }
    }
    directories = validDirectories;
    (0, storage_1.saveDirectories)(directories);
    (0, protocol_1.sendEvent)({ type: 'directories_loaded', payload: { directories } });
    (0, protocol_1.sendEvent)({ type: 'ready', payload: {} });
}
async function handleCommand(cmd) {
    switch (cmd.type) {
        case 'add_directory': {
            const dirPath = cmd.payload?.path;
            if (!dirPath) {
                (0, protocol_1.sendEvent)({ type: 'error', payload: { message: 'No path provided' } });
                return;
            }
            // Check for duplicates
            if (directories.some(d => d.path === dirPath)) {
                (0, protocol_1.sendEvent)({ type: 'error', payload: { message: 'Directory already added' } });
                return;
            }
            // Verify path exists and is accessible
            try {
                fs.accessSync(dirPath, fs.constants.R_OK);
                const stats = fs.statSync(dirPath);
                if (!stats.isDirectory()) {
                    (0, protocol_1.sendEvent)({ type: 'error', payload: { message: 'Path is not a directory' } });
                    return;
                }
            }
            catch {
                (0, protocol_1.sendEvent)({ type: 'error', payload: { message: 'Permission denied or directory not found' } });
                return;
            }
            const id = (0, uuid_1.v4)();
            const newDir = { id, path: dirPath };
            directories.push(newDir);
            await (0, watcher_1.addWatcher)(id, dirPath);
            (0, storage_1.saveDirectories)(directories);
            (0, protocol_1.sendEvent)({ type: 'directory_added', payload: { id, path: dirPath } });
            break;
        }
        case 'remove_directory': {
            const id = cmd.payload?.id;
            if (!id) {
                (0, protocol_1.sendEvent)({ type: 'error', payload: { message: 'No directory id provided' } });
                return;
            }
            (0, watcher_1.removeWatcher)(id);
            directories = directories.filter(d => d.id !== id);
            (0, storage_1.saveDirectories)(directories);
            (0, protocol_1.sendEvent)({ type: 'directory_removed', payload: { id } });
            break;
        }
        case 'get_directories': {
            (0, protocol_1.sendEvent)({ type: 'directories_loaded', payload: { directories } });
            break;
        }
        case 'shutdown': {
            (0, watcher_1.closeAllWatchers)();
            process.exit(0);
        }
    }
}
// Start the sidecar
(0, protocol_1.createProtocol)(handleCommand);
initialize().catch((error) => {
    (0, protocol_1.sendEvent)({ type: 'error', payload: { message: `Initialization error: ${error.message}` } });
});
