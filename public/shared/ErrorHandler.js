class ErrorHandler {
    constructor(logger) {
        this.logger = logger;
    }

    handle(error, context = '') {
        const errorInfo = {
            message: error.message,
            stack: error.stack,
            context: context,
            timestamp: new Date().toISOString()
        };

        this.logger.error(`Error in ${context}: ${error.message}`, errorInfo);

        // In production, could send to monitoring service
        // For now, just log
    }

    handleAsync(error, context = '') {
        // Handle promise rejections
        this.handle(error, context);
    }
}

export default ErrorHandler;
