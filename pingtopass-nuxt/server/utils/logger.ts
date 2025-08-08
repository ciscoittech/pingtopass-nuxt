/**
 * Structured Logging Utility for PingToPass
 * Optimized for Cloudflare Workers with JSON output for Logpush
 */

import type { H3Event } from 'h3';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export interface LogContext {
  traceId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  path?: string;
  method?: string;
  examId?: string;
  questionId?: string;
  [key: string]: any;
}

export interface PerformanceMetrics {
  duration: number;
  memoryUsage?: number;
  cpuTime?: number;
  dbQueryCount?: number;
  dbQueryTime?: number;
  cacheHits?: number;
  cacheMisses?: number;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  performance?: PerformanceMetrics;
  metadata?: Record<string, any>;
}

class Logger {
  private defaultContext: LogContext = {};
  private isProduction = process.env.NODE_ENV === 'production';

  constructor() {
    // Set global context
    this.defaultContext = {
      service: 'pingtopass-nuxt',
      version: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  /**
   * Create a logger instance with request context
   */
  withContext(context: LogContext): Logger {
    const logger = new Logger();
    logger.defaultContext = { ...this.defaultContext, ...context };
    return logger;
  }

  /**
   * Extract context from H3 event
   */
  static extractRequestContext(event: H3Event): LogContext {
    const headers = getHeaders(event);
    const url = getRequestURL(event);
    
    return {
      traceId: headers['cf-ray'] || headers['x-trace-id'] || generateTraceId(),
      requestId: headers['cf-request-id'] || generateRequestId(),
      path: url.pathname,
      method: event.node.req.method,
      userAgent: headers['user-agent'],
      ip: getClientIP(event),
      country: headers['cf-ipcountry'],
      region: headers['cf-region'],
    };
  }

  /**
   * Main logging method
   */
  private log(level: LogLevel, message: string, context?: LogContext, error?: Error, performance?: PerformanceMetrics, metadata?: Record<string, any>) {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
    };

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: this.isProduction ? undefined : error.stack,
        cause: error.cause,
      };
    }

    if (performance) {
      logEntry.performance = performance;
    }

    if (metadata) {
      logEntry.metadata = metadata;
    }

    // Output structured JSON for Cloudflare Logpush
    const output = JSON.stringify(logEntry);
    
    // Use appropriate console method
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(output);
        break;
      default:
        console.log(output);
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>) {
    if (!this.isProduction || process.env.DEBUG === 'true') {
      this.log(LogLevel.DEBUG, message, context, undefined, undefined, metadata);
    }
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context, undefined, undefined, metadata);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context, undefined, undefined, metadata);
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context, error, undefined, metadata);
  }

  critical(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.CRITICAL, message, context, error, undefined, metadata);
  }

  /**
   * Log performance metrics
   */
  performance(message: string, metrics: PerformanceMetrics, context?: LogContext) {
    this.log(LogLevel.INFO, message, context, undefined, metrics);
  }

  /**
   * Log security events
   */
  security(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.WARN, `SECURITY: ${message}`, {
      ...context,
      securityEvent: true,
    }, undefined, undefined, metadata);
  }

  /**
   * Log business events (user actions, transactions, etc.)
   */
  business(message: string, context?: LogContext, metadata?: Record<string, any>) {
    this.log(LogLevel.INFO, `BUSINESS: ${message}`, {
      ...context,
      businessEvent: true,
    }, undefined, undefined, metadata);
  }

  /**
   * Log API requests
   */
  apiRequest(event: H3Event, startTime: number, statusCode: number, responseSize?: number) {
    const duration = Date.now() - startTime;
    const context = Logger.extractRequestContext(event);
    
    this.performance('API request completed', {
      duration,
    }, {
      ...context,
      statusCode,
      responseSize,
      apiRequest: true,
    });
  }

  /**
   * Log database operations
   */
  database(operation: string, table: string, duration: number, recordsAffected?: number, context?: LogContext) {
    this.performance(`Database ${operation} on ${table}`, {
      duration,
      dbQueryCount: 1,
      dbQueryTime: duration,
    }, {
      ...context,
      database: {
        operation,
        table,
        recordsAffected,
      },
    });
  }

  /**
   * Log authentication events
   */
  auth(event: string, userId?: string, success: boolean = true, context?: LogContext) {
    const level = success ? LogLevel.INFO : LogLevel.WARN;
    this.log(level, `Authentication ${event}`, {
      ...context,
      userId,
      authEvent: event,
      success,
    });
  }

  /**
   * Log exam-specific events
   */
  exam(event: string, examId: string, userId?: string, context?: LogContext, metadata?: Record<string, any>) {
    this.business(`Exam ${event}`, {
      ...context,
      examId,
      userId,
      examEvent: event,
    }, metadata);
  }
}

/**
 * Utility functions
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  mark(name: string) {
    this.marks.set(name, Date.now());
  }

  getDuration(name?: string): number {
    const endTime = name ? this.marks.get(name) : Date.now();
    return endTime ? endTime - this.startTime : 0;
  }

  getMarkDuration(startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : Date.now();
    
    if (!start || !end) return 0;
    return end - start;
  }

  getMetrics(): PerformanceMetrics {
    return {
      duration: this.getDuration(),
      // Add memory usage if available in Workers environment
      memoryUsage: (performance as any)?.memory?.usedJSHeapSize,
    };
  }
}

/**
 * Memory usage tracking
 */
export function getMemoryUsage(): number | undefined {
  try {
    // Try to get memory usage from Workers environment
    return (performance as any)?.memory?.usedJSHeapSize;
  } catch {
    return undefined;
  }
}

// Create default logger instance
export const logger = new Logger();

// Export commonly used functions
export const createLogger = (context?: LogContext) => 
  context ? logger.withContext(context) : logger;

export default logger;