class SpatialHashing {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.grid = new Map();
    }

    _getGridCoords(x, y) {
        return {
            x: Math.floor(x / this.cellSize),
            y: Math.floor(y / this.cellSize)
        };
    }

    insert(obj) {
        const min = this._getGridCoords(obj.x - obj.radius, obj.y - obj.radius);
        const max = this._getGridCoords(obj.x + obj.radius, obj.y + obj.radius);

        // Store the cells this object belongs to, so we can remove it efficiently
        obj._spatialCells = [];

        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                const key = `${x},${y}`;
                if (!this.grid.has(key)) {
                    this.grid.set(key, []);
                }
                this.grid.get(key).push(obj);
                obj._spatialCells.push(key);
            }
        }
    }

    remove(obj) {
        if (!obj._spatialCells) {
            // This object was likely not inserted or has been modified.
            // To be safe, we would need to recalculate its cells based on its last known position.
            // For now, we'll assume this doesn't happen.
            return;
        }

        for (const key of obj._spatialCells) {
            if (this.grid.has(key)) {
                const cell = this.grid.get(key);
                const index = cell.indexOf(obj);
                if (index > -1) {
                    cell.splice(index, 1);
                }
            }
        }
        delete obj._spatialCells;
    }

    update(obj) {
        this.remove(obj);
        this.insert(obj);
    }

    query(bounds, found = new Set()) {
        const min = this._getGridCoords(bounds.x, bounds.y);
        const max = this._getGridCoords(bounds.x + bounds.width, bounds.y + bounds.height);

        for (let x = min.x; x <= max.x; x++) {
            for (let y = min.y; y <= max.y; y++) {
                const key = `${x},${y}`;
                if (this.grid.has(key)) {
                    this.grid.get(key).forEach(obj => found.add(obj));
                }
            }
        }
        return Array.from(found);
    }

    clear() {
        this.grid.clear();
    }
}

module.exports = SpatialHashing;