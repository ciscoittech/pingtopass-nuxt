/**
 * Performance Monitoring Middleware for PingToPass
 * Tracks request timing, database queries, and system metrics
 */

import type { H3Event } from 'h3';
import { logger, Logger, PerformanceTimer, getMemoryUsage } from '../utils/logger';

export interface RequestMetrics {
  totalRequests: number;
  avgResponseTime: number;
  slowRequests: number;
  fastRequests: number;
  requestsByPath: Record<string, number>;
  requestsByMethod: Record<string, number>;
  responseTimesByPath: Record<string, { total: number; count: number; avg: number }>;
}

export interface DatabaseMetrics {
  totalQueries: number;
  avgQueryTime: number;
  slowQueries: number;
  queriesByTable: Record<string, number>;
  queryTimesByTable: Record<string, { total: number; count: number; avg: number }>;
}

export interface SystemMetrics {
  memoryUsage?: number;
  cpuUsage?: number;
  uptime: number;
  activeConnections: number;
  cacheHitRate: number;
  cacheMissRate: number;
}

// In-memory metrics storage (reset on worker restart)
const requestMetrics: RequestMetrics = {
  totalRequests: 0,
  avgResponseTime: 0,
  slowRequests: 0,
  fastRequests: 0,
  requestsByPath: {},
  requestsByMethod: {},
  responseTimesByPath: {},
};

const databaseMetrics: DatabaseMetrics = {
  totalQueries: 0,
  avgQueryTime: 0,
  slowQueries: 0,
  queriesByTable: {},
  queryTimesByTable: {},
};

const systemMetrics: SystemMetrics = {
  uptime: Date.now(),
  activeConnections: 0,
  cacheHitRate: 0,
  cacheMissRate: 0,
};

let totalResponseTime = 0;
let totalQueryTime = 0;
let cacheHits = 0;
let cacheMisses = 0;

// Thresholds (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
const FAST_REQUEST_THRESHOLD = 200;  // 200ms
const SLOW_QUERY_THRESHOLD = 100;    // 100ms

export default defineEventHandler(async (event) => {
  const timer = new PerformanceTimer();
  const requestLogger = logger.withContext(Logger.extractRequestContext(event));
  const url = getRequestURL(event);
  const method = event.node.req.method || 'GET';
  
  // Track active connections
  systemMetrics.activeConnections++;
  
  // Set up performance tracking context
  event.context.performanceTimer = timer;
  event.context.dbQueries = [];
  event.context.cacheOps = { hits: 0, misses: 0 };
  
  timer.mark('request_start');
  
  try {
    // Track request start
    trackRequestStart(url.pathname, method);
    
    // Continue to next handler
    return;
  } finally {
    // Track request completion
    timer.mark('request_end');
    const duration = timer.getDuration();
    
    // Update metrics
    updateRequestMetrics(url.pathname, method, duration);
    updateSystemMetrics();
    
    // Log performance data
    requestLogger.apiRequest(event, Date.now() - duration, event.node.res.statusCode || 200);
    
    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      requestLogger.warn('Slow request detected', {
        path: url.pathname,
        method,
        duration,
        threshold: SLOW_REQUEST_THRESHOLD,
      });
    }
    
    // Decrement active connections
    systemMetrics.activeConnections--;
  }
});

/**
 * Track the start of a request
 */
function trackRequestStart(path: string, method: string) {
  requestMetrics.totalRequests++;
  requestMetrics.requestsByPath[path] = (requestMetrics.requestsByPath[path] || 0) + 1;
  requestMetrics.requestsByMethod[method] = (requestMetrics.requestsByMethod[method] || 0) + 1;
}

/**
 * Update request metrics after completion
 */
function updateRequestMetrics(path: string, method: string, duration: number) {
  totalResponseTime += duration;
  requestMetrics.avgResponseTime = totalResponseTime / requestMetrics.totalRequests;
  
  // Track response times by path
  if (!requestMetrics.responseTimesByPath[path]) {
    requestMetrics.responseTimesByPath[path] = { total: 0, count: 0, avg: 0 };
  }
  
  const pathMetrics = requestMetrics.responseTimesByPath[path];
  pathMetrics.total += duration;
  pathMetrics.count++;
  pathMetrics.avg = pathMetrics.total / pathMetrics.count;
  
  // Categorize request speed
  if (duration > SLOW_REQUEST_THRESHOLD) {
    requestMetrics.slowRequests++;
  } else if (duration < FAST_REQUEST_THRESHOLD) {
    requestMetrics.fastRequests++;
  }
}

/**
 * Update system-level metrics
 */
