#!/bin/bash
# PingToPass Environment Setup Script
# Creates all necessary Cloudflare resources for each environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    command -v wrangler >/dev/null 2>&1 || { log_error "Wrangler CLI is required but not installed."; exit 1; }
    command -v turso >/dev/null 2>&1 || { log_error "Turso CLI is required but not installed."; exit 1; }
    
    # Check for wrangler authentication
    wrangler whoami >/dev/null 2>&1 || { log_error "Not authenticated with Wrangler. Run 'wrangler login' first."; exit 1; }
    
    # Check for turso authentication
    turso auth status >/dev/null 2>&1 || { log_error "Not authenticated with Turso. Run 'turso auth login' first."; exit 1; }
    
    log_info "Prerequisites check passed."
}

# Create KV namespaces
create_kv_namespaces() {
    log_step "Creating KV namespaces..."
    
    # Development namespaces
    log_info "Creating development KV namespaces..."
    wrangler kv:namespace create SESSION_STORE --preview || log_warn "Development SESSION_STORE already exists"
    wrangler kv:namespace create CACHE_STORE --preview || log_warn "Development CACHE_STORE already exists"
    
    # Preview namespaces
    log_info "Creating preview KV namespaces..."
    wrangler kv:namespace create SESSION_STORE --env preview || log_warn "Preview SESSION_STORE already exists"
    wrangler kv:namespace create CACHE_STORE --env preview || log_warn "Preview CACHE_STORE already exists"
    
    # Staging namespaces
    log_info "Creating staging KV namespaces..."
    wrangler kv:namespace create SESSION_STORE --env staging || log_warn "Staging SESSION_STORE already exists"
    wrangler kv:namespace create CACHE_STORE --env staging || log_warn "Staging CACHE_STORE already exists"
    
    # Production namespaces
    log_info "Creating production KV namespaces..."
    wrangler kv:namespace create SESSION_STORE --env production || log_warn "Production SESSION_STORE already exists"
    wrangler kv:namespace create CACHE_STORE --env production || log_warn "Production CACHE_STORE already exists"
    
    log_info "KV namespaces created. Update wrangler.toml with the IDs shown above."
}

# Create R2 buckets
create_r2_buckets() {
    log_step "Creating R2 buckets..."
    
    # Assets buckets
    wrangler r2 bucket create pingtopass-assets || log_warn "pingtopass-assets bucket already exists"
    wrangler r2 bucket create pingtopass-assets-preview || log_warn "pingtopass-assets-preview bucket already exists"
    wrangler r2 bucket create pingtopass-assets-staging || log_warn "pingtopass-assets-staging bucket already exists"
    
    # Backup bucket (production only)
    wrangler r2 bucket create pingtopass-backups || log_warn "pingtopass-backups bucket already exists"
    
    log_info "R2 buckets created."
}

# Create Queues
create_queues() {
    log_step "Creating Queues..."
    
    wrangler queues create pingtopass-tasks || log_warn "pingtopass-tasks queue already exists"
    wrangler queues create pingtopass-dlq || log_warn "pingtopass-dlq queue already exists"
    
    log_info "Queues created."
}

# Create Analytics Engine dataset
create_analytics() {
    log_step "Creating Analytics Engine dataset..."
    
    # Note: Analytics Engine creation via CLI is limited
    log_warn "Please create Analytics Engine dataset 'pingtopass_analytics' via Cloudflare Dashboard"
    log_warn "Navigate to: Workers & Pages > Analytics Engine > Create Dataset"
    
    echo
    read -p "Press Enter once you've created the Analytics Engine dataset..."
}

# Setup Turso databases
setup_turso_databases() {
    log_step "Setting up Turso databases..."
    
    # Development database
    log_info "Creating development database..."
    turso db create pingtopass-dev --location iad || log_warn "pingtopass-dev database already exists"
    
    # Staging database
    log_info "Creating staging database..."
    turso db create pingtopass-staging --location iad || log_warn "pingtopass-staging database already exists"
    
    # Production database with replicas
    log_info "Creating production database with global replicas..."
    turso db create pingtopass-prod --location iad || log_warn "pingtopass-prod database already exists"
    
    # Create replicas for global performance
    log_info "Creating production database replicas..."
    turso db replicate pingtopass-prod ams || log_warn "Amsterdam replica already exists"
    turso db replicate pingtopass-prod sin || log_warn "Singapore replica already exists"
    turso db replicate pingtopass-prod syd || log_warn "Sydney replica already exists"
    
    # Show database URLs
    log_info "Database URLs:"
    echo
    turso db show pingtopass-dev --url
    turso db show pingtopass-staging --url
    turso db show pingtopass-prod --url
    echo
    
    # Generate tokens
    log_info "Generating authentication tokens..."
    echo
    echo "Development token:"
    turso db tokens create pingtopass-dev --expiration never
    echo
    echo "Staging token:"
    turso db tokens create pingtopass-staging --expiration never
    echo
    echo "Production token:"
    turso db tokens create pingtopass-prod --expiration never
    echo
    
    log_warn "Save these URLs and tokens - you'll need them for environment secrets!"
}

