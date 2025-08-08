/**
 * API endpoint to expose performance metrics
 */

import { getPerformanceMetrics, getRequestSummary, getDatabaseSummary, getSystemHealth } from '~/server/middleware/performance-monitor';
import { getErrorMetrics, getErrorSummary } from '~/server/middleware/error-handler';

export default defineEventHandler(async (event) => {
  try {
    // Get all metrics
    const [
      performance,
      requestSummary,
      databaseSummary,
      systemHealth,
      errorMetrics,
      errorSummary
    ] = await Promise.all([
      Promise.resolve(getPerformanceMetrics()),
      Promise.resolve(getRequestSummary()),
      Promise.resolve(getDatabaseSummary()),
      Promise.resolve(getSystemHealth()),
      Promise.resolve(getErrorMetrics()),
      Promise.resolve(getErrorSummary()),
    ]);

    return {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        performance,
        requests: requestSummary,
        database: databaseSummary,
        system: systemHealth,
        errors: {
          metrics: errorMetrics,
          summary: errorSummary,
        },
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve metrics',
      data: { error: error.message }
    });
  }
});