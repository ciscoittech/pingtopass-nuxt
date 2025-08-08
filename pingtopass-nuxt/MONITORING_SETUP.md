# PingToPass Monitoring & Logging Setup Guide

This guide provides comprehensive instructions for setting up monitoring and logging for the PingToPass Nuxt 3 application on Cloudflare Workers.

## 🎯 Overview

The monitoring system includes:
- **Structured Logging**: JSON-formatted logs with request context
- **Error Tracking**: Global error handler with detailed error context
- **Performance Monitoring**: Request timing, database queries, and system metrics
- **Real-time Dashboard**: Web-based monitoring interface
- **Alerting**: Webhook-based alerts for critical issues
- **Log Analysis**: Tools for parsing and analyzing Cloudflare logs

## 📋 Quick Setup

### 1. Install Dependencies

```bash
# Make sure you have the required tools
npm install -g wrangler
brew install jq curl  # macOS
# or
apt-get install jq curl  # Linux
```

### 2. Setup Monitoring Components

```bash
# Run the monitoring setup script
./scripts/setup-monitoring-alerts.sh

# Set up notification channels (optional)
export WEBHOOK_URL="https://your-webhook-endpoint.com/alerts"
export SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
export EMAIL_RECIPIENTS="admin@yoursite.com,alerts@yoursite.com"

# Re-run setup with notifications
./scripts/setup-monitoring-alerts.sh
```

### 3. Test the Setup

```bash
# Test alert system
./scripts/test-alerts.sh

# Start health monitor
./scripts/health-monitor.sh &

# View monitoring dashboard
open http://localhost:3000/admin/monitoring
```

## 🏗️ Architecture

### Monitoring Components

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│   Application   │    │   Middleware     │    │   Dashboard    │
│                 │    │                  │    │                │
│ • API Routes    │───▶│ • Error Handler  │───▶│ • Real-time UI │
│ • Business      │    │ • Performance    │    │ • Metrics      │
│   Logic         │    │   Monitor        │    │ • Logs         │
│ • Database      │    │ • Logger         │    │ • Alerts       │
│   Operations    │    │                  │    │                │
└─────────────────┘    └──────────────────┘    └────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│ Structured Logs │    │   Cloudflare     │    │   External     │
│                 │    │                  │    │                │
│ • JSON Format   │───▶│ • Workers Logs   │───▶│ • Webhooks     │
│ • Context Data  │    │ • Analytics      │    │ • Slack        │
│ • Performance   │    │ • Real User      │    │ • Email        │
│   Metrics       │    │   Monitoring     │    │ • PagerDuty    │
│                 │    │                  │    │                │
└─────────────────┘    └──────────────────┘    └────────────────┘
```

### Log Flow

1. **Application Layer**: Business logic generates events
2. **Middleware Layer**: Captures context, timing, and errors
3. **Logger Utility**: Formats logs as structured JSON
4. **Cloudflare Workers**: Outputs logs to Cloudflare's log stream
5. **Log Analysis**: Scripts process logs for insights
6. **Dashboard**: Displays real-time metrics and logs

## 📊 Monitoring Features

### 1. Structured Logging

**Location**: `server/utils/logger.ts`

**Features**:
- JSON-formatted output optimized for Cloudflare Logpush
- Automatic request context extraction (trace ID, user ID, IP, etc.)
- Performance metrics integration
- Different log levels (debug, info, warn, error, critical)
- Business event tracking

**Usage Examples**:

```typescript
import { logger, createLogger } from '~/server/utils/logger';

// Basic logging
logger.info('User logged in', { userId: 'user123' });
logger.error('Database connection failed', error, { retryCount: 3 });

// Performance logging
logger.performance('API request completed', {
  duration: 150,
  dbQueryCount: 2,
  dbQueryTime: 45
});

// Business events
logger.exam('exam_completed', 'aws-saa', 'user123', {
  score: 85,
  timeSpent: 3600,
  questionsAnswered: 65
});

