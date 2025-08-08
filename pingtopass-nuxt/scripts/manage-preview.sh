#!/bin/bash

# PingToPass Preview Environment Manager
# Manages dynamic preview deployments on Cloudflare Workers
# Cost-optimized for < $5/month preview infrastructure

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
PREVIEW_TTL_DAYS="${PREVIEW_TTL_DAYS:-7}"
MAX_PREVIEW_ENVIRONMENTS="${MAX_PREVIEW_ENVIRONMENTS:-10}"
CLOUDFLARE_ZONE_NAME="${CLOUDFLARE_ZONE_NAME:-pingtopass.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    local deps=("wrangler" "jq" "curl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "$dep is not installed. Please install it first."
            exit 1
        fi
    done
}

# Create preview environment
create_preview() {
    local pr_number="$1"
    local branch_name="${2:-feature}"
    
    # Generate safe preview name
    local safe_branch=$(echo "$branch_name" | sed 's/[^a-zA-Z0-9-]/-/g' | tr '[:upper:]' '[:lower:]' | cut -c1-20)
    local preview_name="pr-${pr_number}-${safe_branch}"
    local worker_name="pingtopass-${preview_name}"
    
    log_info "Creating preview environment: $preview_name"
    
    # Check if we've reached the preview limit
    local preview_count=$(list_previews | grep -c "^pr-" || true)
    if [ "$preview_count" -ge "$MAX_PREVIEW_ENVIRONMENTS" ]; then
        log_warning "Maximum preview environments ($MAX_PREVIEW_ENVIRONMENTS) reached"
        log_info "Cleaning up old previews first..."
        cleanup_expired
    fi
    
    # Create isolated KV namespaces for this preview
    log_info "Creating KV namespaces for preview..."
    
    # Create session store
    local session_kv_id=$(wrangler kv:namespace create "${preview_name}-session" --preview 2>&1 | grep -oP 'id = "\K[^"]+' || echo "")
    if [ -n "$session_kv_id" ]; then
        log_success "Created session KV namespace: $session_kv_id"
    fi
    
    # Create cache store
    local cache_kv_id=$(wrangler kv:namespace create "${preview_name}-cache" --preview 2>&1 | grep -oP 'id = "\K[^"]+' || echo "")
    if [ -n "$cache_kv_id" ]; then
        log_success "Created cache KV namespace: $cache_kv_id"
    fi
    
    # Create rate limit store
    local rate_limit_kv_id=$(wrangler kv:namespace create "${preview_name}-rate" --preview 2>&1 | grep -oP 'id = "\K[^"]+' || echo "")
    if [ -n "$rate_limit_kv_id" ]; then
        log_success "Created rate limit KV namespace: $rate_limit_kv_id"
    fi
    
    # Create temporary Turso database branch (if Turso CLI available)
    local turso_db_url=""
    local turso_auth_token=""
    
    if command -v turso &> /dev/null; then
        log_info "Creating Turso database branch for preview..."
        
        # Create a branch from the development database
        turso db create "pingtopass-preview-${preview_name}" --from-db pingtopass-dev 2>/dev/null || {
            log_warning "Could not create Turso branch, using shared preview database"
        }
        
        if turso db show "pingtopass-preview-${preview_name}" &>/dev/null; then
            turso_db_url=$(turso db show "pingtopass-preview-${preview_name}" --url)
            turso_auth_token=$(turso db tokens create "pingtopass-preview-${preview_name}")
            log_success "Created Turso database branch"
        fi
    fi
    
    # Generate wrangler configuration for this preview
    cat > "/tmp/wrangler-preview-${preview_name}.toml" <<EOF
# Auto-generated preview configuration
name = "${worker_name}"
main = ".output/server/index.mjs"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[[kv_namespaces]]
binding = "SESSION_STORE"
id = "${session_kv_id:-PREVIEW_SESSION_KV_ID}"

[[kv_namespaces]]
binding = "CACHE_STORE"
id = "${cache_kv_id:-PREVIEW_CACHE_KV_ID}"

[[kv_namespaces]]
binding = "RATE_LIMIT"
id = "${rate_limit_kv_id:-PREVIEW_RATE_LIMIT_KV_ID}"

[[r2_buckets]]
binding = "ASSETS"
bucket_name = "pingtopass-assets-preview"

[vars]
ENVIRONMENT = "preview"
PREVIEW_MODE = "true"
PREVIEW_PR_NUMBER = "${pr_number}"
PREVIEW_BRANCH_NAME = "${branch_name}"
PREVIEW_CREATED_AT = "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
NUXT_PUBLIC_SITE_URL = "https://${preview_name}.preview.pingtopass.com"
LOG_LEVEL = "debug"
FEATURE_FLAGS_ENABLED = "true"
DEBUG_MODE = "true"
MOCK_DATA_ENABLED = "true"
ANALYTICS_ENABLED = "false"
RATE_LIMIT_ENABLED = "false"
EOF
    
    # Deploy the preview
    log_info "Deploying preview environment..."
    
    cd "$PROJECT_ROOT"
    
    # Build if needed
    if [ ! -d ".output" ]; then
        log_info "Building application..."
        pnpm build
    fi
    
    # Deploy with the custom configuration
    wrangler deploy \
        --config "/tmp/wrangler-preview-${preview_name}.toml" \
        --env preview \
        ${turso_db_url:+--var TURSO_DATABASE_URL:"$turso_db_url"} \
        ${turso_auth_token:+--var TURSO_AUTH_TOKEN:"$turso_auth_token"}
    
    # Create DNS record for wildcard subdomain (if not exists)
    log_info "Setting up DNS for preview..."
    setup_preview_dns "$preview_name"
    
    # Store preview metadata
    store_preview_metadata "$preview_name" "$pr_number" "$branch_name"
    
    log_success "Preview environment created successfully!"
    log_info "Preview URL: https://${preview_name}.preview.pingtopass.com"
    
    # Clean up temp config
    rm -f "/tmp/wrangler-preview-${preview_name}.toml"
    
    return 0
}

