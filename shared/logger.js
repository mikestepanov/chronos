/**
 * Logger - Centralized logging service
 * 
 * Provides structured logging with:
 * - Multiple log levels
 * - Contextual information
 * - JSON output for production
 * - Pretty printing for development
 * - Log filtering and sampling
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

class Logger {
  static LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3,
    TRACE: 4
  };

  static LEVEL_NAMES = Object.keys(Logger.LEVELS).reduce((acc, key) => {
    acc[Logger.LEVELS[key]] = key;
    return acc;
  }, {});

  static COLORS = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[35m', // Magenta
    TRACE: '\x1b[90m', // Gray
    RESET: '\x1b[0m'
  };

  constructor(options = {}) {
    this.name = options.name || 'app';
    this.level = options.level !== undefined ? options.level : Logger.LEVELS.INFO;
    this.format = options.format || (process.env.NODE_ENV === 'production' ? 'json' : 'pretty');
    this.output = options.output || process.stdout;
    this.errorOutput = options.errorOutput || process.stderr;
    this.context = options.context || {};
    this.filters = options.filters || [];
    this.sampling = options.sampling || null;
  }

  /**
   * Create a child logger with additional context
   * @param {string} name - Child logger name
   * @param {Object} context - Additional context
   * @returns {Logger} Child logger instance
   */
  child(name, context = {}) {
    return new Logger({
      name: `${this.name}:${name}`,
      level: this.level,
      format: this.format,
      output: this.output,
      errorOutput: this.errorOutput,
      context: { ...this.context, ...context },
      filters: this.filters,
      sampling: this.sampling
    });
  }

  /**
   * Log at ERROR level
   * @param {string|Error} message - Message or error object
   * @param {Object} meta - Additional metadata
   */
  error(message, meta = {}) {
    if (message instanceof Error) {
      this._log(Logger.LEVELS.ERROR, message.message, {
        ...meta,
        error: {
          name: message.name,
          stack: message.stack,
          code: message.code,
          ...message.context
        }
      });
    } else {
      this._log(Logger.LEVELS.ERROR, message, meta);
    }
  }

  /**
   * Log at WARN level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  warn(message, meta = {}) {
    this._log(Logger.LEVELS.WARN, message, meta);
  }

  /**
   * Log at INFO level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  info(message, meta = {}) {
    this._log(Logger.LEVELS.INFO, message, meta);
  }

  /**
   * Log at DEBUG level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  debug(message, meta = {}) {
    this._log(Logger.LEVELS.DEBUG, message, meta);
  }

  /**
   * Log at TRACE level
   * @param {string} message - Log message
   * @param {Object} meta - Additional metadata
   */
  trace(message, meta = {}) {
    this._log(Logger.LEVELS.TRACE, message, meta);
  }

  /**
   * Internal logging method
   * @private
   */
  _log(level, message, meta = {}) {
    // Check log level
    if (level > this.level) return;

    // Apply sampling if configured
    if (this.sampling && Math.random() > this.sampling) return;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: Logger.LEVEL_NAMES[level],
      logger: this.name,
      message,
      ...this.context,
      ...meta
    };

    // Apply filters
    for (const filter of this.filters) {
      if (!filter(logEntry)) return;
    }

    // Format and output
    const formatted = this._format(logEntry, level);
    const output = level === Logger.LEVELS.ERROR ? this.errorOutput : this.output;
    
    if (typeof output.write === 'function') {
      output.write(formatted + '\n');
    } else {
      console.log(formatted);
    }
  }

  /**
   * Format log entry
   * @private
   */
  _format(entry, level) {
    if (this.format === 'json') {
      return JSON.stringify(entry);
    }

    // Pretty format for development
    const color = Logger.COLORS[entry.level] || '';
    const reset = Logger.COLORS.RESET;
    const levelPadded = entry.level.padEnd(5);
    
    let formatted = `${color}[${entry.timestamp}] ${levelPadded}${reset} [${entry.logger}] ${entry.message}`;
    
    // Add metadata if present
    const { timestamp, level: _, logger, message, ...meta } = entry;
    if (Object.keys(meta).length > 0) {
      formatted += '\n' + util.inspect(meta, { 
        colors: true, 
        depth: 3, 
        compact: false 
      });
    }
    
    return formatted;
  }

  /**
   * Set log level
   * @param {number|string} level - Log level
   */
  setLevel(level) {
    if (typeof level === 'string') {
      this.level = Logger.LEVELS[level.toUpperCase()] || Logger.LEVELS.INFO;
    } else {
      this.level = level;
    }
  }

  /**
   * Add a filter function
   * @param {Function} filter - Filter function that returns boolean
   */
  addFilter(filter) {
    this.filters.push(filter);
  }

  /**
   * Create a timer for performance logging
   * @param {string} name - Timer name
   * @returns {Function} End timer function
   */
  time(name) {
    const start = Date.now();
    return (meta = {}) => {
      const duration = Date.now() - start;
      this.info(`${name} completed`, { duration, ...meta });
    };
  }

  /**
   * Log method entry (for tracing)
   * @param {string} method - Method name
   * @param {Object} args - Method arguments
   */
  enter(method, args = {}) {
    this.trace(`Entering ${method}`, { args });
  }

  /**
   * Log method exit (for tracing)
   * @param {string} method - Method name
   * @param {*} result - Method result
   */
  exit(method, result) {
    this.trace(`Exiting ${method}`, { result: result !== undefined });
  }
}

/**
 * Global logger instance
 */
const globalLogger = new Logger({
  name: 'chronos',
  level: process.env.LOG_LEVEL ? 
    Logger.LEVELS[process.env.LOG_LEVEL.toUpperCase()] : 
    (process.env.NODE_ENV === 'production' ? Logger.LEVELS.INFO : Logger.LEVELS.DEBUG)
});

/**
 * Create a logger for a module
 * @param {string} name - Module name
 * @param {Object} context - Additional context
 * @returns {Logger} Logger instance
 */
function createLogger(name, context = {}) {
  return globalLogger.child(name, context);
}

/**
 * Configure global logger
 * @param {Object} options - Logger options
 */
function configure(options) {
  Object.assign(globalLogger, options);
}

// Convenience exports
module.exports = {
  Logger,
  createLogger,
  configure,
  
  // Direct logging methods on global logger
  error: globalLogger.error.bind(globalLogger),
  warn: globalLogger.warn.bind(globalLogger),
  info: globalLogger.info.bind(globalLogger),
  debug: globalLogger.debug.bind(globalLogger),
  trace: globalLogger.trace.bind(globalLogger),
  
  // Log levels
  LEVELS: Logger.LEVELS
};