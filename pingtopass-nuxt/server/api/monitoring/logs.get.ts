/**
 * API endpoint to retrieve recent logs (from memory buffer)
 */

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: any;
  error?: any;
  performance?: any;
}

// In-memory log buffer (last 1000 entries)
const logBuffer: LogEntry[] = [];
const MAX_LOGS = 1000;

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const limit = Math.min(Number(query.limit) || 100, 500);
    const level = query.level as string;
    const search = query.search as string;
    const since = query.since as string;

    let filteredLogs = [...logBuffer];

    // Filter by level
    if (level) {
      filteredLogs = filteredLogs.filter(log => 
        log.level.toLowerCase() === level.toLowerCase()
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = filteredLogs.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.context || {}).toLowerCase().includes(searchLower)
      );
    }

    // Filter by timestamp
    if (since) {
      const sinceDate = new Date(since);
      filteredLogs = filteredLogs.filter(log =>
        new Date(log.timestamp) >= sinceDate
      );
    }

    // Sort by timestamp (newest first) and limit
    const logs = filteredLogs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    return {
      timestamp: new Date().toISOString(),
      status: 'success',
      data: {
        logs,
        meta: {
          total: filteredLogs.length,
          returned: logs.length,
          bufferSize: logBuffer.length,
          maxBufferSize: MAX_LOGS,
        },
      },
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve logs',
      data: { error: error.message }
    });
  }
});

/**
 * Add log entry to buffer (called by logger utility)
 */
export function addLogEntry(entry: LogEntry) {
  logBuffer.push(entry);
  
  // Maintain buffer size
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift(); // Remove oldest entry
  }
}

/**
 * Clear log buffer
 */
export function clearLogBuffer() {
  logBuffer.length = 0;
}

/**
 * Get log statistics
 */
export function getLogStats() {
  const levelCounts: Record<string, number> = {};
  const recentLogs = logBuffer.slice(-100); // Last 100 logs
  
  for (const log of logBuffer) {
    levelCounts[log.level] = (levelCounts[log.level] || 0) + 1;
  }
  
  return {
    totalLogs: logBuffer.length,
    levelCounts,
    recentActivity: recentLogs.length,
    oldestLog: logBuffer[0]?.timestamp,
    newestLog: logBuffer[logBuffer.length - 1]?.timestamp,
  };
}