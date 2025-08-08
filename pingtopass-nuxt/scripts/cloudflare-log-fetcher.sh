#!/bin/bash

# Cloudflare Log Fetcher for PingToPass
# Fetches logs from Cloudflare Logpush and prepares them for analysis

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$PROJECT_ROOT/logs"
DEFAULT_HOURS=24

echo -e "${GREEN}📥 Cloudflare Log Fetcher for PingToPass${NC}"
echo "=========================================="

# Parse command line arguments
HOURS=${1:-$DEFAULT_HOURS}
OUTPUT_FILE=${2:-"$LOG_DIR/cloudflare-$(date +%Y%m%d-%H%M%S).jsonl"}

# Help function
show_help() {
    echo "Usage: $0 [HOURS] [OUTPUT_FILE]"
    echo ""
    echo "Fetch Cloudflare logs for analysis"
    echo ""
    echo "Arguments:"
    echo "  HOURS        Number of hours to fetch (default: 24)"
    echo "  OUTPUT_FILE  Output file path (default: logs/cloudflare-TIMESTAMP.jsonl)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Fetch last 24 hours"
    echo "  $0 12                 # Fetch last 12 hours"
    echo "  $0 24 recent.jsonl    # Fetch to specific file"
    echo ""
    echo "Environment variables:"
    echo "  CF_API_TOKEN    Cloudflare API token"
    echo "  CF_ZONE_ID      Zone ID (optional, will auto-detect)"
    echo "  CF_ACCOUNT_ID   Account ID (optional, will auto-detect)"
}

# Check for help flag
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

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
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  Warning: jq is not installed - JSON parsing will be limited${NC}"
        echo "Install jq for better log processing: brew install jq (macOS) or apt-get install jq (Linux)"
    fi
    
    echo -e "${GREEN}✅ Dependencies check passed${NC}"
}

# Setup log directory
setup_log_directory() {
    if [ ! -d "$LOG_DIR" ]; then
        echo -e "${YELLOW}Creating log directory: $LOG_DIR${NC}"
        mkdir -p "$LOG_DIR"
    fi
}

# Get Cloudflare credentials
get_cloudflare_info() {
    echo -e "${YELLOW}Getting Cloudflare information...${NC}"
    
    # Check if we're logged into wrangler
    if ! wrangler whoami &>/dev/null; then
        echo -e "${RED}❌ Error: Not logged into wrangler${NC}"
        echo "Please run: wrangler login"
        exit 1
    fi
    
    # Get account ID if not set
    if [ -z "$CF_ACCOUNT_ID" ]; then
        CF_ACCOUNT_ID=$(wrangler whoami 2>/dev/null | grep "Account ID" | awk '{print $3}')
        echo "Using Account ID: $CF_ACCOUNT_ID"
    fi
    
    # Get zone ID if not set
    if [ -z "$CF_ZONE_ID" ]; then
        # Try to get from wrangler.toml
        if [ -f "$PROJECT_ROOT/wrangler.toml" ]; then
            CF_ZONE_ID=$(grep -E "zone_id|zone-id" "$PROJECT_ROOT/wrangler.toml" | head -1 | cut -d'"' -f2)
        fi
        
        # If still not found, try to detect from domain
        if [ -z "$CF_ZONE_ID" ]; then
            echo -e "${YELLOW}⚠️  Zone ID not found. You may need to set CF_ZONE_ID environment variable${NC}"
            echo "To find your Zone ID:"
            echo "1. Go to Cloudflare dashboard"
            echo "2. Select your domain"
            echo "3. Copy Zone ID from the right sidebar"
        else
            echo "Using Zone ID: $CF_ZONE_ID"
        fi
    fi
    
    # Get API token
    if [ -z "$CF_API_TOKEN" ]; then
        # Try to get from wrangler config
        CF_API_TOKEN=$(wrangler config get api_token 2>/dev/null || echo "")
        
        if [ -z "$CF_API_TOKEN" ]; then
            echo -e "${RED}❌ Error: Cloudflare API token not found${NC}"
            echo "Please set CF_API_TOKEN environment variable or run 'wrangler login'"
            exit 1
        fi
    fi
}

# Fetch Workers logs using Wrangler
fetch_workers_logs() {
    echo -e "${YELLOW}Fetching Workers logs for last $HOURS hours...${NC}"
    
    # Calculate time range
    END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS date command
        START_TIME=$(date -u -v-${HOURS}H +"%Y-%m-%dT%H:%M:%SZ")
    else
        # Linux date command
        START_TIME=$(date -u -d "$HOURS hours ago" +"%Y-%m-%dT%H:%M:%SZ")
    fi
    
    echo "Time range: $START_TIME to $END_TIME"
    
    # Fetch logs using wrangler tail (for recent logs)
    echo "Fetching recent Workers logs..."
    timeout 30 wrangler tail --format=json --once > "$OUTPUT_FILE.workers" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Could not fetch recent Workers logs${NC}"
        touch "$OUTPUT_FILE.workers"
    }
}