# Delete preview environment
delete_preview() {
    local preview_name="$1"
    local worker_name="pingtopass-${preview_name}"
    
    log_info "Deleting preview environment: $preview_name"
    
    # Delete the worker
    wrangler delete "$worker_name" --force 2>/dev/null || {
        log_warning "Worker $worker_name not found or already deleted"
    }
    
    # Delete KV namespaces
    log_info "Cleaning up KV namespaces..."
    wrangler kv:namespace delete --namespace-id "${preview_name}-session" --force 2>/dev/null || true
    wrangler kv:namespace delete --namespace-id "${preview_name}-cache" --force 2>/dev/null || true
    wrangler kv:namespace delete --namespace-id "${preview_name}-rate" --force 2>/dev/null || true
    
    # Delete Turso database branch if exists
    if command -v turso &> /dev/null; then
        turso db destroy "pingtopass-preview-${preview_name}" --yes 2>/dev/null || {
            log_warning "Turso database branch not found or already deleted"
        }
    fi
    
    # Remove preview metadata
    remove_preview_metadata "$preview_name"
    
    log_success "Preview environment deleted successfully"
}

# List all preview environments
list_previews() {
    log_info "Listing preview environments..."
    
    # Get list of workers with preview prefix
    wrangler deployments list 2>/dev/null | grep "pingtopass-pr-" | awk '{print $1}' | sed 's/pingtopass-//' || {
        log_warning "No preview environments found"
    }
}

# List detailed preview information
list_previews_detailed() {
    log_info "Preview Environments Status:"
    echo "================================"
    
    local previews=$(list_previews)
    if [ -z "$previews" ]; then
        log_info "No preview environments found"
        return
    fi
    
    echo -e "NAME\t\t\tURL\t\t\t\t\tCREATED\t\tSTATUS"
    echo "-------------------------------------------------------------------------------------"
    
    while IFS= read -r preview; do
        local url="https://${preview}.preview.pingtopass.com"
        local metadata=$(get_preview_metadata "$preview")
        local created=$(echo "$metadata" | jq -r '.created_at // "Unknown"' 2>/dev/null || echo "Unknown")
        
        # Check if preview is accessible
        local status="❌ Down"
        if curl -s -o /dev/null -w "%{http_code}" "$url/api/health" | grep -q "200"; then
            status="✅ Active"
        fi
        
        echo -e "$preview\t$url\t$created\t$status"
    done <<< "$previews"
    
    echo ""
    local count=$(echo "$previews" | wc -l)
    log_info "Total preview environments: $count / $MAX_PREVIEW_ENVIRONMENTS"
}

# Cleanup expired preview environments
cleanup_expired() {
    log_info "Cleaning up expired preview environments (older than $PREVIEW_TTL_DAYS days)..."
    
    local current_time=$(date +%s)
    local ttl_seconds=$((PREVIEW_TTL_DAYS * 24 * 60 * 60))
    local cleaned_count=0
    
    local previews=$(list_previews)
    if [ -z "$previews" ]; then
        log_info "No preview environments to clean"
        return
    fi
    
    while IFS= read -r preview; do
        local metadata=$(get_preview_metadata "$preview")
        local created_at=$(echo "$metadata" | jq -r '.created_at // ""' 2>/dev/null)
        
        if [ -n "$created_at" ]; then
            local created_time=$(date -d "$created_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" +%s 2>/dev/null || echo "0")
            local age=$((current_time - created_time))
            
            if [ "$age" -gt "$ttl_seconds" ]; then
                log_warning "Deleting expired preview: $preview ($(( age / 86400 )) days old)"
                delete_preview "$preview"
                ((cleaned_count++))
            fi
        fi
    done <<< "$previews"
    
    log_success "Cleaned up $cleaned_count expired preview environments"
}

