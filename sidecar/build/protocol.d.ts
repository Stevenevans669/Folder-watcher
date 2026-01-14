import { SidecarCommand, SidecarEvent } from './types';
export declare function createProtocol(onCommand: (cmd: SidecarCommand) => void): void;
export declare function sendEvent(event: SidecarEvent): void;
