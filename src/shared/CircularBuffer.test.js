import CircularBuffer from './CircularBuffer.js';

describe('CircularBuffer', () => {
    it('should initialize with correct default properties', () => {
        const buffer = new CircularBuffer(5);
        expect(buffer.size()).toBe(0);
        expect(buffer.isEmpty()).toBe(true);
        expect(buffer.getCapacity()).toBe(5);
    });

    it('should add elements to the front and remove from the end', () => {
        const buffer = new CircularBuffer(3);
        buffer.addFirst(1);
        buffer.addFirst(2);
        buffer.addFirst(3);

        expect(buffer.size()).toBe(3);
        expect(buffer.toArray()).toEqual([3, 2, 1]);

        expect(buffer.removeLast()).toBe(1);
        expect(buffer.size()).toBe(2);
        expect(buffer.toArray()).toEqual([3, 2]);
    });

    it('should grow when capacity is reached', () => {
        const buffer = new CircularBuffer(2);
        buffer.addFirst(1);
        buffer.addFirst(2);
        expect(buffer.isFull()).toBe(true);

        buffer.addFirst(3); // Trigger grow
        expect(buffer.getCapacity()).toBe(4);
        expect(buffer.size()).toBe(3);
        expect(buffer.toArray()).toEqual([3, 2, 1]);
    });
});
