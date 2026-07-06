import Database from 'better-sqlite3';
import path from 'path';
import PersistenceProvider from './PersistenceProvider.js';
import config from '../../../../config/index.js';

class SQLitePersistenceProvider extends PersistenceProvider {
    constructor(logger, dbPath = null) {
        super();
        this.logger = logger;
        this.dbPath = dbPath || config.dbPath || path.join(process.cwd(), 'world_state.db');
        this.db = new Database(this.dbPath);

        this.initSchema();
    }

    initSchema() {
        this.logger.info('Initializing SQLite schema...');
        // Cria a tabela de agentes
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS agents (
                id TEXT PRIMARY KEY,
                nickname TEXT,
                isBot INTEGER,
                token TEXT,
                isOffline INTEGER,
                offlineSince INTEGER,
                x REAL,
                y REAL,
                angle REAL,
                color TEXT,
                skin TEXT,
                maxLength REAL,
                radius REAL,
                strategy TEXT,
                needs TEXT,
                blackboard TEXT,
                stats TEXT
            )
        `);

        // Cria a tabela de metadados
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
    }

    async saveState(stateData) {
        return new Promise((resolve, reject) => {
            try {
                // Preparar queries
                const insertOrReplaceAgent = this.db.prepare(`
                    INSERT OR REPLACE INTO agents (
                        id, nickname, isBot, token, isOffline, offlineSince,
                        x, y, angle, color, skin, maxLength, radius,
                        strategy, needs, blackboard, stats
                    ) VALUES (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                    )
                `);

                const updateMetadata = this.db.prepare(`
                    INSERT OR REPLACE INTO metadata (key, value) VALUES ('last_save_timestamp', ?)
                `);

                // Executa em transação para melhor performance e integridade
                const transaction = this.db.transaction((data) => {
                    for (const agent of data.agents) {
                        insertOrReplaceAgent.run(
                            agent.id,
                            agent.nickname,
                            agent.isBot ? 1 : 0,
                            agent.token || null,
                            agent.isOffline ? 1 : 0,
                            agent.offlineSince || null,
                            agent.x,
                            agent.y,
                            agent.angle,
                            agent.color,
                            agent.skin,
                            agent.maxLength,
                            agent.radius,
                            JSON.stringify(agent.strategy),
                            JSON.stringify(agent.needs),
                            JSON.stringify(agent.blackboard),
                            JSON.stringify(agent.stats)
                        );
                    }

                    // Remove agentes no banco que não estão no snapshot atual
                    const activeIds = data.agents.map(a => a.id);
                    if (activeIds.length > 0) {
                        const placeholders = activeIds.map(() => '?').join(',');
                        this.db.prepare(`DELETE FROM agents WHERE id NOT IN (${placeholders})`).run(...activeIds);
                    } else {
                        this.db.prepare('DELETE FROM agents').run();
                    }

                    updateMetadata.run(data.timestamp.toString());
                });

                transaction(stateData);
                this.logger.info(`World state saved to SQLite database (${stateData.agents.length} agents)`);
                resolve();
            } catch (err) {
                this.logger.error('Failed to save state to SQLite database:', err);
                reject(err);
            }
        });
    }

    async loadState() {
        return new Promise((resolve, reject) => {
            try {
                const timestampRow = this.db.prepare("SELECT value FROM metadata WHERE key = 'last_save_timestamp'").get();
                if (!timestampRow) {
                    resolve(null);
                    return;
                }

                const timestamp = parseInt(timestampRow.value, 10);
                const rows = this.db.prepare('SELECT * FROM agents').all();

                const agents = rows.map(row => ({
                    id: row.id,
                    nickname: row.nickname,
                    isBot: row.isBot === 1,
                    token: row.token,
                    isOffline: row.isOffline === 1,
                    offlineSince: row.offlineSince,
                    x: row.x,
                    y: row.y,
                    angle: row.angle,
                    color: row.color,
                    skin: row.skin,
                    maxLength: row.maxLength,
                    radius: row.radius,
                    strategy: JSON.parse(row.strategy),
                    needs: JSON.parse(row.needs),
                    blackboard: JSON.parse(row.blackboard),
                    stats: JSON.parse(row.stats)
                }));

                resolve({
                    timestamp,
                    agents
                });
            } catch (err) {
                this.logger.error('Failed to load state from SQLite database:', err);
                reject(err);
            }
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

export default SQLitePersistenceProvider;
