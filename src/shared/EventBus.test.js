import EventBus from './EventBus.js';

describe('EventBus', () => {
    let eventBus;

    beforeEach(() => {
        eventBus = new EventBus();
    });

    test('should subscribe and publish events', () => {
        let callCount = 0;
        let receivedData = null;
        const callback = (data) => {
            callCount++;
            receivedData = data;
        };
        eventBus.subscribe('TEST_EVENT', callback);

        eventBus.publish('TEST_EVENT', { foo: 'bar' });

        expect(callCount).toBe(1);
        expect(receivedData).toEqual({ foo: 'bar' });
    });

    test('should unsubscribe from events', () => {
        let callCount = 0;
        const callback = () => {
            callCount++;
        };
        const unsubscribe = eventBus.subscribe('TEST_EVENT', callback);

        unsubscribe();
        eventBus.publish('TEST_EVENT', { foo: 'bar' });

        expect(callCount).toBe(0);
    });

    test('should only trigger callbacks for the specific event type', () => {
        let calledA = false;
        let calledB = false;

        eventBus.subscribe('EVENT_A', () => { calledA = true; });
        eventBus.subscribe('EVENT_B', () => { calledB = true; });

        eventBus.publish('EVENT_A', 123);

        expect(calledA).toBe(true);
        expect(calledB).toBe(false);
    });
});
