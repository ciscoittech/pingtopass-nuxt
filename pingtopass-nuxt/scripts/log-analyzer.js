#!/usr/bin/env node

/**
 * Log Analyzer for PingToPass
 * Analyzes Cloudflare Workers logs for patterns, issues, and insights
 */

const fs = require('fs');
const path = require('path');
const { createReadStream } = require('fs');
const { createInterface } = require('readline');

class LogAnalyzer {
  constructor() {
    this.stats = {
      totalLogs: 0,
      logsByLevel: {},
      errorsByType: {},
      slowRequests: [],
      frequentErrors: {},
      performanceIssues: [],
      securityEvents: [],
      timeseriesData: {},
      userPatterns: {},
      endpointStats: {},
    };
    
    this.config = {
      slowRequestThreshold: 1000, // 1 second
      errorRateThreshold: 5, // 5%
      timeWindow: 3600000, // 1 hour in milliseconds
    };
  }

  /**
   * Analyze logs from file or stdin
   */
  async analyzeLogs(logSource) {
    console.log('🔍 Starting log analysis...');
    
    const reader = this.createLogReader(logSource);
    
    for await (const line of reader) {
      try {
        const logEntry = JSON.parse(line);
        this.processLogEntry(logEntry);
      } catch (error) {
        // Skip invalid JSON lines
        continue;
      }
    }
    
    this.generateReport();
  }

  /**
   * Create log reader (file or stdin)
   */
  createLogReader(logSource) {
    if (logSource && fs.existsSync(logSource)) {
      console.log(`Reading logs from file: ${logSource}`);
      return createInterface({
        input: createReadStream(logSource),
        crlfDelay: Infinity
      });
    } else {
      console.log('Reading logs from stdin...');
      return createInterface({
        input: process.stdin,
        crlfDelay: Infinity
      });
    }
  }

  /**
   * Process individual log entry
   */
  processLogEntry(logEntry) {
    this.stats.totalLogs++;
    
    // Count by level
    const level = logEntry.level || 'unknown';
    this.stats.logsByLevel[level] = (this.stats.logsByLevel[level] || 0) + 1;
    
    // Track errors
    if (logEntry.error) {
      this.processError(logEntry);
    }
    
    // Track performance
    if (logEntry.performance) {
      this.processPerformance(logEntry);
    }
    
    // Track security events
    if (logEntry.context?.securityEvent) {
      this.processSecurityEvent(logEntry);
    }
    
    // Track API requests
    if (logEntry.context?.apiRequest) {
      this.processApiRequest(logEntry);
    }
    
    // Track user patterns
    if (logEntry.context?.userId) {
      this.processUserActivity(logEntry);
    }
    
    // Track business events
    if (logEntry.context?.businessEvent) {
      this.processBusinessEvent(logEntry);
    }
    
    // Track time-series data
    this.processTimeSeries(logEntry);
  }

  /**
   * Process error log entry
   */
  processError(logEntry) {
    const errorType = logEntry.error.name || 'UnknownError';
    this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
    
    // Track frequent error messages
    const errorMessage = logEntry.error.message || 'Unknown error';
    if (!this.stats.frequentErrors[errorMessage]) {
      this.stats.frequentErrors[errorMessage] = {
        count: 0,
        firstSeen: logEntry.timestamp,
        lastSeen: logEntry.timestamp,
        contexts: []
      };
    }
    
    this.stats.frequentErrors[errorMessage].count++;
    this.stats.frequentErrors[errorMessage].lastSeen = logEntry.timestamp;
    
    // Sample context (keep only first few)
    if (this.stats.frequentErrors[errorMessage].contexts.length < 3) {
      this.stats.frequentErrors[errorMessage].contexts.push({
        path: logEntry.context?.path,
        userId: logEntry.context?.userId,
        traceId: logEntry.context?.traceId,
        timestamp: logEntry.timestamp
      });
    }
  }

