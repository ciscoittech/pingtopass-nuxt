#!/bin/bash
# PingToPass Setup Validation Script
#
# This script validates that the development environment is properly configured
# and all required components are working correctly.
#
# Usage:
#   ./scripts/validate-setup.sh [--fix] [--verbose]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FIX_ISSUES=false
VERBOSE=false
ISSUES_FOUND=0
WARNINGS_FOUND=0

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --fix)
      FIX_ISSUES=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: $0 [--fix] [--verbose]"
      exit 1
      ;;
  esac
done

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  PingToPass Setup Validation${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
}

print_section() {
    echo -e "${BLUE}🔹 $1${NC}"
}

print_check() {
    if [ "$VERBOSE" = true ]; then
        echo -e "  ➤ $1"
    fi
}

print_success() {
    echo -e "${GREEN}  ✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}  ⚠️  $1${NC}"
    ((WARNINGS_FOUND++))
}

print_error() {
    echo -e "${RED}  ❌ $1${NC}"
    ((ISSUES_FOUND++))
}

print_info() {
    echo -e "${YELLOW}  💡 $1${NC}"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    fi
    return 1
}

check_file() {
    if [ -f "$1" ]; then
        return 0
    fi
    return 1
}

check_directory() {
    if [ -d "$1" ]; then
        return 0
    fi
    return 1
}

validate_node_environment() {
    print_section "Node.js Environment"
    
    print_check "Checking Node.js installation..."
    if check_command node; then
        local node_version=$(node --version)
        local major_version=$(echo "$node_version" | sed 's/v//' | cut -d. -f1)
        
        if [ "$major_version" -ge 18 ]; then
            print_success "Node.js $node_version (meets minimum requirement >= 18.0.0)"
        else
            print_error "Node.js $node_version is below minimum requirement (18.0.0)"
            print_info "Please upgrade Node.js: https://nodejs.org/"
        fi
    else
        print_error "Node.js not found"
        print_info "Install Node.js: https://nodejs.org/"
    fi
    
    print_check "Checking npm..."
    if check_command npm; then
        local npm_version=$(npm --version)
        print_success "npm $npm_version is available"
    else
        print_error "npm not found (should come with Node.js)"
    fi
    
    print_check "Checking package.json..."
    if check_file "package.json"; then
        print_success "package.json exists"
    else
        print_error "package.json not found"
    fi
}

validate_project_structure() {
    print_section "Project Structure"
    
    local required_files=(
        "package.json"
        "nuxt.config.ts"
        "wrangler.toml"
        "tsconfig.json"
        ".env.example"
        "database/schema.sql"
        "database/migrate.ts"
        "database/seed.ts"
    )
    
    local required_directories=(
        "server"
        "server/api"
        "server/utils"
        "database"
        "scripts"
        "backups"
        "certs"
        "logs"
    )
    
    for file in "${required_files[@]}"; do
        print_check "Checking $file..."
        if check_file "$file"; then
            print_success "$file exists"
        else
            print_error "$file is missing"
            
            if [ "$FIX_ISSUES" = true ]; then
                case "$file" in
                    "backups/.gitkeep"|"certs/.gitkeep"|"logs/.gitkeep")
                        touch "$file"
                        print_info "Created $file"
                        ;;
                esac
            fi
        fi
    done
    
    for dir in "${required_directories[@]}"; do
        print_check "Checking directory $dir..."
        if check_directory "$dir"; then
            print_success "Directory $dir exists"
        else
            print_error "Directory $dir is missing"
            
            if [ "$FIX_ISSUES" = true ]; then
                mkdir -p "$dir"
                print_info "Created directory $dir"
            fi
        fi
    done
}

validate_dependencies() {
    print_section "Project Dependencies"
    
    print_check "Checking if dependencies are installed..."
    if check_directory "node_modules"; then
        print_success "node_modules directory exists"
        
        # Check key dependencies
        local key_deps=(
            "@libsql/client"
            "@nuxt/ui"
            "nuxt"
            "wrangler"
            "tsx"
        )
        
        for dep in "${key_deps[@]}"; do
            if check_directory "node_modules/$dep"; then
                print_success "$dep is installed"
            else
                print_error "$dep is not installed"
                
                if [ "$FIX_ISSUES" = true ]; then
                    print_info "Run 'npm install' to install missing dependencies"
                fi
            fi
        done
    else
        print_error "Dependencies not installed (node_modules missing)"
        
        if [ "$FIX_ISSUES" = true ]; then
            print_info "Installing dependencies..."
            npm install
            print_success "Dependencies installed"
        else
            print_info "Run 'npm install' to install dependencies"
        fi
    fi
}