// Request-specific logger
export default defineEventHandler(async (event) => {
  const requestLogger = createLogger(Logger.extractRequestContext(event));
  requestLogger.info('Processing exam request');
  // ... handle request
});
```

### 2. Error Tracking

**Location**: `server/middleware/error-handler.ts`

**Features**:
- Global error handler for unhandled exceptions
- Error categorization and metrics
- User-friendly error responses
- Error rate tracking
- Critical error threshold monitoring

**Error Categories**:
- `DatabaseError`: Database connection or query issues
- `AuthError`: Authentication/authorization failures
- `ValidationError`: Input validation failures
- `NetworkError`: External API failures
- `ServerError`: Internal server errors

### 3. Performance Monitoring

**Location**: `server/middleware/performance-monitor.ts`

**Features**:
- Request timing and response time tracking
- Database query performance monitoring
- Memory usage tracking
- Cache hit/miss rates
- Endpoint performance analytics

**Key Metrics**:
- Average response time
- 95th percentile response time
- Slow request count (>1000ms)
- Database query timing
- Memory usage patterns
- Cache performance

### 4. Monitoring Dashboard

**Location**: `pages/admin/monitoring.vue`

**Features**:
- Real-time system health overview
- Request performance metrics
- Error tracking and analysis
- Database performance monitoring
- Recent logs with filtering
- Auto-refresh capability

**Access**: Navigate to `/admin/monitoring` in your application

### 5. Health Check API

**Endpoints**:
- `GET /api/monitoring/health` - System health status
- `GET /api/monitoring/metrics` - Detailed performance metrics
- `GET /api/monitoring/logs` - Recent log entries

**Health Checks**:
- Database connectivity
- System resource usage
- Error rates
- Response time thresholds
- Configuration validation

## 🚨 Alerting System

### Alert Types

1. **High Error Rate**: >5% of requests failing
2. **High Response Time**: Average >2 seconds
3. **Database Issues**: Connection failures or slow queries
4. **Critical Errors**: System-level failures
5. **Health Check Failures**: Endpoint unresponsive

### Notification Channels

1. **Webhooks**: Custom HTTP endpoints
2. **Slack**: Slack channel notifications
3. **Email**: SMTP email alerts
4. **Cloudflare**: Built-in notification system

### Setup Alerts

```bash
# Set notification endpoints
export WEBHOOK_URL="https://your-webhook.com/alerts"
export SLACK_WEBHOOK="https://hooks.slack.com/services/..."
export EMAIL_RECIPIENTS="team@example.com"

# Configure thresholds in monitoring.config.json
{
  "alerts": {
    "error_rate_threshold": 5.0,
    "response_time_threshold": 2000,
    "critical_error_threshold": 10
  }
}
```

## 📈 Log Analysis

### Fetch Logs from Cloudflare

```bash
# Fetch logs from the last 24 hours
./scripts/cloudflare-log-fetcher.sh

# Fetch specific time range
./scripts/cloudflare-log-fetcher.sh 12  # Last 12 hours
./scripts/cloudflare-log-fetcher.sh 24 production-logs.jsonl
```

### Analyze Logs

```bash
# Run comprehensive analysis
./scripts/log-analyzer.js logs/cloudflare-20240101-120000.jsonl

# Analyze from stdin (real-time)
wrangler tail --format=json | ./scripts/log-analyzer.js

# Filter and analyze errors only
grep '"level":"error"' logs/recent.jsonl | ./scripts/log-analyzer.js
```

### Analysis Features

The log analyzer provides:
- **Summary Statistics**: Total logs, error rates, performance overview
- **Error Analysis**: Top error types, frequent error messages
- **Performance Analysis**: Slow requests, database query performance
- **Security Analysis**: Authentication events, suspicious activity
- **User Behavior**: Activity patterns, most active users
- **Recommendations**: Actionable insights for improvements

## 🔧 Configuration

### Environment Variables

```bash
# Monitoring Configuration
ALERT_ERROR_RATE_THRESHOLD=5
ALERT_RESPONSE_TIME_THRESHOLD=2000
ALERT_CRITICAL_ERROR_THRESHOLD=10

# Notification Endpoints
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
ALERT_EMAIL_RECIPIENTS=admin@example.com,team@example.com

# Log Configuration
LOG_LEVEL=info  # debug, info, warn, error, critical
DEBUG=false     # Enable debug logging in production

