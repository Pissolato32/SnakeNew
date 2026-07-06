class EventBus {
    constructor() {
        this.listeners = {};
    }

    subscribe(eventType, callback) {
        if (!this.listeners[eventType]) {
            this.listeners[eventType] = [];
        }
        this.listeners[eventType].push(callback);
        return () => this.unsubscribe(eventType, callback);
    }

    unsubscribe(eventType, callback) {
        if (!this.listeners[eventType]) return;
        this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback);
    }

    publish(eventType, data) {
        if (!this.listeners[eventType]) return;
        this.listeners[eventType].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                // Using console.error here; Logger can wrap it if injected
                console.error(`Error in EventBus listener for ${eventType}:`, err);
            }
        });
    }
}

export default EventBus;
