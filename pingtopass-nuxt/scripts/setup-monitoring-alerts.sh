#!/bin/bash

# Setup Monitoring Alerts for PingToPass
# This script configures Cloudflare notifications and webhooks for monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEBHOOK_URL="${WEBHOOK_URL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
EMAIL_RECIPIENTS="${EMAIL_RECIPIENTS:-}"

echo -e "${GREEN}🚨 Setting up PingToPass Monitoring Alerts${NC}"
echo "=================================="

# Check dependencies
check_dependencies() {
    echo -e "${YELLOW}Checking dependencies...${NC}"
    
    if ! command -v wrangler &> /dev/null; then
        echo -e "${RED}❌ Error: wrangler CLI is not installed${NC}"
        echo "Please install it with: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ Error: curl is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Setup environment variables
setup_environment() {
    echo -e "${YELLOW}Setting up monitoring environment variables...${NC}"
    
    # Alert thresholds
    echo "5" | wrangler secret put ALERT_ERROR_RATE_THRESHOLD --env production
    echo "2000" | wrangler secret put ALERT_RESPONSE_TIME_THRESHOLD --env production
    echo "10" | wrangler secret put ALERT_CRITICAL_ERROR_THRESHOLD --env production
    
    # Webhook URLs (if provided)
    if [ ! -z "$WEBHOOK_URL" ]; then
        echo "$WEBHOOK_URL" | wrangler secret put ALERT_WEBHOOK_URL --env production
    fi
    
    if [ ! -z "$SLACK_WEBHOOK" ]; then
        echo "$SLACK_WEBHOOK" | wrangler secret put SLACK_WEBHOOK_URL --env production
    fi
    
    # Email configuration
    if [ ! -z "$EMAIL_RECIPIENTS" ]; then
        echo "$EMAIL_RECIPIENTS" | wrangler secret put ALERT_EMAIL_RECIPIENTS --env production
    fi
    
    echo -e "${GREEN}✅ Environment variables configured${NC}"
}

# Create webhook endpoint for alerts
create_webhook_endpoint() {
    echo -e "${YELLOW}Creating webhook endpoint...${NC}"
    
    cat > "$PROJECT_ROOT/server/api/webhooks/alerts.post.ts" << 'EOF'
/**
 * Webhook endpoint for receiving monitoring alerts
 */

import { logger } from '~/server/utils/logger';

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const headers = getHeaders(event);
    
    // Verify webhook source (basic validation)
    const userAgent = headers['user-agent'] || '';
    if (!userAgent.includes('Cloudflare') && !headers['x-webhook-source']) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized webhook request'
      });
    }
    
    // Log the alert
    logger.critical('Monitoring alert received', undefined, {
      alertType: body.alert_type || 'unknown',
      alertName: body.name || 'unknown',
      conditions: body.conditions,
      timestamp: body.timestamp,
      source: 'webhook',
    });
    
    // Process different alert types
    switch (body.alert_type) {
      case 'high_error_rate':
        await handleHighErrorRate(body);
        break;
      case 'high_response_time':
        await handleHighResponseTime(body);
        break;
      case 'database_connection_failed':
        await handleDatabaseAlert(body);
        break;
      case 'critical_error_threshold':
        await handleCriticalErrorAlert(body);
        break;
      default:
        logger.warn('Unknown alert type received', {
          alertType: body.alert_type,
          alertData: body,
        });
    }
    
    // Send to external services
    if (body.severity === 'critical') {
      await sendToSlack(body);
      await sendEmail(body);
    }
    
    return {
      status: 'success',
      message: 'Alert processed',
      timestamp: new Date().toISOString(),
    };
  } catch (error: any) {
    logger.error('Failed to process webhook alert', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process alert'
    });
  }
});

async function handleHighErrorRate(alert: any) {
  logger.critical('High error rate detected', undefined, {
    errorRate: alert.conditions?.error_rate,
    threshold: alert.conditions?.threshold,
    period: alert.conditions?.period,
    action: 'investigate_immediately',
  });
  
  // Add custom logic here (e.g., auto-scaling, circuit breaker)
}

async function handleHighResponseTime(alert: any) {
  logger.critical('High response time detected', undefined, {
    avgResponseTime: alert.conditions?.response_time,
    threshold: alert.conditions?.threshold,
    period: alert.conditions?.period,
    action: 'check_database_performance',
  });
  
  // Add custom logic here (e.g., cache warming, database optimization)
}

