/**
 * Structured Logging with Pino
 * 
 * Provides production-grade logging with:
 * - JSON structured output
 * - Log levels (debug/info/warn/error)
 * - Context enrichment
 * - Performance (async by default)
 * 
 * @module logger
 */

const pino = require('pino');

// Configure pino based on environment
const createLogger = (options = {}) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

  return pino({
    level: logLevel,
    ...options,
    // Pretty print in development
    transport: isDev ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname'
      }
    } : undefined
  });
};

// Global logger instance
const logger = createLogger();

/**
 * Create child logger with context
 * @param {Object} context - Additional context fields
 * @returns {Object} Child logger
 */
const withContext = (context) => logger.child(context);

/**
 * Log query execution
 * @param {string} query - Query string
 * @param {number} durationMs - Execution time
 * @param {boolean} success - Success flag
 */
const logQuery = (query, durationMs, success) => {
  logger.info({
    component: 'query',
    query: query.slice(0, 100), // Truncate for logging
    durationMs,
    success
  }, success ? 'Query executed' : 'Query failed');
};

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (error, context = {}) => {
  logger.error({
    err: error,
    ...context
  }, error.message);
};

module.exports = {
  logger,
  createLogger,
  withContext,
  logQuery,
  logError
};
