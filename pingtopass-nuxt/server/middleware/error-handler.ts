/**
 * Global Error Handler Middleware for PingToPass
 * Captures and logs all unhandled errors with context
 */

import type { H3Event, H3Error } from 'h3';
import { logger, Logger, LogLevel } from '~/server/utils/logger';

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError: string;
  errorsByType: Record<string, number>;
  criticalErrors: number;
}

// In-memory error tracking (reset on worker restart)
const errorMetrics: ErrorMetrics = {
  errorCount: 0,
  errorRate: 0,
  lastError: '',
  errorsByType: {},
  criticalErrors: 0,
};

let requestCount = 0;

export default defineEventHandler(async (event) => {
  const requestLogger = logger.withContext(Logger.extractRequestContext(event));
  requestCount++;

  // Set up error handling for this request
  event.context.logger = requestLogger;
  event.context.startTime = Date.now();

  try {
    // Continue to next handler
    return;
  } catch (error: any) {
    return handleError(error, event, requestLogger);
  }
});

/**
 * Handle different types of errors
 */
function handleError(error: any, event: H3Event, requestLogger: ReturnType<typeof logger.withContext>) {
  const errorType = getErrorType(error);
  const statusCode = getStatusCode(error);
  const context = Logger.extractRequestContext(event);
  
  // Update error metrics
  updateErrorMetrics(error, errorType);
  
  // Log error with appropriate level
  if (statusCode >= 500) {
    requestLogger.critical('Server error occurred', error, {
      ...context,
      statusCode,
      errorType,
    });
  } else if (statusCode >= 400) {
    requestLogger.warn('Client error occurred', {
      ...context,
      statusCode,
      errorType,
      errorMessage: error.message,
    });
  } else {
    requestLogger.error('Unexpected error occurred', error, {
      ...context,
      statusCode,
      errorType,
    });
  }

  // Send appropriate error response
  return createErrorResponse(error, statusCode, event);
}

/**
 * Determine error type for categorization
 */
function getErrorType(error: any): string {
  if (error.name) {
    return error.name;
  }
  
  if (error.statusCode) {
    if (error.statusCode >= 500) return 'ServerError';
    if (error.statusCode >= 400) return 'ClientError';
  }
  
  if (error.message) {
    if (error.message.includes('database') || error.message.includes('sql')) return 'DatabaseError';
    if (error.message.includes('auth') || error.message.includes('token')) return 'AuthError';
    if (error.message.includes('validation')) return 'ValidationError';
    if (error.message.includes('network') || error.message.includes('fetch')) return 'NetworkError';
  }
  
  return 'UnknownError';
}

/**
 * Get HTTP status code from error
 */
function getStatusCode(error: any): number {
  if (error.statusCode) return error.statusCode;
  if (error.status) return error.status;
  
  // Default status codes based on error type
  const errorType = getErrorType(error);
  switch (errorType) {
    case 'ValidationError':
    case 'BadRequestError':
      return 400;
    case 'AuthError':
    case 'UnauthorizedError':
      return 401;
    case 'ForbiddenError':
      return 403;
    case 'NotFoundError':
      return 404;
    case 'ConflictError':
      return 409;
    case 'RateLimitError':
      return 429;
    case 'DatabaseError':
    case 'NetworkError':
    case 'ServerError':
      return 500;
    default:
      return 500;
  }
}

/**
 * Update error metrics
 */
function updateErrorMetrics(error: any, errorType: string) {
  errorMetrics.errorCount++;
  errorMetrics.lastError = new Date().toISOString();
  errorMetrics.errorsByType[errorType] = (errorMetrics.errorsByType[errorType] || 0) + 1;
  
  if (getStatusCode(error) >= 500) {
    errorMetrics.criticalErrors++;
  }
  
  // Calculate error rate (errors per 100 requests)
  errorMetrics.errorRate = (errorMetrics.errorCount / Math.max(requestCount, 1)) * 100;
}

/**
 * Create appropriate error response
 */
function createErrorResponse(error: any, statusCode: number, event: H3Event) {
  const isProduction = process.env.NODE_ENV === 'production';
  const errorType = getErrorType(error);
  
  // Base response
  const response: any = {
    error: true,
    statusCode,
    type: errorType,
    timestamp: new Date().toISOString(),
    path: getRequestURL(event).pathname,
  };

  // Add user-friendly message
  response.message = getUserFriendlyMessage(statusCode, errorType);
  
  // Add trace ID for debugging
  const headers = getHeaders(event);
  if (headers['cf-ray']) {
    response.traceId = headers['cf-ray'];
  }

  // Add detailed error info in development
  if (!isProduction) {
    response.details = {
      originalMessage: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  // Set response status and headers
  setResponseStatus(event, statusCode);
  setResponseHeaders(event, {
    'Content-Type': 'application/json',
    'X-Error-Type': errorType,
  });

  return response;
}

/**
 * Get user-friendly error messages
 */
function getUserFriendlyMessage(statusCode: number, errorType: string): string {
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please log in and try again.';
    case 403:
      return 'Access denied. You don\'t have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'Conflict detected. The resource already exists or is in use.';
    case 429:
      return 'Too many requests. Please slow down and try again later.';
    case 500:
      if (errorType === 'DatabaseError') {
        return 'Database temporarily unavailable. Please try again in a moment.';
      }
      if (errorType === 'NetworkError') {
        return 'Network error occurred. Please check your connection and try again.';
      }
      return 'An unexpected error occurred. Our team has been notified.';
    case 503:
      return 'Service temporarily unavailable. Please try again later.';
    default:
      return 'An error occurred while processing your request.';
  }
}

/**
 * Get current error metrics
 */
export function getErrorMetrics(): ErrorMetrics {
  return { ...errorMetrics };
}

/**
 * Reset error metrics (useful for testing or periodic resets)
 */
export function resetErrorMetrics() {
  errorMetrics.errorCount = 0;
  errorMetrics.errorRate = 0;
  errorMetrics.lastError = '';
  errorMetrics.errorsByType = {};
  errorMetrics.criticalErrors = 0;
  requestCount = 0;
}

/**
 * Check if error rates are above threshold
 */
export function isErrorRateHigh(threshold: number = 5): boolean {
  return errorMetrics.errorRate > threshold;
}

/**
 * Check if critical error count is concerning
 */
export function hasCriticalErrors(threshold: number = 10): boolean {
  return errorMetrics.criticalErrors > threshold;
}

/**
 * Get error summary for monitoring
 */
export function getErrorSummary() {
  const now = new Date().toISOString();
  const topErrors = Object.entries(errorMetrics.errorsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return {
    timestamp: now,
    totalRequests: requestCount,
    totalErrors: errorMetrics.errorCount,
    errorRate: Math.round(errorMetrics.errorRate * 100) / 100,
    criticalErrors: errorMetrics.criticalErrors,
    topErrorTypes: topErrors.map(([type, count]) => ({ type, count })),
    lastError: errorMetrics.lastError,
    healthStatus: getHealthStatus(),
  };
}

/**
 * Determine overall health status based on error metrics
 */
function getHealthStatus(): 'healthy' | 'degraded' | 'critical' {
  if (errorMetrics.criticalErrors > 20 || errorMetrics.errorRate > 10) {
    return 'critical';
  }
  if (errorMetrics.criticalErrors > 5 || errorMetrics.errorRate > 3) {
    return 'degraded';
  }
  return 'healthy';
}