async function handleDatabaseAlert(alert: any) {
  logger.critical('Database connection issue', undefined, {
    database: alert.conditions?.database,
    error: alert.conditions?.error_message,
    action: 'check_turso_status',
  });
  
  // Add custom logic here (e.g., fallback to read replicas)
}

async function handleCriticalErrorAlert(alert: any) {
  logger.critical('Critical error threshold exceeded', undefined, {
    errorCount: alert.conditions?.error_count,
    threshold: alert.conditions?.threshold,
    timeWindow: alert.conditions?.time_window,
    action: 'immediate_investigation_required',
  });
  
  // Add custom logic here (e.g., automatic incident creation)
}

async function sendToSlack(alert: any) {
  const slackWebhook = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhook) return;
  
  try {
    await $fetch(slackWebhook, {
      method: 'POST',
      body: {
        text: `🚨 PingToPass Alert: ${alert.name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Alert:* ${alert.name}\n*Severity:* ${alert.severity}\n*Time:* ${alert.timestamp}`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Conditions:* \`\`\`${JSON.stringify(alert.conditions, null, 2)}\`\`\``
            }
          }
        ]
      }
    });
  } catch (error: any) {
    logger.error('Failed to send Slack notification', error);
  }
}

async function sendEmail(alert: any) {
  // Implement email sending logic here
  // This would typically use a service like SendGrid, Resend, or Cloudflare Email Routing
  logger.info('Email alert would be sent', {
    alert: alert.name,
    recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
  });
}
EOF
    
    echo -e "${GREEN}✅ Webhook endpoint created${NC}"
}

# Create monitoring health check
create_health_check() {
    echo -e "${YELLOW}Creating monitoring health check script...${NC}"
    
    cat > "$PROJECT_ROOT/scripts/health-monitor.sh" << 'EOF'
#!/bin/bash

# Continuous health monitoring script for PingToPass
# This script runs periodic health checks and sends alerts

set -e

# Configuration
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-https://pingtopass.com/api/monitoring/health}"
CHECK_INTERVAL="${CHECK_INTERVAL:-60}"  # seconds
ERROR_THRESHOLD="${ERROR_THRESHOLD:-3}"
WEBHOOK_URL="${WEBHOOK_URL:-}"

# State tracking
ERROR_COUNT=0
LAST_STATUS="unknown"

echo "Starting health monitor for $HEALTH_ENDPOINT"
echo "Check interval: ${CHECK_INTERVAL}s"
echo "Error threshold: $ERROR_THRESHOLD"

while true; do
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Perform health check
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_ENDPOINT" || echo "000")
    
    if [ "$HTTP_STATUS" = "200" ]; then
        # Health check passed
        if [ "$ERROR_COUNT" -gt 0 ]; then
            echo "[$TIMESTAMP] ✅ Health restored (was failing for $ERROR_COUNT checks)"
            
            # Send recovery notification
            if [ ! -z "$WEBHOOK_URL" ]; then
                curl -s -X POST "$WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d '{
                        "alert_type": "health_recovered",
                        "name": "PingToPass Health Recovered",
                        "severity": "info",
                        "timestamp": "'$TIMESTAMP'",
                        "conditions": {
                            "previous_error_count": '$ERROR_COUNT',
                            "recovery_time": "'$TIMESTAMP'"
                        }
                    }' || true
            fi
        fi
        
        ERROR_COUNT=0
        LAST_STATUS="healthy"
        echo "[$TIMESTAMP] ✅ Health check passed"
    else
        # Health check failed
        ERROR_COUNT=$((ERROR_COUNT + 1))
        echo "[$TIMESTAMP] ❌ Health check failed (HTTP $HTTP_STATUS) - Failure count: $ERROR_COUNT"
        
        # Send alert if threshold exceeded
        if [ "$ERROR_COUNT" -ge "$ERROR_THRESHOLD" ] && [ "$LAST_STATUS" != "critical" ]; then
            echo "[$TIMESTAMP] 🚨 Error threshold exceeded - Sending alert"
            
            if [ ! -z "$WEBHOOK_URL" ]; then
                curl -s -X POST "$WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d '{
                        "alert_type": "health_check_failed",
                        "name": "PingToPass Health Check Failed",
                        "severity": "critical",
                        "timestamp": "'$TIMESTAMP'",
                        "conditions": {
                            "error_count": '$ERROR_COUNT',
                            "threshold": '$ERROR_THRESHOLD',
                            "http_status": "'$HTTP_STATUS'",
                            "endpoint": "'$HEALTH_ENDPOINT'"
                        }
                    }' || true
            fi
            
            LAST_STATUS="critical"
        fi
    fi
    
    sleep "$CHECK_INTERVAL"
