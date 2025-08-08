#!/bin/bash
# PingToPass Health Check Script
# Verifies deployment health and critical functionality

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("development" "preview" "staging" "production")
declare -A ENVIRONMENT_URLS=(
    ["development"]="http://localhost:3000"
    ["preview"]="https://preview.pingtopass.com"
    ["staging"]="https://staging.pingtopass.com"
    ["production"]="https://pingtopass.com"
)

# Health check configuration
MAX_RETRIES=3
TIMEOUT=30
EXPECTED_RESPONSE_TIME=2000  # 2 seconds in milliseconds

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
}

# Check if environment is valid
validate_environment() {
    local env=$1
    
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment: $env"
        echo "Valid environments: ${ENVIRONMENTS[@]}"
        exit 1
    fi
}

# Check basic connectivity
check_connectivity() {
    local url=$1
    local env=$2
    
    log_step "Checking basic connectivity to $url..."
    
    local start_time=$(date +%s%3N)
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
    local end_time=$(date +%s%3N)
    local response_time=$((end_time - start_time))
    
    if [ "$http_code" = "200" ]; then
        log_pass "Basic connectivity check passed (${response_time}ms)"
        
        # Check response time
        if [ $response_time -gt $EXPECTED_RESPONSE_TIME ]; then
            log_warn "Response time (${response_time}ms) exceeds expected threshold (${EXPECTED_RESPONSE_TIME}ms)"
        fi
        
        return 0
    else
        log_fail "Basic connectivity check failed (HTTP $http_code)"
        return 1
    fi
}

# Check health endpoint
check_health_endpoint() {
    local url=$1
    local env=$2
    
    log_step "Checking health endpoint..."
    
    local health_url="$url/api/health"
    local response=$(curl -s --max-time $TIMEOUT "$health_url" || echo '{}')
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$health_url" || echo "000")
    
    if [ "$http_code" = "200" ]; then
        log_pass "Health endpoint is responding"
        
        # Parse response if it's JSON
        if echo "$response" | grep -q '"status"'; then
            local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
            local timestamp=$(echo "$response" | grep -o '"timestamp":"[^"]*"' | cut -d'"' -f4)
            
            echo "  Status: $status"
            echo "  Timestamp: $timestamp"
            
            if [ "$status" = "healthy" ] || [ "$status" = "ok" ]; then
                log_pass "Health status is healthy"
                return 0
            else
                log_fail "Health status is not healthy: $status"
                return 1
            fi
        else
            log_warn "Health endpoint response is not in expected JSON format"
            echo "  Response: $response"
            return 0
        fi
    else
        log_fail "Health endpoint check failed (HTTP $http_code)"
        return 1
    fi
}

# Check database connectivity
check_database_connectivity() {
    local url=$1
    local env=$2
    
    log_step "Checking database connectivity..."
    
    local db_health_url="$url/api/health/database"
    local response=$(curl -s --max-time $TIMEOUT "$db_health_url" || echo '{}')
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$db_health_url" || echo "000")
    
    if [ "$http_code" = "200" ]; then
        log_pass "Database connectivity check passed"
        
        # Parse response for database status
        if echo "$response" | grep -q '"database"'; then
            local db_status=$(echo "$response" | grep -o '"database":"[^"]*"' | cut -d'"' -f4)
            echo "  Database Status: $db_status"
            
            if [ "$db_status" = "connected" ] || [ "$db_status" = "healthy" ]; then
                log_pass "Database is healthy"
                return 0
            else
                log_fail "Database is not healthy: $db_status"
                return 1
            fi
        else
            log_warn "Database response is not in expected format"
            return 0
        fi
    elif [ "$http_code" = "404" ]; then
        log_warn "Database health endpoint not implemented"
        return 0
    else
        log_fail "Database connectivity check failed (HTTP $http_code)"
        return 1
    fi
}

# Check authentication endpoint
check_auth_endpoint() {
    local url=$1
    local env=$2
    
    log_step "Checking authentication endpoint..."
    
    local auth_url="$url/api/auth/status"
    local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$auth_url" || echo "000")
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "401" ]; then
        log_pass "Authentication endpoint is responding"
        return 0
    elif [ "$http_code" = "404" ]; then
        log_warn "Authentication endpoint not implemented"
        return 0
    else
        log_fail "Authentication endpoint check failed (HTTP $http_code)"
        return 1
    fi
}

