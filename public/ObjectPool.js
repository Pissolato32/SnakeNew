/**
 * 1. Object Pool para evitar garbage collection
 * @template T
 */
class ObjectPool {
    /**
     * @param {function(): T} createFn - Function to create a new object.
     * @param {function(T): void} resetFn - Function to reset an object to its initial state.
     * @param {number} initialSize - Initial size of the pool.
     */
    constructor(createFn, resetFn, initialSize = 50) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = new Set();
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    /**
     * Retrieves an object from the pool. Creates a new one if the pool is empty.
     * @returns {T}
     */
    get() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.add(obj);
        return obj;
    }
    
    /**
     * Releases an object back to the pool.
     * @param {T} obj - The object to release.
     */
    release(obj) {
        if (this.active.has(obj)) {
            this.active.delete(obj);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
    
    /**
     * Releases all active objects back to the pool.
     */
    releaseAll() {
        // Convert Set to Array to avoid issues with modifying Set during iteration
        Array.from(this.active).forEach(obj => this.release(obj));
    }
}

export default ObjectPool;