function updateSystemMetrics() {
  systemMetrics.memoryUsage = getMemoryUsage();
  systemMetrics.uptime = Date.now() - systemMetrics.uptime;
  
  // Update cache hit/miss rates
  const totalCacheOps = cacheHits + cacheMisses;
  if (totalCacheOps > 0) {
    systemMetrics.cacheHitRate = (cacheHits / totalCacheOps) * 100;
    systemMetrics.cacheMissRate = (cacheMisses / totalCacheOps) * 100;
  }
}

/**
 * Track database query performance
 */
export function trackDatabaseQuery(
  table: string,
  operation: string,
  duration: number,
  recordsAffected?: number,
  event?: H3Event
) {
  databaseMetrics.totalQueries++;
  totalQueryTime += duration;
  databaseMetrics.avgQueryTime = totalQueryTime / databaseMetrics.totalQueries;
  
  // Track queries by table
  databaseMetrics.queriesByTable[table] = (databaseMetrics.queriesByTable[table] || 0) + 1;
  
  // Track query times by table
  if (!databaseMetrics.queryTimesByTable[table]) {
    databaseMetrics.queryTimesByTable[table] = { total: 0, count: 0, avg: 0 };
  }
  
  const tableMetrics = databaseMetrics.queryTimesByTable[table];
  tableMetrics.total += duration;
  tableMetrics.count++;
  tableMetrics.avg = tableMetrics.total / tableMetrics.count;
  
  // Track slow queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    databaseMetrics.slowQueries++;
    
    // Log slow query
    if (event?.context.logger) {
      event.context.logger.warn('Slow database query detected', {
        table,
        operation,
        duration,
        threshold: SLOW_QUERY_THRESHOLD,
        recordsAffected,
      });
    }
  }
  
  // Add to event context for request-level tracking
  if (event?.context.dbQueries) {
    event.context.dbQueries.push({
      table,
      operation,
      duration,
      recordsAffected,
    });
  }
  
  // Log the query
  if (event?.context.logger) {
    event.context.logger.database(operation, table, duration, recordsAffected);
  }
}

/**
 * Track cache operations
 */
export function trackCacheHit(key: string, event?: H3Event) {
  cacheHits++;
  if (event?.context.cacheOps) {
    event.context.cacheOps.hits++;
  }
}

export function trackCacheMiss(key: string, event?: H3Event) {
  cacheMisses++;
  if (event?.context.cacheOps) {
    event.context.cacheOps.misses++;
  }
}

/**
 * Get current performance metrics
 */
export function getPerformanceMetrics() {
  return {
    timestamp: new Date().toISOString(),
    requests: { ...requestMetrics },
    database: { ...databaseMetrics },
    system: { ...systemMetrics },
    thresholds: {
      slowRequest: SLOW_REQUEST_THRESHOLD,
      fastRequest: FAST_REQUEST_THRESHOLD,
      slowQuery: SLOW_QUERY_THRESHOLD,
    },
  };
}

/**
 * Get request performance summary
 */
export function getRequestSummary() {
  const now = new Date().toISOString();
  const slowRequestRate = (requestMetrics.slowRequests / Math.max(requestMetrics.totalRequests, 1)) * 100;
  const fastRequestRate = (requestMetrics.fastRequests / Math.max(requestMetrics.totalRequests, 1)) * 100;
  
  // Get top slow endpoints
  const slowEndpoints = Object.entries(requestMetrics.responseTimesByPath)
    .filter(([, metrics]) => metrics.avg > SLOW_REQUEST_THRESHOLD)
    .sort(([, a], [, b]) => b.avg - a.avg)
    .slice(0, 10);
  
  // Get busiest endpoints
  const busiestEndpoints = Object.entries(requestMetrics.requestsByPath)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  return {
    timestamp: now,
    summary: {
      totalRequests: requestMetrics.totalRequests,
      avgResponseTime: Math.round(requestMetrics.avgResponseTime),
      slowRequestRate: Math.round(slowRequestRate * 100) / 100,
      fastRequestRate: Math.round(fastRequestRate * 100) / 100,
      activeConnections: systemMetrics.activeConnections,
    },
    slowEndpoints: slowEndpoints.map(([path, metrics]) => ({
      path,
      avgTime: Math.round(metrics.avg),
      requests: metrics.count,
    })),
    busiestEndpoints: busiestEndpoints.map(([path, count]) => ({
      path,
      requests: count,
      avgTime: Math.round(requestMetrics.responseTimesByPath[path]?.avg || 0),
    })),
  };
}

/**
 * Get database performance summary
 */