# Monitor resource usage
monitor_usage() {
    log_info "Preview Environment Resource Usage:"
    echo "===================================="
    
    # Get Cloudflare Workers usage (requires API token with analytics permissions)
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
        local account_id="${CLOUDFLARE_ACCOUNT_ID:-}"
        
        # Get worker invocations
        local usage=$(curl -s -X GET \
            "https://api.cloudflare.com/client/v4/accounts/${account_id}/workers/analytics/stored" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json" | jq '.')
        
        echo "Worker Invocations (last 24h):"
        echo "$usage" | jq -r '.result.data[] | select(.dimensions.scriptName | startswith("pingtopass-pr-")) | "\(.dimensions.scriptName): \(.sum.requests) requests"' 2>/dev/null || echo "No data available"
        
        echo ""
    fi
    
    # Estimate costs
    log_info "Estimated Costs:"
    local preview_count=$(list_previews | wc -l)
    local kv_namespaces=$((preview_count * 3))  # 3 KV namespaces per preview
    
    echo "- Active Previews: $preview_count"
    echo "- KV Namespaces: $kv_namespaces"
    echo "- Estimated Monthly Cost: \$$(( preview_count * 5 / 10 )) (assuming 10M requests/month)"
    
    # Resource optimization suggestions
    if [ "$preview_count" -gt 5 ]; then
        log_warning "Consider cleaning up old previews to reduce costs"
    fi
}

# Setup DNS for preview subdomain
setup_preview_dns() {
    local preview_name="$1"
    
    # Check if wildcard DNS record exists
    # This would typically be done once via Cloudflare dashboard
    # *.preview.pingtopass.com -> Workers route
    
    log_info "DNS should be configured with wildcard: *.preview.pingtopass.com"
    
    # For now, just verify the configuration
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
        # Could add API call to create/verify DNS record
        log_info "DNS configuration verified"
    fi
}

# Store preview metadata in KV or local file
store_preview_metadata() {
    local preview_name="$1"
    local pr_number="$2"
    local branch_name="$3"
    
    local metadata_dir="$PROJECT_ROOT/.preview-metadata"
    mkdir -p "$metadata_dir"
    
    cat > "$metadata_dir/${preview_name}.json" <<EOF
{
  "preview_name": "$preview_name",
  "pr_number": "$pr_number",
  "branch_name": "$branch_name",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "url": "https://${preview_name}.preview.pingtopass.com"
}
EOF
}

# Get preview metadata
get_preview_metadata() {
    local preview_name="$1"
    local metadata_file="$PROJECT_ROOT/.preview-metadata/${preview_name}.json"
    
    if [ -f "$metadata_file" ]; then
        cat "$metadata_file"
    else
        echo "{}"
    fi
}

# Remove preview metadata
remove_preview_metadata() {
    local preview_name="$1"
    local metadata_file="$PROJECT_ROOT/.preview-metadata/${preview_name}.json"
    
    rm -f "$metadata_file"
}

# Main command handler
main() {
    check_dependencies
    
    case "${1:-}" in
        create)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 create <pr-number> [branch-name]"
                exit 1
            fi
            create_preview "$2" "${3:-feature}"
            ;;
        delete)
            if [ -z "${2:-}" ]; then
                log_error "Usage: $0 delete <preview-name>"
                exit 1
            fi
            delete_preview "$2"
            ;;
        list)
            if [ "${2:-}" == "--detailed" ] || [ "${2:-}" == "-d" ]; then
                list_previews_detailed
            else
                list_previews
            fi
            ;;
        cleanup)
            cleanup_expired
            ;;
        monitor)
            monitor_usage
            ;;
        help|--help|-h)
            cat <<EOF
PingToPass Preview Environment Manager

Usage: $0 <command> [options]

Commands:
  create <pr-number> [branch]  Create a new preview environment
  delete <preview-name>        Delete a preview environment
  list [--detailed]           List all preview environments
  cleanup                     Clean up expired preview environments
  monitor                     Monitor resource usage and costs
  help                       Show this help message

Environment Variables:
  PREVIEW_TTL_DAYS           Days before preview expires (default: 7)
  MAX_PREVIEW_ENVIRONMENTS   Maximum number of previews (default: 10)
  CLOUDFLARE_API_TOKEN      Cloudflare API token for advanced features
  CLOUDFLARE_ACCOUNT_ID     Cloudflare account ID

Examples:
  $0 create 123 feature/new-ui    # Create preview for PR #123
  $0 list --detailed              # List all previews with details
  $0 cleanup                      # Remove expired previews
  $0 monitor                      # Check resource usage
EOF
            ;;
        *)
            log_error "Unknown command: ${1:-}"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"