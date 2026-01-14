import { SidecarEvent } from './types';
type EventHandler = (event: SidecarEvent) => void;
declare class EventBus {
    private handlers;
    subscribe(handler: EventHandler): () => void;
    emit(event: SidecarEvent): void;
}
export declare const eventBus: EventBus;
export {};
