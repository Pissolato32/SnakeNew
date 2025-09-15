/**
 * 2. Spatial Grid para otimização de colisões
 */
class SpatialGrid {
    constructor(width, height, cellSize) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows);
        this.clear();
    }
    
    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i] = []; // Always initialize to an empty array
        }
    }
    
    getIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        return row * this.cols + col;
    }
    
    insert(obj, x, y) {
        const index = this.getIndex(x, y);
        if (index >= 0) {
            this.grid[index].push(obj);
        }
    }
    
    getNearby(x, y, radius = 1) {

        const nearby = [];
        const centerCol = Math.floor(x / this.cellSize);
        const centerRow = Math.floor(y / this.cellSize);
        for (let row = centerRow - radius; row <= centerRow + radius; row++) {
            for (let col = centerCol - radius; col <= centerCol + radius; col++) {
                if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
                    const index = row * this.cols + col;
                    if (this.grid[index]) {
                        nearby.push(...this.grid[index]);
                    }
                }
            }
        }
        return nearby;
    }
}

export default SpatialGrid;
