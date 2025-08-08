#!/bin/bash

# PingToPass Preview Environment Automated Cleanup
# Run this as a cron job to automatically clean up expired preview environments
# Suggested cron: 0 */6 * * * (every 6 hours)

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-/var/log/pingtopass}"
LOG_FILE="${LOG_DIR}/preview-cleanup-$(date +%Y%m%d).log"
SLACK_WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"
CLEANUP_DRY_RUN="${CLEANUP_DRY_RUN:-false}"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" >&2
}

# Send notification to Slack (if configured)
send_notification() {
    local message="$1"
    local level="${2:-info}"
    
    if [ -n "$SLACK_WEBHOOK_URL" ]; then
        local emoji="📋"
        case "$level" in
            success) emoji="✅" ;;
            warning) emoji="⚠️" ;;
            error) emoji="❌" ;;
        esac
        
        curl -X POST "$SLACK_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"${emoji} Preview Cleanup: ${message}\",
                \"username\": \"Preview Bot\",
                \"icon_emoji\": \":robot_face:\"
            }" 2>/dev/null || log_error "Failed to send Slack notification"
    fi
}

# Main cleanup function
run_cleanup() {
    log "Starting preview environment cleanup..."
    
    # Change to project directory
    cd "$SCRIPT_DIR/.."
    
    # Check if we're in dry run mode
    if [ "$CLEANUP_DRY_RUN" = "true" ]; then
        log "Running in DRY RUN mode - no actual deletions will occur"
    fi
    
    # Get list of preview environments
    local previews=$("$SCRIPT_DIR/manage-preview.sh" list 2>/dev/null | grep "^pr-" || echo "")
    
    if [ -z "$previews" ]; then
        log "No preview environments found"
        return 0
    fi
    
    local total_count=$(echo "$previews" | wc -l)
    local expired_count=0
    local error_count=0
    local space_saved=0
    
    log "Found $total_count preview environments to check"
    
    # Check each preview for expiration
    while IFS= read -r preview; do
        if [ -z "$preview" ]; then
            continue
        fi
        
        log "Checking preview: $preview"
        
        # Get preview metadata
        local metadata_file=".preview-metadata/${preview}.json"
        
        if [ ! -f "$metadata_file" ]; then
            log "No metadata found for $preview, marking for cleanup"
            
            if [ "$CLEANUP_DRY_RUN" != "true" ]; then
                if "$SCRIPT_DIR/manage-preview.sh" delete "$preview" 2>/dev/null; then
                    ((expired_count++))
                    log "Deleted orphaned preview: $preview"
                else
                    ((error_count++))
                    log_error "Failed to delete preview: $preview"
                fi
            else
                log "DRY RUN: Would delete orphaned preview: $preview"
                ((expired_count++))
            fi
            continue
        fi
        
        # Check age of preview
        local created_at=$(jq -r '.created_at' "$metadata_file" 2>/dev/null || echo "")
        
        if [ -z "$created_at" ]; then
            log "Invalid metadata for $preview"
            continue
        fi
        
        # Calculate age in seconds
        local created_timestamp=$(date -d "$created_at" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$created_at" +%s 2>/dev/null || echo "0")
        local current_timestamp=$(date +%s)
        local age_seconds=$((current_timestamp - created_timestamp))
        local age_days=$((age_seconds / 86400))
        local ttl_days="${PREVIEW_TTL_DAYS:-7}"
        
        if [ "$age_days" -ge "$ttl_days" ]; then
            log "Preview $preview is $age_days days old (TTL: $ttl_days days)"
            
            if [ "$CLEANUP_DRY_RUN" != "true" ]; then
                if "$SCRIPT_DIR/manage-preview.sh" delete "$preview" 2>/dev/null; then
                    ((expired_count++))
                    space_saved=$((space_saved + 10)) # Estimate 10MB per preview
                    log "Deleted expired preview: $preview"
                else
                    ((error_count++))
                    log_error "Failed to delete preview: $preview"
                fi
            else
                log "DRY RUN: Would delete expired preview: $preview"
                ((expired_count++))
            fi
        else
            log "Preview $preview is $age_days days old (keeping)"
        fi
        
    done <<< "$previews"
    
    # Generate summary
    local kept_count=$((total_count - expired_count - error_count))
    local summary="Cleanup complete: $expired_count deleted, $kept_count kept, $error_count errors"
    
    log "$summary"
    
    # Send notifications based on results
    if [ "$expired_count" -gt 0 ]; then
        send_notification "Cleaned up $expired_count preview environments, freed ~${space_saved}MB" "success"
    fi
    
    if [ "$error_count" -gt 0 ]; then
        send_notification "Failed to clean up $error_count preview environments" "error"
    fi
    
    # Check if we're approaching limits
    if [ "$kept_count" -ge "${MAX_PREVIEW_ENVIRONMENTS:-10}" ]; then
        send_notification "Warning: At preview environment limit ($kept_count/${MAX_PREVIEW_ENVIRONMENTS:-10})" "warning"
    fi
    
    return 0
}

# Resource monitoring
check_resource_usage() {
    log "Checking resource usage..."
    
    # Get Cloudflare Workers usage if API token is available
    if [ -n "${CLOUDFLARE_API_TOKEN:-}" ] && [ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
        local usage=$(curl -s -X GET \
            "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/workers/analytics/stored" \
            -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
            -H "Content-Type: application/json")
        
        local preview_requests=$(echo "$usage" | jq '[.result.data[] | select(.dimensions.scriptName | startswith("pingtopass-pr-")) | .sum.requests] | add' 2>/dev/null || echo "0")
        
        if [ "$preview_requests" -gt 1000000 ]; then
            send_notification "High preview usage detected: ${preview_requests} requests in last 24h" "warning"
        fi
        
        log "Preview requests (24h): $preview_requests"
    fi
}

# Orphan detection
find_orphaned_resources() {
    log "Checking for orphaned resources..."
    
    # Check for KV namespaces without corresponding workers
    if command -v wrangler &> /dev/null; then
        local kv_namespaces=$(wrangler kv:namespace list 2>/dev/null | grep "pr-" || echo "")
        local orphaned_count=0
        
        while IFS= read -r namespace; do
            if [ -z "$namespace" ]; then
                continue
            fi
            
            local namespace_id=$(echo "$namespace" | awk '{print $1}')
            local namespace_name=$(echo "$namespace" | awk '{print $2}')
            
            # Check if corresponding worker exists
            if ! wrangler deployments list 2>/dev/null | grep -q "pingtopass-${namespace_name}"; then
                log "Found orphaned KV namespace: $namespace_name"
                
                if [ "$CLEANUP_DRY_RUN" != "true" ]; then
                    wrangler kv:namespace delete --namespace-id "$namespace_id" --force 2>/dev/null || {
                        log_error "Failed to delete orphaned KV namespace: $namespace_name"
                    }
                else
                    log "DRY RUN: Would delete orphaned KV namespace: $namespace_name"
                fi
                
                ((orphaned_count++))
            fi
        done <<< "$kv_namespaces"
        
        if [ "$orphaned_count" -gt 0 ]; then
            send_notification "Cleaned up $orphaned_count orphaned KV namespaces" "success"
        fi
    fi
    
    # Check for orphaned Turso databases
    if command -v turso &> /dev/null; then
        local turso_dbs=$(turso db list 2>/dev/null | grep "pingtopass-preview-pr-" || echo "")
        local orphaned_db_count=0
        
        while IFS= read -r db; do
            if [ -z "$db" ]; then
                continue
            fi
            
            local db_name=$(echo "$db" | awk '{print $1}')
            local preview_name=${db_name#pingtopass-preview-}
            
            # Check if corresponding worker exists
            if ! wrangler deployments list 2>/dev/null | grep -q "pingtopass-${preview_name}"; then
                log "Found orphaned Turso database: $db_name"
                
                if [ "$CLEANUP_DRY_RUN" != "true" ]; then
                    turso db destroy "$db_name" --yes 2>/dev/null || {
                        log_error "Failed to delete orphaned Turso database: $db_name"
                    }
                else
                    log "DRY RUN: Would delete orphaned Turso database: $db_name"
                fi
                
                ((orphaned_db_count++))
            fi
        done <<< "$turso_dbs"
        
        if [ "$orphaned_db_count" -gt 0 ]; then
            send_notification "Cleaned up $orphaned_db_count orphaned Turso databases" "success"
        fi
    fi
}

# Health check
health_check() {
    log "Running health checks on remaining previews..."
    
    local previews=$("$SCRIPT_DIR/manage-preview.sh" list 2>/dev/null | grep "^pr-" || echo "")
    local unhealthy_count=0
    
    while IFS= read -r preview; do
        if [ -z "$preview" ]; then
            continue
        fi
        
        local url="https://${preview}.preview.pingtopass.com/api/health"
        
        if ! curl -s -f -m 5 "$url" > /dev/null 2>&1; then
            log "Preview $preview is unhealthy"
            ((unhealthy_count++))
            
            # Could trigger automatic restart or deletion here
            # "$SCRIPT_DIR/manage-preview.sh" restart "$preview"
        fi
    done <<< "$previews"
    
    if [ "$unhealthy_count" -gt 0 ]; then
        send_notification "$unhealthy_count preview environments are unhealthy" "warning"
    fi
}

# Main execution
main() {
    log "========================================="
    log "Preview Cleanup Cron Job Started"
    log "========================================="
    
    # Set error trap
    trap 'log_error "Script failed with exit code $?"' ERR
    
    # Run cleanup tasks
    run_cleanup
    
    # Check for orphaned resources
    find_orphaned_resources
    
    # Monitor resource usage
    check_resource_usage
    
    # Health check remaining previews
    health_check
    
    log "========================================="
    log "Preview Cleanup Cron Job Completed"
    log "========================================="
    
    # Rotate logs if they're getting too large
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 10485760 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        gzip "${LOG_FILE}.old"
        log "Rotated log file"
    fi
}

# Run main function
main "$@"