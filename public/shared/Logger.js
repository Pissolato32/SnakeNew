/**
 * Logger utility for unified logging across client and server.
 */
class Logger {
    constructor(level = 'info', output = 'console') {
        this.levels = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3
        };
        this.currentLevel = this.levels[level] || 1;
        this.output = output; // 'console' or 'file'
        this.logFile = null;
        if (output === 'file') {
            // In browser, can't write files, so fallback to console
            if (typeof window !== 'undefined') {
                this.output = 'console';
            } else {
                // For server, could use fs, but for simplicity, console
                this.output = 'console';
            }
        }
    }

    setLevel(level) {
        this.currentLevel = this.levels[level] || 1;
    }

    debug(message, ...args) {
        if (this.currentLevel <= 0) this.log('DEBUG', message, ...args);
    }

    info(message, ...args) {
        if (this.currentLevel <= 1) this.log('INFO', message, ...args);
    }

    warn(message, ...args) {
        if (this.currentLevel <= 2) this.log('WARN', message, ...args);
    }

    error(message, ...args) {
        if (this.currentLevel <= 3) this.log('ERROR', message, ...args);
    }

    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${level}: ${message}`;
        if (args.length > 0) {
            console.log(formatted, ...args);
        } else {
            console.log(formatted);
        }
    }
}

export default Logger;

// Universal module export for both CommonJS and ES6 environments
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS (Node.js server)
    module.exports = Logger;
} else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], () => Logger);
} else if (typeof window !== 'undefined') {
    // Browser global
    window.Logger = Logger;
} else if (typeof global !== 'undefined') {
    // Node.js global
    global.Logger = Logger;
}
