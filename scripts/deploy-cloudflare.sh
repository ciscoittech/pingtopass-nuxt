#!/bin/bash
# PingToPass Cloudflare Deployment Script
#
# This script handles deployment to Cloudflare Pages with proper environment
# variable setup and secrets management.
#
# Usage:
#   ./scripts/deploy-cloudflare.sh [environment] [--dry-run]
#
# Examples:
#   ./scripts/deploy-cloudflare.sh dev         # Deploy to development
#   ./scripts/deploy-cloudflare.sh staging     # Deploy to staging
#   ./scripts/deploy-cloudflare.sh prod        # Deploy to production
#   ./scripts/deploy-cloudflare.sh prod --dry-run  # Preview deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pingtopass"
DRY_RUN=false

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  PingToPass Cloudflare Deployment${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
}

print_step() {
    echo -e "${BLUE}🔹 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}💡 $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if wrangler is available
    if ! command -v wrangler &> /dev/null && ! command -v npx &> /dev/null; then
        print_error "Neither wrangler nor npx found. Please install Node.js and wrangler."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "wrangler.toml" ]; then
        print_error "Not in project root directory. Please run from project root."
        exit 1
    fi
    
    # Check if user is authenticated with Cloudflare
    if ! wrangler whoami &> /dev/null && ! npx wrangler whoami &> /dev/null; then
        print_error "Not authenticated with Cloudflare. Please log in first:"
        echo "  wrangler login"
        echo "  # or"
        echo "  npx wrangler login"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

load_env_file() {
    local env_file="$1"
    
    if [ -f "$env_file" ]; then
        print_info "Loading environment from $env_file"
        export $(grep -v '^#' "$env_file" | grep -v '^[[:space:]]*$' | xargs)
    else
        print_warning "Environment file $env_file not found"
    fi
}

set_cloudflare_secrets() {
    local env="$1"
    
    print_step "Setting Cloudflare secrets for $env environment..."
    
    # Define secrets that should be set in Cloudflare
    local secrets=(
        "TURSO_DATABASE_URL"
        "TURSO_AUTH_TOKEN"
        "JWT_SECRET"
        "GOOGLE_CLIENT_SECRET"
        "OPENROUTER_API_KEY"
        "LANGCHAIN_API_KEY"
        "STRIPE_SECRET_KEY"
        "STRIPE_WEBHOOK_SECRET"
        "TWITTER_API_KEY"
        "TWITTER_API_SECRET"
        "TWITTER_ACCESS_TOKEN"
        "TWITTER_ACCESS_TOKEN_SECRET"
        "TWITTER_BEARER_TOKEN"
        "SMTP_PASSWORD"
        "SESSION_SECRET"
    )
    
    # Environment-specific database URLs and tokens
    if [ "$env" = "production" ]; then
        secrets+=("TURSO_DATABASE_URL_PROD" "TURSO_AUTH_TOKEN_PROD")
    elif [ "$env" = "staging" ]; then
        secrets+=("TURSO_DATABASE_URL_STAGING" "TURSO_AUTH_TOKEN_STAGING")
    fi
    
    for secret in "${secrets[@]}"; do
        local value
        
        # Get environment-specific variable name
        case "$secret" in
            "TURSO_DATABASE_URL")
                if [ "$env" = "production" ]; then
                    value="${TURSO_DATABASE_URL_PROD}"
                elif [ "$env" = "staging" ]; then
                    value="${TURSO_DATABASE_URL_STAGING}"
                else
                    value="${TURSO_DATABASE_URL}"
                fi
                ;;
            "TURSO_AUTH_TOKEN")
                if [ "$env" = "production" ]; then
                    value="${TURSO_AUTH_TOKEN_PROD}"
                elif [ "$env" = "staging" ]; then
                    value="${TURSO_AUTH_TOKEN_STAGING}"
                else
                    value="${TURSO_AUTH_TOKEN}"
                fi
                ;;
            *)
                value="${!secret}"
                ;;
        esac
        
        if [ -n "$value" ]; then
            if [ "$DRY_RUN" = true ]; then
                echo "  Would set: $secret=***"
            else
                echo "  Setting: $secret"
                echo "$value" | wrangler pages secret put "$secret" --project-name="$PROJECT_NAME" --env="$env" > /dev/null
            fi
        else
            print_warning "  Skipping $secret (not set in environment)"
        fi
    done
    
    print_success "Secrets configuration complete"
}

run_build() {
    print_step "Building application..."
    
    if [ "$DRY_RUN" = true ]; then
        print_info "Dry run: Would run npm run build"
        return
    fi
    
    # Set NODE_ENV for the build
    export NODE_ENV="production"
    
    # Run the build
    npm run build
    
    # Verify build output exists
    if [ ! -d ".output/public" ]; then
        print_error "Build output not found at .output/public"
        exit 1
    fi
    
    print_success "Build completed successfully"
}

