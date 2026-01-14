import * as readline from 'readline';
import { SidecarCommand, SidecarEvent } from './types';
import { eventBus } from './event-bus';

export function createProtocol(onCommand: (cmd: SidecarCommand) => void): void {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    try {
      const command = JSON.parse(line) as SidecarCommand;
      onCommand(command);
    } catch (e) {
      sendEvent({ type: 'error', payload: { message: 'Invalid JSON command' } });
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

/**
 * Send event to both stdout (for Tauri) and event bus (for WebSocket clients)
 */
export function sendEvent(event: SidecarEvent): void {
  // Output to stdout for Tauri
  console.log(JSON.stringify(event));
  // Emit to event bus for WebSocket clients
  eventBus.emit(event);
}
