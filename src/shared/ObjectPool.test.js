import ObjectPool from './ObjectPool.js';

describe('ObjectPool', () => {
    it('should pre-populate the pool', () => {
        let count = 0;
        const createFn = () => ({ id: count++ });
        const resetFn = (obj) => { obj.reset = true; };
        
        const pool = new ObjectPool(createFn, resetFn, 5);
        expect(pool.pool.length).toBe(5);
        expect(pool.active.size).toBe(0);
    });

    it('should get objects and track them as active', () => {
        let count = 0;
        const createFn = () => ({ id: count++ });
        const resetFn = (obj) => { obj.reset = true; };
        
        const pool = new ObjectPool(createFn, resetFn, 2);
        const obj1 = pool.get();
        const obj2 = pool.get();
        
        expect(pool.active.has(obj1)).toBe(true);
        expect(pool.active.has(obj2)).toBe(true);
        expect(pool.pool.length).toBe(0);
        
        const obj3 = pool.get(); // Should create a new one since pool is empty
        expect(obj3.id).toBe(2);
        expect(pool.active.size).toBe(3);
    });

    it('should release objects back to the pool and reset them', () => {
        const createFn = () => ({ val: 1 });
        const resetFn = (obj) => { obj.val = 0; };
        
        const pool = new ObjectPool(createFn, resetFn, 1);
        const obj = pool.get();
        expect(obj.val).toBe(1);
        
        pool.release(obj);
        expect(pool.active.has(obj)).toBe(false);
        expect(pool.pool.length).toBe(1);
        expect(obj.val).toBe(0);
    });
});
