export class EventSystem {
    constructor() {
        this.listeners = new Map();
        this.queuedEvents = [];
        this.processing = false;
    }

    on(event, callback, context = null) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add({ callback, context });
        return () => this.off(event, callback, context);
    }

    off(event, callback, context = null) {
        if (!this.listeners.has(event)) return;
        
        const listeners = this.listeners.get(event);
        for (const listener of listeners) {
            if (listener.callback === callback && listener.context === context) {
                listeners.delete(listener);
                break;
            }
        }
        
        if (listeners.size === 0) {
            this.listeners.delete(event);
        }
    }

    emit(event, data = null) {
        this.queuedEvents.push({ event, data });
        if (!this.processing) {
            this.processEvents();
        }
    }

    processEvents() {
        this.processing = true;
        
        while (this.queuedEvents.length > 0) {
            const { event, data } = this.queuedEvents.shift();
            
            if (this.listeners.has(event)) {
                this.listeners.get(event).forEach(({ callback, context }) => {
                    try {
                        callback.call(context, data);
                    } catch (error) {
                        console.error(`Error in event handler for ${event}:`, error);
                    }
                });
            }
        }
        
        this.processing = false;
    }

    clear() {
        this.listeners.clear();
        this.queuedEvents = [];
    }
} 