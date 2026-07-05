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

    reset() {
        this.players.clear();
        this.food.clear();
        this.powerups.clear();
        this.selfId = null;
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
        const mapA = new Map();
        for (let i = 0; i < playersA.length; i++) {
            mapA.set(playersA[i].id, playersA[i]);
        }

        for (const pB of playersB) {
            const pA = mapA.get(pB.id);
            let player = this.players.get(pB.id);

            if (!player) {
                player = { body: new CircularBuffer(1000) };
                this.players.set(pB.id, player);
            }

            seenPlayers.add(pB.id);

            if (pA) {
                player.x = this.lerp(pA.x, pB.x, t);
                player.y = this.lerp(pA.y, pB.y, t);
                player.angle = this.slerp(pA.angle, pB.angle, t);

                const bodyA = pA.s || [];
                const bodyB = pB.s || [];
                const maxLength = Math.max(bodyA.length, bodyB.length);

                player.body.reset();

                for (let i = maxLength - 1; i >= 0; i--) {
                    const segA = bodyA[i] || bodyA[bodyA.length - 1];
                    const segB = bodyB[i] || bodyB[bodyB.length - 1];
                    if (segA && segB) {
                        player.body.addFirst({
                            x: this.lerp(segA.x, segB.x, t),
                            y: this.lerp(segA.y, segB.y, t),
                        });
                    }
                }

            } else {
                player.x = pB.x;
                player.y = pB.y;
                player.angle = pB.angle;
                player.body.reset();
                const body = pB.s || [];
                for (let i = body.length - 1; i >= 0; i--) {
                    player.body.addFirst(body[i]);
                }
            }

            player.id = pB.id;
            player.nickname = pB.n || pB.nickname;
            player.skin = pB.skin;
            player.radius = pB.radius;
            if (player.color !== pB.color) {
                player.color = pB.color;
                player._colorDirty = true;
            }
            player.isDead = !pB.a;
            player.maxLength = pB.sc;
            player.needs = pB.needs;
            player.blackboard = pB.blackboard;
        }

        for (const id of this.players.keys()) {
            if (!seenPlayers.has(id)) {
                this.players.delete(id);
            }
        }
    }

    updateItems(itemMap, itemsA, itemsB, t) {
        const seenItems = new Set();
        const mapA = new Map();
        for (let i = 0; i < itemsA.length; i++) {
            mapA.set(itemsA[i].id, itemsA[i]);
        }

        for (const itemB of itemsB) {
            const itemA = mapA.get(itemB.id);
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
            if (itemB.color) item.color = itemB.color;
            if (itemB.radius) item.radius = itemB.radius;
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