validate_environment_config() {
    print_section "Environment Configuration"
    
    print_check "Checking .env file..."
    if check_file ".env"; then
        print_success ".env file exists"
        
        # Check for required environment variables
        local required_vars=(
            "TURSO_DATABASE_URL"
            "TURSO_AUTH_TOKEN"
            "JWT_SECRET"
            "GOOGLE_CLIENT_ID"
            "GOOGLE_CLIENT_SECRET"
        )
        
        for var in "${required_vars[@]}"; do
            if grep -q "^$var=" .env && ! grep -q "^$var=your-" .env; then
                print_success "$var is configured"
            else
                print_warning "$var is not configured or using placeholder value"
                print_info "Update $var in .env file"
            fi
        done
        
        # Check for optional but recommended variables
        local optional_vars=(
            "OPENROUTER_API_KEY"
            "STRIPE_SECRET_KEY"
            "CLOUDFLARE_API_TOKEN"
        )
        
        for var in "${optional_vars[@]}"; do
            if grep -q "^$var=" .env && ! grep -q "^$var=your-" .env; then
                print_success "$var is configured"
            else
                print_warning "$var is not configured (optional for basic development)"
            fi
        done
    else
        print_error ".env file not found"
        
        if [ "$FIX_ISSUES" = true ] && check_file ".env.example"; then
            cp .env.example .env
            print_info "Created .env from .env.example"
            print_warning "Please update .env with your actual values"
        else
            print_info "Copy .env.example to .env and configure your values"
        fi
    fi
}

validate_system_tools() {
    print_section "System Tools"
    
    print_check "Checking Turso CLI..."
    if check_command turso; then
        print_success "Turso CLI is installed"
        
        # Check if user is logged in
        if turso auth token &> /dev/null; then
            print_success "Authenticated with Turso"
        else
            print_warning "Not authenticated with Turso"
            print_info "Run 'turso auth login' to authenticate"
        fi
    else
        print_error "Turso CLI not found"
        print_info "Install: curl -sSfL https://get.tur.so/install.sh | bash"
    fi
    
    print_check "Checking Wrangler CLI..."
    if check_command wrangler || check_command npx; then
        if check_command wrangler; then
            print_success "Wrangler CLI is available globally"
        else
            print_success "Wrangler available via npx"
        fi
        
        # Check Cloudflare authentication
        if wrangler whoami &> /dev/null || npx wrangler whoami &> /dev/null; then
            print_success "Authenticated with Cloudflare"
        else
            print_warning "Not authenticated with Cloudflare"
            print_info "Run 'wrangler login' or 'npx wrangler login'"
        fi
    else
        print_error "Wrangler CLI not available"
        print_info "Should be installed as dev dependency"
    fi
    
    print_check "Checking mkcert (optional)..."
    if check_command mkcert; then
        print_success "mkcert is available for HTTPS development"
    else
        print_warning "mkcert not found (optional for HTTPS development)"
        print_info "Install for HTTPS: brew install mkcert (macOS) or see docs"
    fi
}

validate_build_process() {
    print_section "Build Process"
    
    print_check "Testing TypeScript compilation..."
    if npm run typecheck &> /dev/null; then
        print_success "TypeScript compilation succeeds"
    else
        print_error "TypeScript compilation failed"
        print_info "Run 'npm run typecheck' to see specific errors"
    fi
    
    print_check "Testing ESLint..."
    if npm run lint &> /dev/null; then
        print_success "ESLint passes"
    else
        print_warning "ESLint found issues"
        print_info "Run 'npm run lint' to see issues, 'npm run lint:fix' to auto-fix"
    fi
    
    print_check "Testing build process..."
    if [ "$VERBOSE" = true ]; then
        if npm run build &> build.log; then
            print_success "Build process succeeds"
            rm -f build.log
        else
            print_error "Build process failed"
            print_info "Check build.log for details"
        fi
    else
        print_info "Skipping build test (use --verbose to run)"
    fi
}

