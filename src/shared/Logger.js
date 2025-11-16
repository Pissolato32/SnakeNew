class Logger {
    constructor(level) {
        this.level = level;
    }

    log(level, ...args) {
        if (this.level === 'debug' || level !== 'debug') {
            console.log(`[${level.toUpperCase()}]`, ...args);
        }
    }

    debug(...args) {
        this.log('debug', ...args);
    }

    info(...args) {
        this.log('info', ...args);
    }

    warn(...args) {
        this.log('warn', ...args);
    }

    error(...args) {
        this.log('error', ...args);
    }
}

export default Logger;