done
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/health-monitor.sh"
    echo -e "${GREEN}✅ Health monitor script created${NC}"
}

# Create alert testing script
create_test_alerts() {
    echo -e "${YELLOW}Creating alert testing script...${NC}"
    
    cat > "$PROJECT_ROOT/scripts/test-alerts.sh" << 'EOF'
#!/bin/bash

# Test monitoring alerts for PingToPass

set -e

WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3000/api/webhooks/alerts}"

echo "Testing PingToPass monitoring alerts"
echo "Webhook URL: $WEBHOOK_URL"

# Test high error rate alert
echo "Testing high error rate alert..."
curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "alert_type": "high_error_rate",
        "name": "Test High Error Rate Alert",
        "severity": "critical",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "conditions": {
            "error_rate": 12.5,
            "threshold": 5.0,
            "period": 300
        }
    }'

echo -e "\n✅ High error rate alert sent"

# Test high response time alert
echo "Testing high response time alert..."
curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "alert_type": "high_response_time",
        "name": "Test High Response Time Alert",
        "severity": "warning",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "conditions": {
            "response_time": 3500,
            "threshold": 2000,
            "period": 300
        }
    }'

echo -e "\n✅ High response time alert sent"

# Test database alert
echo "Testing database connection alert..."
curl -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d '{
        "alert_type": "database_connection_failed",
        "name": "Test Database Connection Alert",
        "severity": "critical",
        "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
        "conditions": {
            "database": "turso",
            "error_message": "Connection timeout after 30 seconds",
            "retry_count": 3
        }
    }'

echo -e "\n✅ Database connection alert sent"

echo -e "\n🎉 All test alerts sent successfully"
echo "Check your logs and notification channels for the test alerts"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/test-alerts.sh"
    echo -e "${GREEN}✅ Alert testing script created${NC}"
}

# Create monitoring configuration
create_monitoring_config() {
    echo -e "${YELLOW}Creating monitoring configuration...${NC}"
    
    cat > "$PROJECT_ROOT/monitoring.config.json" << 'EOF'
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
      "recipients": []
    },
    "webhook": {
      "enabled": true,
      "url": ""
    },
    "slack": {
      "enabled": false,
      "webhook_url": ""
    }
  },
  "health_checks": {
    "endpoints": [
      "/api/monitoring/health",
      "/api/monitoring/metrics"
    ],
    "interval": 30,
    "timeout": 10000,
    "retries": 3
  },
  "log_retention": {
    "max_entries": 10000,
    "max_age_days": 7
  }
}
EOF
    
    echo -e "${GREEN}✅ Monitoring configuration created${NC}"
}

# Main execution
main() {
    echo -e "${GREEN}Starting monitoring alerts setup...${NC}"
    
    # Check if required environment variables are set
    if [ -z "$WEBHOOK_URL" ] && [ -z "$SLACK_WEBHOOK" ] && [ -z "$EMAIL_RECIPIENTS" ]; then
        echo -e "${YELLOW}⚠️  Warning: No notification endpoints configured${NC}"
        echo "Set environment variables:"
        echo "  WEBHOOK_URL=https://your-webhook-url.com/alerts"
        echo "  SLACK_WEBHOOK=https://hooks.slack.com/services/..."
        echo "  EMAIL_RECIPIENTS=admin@example.com,alerts@example.com"
        echo ""
        read -p "Continue with setup anyway? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 0
        fi
    fi
    
    check_dependencies
    setup_environment
    create_webhook_endpoint
    create_health_check
    create_test_alerts
    create_monitoring_config
    
    echo -e "${GREEN}🎉 Monitoring alerts setup complete!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test alerts: ./scripts/test-alerts.sh"
    echo "2. Start health monitor: ./scripts/health-monitor.sh"
    echo "3. View monitoring dashboard: http://localhost:3000/admin/monitoring"
    echo "4. Configure notification channels in monitoring.config.json"
    echo ""
    echo "For production:"
    echo "1. Set up proper webhook endpoints"
    echo "2. Configure email/Slack notifications"
    echo "3. Set up log shipping to external services"
}

# Run main function
main "$@"