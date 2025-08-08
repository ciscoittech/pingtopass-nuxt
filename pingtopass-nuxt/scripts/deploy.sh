#!/bin/bash
# PingToPass Deployment Script
# Handles deployment to all environments with safety checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pingtopass"
ENVIRONMENTS=("development" "preview" "staging" "production")

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check for required tools
    command -v node >/dev/null 2>&1 || { log_error "Node.js is required but not installed."; exit 1; }
    command -v pnpm >/dev/null 2>&1 || { log_error "pnpm is required but not installed."; exit 1; }
    command -v wrangler >/dev/null 2>&1 || { log_error "Wrangler CLI is required but not installed."; exit 1; }
    
    # Check for wrangler authentication
    wrangler whoami >/dev/null 2>&1 || { log_error "Not authenticated with Wrangler. Run 'wrangler login' first."; exit 1; }
    
    log_info "Prerequisites check passed."
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    # Type checking
    pnpm run typecheck || { log_error "TypeScript type check failed."; exit 1; }
    
    # Linting
    pnpm run lint || { log_error "Linting failed."; exit 1; }
    
    # Unit tests
    pnpm run test:unit || { log_error "Unit tests failed."; exit 1; }
    
    log_info "All tests passed."
}

# Build application
build_app() {
    log_info "Building application..."
    pnpm run build || { log_error "Build failed."; exit 1; }
    log_info "Build completed successfully."
}

# Deploy to environment
deploy_to_env() {
    local env=$1
    
    log_info "Deploying to $env environment..."
    
    # Deploy with environment flag
    if [ "$env" = "development" ]; then
        wrangler deploy || { log_error "Deployment to $env failed."; exit 1; }
    else
        wrangler deploy --env $env || { log_error "Deployment to $env failed."; exit 1; }
    fi
    
    log_info "Deployment to $env completed."
}

# Verify deployment
verify_deployment() {
    local env=$1
    local url=""
    
    case $env in
        development)
            url="http://localhost:3000/api/health"
            ;;
        preview)
            url="https://preview.pingtopass.com/api/health"
            ;;
        staging)
            url="https://staging.pingtopass.com/api/health"
            ;;
        production)
            url="https://pingtopass.com/api/health"
            ;;
    esac
    
    log_info "Verifying deployment at $url..."
    
    # Wait for deployment to be ready
    sleep 5
    
    # Check health endpoint
    response=$(curl -s -o /dev/null -w "%{http_code}" $url)
    
    if [ "$response" = "200" ]; then
        log_info "Deployment verified successfully."
        return 0
    else
        log_error "Deployment verification failed. HTTP status: $response"
        return 1
    fi
}

# Rollback deployment
rollback() {
    local env=$1
    
    log_warn "Rolling back $env deployment..."
    
    # Get list of deployments
    if [ "$env" = "development" ]; then
        wrangler deployments list
    else
        wrangler deployments list --env $env
    fi
    
    read -p "Enter deployment ID to rollback to: " deployment_id
    
    if [ "$env" = "development" ]; then
        wrangler rollback $deployment_id || { log_error "Rollback failed."; exit 1; }
    else
        wrangler rollback $deployment_id --env $env || { log_error "Rollback failed."; exit 1; }
    fi
    
    log_info "Rollback completed."
}

# Main deployment flow
main() {
    echo "======================================"
    echo "   PingToPass Deployment Script"
    echo "======================================"
    echo
    
    # Parse arguments
    ENVIRONMENT=$1
    SKIP_TESTS=${2:-false}
    
    # Validate environment
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${ENVIRONMENT} " ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        echo "Usage: $0 <environment> [skip-tests]"
        echo "Environments: ${ENVIRONMENTS[@]}"
        exit 1
    fi
    
    # Production deployment confirmation
    if [ "$ENVIRONMENT" = "production" ]; then
        log_warn "You are about to deploy to PRODUCTION!"
        read -p "Are you sure? Type 'yes' to continue: " confirmation
        if [ "$confirmation" != "yes" ]; then
            log_info "Production deployment cancelled."
            exit 0
        fi
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests unless skipped
    if [ "$SKIP_TESTS" != "skip-tests" ]; then
        run_tests
    else
        log_warn "Skipping tests (not recommended for production)."
    fi
    
    # Build application
    build_app
    
    # Deploy to environment
    deploy_to_env $ENVIRONMENT
    
    # Verify deployment
    if verify_deployment $ENVIRONMENT; then
        log_info "Deployment to $ENVIRONMENT completed successfully!"
        
        # Show deployment info
        echo
        echo "Deployment Summary:"
        echo "==================="
        echo "Environment: $ENVIRONMENT"
        echo "Timestamp: $(date)"
        
        case $ENVIRONMENT in
            development)
                echo "URL: http://localhost:3000"
                echo "Logs: wrangler tail"
                ;;
            preview)
                echo "URL: https://preview.pingtopass.com"
                echo "Logs: wrangler tail --env preview"
                ;;
            staging)
                echo "URL: https://staging.pingtopass.com"
                echo "Logs: wrangler tail --env staging"
                ;;
            production)
                echo "URL: https://pingtopass.com"
                echo "Logs: wrangler tail --env production"
                ;;
        esac
    else
        log_error "Deployment verification failed!"
        read -p "Do you want to rollback? (y/n): " should_rollback
        if [ "$should_rollback" = "y" ]; then
            rollback $ENVIRONMENT
        fi
        exit 1
    fi
}

# Run main function
main "$@"