# Cloudflare Configuration (optional)
CF_API_TOKEN=your-cloudflare-api-token
CF_ZONE_ID=your-zone-id
CF_ACCOUNT_ID=your-account-id
```

### Monitoring Configuration

Edit `monitoring.config.json`:

```json
{
  "alerts": {
    "error_rate_threshold": 5.0,
    "response_time_threshold": 2000,
    "critical_error_threshold": 10,
    "database_timeout_threshold": 30000,
    "memory_usage_threshold": 100,
    "check_interval": 60
  },
  "notifications": {
    "email": {
      "enabled": true,
      "recipients": ["admin@example.com"]
    },
    "webhook": {
      "enabled": true,
      "url": "https://your-webhook.com/alerts"
    },
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/..."
    }
  },
  "health_checks": {
    "endpoints": ["/api/monitoring/health", "/api/monitoring/metrics"],
    "interval": 30,
    "timeout": 10000,
    "retries": 3
  },
  "log_retention": {
    "max_entries": 10000,
    "max_age_days": 7
  }
}
```

## 🚀 Production Deployment

### 1. Deploy with Monitoring

```bash
# Deploy to production with monitoring enabled
wrangler deploy --env production

# Set production secrets
echo "your-webhook-url" | wrangler secret put ALERT_WEBHOOK_URL --env production
echo "your-slack-webhook" | wrangler secret put SLACK_WEBHOOK_URL --env production
```

### 2. Set up Cloudflare Logpush (Optional)

For long-term log retention and analysis:

1. Go to Cloudflare Dashboard > Analytics > Logs
2. Create a Logpush job
3. Configure destination (S3, GCS, etc.)
4. Update log fetcher script with destination details

### 3. Set up External Monitoring

For additional monitoring, consider:
- **Uptime Robot**: External uptime monitoring
- **DataDog**: Advanced APM and logging
- **Sentry**: Error tracking and performance monitoring
- **New Relic**: Full-stack observability

## 🔍 Troubleshooting

### Common Issues

1. **No logs appearing**:
   - Check if structured logging is properly imported
   - Verify wrangler is authenticated
   - Ensure console.log statements use logger utility

2. **Dashboard not loading**:
   - Check if monitoring API endpoints are working
   - Verify database connection
   - Check browser console for JavaScript errors

3. **Alerts not firing**:
   - Test webhook endpoints manually
   - Check environment variable configuration
   - Verify alert thresholds are appropriate

4. **Performance issues**:
   - Check if monitoring middleware is affecting performance
   - Consider sampling for high-traffic applications
   - Monitor memory usage of logging

### Debug Commands

```bash
# Check wrangler authentication
wrangler whoami

# Test API endpoints
curl -s http://localhost:3000/api/monitoring/health | jq
curl -s http://localhost:3000/api/monitoring/metrics | jq

# View recent logs
wrangler tail --format=json

# Test webhook endpoints
curl -X POST your-webhook-url.com/test

# Check log file sizes
du -sh logs/*.jsonl
```

## 📚 Best Practices

### 1. Logging Best Practices

- **Structured Data**: Always use JSON format
- **Context Rich**: Include user ID, request ID, trace ID
- **Appropriate Levels**: Use correct log levels
- **Sensitive Data**: Never log passwords, tokens, or PII
- **Performance Impact**: Be mindful of logging overhead

### 2. Monitoring Best Practices

- **Baseline Metrics**: Establish normal operating ranges
- **Alert Fatigue**: Set appropriate thresholds to avoid noise
- **Runbook**: Document response procedures for each alert
- **Regular Review**: Analyze trends and adjust thresholds
- **Testing**: Regularly test alert delivery

### 3. Performance Best Practices

- **Sampling**: Consider sampling for very high-traffic applications
- **Async Logging**: Use fire-and-forget for non-critical logs
- **Batch Operations**: Group related logs when possible
- **Resource Monitoring**: Monitor the monitoring system itself

## 🎯 Next Steps

1. **Set up external monitoring**: Consider DataDog, New Relic, or Sentry
2. **Configure log shipping**: Set up Cloudflare Logpush for long-term storage
3. **Create runbooks**: Document incident response procedures
4. **Set up dashboards**: Create custom Grafana or DataDog dashboards
5. **Implement SLOs**: Define Service Level Objectives and monitor them

## 📞 Support

For issues with the monitoring setup:

1. Check the troubleshooting section above
2. Review Cloudflare Workers documentation
3. Test with the provided scripts
4. Review logs and error messages
5. Check the monitoring dashboard for system health

The monitoring system is designed to be self-monitoring - if there are issues with the monitoring itself, they should be visible in the dashboard and logs.

---

*This monitoring setup provides comprehensive observability for PingToPass running on Cloudflare Workers, with production-ready alerting and analysis capabilities.*