#!/bin/bash
# PingToPass Database Setup Script
# 
# This script sets up Turso databases for all environments and creates replicas
# for optimal edge performance.
#
# Prerequisites:
# - Turso CLI installed (curl -sSfL https://get.tur.so/install.sh | bash)
# - Logged into Turso (turso auth login)
#
# Usage:
#   ./scripts/setup-databases.sh [environment]
#   
# Examples:
#   ./scripts/setup-databases.sh all      # Setup all environments
#   ./scripts/setup-databases.sh dev     # Setup only development
#   ./scripts/setup-databases.sh prod    # Setup only production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="pingtopass"
USERNAME=$(whoami)

# Database configurations
DATABASES=(
    "dev|$PROJECT_NAME-dev-$USERNAME|Development database"
    "staging|$PROJECT_NAME-staging-$USERNAME|Staging database"  
    "prod|$PROJECT_NAME-prod-$USERNAME|Production database"
)

# Edge locations for replicas (global coverage)
REPLICA_LOCATIONS=(
    "ams"    # Amsterdam, Netherlands
    "fra"    # Frankfurt, Germany
    "lhr"    # London, UK
    "nrt"    # Tokyo, Japan
    "sjc"    # San Jose, CA
    "syd"    # Sydney, Australia
)

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  PingToPass Database Setup Script${NC}"
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

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if turso CLI is installed
    if ! command -v turso &> /dev/null; then
        print_error "Turso CLI not found. Please install it first:"
        echo "  curl -sSfL https://get.tur.so/install.sh | bash"
        exit 1
    fi
    
    # Check if user is logged in
    if ! turso auth token &> /dev/null; then
        print_error "Not logged into Turso. Please log in first:"
        echo "  turso auth login"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

database_exists() {
    local db_name="$1"
    turso db list | grep -q "^$db_name"
}

create_database() {
    local env="$1"
    local db_name="$2" 
    local description="$3"
    
    print_step "Creating $env database: $db_name"
    
    if database_exists "$db_name"; then
        print_warning "Database $db_name already exists, skipping creation"
        return 0
    fi
    
    # Create database
    turso db create "$db_name"
    
    if [ $? -eq 0 ]; then
        print_success "Database $db_name created successfully"
        
        # Get connection details
        echo "Getting connection details..."
        DB_URL=$(turso db show "$db_name" --url)
        AUTH_TOKEN=$(turso db tokens create "$db_name")
        
        echo
        echo -e "${YELLOW}📋 Database Connection Details for $env:${NC}"
        echo "  Database URL: $DB_URL"
        echo "  Auth Token:   $AUTH_TOKEN"
        echo
        echo -e "${BLUE}💡 Add these to your .env file:${NC}"
        if [ "$env" = "dev" ]; then
            echo "  TURSO_DATABASE_URL=$DB_URL"
            echo "  TURSO_AUTH_TOKEN=$AUTH_TOKEN"
        else
            echo "  TURSO_DATABASE_URL_${env^^}=$DB_URL"
            echo "  TURSO_AUTH_TOKEN_${env^^}=$AUTH_TOKEN"
        fi
        echo
    else
        print_error "Failed to create database $db_name"
        return 1
    fi
}

create_replicas() {
    local db_name="$1"
    
    print_step "Creating edge replicas for $db_name"
    
    for location in "${REPLICA_LOCATIONS[@]}"; do
        echo "  Creating replica in $location..."
        
        if turso db replicate "$db_name" "$location" &> /dev/null; then
            print_success "  Replica created in $location"
        else
            print_warning "  Failed to create replica in $location (may already exist)"
        fi
    done
}

setup_database_schema() {
    local env="$1"
    local db_name="$2"
    
    print_step "Setting up schema for $db_name"
    
    # Check if schema file exists
    if [ ! -f "database/schema.sql" ]; then
        print_error "Schema file not found: database/schema.sql"
        return 1
    fi
    
    # Apply schema using turso shell
    if turso db shell "$db_name" < database/schema.sql; then
        print_success "Schema applied to $db_name"
    else
        print_error "Failed to apply schema to $db_name"
        return 1
    fi
}

setup_environment() {
    local target_env="$1"
    
    for db_config in "${DATABASES[@]}"; do
        IFS='|' read -r env db_name description <<< "$db_config"
        
        if [ "$target_env" = "all" ] || [ "$target_env" = "$env" ]; then
            echo
            print_step "Setting up $env environment"
            
            # Create database
            create_database "$env" "$db_name" "$description"
            
            # Setup schema
            setup_database_schema "$env" "$db_name"
            
            # Create replicas (only for staging and production)
            if [ "$env" != "dev" ]; then
                create_replicas "$db_name"
            fi
            
            print_success "$env environment setup complete"
        fi
    done
}

show_summary() {
    echo
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Setup Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    print_success "Database setup completed successfully!"
    echo
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Copy the connection details above to your .env file"
    echo "2. Run migrations: npm run db:migrate"
    echo "3. Seed development data: npm run db:seed"
    echo "4. Start development server: npm run dev"
    echo
    echo -e "${BLUE}🔧 Useful Commands:${NC}"
    echo "  turso db list                    # List all databases"
    echo "  turso db shell [db-name]         # Connect to database shell"  
    echo "  turso db inspect [db-name]       # Show database info"
    echo "  turso db tokens list [db-name]   # List auth tokens"
    echo
    echo -e "${BLUE}📚 Documentation:${NC}"
    echo "  Turso CLI: https://docs.turso.tech/reference/turso-cli"
    echo "  libSQL:    https://docs.turso.tech/libsql"
    echo
}

cleanup_on_error() {
    print_error "Setup failed. You may need to manually clean up any created resources."
    exit 1
}

main() {
    local env="${1:-all}"
    
    # Trap errors
    trap cleanup_on_error ERR
    
    print_header
    
    # Validate environment argument
    if [ "$env" != "all" ] && [ "$env" != "dev" ] && [ "$env" != "staging" ] && [ "$env" != "prod" ]; then
        print_error "Invalid environment: $env"
        echo "Usage: $0 [all|dev|staging|prod]"
        exit 1
    fi
    
    check_prerequisites
    setup_environment "$env"
    show_summary
}

# Execute main function
main "$@"