  /**
   * Process performance log entry
   */
  processPerformance(logEntry) {
    const duration = logEntry.performance.duration;
    const path = logEntry.context?.path;
    
    if (duration > this.config.slowRequestThreshold) {
      this.stats.slowRequests.push({
        path: path,
        duration: duration,
        timestamp: logEntry.timestamp,
        context: logEntry.context,
        dbQueryTime: logEntry.performance.dbQueryTime,
        dbQueryCount: logEntry.performance.dbQueryCount
      });
    }
    
    // Track performance issues
    if (logEntry.performance.memoryUsage > 100 * 1024 * 1024) { // 100MB
      this.stats.performanceIssues.push({
        type: 'high_memory_usage',
        value: logEntry.performance.memoryUsage,
        timestamp: logEntry.timestamp,
        context: logEntry.context
      });
    }
    
    if (logEntry.performance.dbQueryTime > 100) { // 100ms
      this.stats.performanceIssues.push({
        type: 'slow_database_query',
        value: logEntry.performance.dbQueryTime,
        timestamp: logEntry.timestamp,
        context: logEntry.context
      });
    }
  }

  /**
   * Process security event
   */
  processSecurityEvent(logEntry) {
    this.stats.securityEvents.push({
      message: logEntry.message,
      timestamp: logEntry.timestamp,
      context: logEntry.context,
      level: logEntry.level
    });
  }

  /**
   * Process API request
   */
  processApiRequest(logEntry) {
    const path = logEntry.context?.path;
    if (!path) return;
    
    if (!this.stats.endpointStats[path]) {
      this.stats.endpointStats[path] = {
        requestCount: 0,
        totalResponseTime: 0,
        avgResponseTime: 0,
        statusCodes: {},
        errorCount: 0,
        slowRequestCount: 0
      };
    }
    
    const endpoint = this.stats.endpointStats[path];
    endpoint.requestCount++;
    
    const duration = logEntry.performance?.duration || 0;
    endpoint.totalResponseTime += duration;
    endpoint.avgResponseTime = endpoint.totalResponseTime / endpoint.requestCount;
    
    if (duration > this.config.slowRequestThreshold) {
      endpoint.slowRequestCount++;
    }
    
    const statusCode = logEntry.context?.statusCode;
    if (statusCode) {
      endpoint.statusCodes[statusCode] = (endpoint.statusCodes[statusCode] || 0) + 1;
      
      if (statusCode >= 400) {
        endpoint.errorCount++;
      }
    }
  }

  /**
   * Process user activity
   */
  processUserActivity(logEntry) {
    const userId = logEntry.context.userId;
    
    if (!this.stats.userPatterns[userId]) {
      this.stats.userPatterns[userId] = {
        totalRequests: 0,
        errorCount: 0,
        lastActivity: null,
        examsSeen: new Set(),
        activityByHour: {}
      };
    }
    
    const user = this.stats.userPatterns[userId];
    user.totalRequests++;
    user.lastActivity = logEntry.timestamp;
    
    if (logEntry.level === 'error') {
      user.errorCount++;
    }
    
    if (logEntry.context.examId) {
      user.examsSeen.add(logEntry.context.examId);
    }
    
    // Track activity by hour
    const hour = new Date(logEntry.timestamp).getHours();
    user.activityByHour[hour] = (user.activityByHour[hour] || 0) + 1;
  }

  /**
   * Process business event
   */
  processBusinessEvent(logEntry) {
    // Implementation for business event tracking
    // Could track exam completions, user registrations, etc.
  }

  /**
   * Process time-series data
   */
  processTimeSeries(logEntry) {
    const timestamp = new Date(logEntry.timestamp);
    const hour = new Date(timestamp.getFullYear(), timestamp.getMonth(), 
                         timestamp.getDate(), timestamp.getHours());
    const hourKey = hour.toISOString();
    
    if (!this.stats.timeseriesData[hourKey]) {
      this.stats.timeseriesData[hourKey] = {
        requests: 0,
        errors: 0,
        totalResponseTime: 0,
        avgResponseTime: 0
      };
    }
    
    const hourData = this.stats.timeseriesData[hourKey];
    hourData.requests++;
    
    if (logEntry.level === 'error') {
      hourData.errors++;
    }
    
    if (logEntry.performance?.duration) {
      hourData.totalResponseTime += logEntry.performance.duration;
      hourData.avgResponseTime = hourData.totalResponseTime / hourData.requests;
    }
  }

