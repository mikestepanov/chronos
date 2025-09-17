/**
 * ErrorHandler - Centralized error handling utilities
 * 
 * Provides consistent error handling patterns across the application:
 * - Error wrapping with context
 * - Structured error logging
 * - Async error handling
 * - Custom error types
 */

class ErrorHandler {
  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context information for error tracking
   * @returns {Promise} Result of the function or enhanced error
   */
  static async wrap(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      throw this.enhance(error, context);
    }
  }

  /**
   * Wrap an async function with error handling and logging
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context information
   * @returns {Promise} Result of the function or enhanced error
   */
  static async wrapWithLogging(fn, context = {}) {
    try {
      return await fn();
    } catch (error) {
      this.log(error, context);
      throw this.enhance(error, context);
    }
  }

  /**
   * Create a decorator for class methods
   * @param {Object} context - Context information
   * @returns {Function} Decorator function
   */
  static asyncMethod(context = {}) {
    return function(target, propertyKey, descriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function(...args) {
        const methodContext = {
          ...context,
          class: target.constructor.name,
          method: propertyKey,
          args: args.length
        };
        
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          ErrorHandler.log(error, methodContext);
          throw ErrorHandler.enhance(error, methodContext);
        }
      };
      
      return descriptor;
    };
  }

  /**
   * Enhance an error with additional context
   * @param {Error} error - Original error
   * @param {Object} context - Context to add
   * @returns {Error} Enhanced error
   */
  static enhance(error, context = {}) {
    // If already enhanced, add to context
    if (error.context) {
      error.context = { ...error.context, ...context };
    } else {
      error.context = context;
    }
    
    // Add timestamp if not present
    if (!error.timestamp) {
      error.timestamp = new Date().toISOString();
    }
    
    // Add stack trace parsing
    if (error.stack && !error.parsedStack) {
      error.parsedStack = this.parseStack(error.stack);
    }
    
    return error;
  }

  /**
   * Log an error with structured format
   * @param {Error} error - Error to log
   * @param {Object} context - Additional context
   */
  static log(error, context = {}) {
    const logEntry = {
      level: 'error',
      message: error.message,
      error: {
        name: error.name,
        code: error.code,
        stack: error.stack
      },
      context: { ...context, ...error.context },
      timestamp: error.timestamp || new Date().toISOString()
    };

    // In production, this would go to a logging service
    console.error(JSON.stringify(logEntry, null, 2));
  }

  /**
   * Parse error stack trace
   * @param {string} stack - Stack trace string
   * @returns {Array} Parsed stack frames
   */
  static parseStack(stack) {
    if (!stack) return [];
    
    return stack
      .split('\n')
      .slice(1) // Skip the error message
      .map(line => {
        const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
        if (match) {
          return {
            function: match[1],
            file: match[2],
            line: parseInt(match[3]),
            column: parseInt(match[4])
          };
        }
        return { raw: line.trim() };
      })
      .filter(frame => frame.file || frame.raw);
  }

  /**
   * Create a retry wrapper
   * @param {Function} fn - Function to retry
   * @param {Object} options - Retry options
   * @returns {Promise} Result after retries
   */
  static async retry(fn, options = {}) {
    const {
      maxAttempts = 3,
      delay = 1000,
      backoff = 2,
      shouldRetry = (error) => true,
      context = {}
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw this.enhance(error, {
            ...context,
            retry: {
              attempts: attempt,
              maxAttempts,
              final: true
            }
          });
        }
        
        // Wait before next attempt
        const waitTime = delay * Math.pow(backoff, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw lastError;
  }
}

/**
 * Base class for custom errors
 */
class CustomError extends Error {
  constructor(message, code, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error types
 */
class ValidationError extends CustomError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }
}

class AuthenticationError extends CustomError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR', 401);
  }
}

class NotFoundError extends CustomError {
  constructor(resource, id = null) {
    const message = id 
      ? `${resource} not found: ${id}`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404);
    this.resource = resource;
    this.resourceId = id;
  }
}

class ConfigurationError extends CustomError {
  constructor(message, configKey = null) {
    super(message, 'CONFIG_ERROR', 500);
    this.configKey = configKey;
  }
}

class ExternalServiceError extends CustomError {
  constructor(service, message, originalError = null) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 503);
    this.service = service;
    this.originalError = originalError;
  }
}

class RateLimitError extends CustomError {
  constructor(limit, window, retryAfter = null) {
    super(`Rate limit exceeded: ${limit} requests per ${window}`, 'RATE_LIMIT', 429);
    this.limit = limit;
    this.window = window;
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  ErrorHandler,
  CustomError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConfigurationError,
  ExternalServiceError,
  RateLimitError
};