# Set environment secrets
set_secrets() {
    local env=$1
    
    log_step "Setting secrets for $env environment..."
    
    echo "You'll need to provide the following secrets:"
    echo "  - TURSO_DATABASE_URL"
    echo "  - TURSO_AUTH_TOKEN"
    echo "  - GOOGLE_CLIENT_SECRET"
    echo "  - JWT_SECRET"
    echo "  - OPENROUTER_API_KEY"
    
    if [ "$env" = "production" ]; then
        echo "  - STRIPE_SECRET_KEY"
        echo "  - STRIPE_WEBHOOK_SECRET"
    fi
    
    echo
    read -p "Do you want to set secrets now? (y/n): " set_now
    
    if [ "$set_now" = "y" ]; then
        # Set each secret
        read -s -p "Enter TURSO_DATABASE_URL: " turso_url
        echo
        wrangler secret put TURSO_DATABASE_URL --env $env <<< "$turso_url"
        
        read -s -p "Enter TURSO_AUTH_TOKEN: " turso_token
        echo
        wrangler secret put TURSO_AUTH_TOKEN --env $env <<< "$turso_token"
        
        read -s -p "Enter GOOGLE_CLIENT_SECRET: " google_secret
        echo
        wrangler secret put GOOGLE_CLIENT_SECRET --env $env <<< "$google_secret"
        
        read -s -p "Enter JWT_SECRET: " jwt_secret
        echo
        wrangler secret put JWT_SECRET --env $env <<< "$jwt_secret"
        
        read -s -p "Enter OPENROUTER_API_KEY: " openrouter_key
        echo
        wrangler secret put OPENROUTER_API_KEY --env $env <<< "$openrouter_key"
        
        if [ "$env" = "production" ]; then
            read -s -p "Enter STRIPE_SECRET_KEY: " stripe_key
            echo
            wrangler secret put STRIPE_SECRET_KEY --env $env <<< "$stripe_key"
            
            read -s -p "Enter STRIPE_WEBHOOK_SECRET: " stripe_webhook
            echo
            wrangler secret put STRIPE_WEBHOOK_SECRET --env $env <<< "$stripe_webhook"
        fi
        
        log_info "Secrets set for $env environment."
    else
        log_warn "Remember to set secrets using: wrangler secret put SECRET_NAME --env $env"
    fi
}

# Generate .env.example file
generate_env_example() {
    log_step "Generating .env.example file..."
    
    cat > .env.example << 'EOF'
# PingToPass Environment Variables
# Copy this file to .env and fill in your values

# Environment
NODE_ENV=development
ENVIRONMENT=development

# Site Configuration
NUXT_PUBLIC_SITE_URL=http://localhost:3000

# Database (Turso)
# Get these from: turso db show <database-name> --url
# and: turso db tokens create <database-name>
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Authentication
# Get from Google Cloud Console: https://console.cloud.google.com/apis/credentials
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Generate with: openssl rand -base64 32
JWT_SECRET=your-jwt-secret-key

# AI Integration
# Get from: https://openrouter.ai/keys
OPENROUTER_API_KEY=sk-or-v1-your-key

# Optional: LangChain tracing
# Get from: https://smith.langchain.com/
LANGCHAIN_API_KEY=ls__your-key
LANGCHAIN_TRACING_V2=false
LANGCHAIN_PROJECT=pingtopass

# Payments (Production only)
# Get from: https://dashboard.stripe.com/test/apikeys
NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
STRIPE_SECRET_KEY=sk_test_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Cloudflare Account (for deployment)
# Get from: https://dash.cloudflare.com/profile/api-tokens
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ACCOUNT_ID=your-account-id
EOF
    
    log_info ".env.example file created."
}

# Main setup flow
main() {
    echo "============================================"
    echo "   PingToPass Environment Setup Script"
    echo "============================================"
    echo
    
    # Check prerequisites
    check_prerequisites
    
    # Create resources
    log_info "Starting environment setup..."
    echo
    
    # KV Namespaces
    read -p "Create KV namespaces? (y/n): " create_kv
    if [ "$create_kv" = "y" ]; then
        create_kv_namespaces
    fi
    echo
    
    # R2 Buckets
    read -p "Create R2 buckets? (y/n): " create_r2
    if [ "$create_r2" = "y" ]; then
        create_r2_buckets
    fi
    echo
    
    # Queues
    read -p "Create Queues? (y/n): " create_q
    if [ "$create_q" = "y" ]; then
        create_queues
    fi
    echo
    
    # Analytics
    read -p "Setup Analytics Engine? (y/n): " create_analytics_dataset
    if [ "$create_analytics_dataset" = "y" ]; then
        create_analytics
    fi
    echo
    
    # Turso databases
    read -p "Setup Turso databases? (y/n): " setup_turso
    if [ "$setup_turso" = "y" ]; then
        setup_turso_databases
    fi
    echo
    
    # Set secrets for each environment
    for env in development preview staging production; do
        read -p "Set secrets for $env environment? (y/n): " set_env_secrets
        if [ "$set_env_secrets" = "y" ]; then
            set_secrets $env
        fi
        echo
    done
    
    # Generate .env.example
    generate_env_example
    
    echo
    log_info "Environment setup complete!"
    echo
    echo "Next steps:"
    echo "1. Update wrangler.toml with the KV namespace IDs shown above"
    echo "2. Copy .env.example to .env and fill in your values"
    echo "3. Run 'pnpm run dev:wrangler' to start local development"
    echo "4. Run './scripts/deploy.sh <environment>' to deploy"
    echo
    echo "Documentation:"
    echo "- Deployment Guide: platform-specification/system-architecture/CLOUDFLARE_DEPLOYMENT_ARCHITECTURE.md"
    echo "- Migration Guide: platform-specification/system-architecture/CLOUDFLARE_WORKERS_MIGRATION.md"
}

# Run main function
main "$@"