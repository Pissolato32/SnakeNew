import Database from 'better-sqlite3';
import path from 'path';
import PersistenceProvider from './PersistenceProvider.js';
import config from '../../../../config/index.js';

const SCHEMA_VERSION = 2;

class SQLitePersistenceProvider extends PersistenceProvider {
    constructor(logger, dbPath = null) {
        super();
        this.logger = logger;
        this.dbPath = dbPath || config.dbPath || path.join(process.cwd(), 'world_state.db');
        this.db = new Database(this.dbPath);
        this.initSchema();
    }

    initSchema() {
        this.logger.info(`Initializing SQLite schema v${SCHEMA_VERSION}...`);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY, persistentId TEXT, nickname TEXT, isBot INTEGER,
                token TEXT, isOffline INTEGER, isOnline INTEGER, controller TEXT,
                offlineSince INTEGER, familyId TEXT, broodId TEXT, generation INTEGER,
                genes TEXT, traits TEXT, skills TEXT, focus TEXT,
                x REAL, y REAL, angle REAL, color TEXT, skin TEXT,
                maxLength REAL, radius REAL, strategy TEXT, needs TEXT, blackboard TEXT, stats TEXT
            );
            CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT);
        `);

        const columns = this.db.prepare('PRAGMA table_info(agents)').all().map(c => c.name);
        const additions = {
            persistentId: 'TEXT', isOnline: 'INTEGER', controller: 'TEXT', familyId: 'TEXT',
            broodId: 'TEXT', generation: 'INTEGER', genes: 'TEXT', traits: 'TEXT',
            skills: 'TEXT', focus: 'TEXT'
        };
        for (const [name, type] of Object.entries(additions)) {
            if (!columns.includes(name)) this.db.exec(`ALTER TABLE agents ADD COLUMN ${name} ${type}`);
        }
        this.db.prepare("INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?)").run(String(SCHEMA_VERSION));
    }

    async saveState(stateData) {
        const insert = this.db.prepare(`
            INSERT OR REPLACE INTO agents (
                id,persistentId,nickname,isBot,token,isOffline,isOnline,controller,offlineSince,
                familyId,broodId,generation,genes,traits,skills,focus,x,y,angle,color,skin,maxLength,
                radius,strategy,needs,blackboard,stats
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `);
        const metadata = this.db.prepare("INSERT OR REPLACE INTO metadata (key,value) VALUES ('last_save_timestamp',?)");
        const transaction = this.db.transaction((data) => {
            for (const agent of data.agents) {
                insert.run(
                    agent.id, agent.persistentId || null, agent.nickname, agent.isBot ? 1 : 0, agent.token || null,
                    agent.isOffline ? 1 : 0, agent.isOnline ? 1 : 0, agent.controller || null, agent.offlineSince || null,
                    agent.familyId || null, agent.broodId || null, agent.generation || 1,
                    JSON.stringify(agent.genes || []), JSON.stringify(agent.traits || []), JSON.stringify(agent.skills || {}),
                    JSON.stringify(agent.focus || {}), agent.x, agent.y, agent.angle, agent.color, agent.skin,
                    agent.maxLength, agent.radius, JSON.stringify(agent.strategy || {}), JSON.stringify(agent.needs || {}),
                    JSON.stringify(agent.blackboard || {}), JSON.stringify(agent.stats || {})
                );
            }
            const ids = data.agents.map(a => a.id);
            if (ids.length) this.db.prepare(`DELETE FROM agents WHERE id NOT IN (${ids.map(() => '?').join(',')})`).run(...ids);
            else this.db.prepare('DELETE FROM agents').run();
            metadata.run(String(data.timestamp));
        });
        try { transaction(stateData); } catch (err) { this.logger.error('Failed to save state:', err); throw err; }
    }

    async loadState() {
        const timestampRow = this.db.prepare("SELECT value FROM metadata WHERE key='last_save_timestamp'").get();
        if (!timestampRow) return null;
        const rows = this.db.prepare('SELECT * FROM agents').all();
        return {
            timestamp: Number(timestampRow.value),
            agents: rows.map(row => ({
                id: row.id, persistentId: row.persistentId, nickname: row.nickname, isBot: row.isBot === 1,
                token: row.token, isOffline: row.isOffline === 1, isOnline: row.isOnline === 1,
                controller: row.controller, offlineSince: row.offlineSince, familyId: row.familyId,
                broodId: row.broodId, generation: row.generation || 1,
                genes: row.genes ? JSON.parse(row.genes) : [], traits: row.traits ? JSON.parse(row.traits) : [],
                skills: row.skills ? JSON.parse(row.skills) : {}, focus: row.focus ? JSON.parse(row.focus) : null,
                x: row.x, y: row.y, angle: row.angle, color: row.color, skin: row.skin,
                maxLength: row.maxLength, radius: row.radius,
                strategy: row.strategy ? JSON.parse(row.strategy) : {}, needs: row.needs ? JSON.parse(row.needs) : {},
                blackboard: row.blackboard ? JSON.parse(row.blackboard) : {}, stats: row.stats ? JSON.parse(row.stats) : {}
            }))
        };
    }

    close() { if (this.db) this.db.close(); }
}

export default SQLitePersistenceProvider;
