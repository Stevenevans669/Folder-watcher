import { SidecarEvent } from './types';

type EventHandler = (event: SidecarEvent) => void;

class EventBus {
  private handlers: Set<EventHandler> = new Set();

  subscribe(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  emit(event: SidecarEvent): void {
    this.handlers.forEach(handler => {
      try {
        handler(event);
      } catch (err) {
        console.error('Event handler error:', err);
      }
    });
  }
}

export const eventBus = new EventBus();