validate_database_setup() {
    print_section "Database Configuration"
    
    if check_file ".env" && grep -q "^TURSO_DATABASE_URL=" .env; then
        local db_url=$(grep "^TURSO_DATABASE_URL=" .env | cut -d'=' -f2)
        local auth_token=$(grep "^TURSO_AUTH_TOKEN=" .env | cut -d'=' -f2)
        
        if [[ "$db_url" != *"your-"* ]] && [[ "$auth_token" != *"your-"* ]]; then
            print_check "Testing database connection..."
            
            # Test database connection using Node.js script
            cat > test_db_connection.js << 'EOF'
const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function testConnection() {
  try {
    const result = await client.execute('SELECT 1 as test');
    console.log('SUCCESS');
  } catch (error) {
    console.log('ERROR:', error.message);
  }
}

testConnection();
EOF
            
            local connection_result=$(node test_db_connection.js 2>&1)
            rm -f test_db_connection.js
            
            if [[ "$connection_result" == *"SUCCESS"* ]]; then
                print_success "Database connection succeeds"
            else
                print_error "Database connection failed"
                print_info "Check database URL and auth token in .env"
            fi
        else
            print_warning "Database credentials not configured"
            print_info "Update TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env"
        fi
    else
        print_warning "Database configuration not found"
        print_info "Configure database settings in .env file"
    fi
    
    print_check "Checking migration scripts..."
    if check_file "database/migrate.ts"; then
        print_success "Migration script exists"
    else
        print_error "Migration script missing"
    fi
    
    print_check "Checking seed script..."
    if check_file "database/seed.ts"; then
        print_success "Seed script exists"
    else
        print_error "Seed script missing"
    fi
}

validate_scripts() {
    print_section "NPM Scripts"
    
    local key_scripts=(
        "dev"
        "build"
        "test"
        "typecheck"
        "lint"
        "db:migrate"
        "db:seed"
    )
    
    for script in "${key_scripts[@]}"; do
        print_check "Checking npm script: $script"
        if npm run "$script" --silent &> /dev/null || grep -q "\"$script\":" package.json; then
            print_success "Script '$script' is available"
        else
            print_error "Script '$script' not found or failed"
        fi
    done
}

show_summary() {
    echo
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Validation Summary${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    
    if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
        print_success "All validation checks passed! ✨"
        echo
        echo -e "${GREEN}🚀 Your development environment is ready!${NC}"
        echo
        echo "Next steps:"
        echo "1. Start the development server: npm run dev"
        echo "2. Open http://localhost:3000 in your browser"
        echo "3. Begin developing your features!"
    elif [ $ISSUES_FOUND -eq 0 ]; then
        print_success "No critical issues found!"
        echo -e "${YELLOW}Found $WARNINGS_FOUND warnings that should be addressed.${NC}"
        echo
        echo "Your environment should work, but consider fixing the warnings above."
    else
        echo -e "${RED}❌ Found $ISSUES_FOUND critical issues and $WARNINGS_FOUND warnings.${NC}"
        echo
        echo "Please fix the critical issues before proceeding:"
        
        if [ "$FIX_ISSUES" = false ]; then
            echo
            echo -e "${YELLOW}💡 Tip: Run with --fix flag to automatically fix some issues:${NC}"
            echo "  ./scripts/validate-setup.sh --fix"
        fi
    fi
    
    echo
    echo -e "${BLUE}🔧 Useful commands:${NC}"
    echo "  npm run dev          # Start development server"
    echo "  npm run test:all     # Run all tests"
    echo "  npm run db:migrate   # Run database migrations"
    echo "  npm run db:seed      # Seed database with sample data"
    echo
}

main() {
    print_header
    
    validate_node_environment
    validate_project_structure
    validate_dependencies
    validate_environment_config
    validate_system_tools
    validate_build_process
    validate_database_setup
    validate_scripts
    
    show_summary
    
    # Exit with error code if critical issues found
    if [ $ISSUES_FOUND -gt 0 ]; then
        exit 1
    fi
}

# Execute main function
main "$@"