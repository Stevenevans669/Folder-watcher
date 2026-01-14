import { SidecarCommand, SidecarEvent } from './types';
export declare function createProtocol(onCommand: (cmd: SidecarCommand) => void): void;
/**
 * Send event to both stdout (for Tauri) and event bus (for WebSocket clients)
 */
export declare function sendEvent(event: SidecarEvent): void;