  /**
   * Generate analysis report
   */
  generateReport() {
    console.log('\n📊 Log Analysis Report');
    console.log('====================');
    
    this.printSummary();
    this.printErrorAnalysis();
    this.printPerformanceAnalysis();
    this.printSecurityAnalysis();
    this.printEndpointAnalysis();
    this.printUserAnalysis();
    this.printRecommendations();
  }

  /**
   * Print summary statistics
   */
  printSummary() {
    console.log('\n📋 Summary');
    console.log('-----------');
    console.log(`Total log entries: ${this.stats.totalLogs.toLocaleString()}`);
    
    console.log('\nLogs by level:');
    Object.entries(this.stats.logsByLevel)
      .sort(([,a], [,b]) => b - a)
      .forEach(([level, count]) => {
        const percentage = ((count / this.stats.totalLogs) * 100).toFixed(2);
        console.log(`  ${level.padEnd(10)}: ${count.toLocaleString().padStart(8)} (${percentage}%)`);
      });
    
    const errorRate = ((this.stats.logsByLevel.error || 0) / this.stats.totalLogs * 100).toFixed(2);
    console.log(`\nOverall error rate: ${errorRate}%`);
  }

  /**
   * Print error analysis
   */
  printErrorAnalysis() {
    console.log('\n🚨 Error Analysis');
    console.log('-----------------');
    
    if (Object.keys(this.stats.errorsByType).length === 0) {
      console.log('No errors found in logs.');
      return;
    }
    
    console.log('Errors by type:');
    Object.entries(this.stats.errorsByType)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([type, count]) => {
        console.log(`  ${type.padEnd(25)}: ${count.toLocaleString()}`);
      });
    