run_tests() {
    print_step "Running tests before deployment..."
    
    if [ "$DRY_RUN" = true ]; then
        print_info "Dry run: Would run tests"
        return
    fi
    
    # Run the test suite
    if npm run test:ci; then
        print_success "All tests passed"
    else
        print_error "Tests failed. Deployment aborted."
        exit 1
    fi
}

deploy_to_cloudflare() {
    local env="$1"
    
    print_step "Deploying to Cloudflare Pages ($env environment)..."
    
    if [ "$DRY_RUN" = true ]; then
        print_info "Dry run: Would deploy to $env environment"
        return
    fi
    
    # Deploy using wrangler
    local deploy_cmd="wrangler pages deploy .output/public --project-name=$PROJECT_NAME"
    
    # Add environment-specific flags
    if [ "$env" != "production" ]; then
        deploy_cmd="$deploy_cmd --env=$env"
    fi
    
    # Add compatibility date
    deploy_cmd="$deploy_cmd --compatibility-date=2024-01-01"
    
    print_info "Running: $deploy_cmd"
    
    if $deploy_cmd; then
        print_success "Deployment to $env completed successfully"
        
        # Get deployment URL
        local url=$(wrangler pages project list --project-name="$PROJECT_NAME" | grep "URL" | awk '{print $2}' | head -1)
        if [ -n "$url" ]; then
            print_success "Deployment URL: $url"
        fi
    else
        print_error "Deployment to $env failed"
        exit 1
    fi
}

run_health_check() {
    local env="$1"
    
    print_step "Running post-deployment health check..."
    
    if [ "$DRY_RUN" = true ]; then
        print_info "Dry run: Would run health check"
        return
    fi
    
    # Determine the URL based on environment
    local health_url
    case "$env" in
        "production")
            health_url="https://pingtopass.com/api/health"
            ;;
        "staging")
            health_url="https://staging.pingtopass.com/api/health"
            ;;
        *)
            health_url="https://dev.pingtopass.com/api/health"
            ;;
    esac
    
    print_info "Checking health endpoint: $health_url"
    
    # Wait a bit for deployment to propagate
    sleep 10
    
    # Make health check request
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        print_info "Health check attempt $attempt/$max_attempts"
        
        if curl -f -s "$health_url" > /dev/null; then
            print_success "Health check passed"
            return
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_warning "Health check failed after $max_attempts attempts"
            print_info "Deployment may still be propagating. Check manually: $health_url"
            return
        fi
        
        attempt=$((attempt + 1))
        sleep 5
    done
}

show_deployment_summary() {
    local env="$1"
    
    echo
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Deployment Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    
    if [ "$DRY_RUN" = true ]; then
        print_info "Dry run completed - no actual deployment performed"
    else
        print_success "Deployment to $env environment completed!"
    fi
    
    echo
    echo -e "${YELLOW}📋 Deployment Details:${NC}"
    echo "  Environment: $env"
    echo "  Project: $PROJECT_NAME"
    
    case "$env" in
        "production")
            echo "  URL: https://pingtopass.com"
            echo "  Admin: https://pingtopass.com/admin"
            ;;
        "staging")
            echo "  URL: https://staging.pingtopass.com"
            echo "  Admin: https://staging.pingtopass.com/admin"
            ;;
        *)
            echo "  URL: https://dev.pingtopass.com"
            echo "  Admin: https://dev.pingtopass.com/admin"
            ;;
    esac
    
    echo
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  wrangler pages deployment list --project-name=$PROJECT_NAME"
    echo "  wrangler pages deployment tail --project-name=$PROJECT_NAME --env=$env"
    echo "  wrangler pages project list"
    echo
    
    if [ "$env" = "production" ]; then
        print_warning "Remember to update DNS records if this is the first production deployment"
    fi
}

main() {
    local env="${1:-dev}"
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            dev|development|staging|prod|production)
                env="$1"
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    # Normalize environment name
    case "$env" in
        "dev"|"development")
            env="development"
            ;;
        "prod")
            env="production"
            ;;
    esac
    
    print_header
    
    # Validate environment
    if [ "$env" != "development" ] && [ "$env" != "staging" ] && [ "$env" != "production" ]; then
        print_error "Invalid environment: $env"
        echo "Usage: $0 [development|staging|production] [--dry-run]"
        exit 1
    fi
    
    # Load environment-specific variables
    load_env_file ".env"
    
    if [ "$env" = "production" ]; then
        load_env_file ".env.production"
    elif [ "$env" = "staging" ]; then
        load_env_file ".env.staging"
    fi
    
    # Run deployment steps
    check_prerequisites
    run_tests
    run_build
    set_cloudflare_secrets "$env"
    deploy_to_cloudflare "$env"
    run_health_check "$env"
    show_deployment_summary "$env"
}

# Execute main function
main "$@"