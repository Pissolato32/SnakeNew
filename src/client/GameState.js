import CircularBuffer from '../../src/shared/CircularBuffer.js';

class GameState {
    constructor() {
        this.players = new Map();
        this.food = new Map();
        this.powerups = new Map();
        this.selfId = null;
        this.worldSize = 0;
    }

    setSelfId(id) {
        this.selfId = id;
    }

    setWorldSize(size) {
        this.worldSize = size;
    }

    getPlayer(id) {
        return this.players.get(id);
    }

    updateFromSnapshot(snapshotA, snapshotB, t) {
        this.updatePlayers(snapshotA.players, snapshotB.players, t);
        this.updateItems(this.food, snapshotA.food, snapshotB.food, t);
        this.updateItems(this.powerups, snapshotA.powerups, snapshotB.powerups, t);
    }

    updatePlayers(playersA, playersB, t) {
        const seenPlayers = new Set();

        for (const pB of playersB) {
            const pA = playersA.find(p => p.id === pB.id);
            let player = this.players.get(pB.id);

            if (!player) {
                player = { body: new CircularBuffer(1000) }; // Create new player object
                this.players.set(pB.id, player);
            }
            
            seenPlayers.add(pB.id);

            if (pA) {
                // Interpolate properties
                player.x = this.lerp(pA.x, pB.x, t);
                player.y = this.lerp(pA.y, pB.y, t);
                player.angle = this.slerp(pA.angle, pB.angle, t);
                
                // Interpolate body segments for smooth snake animation
                const bodyA = pA.s || [];
                const bodyB = pB.s || [];
                const maxLength = Math.max(bodyA.length, bodyB.length);
                const newBody = [];
                for(let i = 0; i < maxLength; i++) {
                    const segA = bodyA[i] || bodyA[bodyA.length - 1]; // Use last segment if A is shorter
                    const segB = bodyB[i] || bodyB[bodyB.length - 1]; // Use last segment if B is shorter
                    if(segA && segB) {
                        newBody.push({
                            x: this.lerp(segA.x, segB.x, t),
                            y: this.lerp(segA.y, segB.y, t),
                        });
                    }
                }
                player.body.clear();
                newBody.reverse().forEach(seg => player.body.addFirst(seg));

            } else {
                // Player is new, just use state from B
                player.x = pB.x;
                player.y = pB.y;
                player.angle = pB.angle;
                player.body.clear();
                (pB.s || []).reverse().forEach(seg => player.body.addFirst(seg));
            }

            // Update non-interpolated properties directly from B
            player.id = pB.id;
            player.nickname = pB.nickname;
            player.skin = pB.skin;
            player.radius = pB.radius;
            player.color = pB.color;
            player.isDead = !pB.a;
            player.maxLength = pB.sc;
        }

        // Remove players that are no longer in the snapshot
        for (const id of this.players.keys()) {
            if (!seenPlayers.has(id)) {
                this.players.delete(id);
            }
        }
    }

    updateItems(itemMap, itemsA, itemsB, t) {
        const seenItems = new Set();
        for (const itemB of itemsB) {
            const itemA = itemsA.find(i => i.id === itemB.id);
            let item = itemMap.get(itemB.id);

            if (!item) {
                item = {};
                itemMap.set(itemB.id, item);
            }

            seenItems.add(itemB.id);

            if (itemA) {
                item.x = this.lerp(itemA.x, itemB.x, t);
                item.y = this.lerp(itemA.y, itemB.y, t);
            } else {
                item.x = itemB.x;
                item.y = itemB.y;
            }
            item.id = itemB.id;
            if (itemB.type) item.type = itemB.type;
        }

        for (const id of itemMap.keys()) {
            if (!seenItems.has(id)) {
                itemMap.delete(id);
            }
        }
    }

    lerp(start, end, t) {
        return start + t * (end - start);
    }

    slerp(start, end, t) {
        const delta = (end - start + Math.PI * 2) % (Math.PI * 2);
        const shortestAngle = delta > Math.PI ? delta - Math.PI * 2 : delta;
        return start + shortestAngle * t;
    }
}

export default GameState;