# Fetch HTTP logs via Cloudflare API (if Logpush is enabled)
fetch_http_logs() {
    if [ -z "$CF_ZONE_ID" ]; then
        echo -e "${YELLOW}⚠️  Skipping HTTP logs - Zone ID not available${NC}"
        return
    fi
    
    echo -e "${YELLOW}Checking for Cloudflare Logpush jobs...${NC}"
    
    # List logpush jobs
    LOGPUSH_JOBS=$(curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
        "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/logpush/jobs" | \
        jq -r '.result[] | select(.dataset == "http_requests") | .id' 2>/dev/null || echo "")
    
    if [ -z "$LOGPUSH_JOBS" ]; then
        echo -e "${YELLOW}⚠️  No HTTP request logpush jobs found${NC}"
        echo "To set up Cloudflare Logpush:"
        echo "1. Go to Cloudflare Dashboard > Analytics > Logs"
        echo "2. Create a Logpush job for HTTP requests"
        echo "3. Configure destination (S3, GCS, etc.)"
        return
    fi
    
    echo "Found Logpush jobs: $LOGPUSH_JOBS"
    echo -e "${YELLOW}ℹ️  Note: HTTP logs are delivered to your configured destination${NC}"
    echo "Check your Logpush destination (S3, GCS, etc.) for HTTP request logs"
}

# Combine and process logs
process_logs() {
    echo -e "${YELLOW}Processing logs...${NC}"
    
    # Combine all log sources
    cat "$OUTPUT_FILE.workers" > "$OUTPUT_FILE" 2>/dev/null || touch "$OUTPUT_FILE"
    
    # Clean up temporary files
    rm -f "$OUTPUT_FILE.workers" 2>/dev/null || true
    
    # Get log count
    LOG_COUNT=$(wc -l < "$OUTPUT_FILE" 2>/dev/null || echo "0")
    
    echo -e "${GREEN}✅ Log processing complete${NC}"
    echo "Total log entries: $LOG_COUNT"
    echo "Output file: $OUTPUT_FILE"
    
    if [ "$LOG_COUNT" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No logs were fetched${NC}"
        echo ""
        echo "Possible reasons:"
        echo "1. No recent traffic to your application"
        echo "2. Logging is not properly configured"
        echo "3. Workers are not generating structured logs"
        echo ""
        echo "To generate test logs:"
        echo "  curl https://your-domain.com/api/monitoring/health"
        echo "  curl https://your-domain.com/api/monitoring/metrics"
        return
    fi
    
    # Show sample log entry if jq is available
    if command -v jq &> /dev/null && [ "$LOG_COUNT" -gt 0 ]; then
        echo ""
        echo "Sample log entry:"
        head -1 "$OUTPUT_FILE" | jq . 2>/dev/null || head -1 "$OUTPUT_FILE"
    fi
}

# Generate analysis command
suggest_analysis() {
    echo ""
    echo -e "${GREEN}📊 Next Steps${NC}"
    echo "============="
    echo ""
    echo "Analyze the fetched logs:"
    echo "  ./scripts/log-analyzer.js $OUTPUT_FILE"
    echo ""
    echo "Stream new logs in real-time:"
    echo "  wrangler tail --format=json"
    echo ""
    echo "Filter logs by level:"
    echo "  grep '\"level\":\"error\"' $OUTPUT_FILE | ./scripts/log-analyzer.js"
    echo ""
    echo "View in monitoring dashboard:"
    echo "  Open http://localhost:3000/admin/monitoring"
}

# Setup log rotation
setup_log_rotation() {
    echo -e "${YELLOW}Setting up log rotation...${NC}"
    
    cat > "$PROJECT_ROOT/scripts/rotate-logs.sh" << 'EOF'
#!/bin/bash

# Log rotation script for PingToPass

LOG_DIR="$(dirname "$0")/../logs"
MAX_AGE_DAYS=7
MAX_FILES=50

echo "Rotating logs in $LOG_DIR"

# Remove logs older than MAX_AGE_DAYS
find "$LOG_DIR" -name "*.jsonl" -type f -mtime +$MAX_AGE_DAYS -delete

# Keep only the most recent MAX_FILES log files
ls -t "$LOG_DIR"/*.jsonl 2>/dev/null | tail -n +$((MAX_FILES + 1)) | xargs rm -f 2>/dev/null || true

echo "Log rotation complete"
EOF
    
    chmod +x "$PROJECT_ROOT/scripts/rotate-logs.sh"
    echo -e "${GREEN}✅ Log rotation script created${NC}"
}

# Main execution
main() {
    echo "Fetching Cloudflare logs for the last $HOURS hours..."
    
    check_dependencies
    setup_log_directory
    get_cloudflare_info
    fetch_workers_logs
    fetch_http_logs
    process_logs
    setup_log_rotation
    suggest_analysis
    
    echo ""
    echo -e "${GREEN}🎉 Log fetching complete!${NC}"
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}⚠️  Interrupted by user${NC}"; exit 130' INT

# Run main function
main "$@"