    console.log('\nMost frequent error messages:');
    Object.entries(this.stats.frequentErrors)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5)
      .forEach(([message, data]) => {
        console.log(`\n  "${message.substring(0, 60)}${message.length > 60 ? '...' : ''}"`);
        console.log(`    Count: ${data.count}`);
        console.log(`    First seen: ${new Date(data.firstSeen).toLocaleString()}`);
        console.log(`    Last seen: ${new Date(data.lastSeen).toLocaleString()}`);
      });
  }

  /**
   * Print performance analysis
   */
  printPerformanceAnalysis() {
    console.log('\n⚡ Performance Analysis');
    console.log('----------------------');
    
    console.log(`Slow requests (>${this.config.slowRequestThreshold}ms): ${this.stats.slowRequests.length}`);
    
    if (this.stats.slowRequests.length > 0) {
      console.log('\nSlowest requests:');
      this.stats.slowRequests
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 10)
        .forEach((req, i) => {
          console.log(`  ${i + 1}. ${req.path} - ${req.duration}ms`);
          if (req.dbQueryTime) {
            console.log(`     DB Time: ${req.dbQueryTime}ms, Queries: ${req.dbQueryCount}`);
          }
        });
    }
    
    if (this.stats.performanceIssues.length > 0) {
      console.log('\nPerformance issues:');
      const issuesByType = {};
      this.stats.performanceIssues.forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      });
      
      Object.entries(issuesByType).forEach(([type, count]) => {
        console.log(`  ${type.replace(/_/g, ' ')}: ${count} occurrences`);
      });
    }
  }

  /**
   * Print security analysis
   */
  printSecurityAnalysis() {
    console.log('\n🔒 Security Analysis');
    console.log('-------------------');
    
    if (this.stats.securityEvents.length === 0) {
      console.log('No security events found.');
      return;
    }
    
    console.log(`Security events found: ${this.stats.securityEvents.length}`);
    
    const eventsByType = {};
    this.stats.securityEvents.forEach(event => {
      const type = event.context?.authEvent || 'unknown';
      eventsByType[type] = (eventsByType[type] || 0) + 1;
    });
    
    console.log('\nSecurity events by type:');
    Object.entries(eventsByType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  }

  /**
   * Print endpoint analysis
   */
  printEndpointAnalysis() {
    console.log('\n🌐 Endpoint Analysis');
    console.log('-------------------');
    
    if (Object.keys(this.stats.endpointStats).length === 0) {
      console.log('No endpoint data found.');
      return;
    }
    
    console.log('Top endpoints by request count:');
    Object.entries(this.stats.endpointStats)
      .sort(([,a], [,b]) => b.requestCount - a.requestCount)
      .slice(0, 10)
      .forEach(([path, stats]) => {
        const errorRate = stats.errorCount / stats.requestCount * 100;
        console.log(`  ${path.padEnd(30)} - ${stats.requestCount.toLocaleString().padStart(6)} req, ` +
                   `${Math.round(stats.avgResponseTime).toString().padStart(4)}ms avg, ` +
                   `${errorRate.toFixed(1).padStart(5)}% errors`);
      });
    
    console.log('\nSlowest endpoints:');
    Object.entries(this.stats.endpointStats)
      .filter(([,stats]) => stats.avgResponseTime > 0)
      .sort(([,a], [,b]) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10)
      .forEach(([path, stats]) => {
        console.log(`  ${path.padEnd(30)} - ${Math.round(stats.avgResponseTime).toString().padStart(4)}ms avg ` +
                   `(${stats.slowRequestCount} slow out of ${stats.requestCount})`);
      });
  }

  /**
   * Print user analysis
   */
  printUserAnalysis() {
    console.log('\n👥 User Analysis');
    console.log('---------------');
    
    const userCount = Object.keys(this.stats.userPatterns).length;
    console.log(`Unique users: ${userCount}`);
    
    if (userCount === 0) return;
    
    // Most active users
    console.log('\nMost active users:');
    Object.entries(this.stats.userPatterns)
      .sort(([,a], [,b]) => b.totalRequests - a.totalRequests)
      .slice(0, 5)
      .forEach(([userId, stats]) => {
        const errorRate = stats.errorCount / stats.totalRequests * 100;
        console.log(`  ${userId.substring(0, 20).padEnd(20)} - ${stats.totalRequests.toString().padStart(4)} requests, ` +
                   `${errorRate.toFixed(1).padStart(5)}% errors, ${stats.examsSeen.size} exams`);
      });
  }

  /**
   * Print recommendations
   */
  printRecommendations() {
    console.log('\n💡 Recommendations');
    console.log('------------------');
    
    const recommendations = [];
    
    // Error rate recommendations
    const errorRate = (this.stats.logsByLevel.error || 0) / this.stats.totalLogs * 100;
    if (errorRate > this.config.errorRateThreshold) {
      recommendations.push(`⚠️  High error rate (${errorRate.toFixed(2)}%) - investigate top error types`);
    }
    
    // Performance recommendations
    if (this.stats.slowRequests.length > 0) {
      const slowRate = this.stats.slowRequests.length / this.stats.totalLogs * 100;
      recommendations.push(`⚡ ${slowRate.toFixed(2)}% of requests are slow - optimize top slow endpoints`);
    }
    
    // Database recommendations
    const dbIssues = this.stats.performanceIssues.filter(i => i.type === 'slow_database_query');
    if (dbIssues.length > 0) {
      recommendations.push(`💾 ${dbIssues.length} slow database queries detected - add indexes or optimize queries`);
    }
    
    // Memory recommendations
    const memoryIssues = this.stats.performanceIssues.filter(i => i.type === 'high_memory_usage');
    if (memoryIssues.length > 0) {
      recommendations.push(`🧠 ${memoryIssues.length} high memory usage events - check for memory leaks`);
    }
    
    // Security recommendations
    if (this.stats.securityEvents.length > 0) {
      recommendations.push(`🔒 ${this.stats.securityEvents.length} security events - review authentication and access patterns`);
    }
    
    if (recommendations.length === 0) {
      console.log('✅ No major issues detected - system appears healthy');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }
    
    console.log('\n📈 For ongoing monitoring:');
    console.log('  1. Set up alerts for error rates > 5%');
    console.log('  2. Monitor response times > 1000ms');
    console.log('  3. Track database query performance');
    console.log('  4. Review security events regularly');
    console.log('  5. Analyze user behavior patterns');
  }
}

// CLI usage
if (require.main === module) {
  const analyzer = new LogAnalyzer();
  const logFile = process.argv[2];
  
  analyzer.analyzeLogs(logFile).catch(error => {
    console.error('Error analyzing logs:', error);
    process.exit(1);
  });
}

module.exports = LogAnalyzer;