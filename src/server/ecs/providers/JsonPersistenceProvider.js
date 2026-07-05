import fs from 'fs';
import path from 'path';
import PersistenceProvider from './PersistenceProvider.js';

class JsonPersistenceProvider extends PersistenceProvider {
    constructor(logger) {
        super();
        this.logger = logger;
        this.dbPath = path.join(process.cwd(), 'world_state.json');
    }

    async saveState(stateData) {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.dbPath, JSON.stringify(stateData, null, 2), (err) => {
                if (err) {
                    this.logger.error('Failed to save world state to JSON:', err);
                    reject(err);
                } else {
                    this.logger.info(`World state saved to ${this.dbPath}`);
                    resolve();
                }
            });
        });
    }

    async loadState() {
        return new Promise((resolve, reject) => {
            fs.readFile(this.dbPath, 'utf8', (err, data) => {
                if (err) {
                    if (err.code === 'ENOENT') {
                        resolve(null); // File doesn't exist yet
                    } else {
                        reject(err);
                    }
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (parseErr) {
                        reject(parseErr);
                    }
                }
            });
        });
    }
}

export default JsonPersistenceProvider;