# Check API endpoints
check_api_endpoints() {
    local url=$1
    local env=$2
    
    log_step "Checking critical API endpoints..."
    
    # List of critical endpoints to check
    local endpoints=(
        "/api/health"
        "/api/auth/status"
        "/api/questions"
        "/api/exams"
    )
    
    local failed_endpoints=()
    
    for endpoint in "${endpoints[@]}"; do
        local full_url="$url$endpoint"
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$full_url" || echo "000")
        
        case $http_code in
            200|401|403)
                echo "  $endpoint: OK (HTTP $http_code)"
                ;;
            404)
                echo "  $endpoint: Not implemented (HTTP 404)"
                ;;
            000)
                echo "  $endpoint: Connection failed"
                failed_endpoints+=("$endpoint")
                ;;
            *)
                echo "  $endpoint: Error (HTTP $http_code)"
                failed_endpoints+=("$endpoint")
                ;;
        esac
    done
    
    if [ ${#failed_endpoints[@]} -eq 0 ]; then
        log_pass "All API endpoints are responding"
        return 0
    else
        log_fail "Some API endpoints failed: ${failed_endpoints[*]}"
        return 1
    fi
}

# Check SSL/TLS certificate (for production environments)
check_ssl_certificate() {
    local url=$1
    local env=$2
    
    # Only check SSL for HTTPS URLs
    if [[ ! $url =~ ^https:// ]]; then
        log_warn "Skipping SSL check for non-HTTPS URL"
        return 0
    fi
    
    log_step "Checking SSL certificate..."
    
    local domain=$(echo "$url" | sed 's|https://||' | sed 's|/.*||')
    local cert_info=$(echo | openssl s_client -connect "$domain:443" -servername "$domain" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "")
    
    if [ -n "$cert_info" ]; then
        local not_after=$(echo "$cert_info" | grep "notAfter" | cut -d= -f2)
        local expire_date=$(date -d "$not_after" +%s 2>/dev/null || echo "0")
        local current_date=$(date +%s)
        local days_until_expiry=$(( (expire_date - current_date) / 86400 ))
        
        if [ $days_until_expiry -gt 30 ]; then
            log_pass "SSL certificate is valid (expires in $days_until_expiry days)"
            return 0
        elif [ $days_until_expiry -gt 0 ]; then
            log_warn "SSL certificate expires soon (in $days_until_expiry days)"
            return 0
        else
            log_fail "SSL certificate has expired"
            return 1
        fi
    else
        log_fail "Could not retrieve SSL certificate information"
        return 1
    fi
}

# Performance benchmark
check_performance() {
    local url=$1
    local env=$2
    
    log_step "Running performance benchmark..."
    
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    
    for i in {1..5}; do
        local start_time=$(date +%s%3N)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
        local end_time=$(date +%s%3N)
        local request_time=$((end_time - start_time))
        
        if [ "$http_code" = "200" ]; then
            total_time=$((total_time + request_time))
            successful_requests=$((successful_requests + 1))
            echo "  Request $i: ${request_time}ms"
        else
            failed_requests=$((failed_requests + 1))
            echo "  Request $i: Failed (HTTP $http_code)"
        fi
    done
    
    if [ $successful_requests -gt 0 ]; then
        local avg_time=$((total_time / successful_requests))
        echo "  Average response time: ${avg_time}ms"
        echo "  Successful requests: $successful_requests/5"
        
        if [ $avg_time -lt 1000 ]; then
            log_pass "Performance is excellent (<1s average)"
        elif [ $avg_time -lt 2000 ]; then
            log_pass "Performance is good (<2s average)"
        else
            log_warn "Performance is slow (>${avg_time}ms average)"
        fi
        
        return 0
    else
        log_fail "All performance test requests failed"
        return 1
    fi
}

# Comprehensive health check for environment
check_environment_health() {
    local env=$1
    local url=${ENVIRONMENT_URLS[$env]}
    
    echo "======================================"
    echo "  Health Check - $env Environment"
    echo "======================================"
    echo "URL: $url"
    echo "Timeout: ${TIMEOUT}s"
    echo "Max Retries: $MAX_RETRIES"
    echo
    
    local checks=0
    local passed=0
    local failed=0
    
    # Run health checks with retries
    for attempt in $(seq 1 $MAX_RETRIES); do
        if [ $attempt -gt 1 ]; then
            log_info "Retry attempt $attempt/$MAX_RETRIES..."
            sleep 2
        fi
        
        # Basic connectivity
        if check_connectivity "$url" "$env"; then
            passed=$((passed + 1))
            break
        else
            if [ $attempt -eq $MAX_RETRIES ]; then
                failed=$((failed + 1))
                log_error "Basic connectivity failed after $MAX_RETRIES attempts"
                return 1
            fi
        fi
    done
    checks=$((checks + 1))
    
    echo
    
    # Health endpoint
    if check_health_endpoint "$url" "$env"; then
        passed=$((passed + 1))
    else
        failed=$((failed + 1))
    fi
    checks=$((checks + 1))
    
    echo
    
    # Database connectivity
    if check_database_connectivity "$url" "$env"; then
        passed=$((passed + 1))
    else
        failed=$((failed + 1))
    fi
    checks=$((checks + 1))
    
    echo
    
    # Authentication
    if check_auth_endpoint "$url" "$env"; then
        passed=$((passed + 1))
    else
        failed=$((failed + 1))
    fi
    checks=$((checks + 1))
    
    echo
    
    # API endpoints
    if check_api_endpoints "$url" "$env"; then
        passed=$((passed + 1))
    else
        failed=$((failed + 1))
    fi
    checks=$((checks + 1))
    
    echo
    
    # SSL certificate (for production)
    if [[ $url =~ ^https:// ]]; then
        if check_ssl_certificate "$url" "$env"; then
            passed=$((passed + 1))
        else
            failed=$((failed + 1))
        fi
        checks=$((checks + 1))
        echo
    fi
    
    # Performance benchmark
    if check_performance "$url" "$env"; then
        passed=$((passed + 1))
    else
        failed=$((failed + 1))
    fi
    checks=$((checks + 1))
    
    echo
    echo "======================================"
    echo "  Health Check Summary - $env"
    echo "======================================"
    echo "Total Checks: $checks"
    echo "Passed: $passed"
    echo "Failed: $failed"
    
    local success_rate=$((passed * 100 / checks))
    echo "Success Rate: ${success_rate}%"
    
    if [ $failed -eq 0 ]; then
        log_pass "$env environment is healthy!"
        return 0
    elif [ $success_rate -ge 80 ]; then
        log_warn "$env environment has minor issues"
        return 0
    else
        log_fail "$env environment has serious issues"
        return 1
    fi
}

# Wait for deployment to be ready
wait_for_deployment() {
    local env=$1
    local url=${ENVIRONMENT_URLS[$env]}
    local max_wait=300  # 5 minutes
    local wait_interval=10  # 10 seconds
    local elapsed=0
    
    log_step "Waiting for $env deployment to be ready..."
    
    while [ $elapsed -lt $max_wait ]; do
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" || echo "000")
        
        if [ "$http_code" = "200" ]; then
            log_pass "Deployment is ready!"
            return 0
        fi
        
        echo "  Waiting... (${elapsed}s elapsed, HTTP $http_code)"
        sleep $wait_interval
        elapsed=$((elapsed + wait_interval))
    done
    
    log_error "Deployment did not become ready within ${max_wait}s"
    return 1
}

# Check multiple environments
check_all_environments() {
    local environments_to_check=("$@")
    local overall_success=true
    
    if [ ${#environments_to_check[@]} -eq 0 ]; then
        environments_to_check=("${ENVIRONMENTS[@]}")
    fi
    
    echo "============================================"
    echo "   Multi-Environment Health Check"
    echo "============================================"
    echo "Checking environments: ${environments_to_check[*]}"
    echo
    
    for env in "${environments_to_check[@]}"; do
        if check_environment_health "$env"; then
            echo
            log_pass "$env environment check completed successfully"
        else
            echo
            log_fail "$env environment check failed"
            overall_success=false
        fi
        echo
        echo
    done
    
    echo "============================================"
    echo "   Overall Health Check Summary"
    echo "============================================"
    
    if $overall_success; then
        log_pass "All environments are healthy!"
        return 0
    else
        log_fail "Some environments have issues"
        return 1
    fi
}

# Main function
main() {
    ACTION=${1:-"check"}
    ENVIRONMENT=${2:-""}
    
    case $ACTION in
        check)
            if [ -n "$ENVIRONMENT" ]; then
                validate_environment "$ENVIRONMENT"
                check_environment_health "$ENVIRONMENT"
            else
                check_all_environments
            fi
            ;;
        wait)
            if [ -z "$ENVIRONMENT" ]; then
                log_error "Environment is required for wait command"
                echo "Usage: $0 wait <environment>"
                exit 1
            fi
            validate_environment "$ENVIRONMENT"
            wait_for_deployment "$ENVIRONMENT"
            ;;
        connectivity)
            if [ -z "$ENVIRONMENT" ]; then
                log_error "Environment is required for connectivity command"
                echo "Usage: $0 connectivity <environment>"
                exit 1
            fi
            validate_environment "$ENVIRONMENT"
            check_connectivity "${ENVIRONMENT_URLS[$ENVIRONMENT]}" "$ENVIRONMENT"
            ;;
        performance)
            if [ -z "$ENVIRONMENT" ]; then
                log_error "Environment is required for performance command"
                echo "Usage: $0 performance <environment>"
                exit 1
            fi
            validate_environment "$ENVIRONMENT"
            check_performance "${ENVIRONMENT_URLS[$ENVIRONMENT]}" "$ENVIRONMENT"
            ;;
        *)
            echo "PingToPass Health Check Script"
            echo
            echo "Usage: $0 <action> [environment]"
            echo
            echo "Actions:"
            echo "  check [env]         - Run full health check (all environments if not specified)"
            echo "  wait <env>          - Wait for deployment to be ready"
            echo "  connectivity <env>  - Check basic connectivity only"
            echo "  performance <env>   - Run performance benchmark only"
            echo
            echo "Environments: ${ENVIRONMENTS[@]}"
            echo
            echo "Examples:"
            echo "  $0 check production                    # Check production environment"
            echo "  $0 check                              # Check all environments"
            echo "  $0 wait staging                       # Wait for staging to be ready"
            echo "  $0 connectivity development           # Test local connectivity"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"