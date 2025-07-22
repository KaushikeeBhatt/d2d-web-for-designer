/**
 * Logger Utility
 * Provides structured logging with different levels and contexts
 * @module utils/logger
 */

import { format } from 'date-fns';

/**
 * Log levels with numeric priority
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[32m', // Green
  TRACE: '\x1b[37m', // White
  RESET: '\x1b[0m'
};

/**
 * Logger class for structured logging
 */
export class Logger {
  /**
   * Create a new logger instance
   * @param {string} context - Logger context (e.g., module name)
   * @param {Object} options - Logger options
   */
  constructor(context = 'App', options = {}) {
    this.context = context;
    this.options = {
      level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG'),
      useColors: process.env.NODE_ENV !== 'production',
      includeTimestamp: true,
      includeContext: true,
      ...options
    };
    
    // Convert string level to numeric
    this.minLevel = LOG_LEVELS[this.options.level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  /**
   * Format log message with metadata
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @returns {Object} Formatted log object
   */
  formatLog(level, message, data = null) {
    const log = {
      level,
      message,
      context: this.context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    };

    // Add data if present
    if (data !== null && data !== undefined) {
      if (data instanceof Error) {
        log.error = {
          name: data.name,
          message: data.message,
          stack: data.stack,
          ...data
        };
      } else {
        log.data = data;
      }
    }

    return log;
  }

  /**
   * Format message for console output
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @returns {string} Formatted console message
   */
  formatConsoleMessage(level, message, data) {
    const parts = [];
    
    // Add timestamp
    if (this.options.includeTimestamp) {
      const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
      parts.push(`[${timestamp}]`);
    }

    // Add level with color
    if (this.options.useColors) {
      parts.push(`${COLORS[level]}[${level}]${COLORS.RESET}`);
    } else {
      parts.push(`[${level}]`);
    }

    // Add context
    if (this.options.includeContext) {
      parts.push(`[${this.context}]`);
    }

    // Add message
    parts.push(message);

    // Format the base message
    let formattedMessage = parts.join(' ');

    // Add data if present
    if (data !== null && data !== undefined) {
      if (data instanceof Error) {
        formattedMessage += `\n${data.stack || data.message}`;
      } else if (typeof data === 'object') {
        try {
          formattedMessage += `\n${JSON.stringify(data, null, 2)}`;
        } catch (error) {
          formattedMessage += `\n[Circular or unserializable data]`;
        }
      } else {
        formattedMessage += ` ${data}`;
      }
    }

    return formattedMessage;
  }

  /**
   * Check if log level should be output
   * @param {string} level - Log level to check
   * @returns {boolean} Whether to output the log
   */
  shouldLog(level) {
    const levelValue = LOG_LEVELS[level];
    return levelValue !== undefined && levelValue <= this.minLevel;
  }

  /**
   * Output log to console or external service
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   */
  output(level, message, data) {
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      const logObject = this.formatLog(level, message, data);
      
      // In production, output JSON for log aggregation services
      if (process.env.NODE_ENV === 'production') {
        console.log(JSON.stringify(logObject));
      } else {
        // In development, use formatted console output
        const consoleMessage = this.formatConsoleMessage(level, message, data);
        
        switch (level) {
          case 'ERROR':
            console.error(consoleMessage);
            break;
          case 'WARN':
            console.warn(consoleMessage);
            break;
          case 'INFO':
            console.info(consoleMessage);
            break;
          case 'DEBUG':
          case 'TRACE':
            console.log(consoleMessage);
            break;
          default:
            console.log(consoleMessage);
        }
      }

      // Send to external logging service if configured
      if (process.env.EXTERNAL_LOGGING_ENDPOINT) {
        this.sendToExternalService(logObject);
      }
    } catch (error) {
      // Fallback if logging fails
      console.error('Logger error:', error);
      console.log(`[${level}] ${message}`, data);
    }
  }

  /**
   * Send logs to external service (e.g., Datadog, LogRocket)
   * @param {Object} logObject - Formatted log object
   */
  async sendToExternalService(logObject) {
    try {
      // Implementation depends on your logging service
      // Example: await fetch(process.env.EXTERNAL_LOGGING_ENDPOINT, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(logObject)
      // });
    } catch (error) {
      // Silently fail to avoid infinite loop
    }
  }

  /**
   * Log error message
   * @param {string} message - Error message
   * @param {*} error - Error object or additional data
   */
  error(message, error) {
    this.output('ERROR', message, error);
  }

  /**
   * Log warning message
   * @param {string} message - Warning message
   * @param {*} data - Additional data
   */
  warn(message, data) {
    this.output('WARN', message, data);
  }

  /**
   * Log info message
   * @param {string} message - Info message
   * @param {*} data - Additional data
   */
  info(message, data) {
    this.output('INFO', message, data);
  }

  /**
   * Log debug message
   * @param {string} message - Debug message
   * @param {*} data - Additional data
   */
  debug(message, data) {
    this.output('DEBUG', message, data);
  }

  /**
   * Log trace message
   * @param {string} message - Trace message
   * @param {*} data - Additional data
   */
  trace(message, data) {
    this.output('TRACE', message, data);
  }

  /**
   * Create a child logger with additional context
   * @param {string} childContext - Additional context
   * @returns {Logger} New logger instance
   */
  child(childContext) {
    return new Logger(`${this.context}:${childContext}`, this.options);
  }

  /**
   * Measure execution time of a function
   * @param {string} operation - Operation name
   * @param {Function} fn - Function to measure
   * @returns {*} Function result
   */
  async time(operation, fn) {
    const startTime = Date.now();
    const startMark = `${this.context}:${operation}:start`;
    const endMark = `${this.context}:${operation}:end`;

    try {
      if (typeof performance !== 'undefined') {
        performance.mark(startMark);
      }

      this.debug(`${operation} started`);
      const result = await fn();
      const duration = Date.now() - startTime;

      if (typeof performance !== 'undefined') {
        performance.mark(endMark);
        performance.measure(operation, startMark, endMark);
      }

      this.info(`${operation} completed`, { duration: `${duration}ms` });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.error(`${operation} failed`, { duration: `${duration}ms`, error });
      throw error;
    }
  }

  /**
   * Log API request
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  logRequest(req, res) {
    const requestData = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: req.query,
      ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress
    };

    // Log request start
    this.info('API Request', requestData);

    // Log response when finished
    const originalSend = res.send;
    res.send = function(data) {
      res.send = originalSend;
      const responseData = {
        statusCode: res.statusCode,
        duration: Date.now() - req._startTime
      };
      
      if (res.statusCode >= 400) {
        this.error('API Response Error', { ...requestData, ...responseData, body: data });
      } else {
        this.info('API Response', responseData);
      }
      
      return res.send(data);
    }.bind(this);
  }
}

/**
 * Create a default logger instance
 */
export const logger = new Logger();

/**
 * Express middleware for request logging
 */
export function requestLogger(context = 'API') {
  const reqLogger = new Logger(context);
  
  return (req, res, next) => {
    req._startTime = Date.now();
    reqLogger.logRequest(req, res);
    next();
  };
}

export default Logger;