export function getDatabaseSummary() {
  const now = new Date().toISOString();
  const slowQueryRate = (databaseMetrics.slowQueries / Math.max(databaseMetrics.totalQueries, 1)) * 100;
  
  // Get slowest tables
  const slowestTables = Object.entries(databaseMetrics.queryTimesByTable)
    .filter(([, metrics]) => metrics.avg > SLOW_QUERY_THRESHOLD)
    .sort(([, a], [, b]) => b.avg - a.avg)
    .slice(0, 10);
  
  // Get busiest tables
  const busiestTables = Object.entries(databaseMetrics.queriesByTable)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  return {
    timestamp: now,
    summary: {
      totalQueries: databaseMetrics.totalQueries,
      avgQueryTime: Math.round(databaseMetrics.avgQueryTime * 100) / 100,
      slowQueryRate: Math.round(slowQueryRate * 100) / 100,
      slowQueries: databaseMetrics.slowQueries,
    },
    slowestTables: slowestTables.map(([table, metrics]) => ({
      table,
      avgTime: Math.round(metrics.avg * 100) / 100,
      queries: metrics.count,
    })),
    busiestTables: busiestTables.map(([table, count]) => ({
      table,
      queries: count,
      avgTime: Math.round(databaseMetrics.queryTimesByTable[table]?.avg || 0),
    })),
  };
}

/**
 * Get system health status
 */
export function getSystemHealth() {
  const now = new Date().toISOString();
  const uptime = Date.now() - systemMetrics.uptime;
  
  return {
    timestamp: now,
    status: determineHealthStatus(),
    uptime: {
      milliseconds: uptime,
      seconds: Math.floor(uptime / 1000),
      minutes: Math.floor(uptime / 60000),
      hours: Math.floor(uptime / 3600000),
    },
    memory: {
      usage: systemMetrics.memoryUsage,
      status: systemMetrics.memoryUsage ? getMemoryStatus(systemMetrics.memoryUsage) : 'unknown',
    },
    cache: {
      hitRate: Math.round(systemMetrics.cacheHitRate * 100) / 100,
      missRate: Math.round(systemMetrics.cacheMissRate * 100) / 100,
      status: getCacheStatus(systemMetrics.cacheHitRate),
    },
    connections: {
      active: systemMetrics.activeConnections,
      status: getConnectionStatus(systemMetrics.activeConnections),
    },
  };
}

/**
 * Determine overall system health status
 */
function determineHealthStatus(): 'healthy' | 'degraded' | 'critical' {
  const slowRequestRate = (requestMetrics.slowRequests / Math.max(requestMetrics.totalRequests, 1)) * 100;
  const slowQueryRate = (databaseMetrics.slowQueries / Math.max(databaseMetrics.totalQueries, 1)) * 100;
  
  if (slowRequestRate > 20 || slowQueryRate > 30 || systemMetrics.activeConnections > 1000) {
    return 'critical';
  }
  if (slowRequestRate > 10 || slowQueryRate > 15 || systemMetrics.activeConnections > 500) {
    return 'degraded';
  }
  return 'healthy';
}

/**
 * Get memory status
 */
function getMemoryStatus(usage: number): 'low' | 'moderate' | 'high' | 'critical' {
  const MB = 1024 * 1024;
  if (usage > 100 * MB) return 'critical';
  if (usage > 50 * MB) return 'high';
  if (usage > 25 * MB) return 'moderate';
  return 'low';
}

/**
 * Get cache performance status
 */
function getCacheStatus(hitRate: number): 'excellent' | 'good' | 'poor' | 'critical' {
  if (hitRate >= 90) return 'excellent';
  if (hitRate >= 75) return 'good';
  if (hitRate >= 50) return 'poor';
  return 'critical';
}

/**
 * Get connection status
 */
function getConnectionStatus(active: number): 'low' | 'moderate' | 'high' | 'critical' {
  if (active > 1000) return 'critical';
  if (active > 500) return 'high';
  if (active > 100) return 'moderate';
  return 'low';
}

/**
 * Reset all metrics (useful for testing or periodic resets)
 */
export function resetMetrics() {
  // Reset request metrics
  requestMetrics.totalRequests = 0;
  requestMetrics.avgResponseTime = 0;
  requestMetrics.slowRequests = 0;
  requestMetrics.fastRequests = 0;
  requestMetrics.requestsByPath = {};
  requestMetrics.requestsByMethod = {};
  requestMetrics.responseTimesByPath = {};
  
  // Reset database metrics
  databaseMetrics.totalQueries = 0;
  databaseMetrics.avgQueryTime = 0;
  databaseMetrics.slowQueries = 0;
  databaseMetrics.queriesByTable = {};
  databaseMetrics.queryTimesByTable = {};
  
  // Reset system metrics
  systemMetrics.uptime = Date.now();
  systemMetrics.activeConnections = 0;
  systemMetrics.cacheHitRate = 0;
  systemMetrics.cacheMissRate = 0;
  
  // Reset counters
  totalResponseTime = 0;
  totalQueryTime = 0;
  cacheHits = 0;
  cacheMisses = 0;
}