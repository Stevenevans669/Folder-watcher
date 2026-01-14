"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventBus = void 0;
class EventBus {
    constructor() {
        this.handlers = new Set();
    }
    subscribe(handler) {
        this.handlers.add(handler);
        return () => this.handlers.delete(handler);
    }
    emit(event) {
        this.handlers.forEach(handler => {
            try {
                handler(event);
            }
            catch (err) {
                console.error('Event handler error:', err);
            }
        });
    }
}
exports.eventBus = new EventBus();
