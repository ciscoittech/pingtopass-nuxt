/**
 * Health check endpoint with detailed system status
 */

import { getSystemHealth } from '../../middleware/performance-monitor';
import { getErrorSummary } from '../../middleware/error-handler';
import { getDB, sql } from '../../utils/database';

export default defineEventHandler(async (event) => {
  const startTime = Date.now();
  const checks: Record<string, any> = {};
  let overallStatus = 'healthy';

  try {
    // Database connectivity check
    try {
      const dbStart = Date.now();
      const db = getDB();
      await db.run(sql`SELECT 1`);
      checks.database = {
        status: 'healthy',
        responseTime: Date.now() - dbStart,
        message: 'Database connection successful',
      };
    } catch (error: any) {
      checks.database = {
        status: 'critical',
        responseTime: Date.now() - startTime,
        message: `Database connection failed: ${error.message}`,
      };
      overallStatus = 'critical';
    }

    // System health check
    try {
      const systemHealth = getSystemHealth();
      checks.system = {
        status: systemHealth.status,
        uptime: systemHealth.uptime,
        memory: systemHealth.memory,
        cache: systemHealth.cache,
        connections: systemHealth.connections,
      };

      if (systemHealth.status === 'critical') {
        overallStatus = 'critical';
      } else if (systemHealth.status === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error: any) {
      checks.system = {
        status: 'critical',
        message: `System health check failed: ${error.message}`,
      };
      overallStatus = 'critical';
    }

    // Error rate check
    try {
      const errorSummary = getErrorSummary();
      checks.errors = {
        status: errorSummary.healthStatus,
        errorRate: errorSummary.errorRate,
        criticalErrors: errorSummary.criticalErrors,
        totalRequests: errorSummary.totalRequests,
      };

      if (errorSummary.healthStatus === 'critical') {
        overallStatus = 'critical';
      } else if (errorSummary.healthStatus === 'degraded' && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error: any) {
      checks.errors = {
        status: 'unknown',
        message: `Error metrics check failed: ${error.message}`,
      };
    }

    // Environment checks
    checks.environment = {
      status: 'healthy',
      nodeVersion: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV || 'development',
    };

    // Configuration checks
    const configIssues = [];
    if (!process.env.TURSO_DATABASE_URL) {
      configIssues.push('TURSO_DATABASE_URL not configured');
    }
    if (!process.env.JWT_SECRET) {
      configIssues.push('JWT_SECRET not configured');
    }

    checks.configuration = {
      status: configIssues.length === 0 ? 'healthy' : 'degraded',
      issues: configIssues,
    };

    if (configIssues.length > 0 && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }

    const responseTime = Date.now() - startTime;

    return {
      timestamp: new Date().toISOString(),
      status: overallStatus,
      responseTime,
      version: process.env.NUXT_PUBLIC_APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      checks,
      summary: {
        healthy: Object.values(checks).filter((check: any) => check.status === 'healthy').length,
        degraded: Object.values(checks).filter((check: any) => check.status === 'degraded').length,
        critical: Object.values(checks).filter((check: any) => check.status === 'critical').length,
        total: Object.keys(checks).length,
      },
    };
  } catch (error: any) {
    return {
      timestamp: new Date().toISOString(),
      status: 'critical',
      responseTime: Date.now() - startTime,
      error: error.message,
      checks: {
        general: {
          status: 'critical',
          message: `Health check failed: ${error.message}`,
        },
      },
    };
  }
});