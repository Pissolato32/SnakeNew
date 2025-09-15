/**
 * A Circular Buffer implementation that can dynamically grow.
 * Optimized for queue-like operations (adding to one end, removing from the other).
 */
class CircularBuffer {
    constructor(initialCapacity = 50) {
        this.buffer = new Array(initialCapacity);
        this.capacity = initialCapacity;
        this.length = 0;
        this.head = 0; // Points to the first element
        this.tail = 0; // Points to the next available slot for the last element
    }

    /**
     * Adds an item to the front of the buffer (like unshift).
     * @param {*} item The item to add.
     */
    addFirst(item) {
        if (this.length === this.capacity) {
            this._grow();
        }
        this.head = (this.head - 1 + this.capacity) % this.capacity;
        this.buffer[this.head] = item;
        this.length++;
    }

    /**
     * Removes an item from the end of the buffer (like pop).
     * @returns {*} The removed item.
     */
    removeLast() {
        if (this.length === 0) {
            return undefined;
        }
        this.tail = (this.tail - 1 + this.capacity) % this.capacity;
        const item = this.buffer[this.tail];
        this.buffer[this.tail] = undefined; // Clear the reference
        this.length--;
        return item;
    }

    clear() {
        this.buffer = new Array(this.capacity);
        this.length = 0;
        this.head = 0;
    }

    /**
     * Gets an item at a specific index from the start of the buffer.
     * @param {number} index The index to retrieve.
     * @returns {*} The item at the specified index.
     */
    get(index) {
        if (index < 0 || index >= this.length) {
            return undefined;
        }
        const bufferIndex = (this.head + index) % this.capacity;
        return this.buffer[bufferIndex];
    }

    /**
     * Returns an array representation of the buffer, from head to tail.
     * @returns {Array<*>}
     */
    toArray() {
        const arr = [];
        for (let i = 0; i < this.length; i++) {
            arr.push(this.get(i));
        }
        return arr;
    }

    /**
     * Doubles the buffer's capacity when it's full.
     */
    _grow() {
        const newCapacity = this.capacity * 2;
        const newBuffer = new Array(newCapacity);

        // Re-order elements into the new buffer
        for (let i = 0; i < this.length; i++) {
            newBuffer[i] = this.get(i);
        }

        this.buffer = newBuffer;
        this.capacity = newCapacity;
        this.head = 0;
        this.tail = this.length;
    }
}

export default CircularBuffer;
