#!/bin/bash
# PingToPass Development Environment Setup
#
# This script sets up the complete development environment for PingToPass
# including dependencies, databases, and development tools.
#
# Usage:
#   ./scripts/setup-dev-environment.sh [--skip-deps] [--skip-db] [--skip-ssl]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="PingToPass"
NODE_MIN_VERSION="18.0.0"

# Parse command line arguments
SKIP_DEPS=false
SKIP_DB=false
SKIP_SSL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-db)
      SKIP_DB=true
      shift
      ;;
    --skip-ssl)
      SKIP_SSL=true
      shift
      ;;
    *)
      echo "Unknown option $1"
      echo "Usage: $0 [--skip-deps] [--skip-db] [--skip-ssl]"
      exit 1
      ;;
  esac
done

print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  $PROJECT_NAME Development Environment Setup${NC}"
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

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

version_compare() {
    printf '%s\n%s\n' "$2" "$1" | sort -V -C
}

check_node_version() {
    print_step "Checking Node.js version..."
    
    if ! check_command node; then
        print_error "Node.js is not installed. Please install Node.js >= $NODE_MIN_VERSION"
        echo "Visit: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//')
    
    if version_compare "$node_version" "$NODE_MIN_VERSION"; then
        print_success "Node.js $node_version meets minimum requirement ($NODE_MIN_VERSION)"
    else
        print_error "Node.js $node_version is below minimum requirement ($NODE_MIN_VERSION)"
        echo "Please upgrade Node.js to version $NODE_MIN_VERSION or higher"
        exit 1
    fi
}

install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        print_info "Skipping dependency installation"
        return
    fi
    
    print_step "Installing project dependencies..."
    
    # Check for package manager preference
    if [ -f "pnpm-lock.yaml" ] && check_command pnpm; then
        print_info "Using pnpm package manager"
        pnpm install
    elif [ -f "yarn.lock" ] && check_command yarn; then
        print_info "Using yarn package manager"
        yarn install
    else
        print_info "Using npm package manager"
        npm install
    fi
    
    print_success "Dependencies installed successfully"
}

install_system_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        return
    fi
    
    print_step "Checking system dependencies..."
    
    # Check for Turso CLI
    if ! check_command turso; then
        print_warning "Turso CLI not found. Installing..."
        curl -sSfL https://get.tur.so/install.sh | bash
        
        # Add to PATH for current session
        export PATH="$HOME/.turso:$PATH"
        
        if check_command turso; then
            print_success "Turso CLI installed successfully"
        else
            print_error "Failed to install Turso CLI. Please install manually:"
            echo "curl -sSfL https://get.tur.so/install.sh | bash"
            exit 1
        fi
    else
        print_success "Turso CLI is already installed"
    fi
    
    # Check for Wrangler CLI (should be installed via npm)
    if ! check_command wrangler; then
        print_warning "Wrangler CLI not found in global scope"
        print_info "Wrangler is installed locally as a dev dependency"
        print_info "Use: npx wrangler or npm run wrangler:* commands"
    else
        print_success "Wrangler CLI is available globally"
    fi
    
    # Check for mkcert (for HTTPS development)
    if [ "$SKIP_SSL" = false ] && ! check_command mkcert; then
        print_warning "mkcert not found. This is optional for HTTPS development."
        print_info "To install mkcert:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            echo "  brew install mkcert"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            echo "  # Ubuntu/Debian:"
            echo "  apt install libnss3-tools"
            echo "  curl -JLO 'https://dl.filippo.io/mkcert/latest?for=linux/amd64'"
            echo "  chmod +x mkcert-v*-linux-amd64"
            echo "  sudo cp mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
        fi
    else
        print_success "mkcert is available for HTTPS development"
    fi
}

setup_environment_file() {
    print_step "Setting up environment configuration..."
    
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please update .env with your actual configuration values"
        else
            print_error ".env.example not found. Cannot create .env file."
            exit 1
        fi
    else
        print_info ".env file already exists"
        
        # Check if .env.example is newer
        if [ ".env.example" -nt ".env" ]; then
            print_warning ".env.example is newer than .env"
            print_info "Consider updating your .env file with new variables from .env.example"
        fi
    fi
}

setup_directories() {
    print_step "Creating required directories..."
    
    # Create directories if they don't exist
    local dirs=(
        "backups"
        "certs"
        "logs"
        "uploads"
        "database/migrations"
        ".nuxt"
        ".output"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            print_success "Created directory: $dir"
        fi
    done
    
    # Create .gitkeep files for empty directories that should be tracked
    local keep_dirs=(
        "backups"
        "logs"
        "database/migrations"
    )
    
    for dir in "${keep_dirs[@]}"; do
        if [ ! -f "$dir/.gitkeep" ] && [ ! "$(ls -A $dir)" ]; then
            touch "$dir/.gitkeep"
        fi
    done
}

setup_ssl_certificates() {
    if [ "$SKIP_SSL" = true ]; then
        print_info "Skipping SSL certificate setup"
        return
    fi
    
    print_step "Setting up SSL certificates for HTTPS development..."
    
    if ! check_command mkcert; then
        print_warning "mkcert not available. Skipping SSL setup."
        print_info "You can set up SSL later with: npm run setup:https"
        return
    fi
    
    if [ ! -f "certs/localhost.pem" ] || [ ! -f "certs/localhost-key.pem" ]; then
        print_info "Creating SSL certificates..."
        
        # Install CA in local trust store
        mkcert -install
        
        # Create certificates
        cd certs
        mkcert localhost 127.0.0.1 ::1
        cd ..
        
        print_success "SSL certificates created in certs/ directory"
        print_info "You can now use: npm run dev:https"
    else
        print_success "SSL certificates already exist"
    fi
}

setup_database() {
    if [ "$SKIP_DB" = true ]; then
        print_info "Skipping database setup"
        return
    fi
    
    print_step "Setting up databases..."
    
    # Check if user is logged into Turso
    if ! turso auth token &> /dev/null; then
        print_warning "Not logged into Turso. Please log in first:"
        echo "  turso auth login"
        print_info "After logging in, run: npm run db:setup:dev"
        return
    fi
    
    # Run database setup script
    if [ -x "scripts/setup-databases.sh" ]; then
        print_info "Running database setup for development environment..."
        ./scripts/setup-databases.sh dev
    else
        print_warning "Database setup script not found or not executable"
        print_info "Run manually: npm run db:setup:dev"
    fi
}

run_initial_checks() {
    print_step "Running initial project checks..."
    
    # Type checking
    print_info "Running TypeScript type check..."
    if npm run typecheck; then
        print_success "Type checking passed"
    else
        print_warning "Type checking failed - you may need to fix some issues"
    fi
    
    # Linting
    print_info "Running ESLint..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found - run 'npm run lint:fix' to auto-fix"
    fi
}

show_next_steps() {
    echo
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Setup Complete! Next Steps${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo
    print_success "Development environment setup complete!"
    echo
    echo -e "${YELLOW}📋 Next Steps:${NC}"
    echo "1. Update your .env file with actual API keys and secrets"
    echo "2. Log into Turso if not already done: turso auth login"
    echo "3. Set up databases: npm run db:setup:dev"
    echo "4. Run database migrations: npm run db:migrate"
    echo "5. Seed development data: npm run db:seed"
    echo "6. Start the development server: npm run dev"
    echo
    echo -e "${BLUE}🔧 Available Commands:${NC}"
    echo "  npm run dev                # Start development server"
    echo "  npm run dev:debug          # Start with Node.js inspector"
    echo "  npm run dev:https          # Start with HTTPS (requires SSL setup)"
    echo "  npm run test               # Run unit tests"
    echo "  npm run test:watch         # Run tests in watch mode"
    echo "  npm run db:shell           # Open database shell"
    echo "  npm run db:migrate:status  # Check migration status"
    echo
    echo -e "${BLUE}🔗 Helpful Links:${NC}"
    echo "  Turso Dashboard: https://turso.tech/dashboard"
    echo "  Cloudflare Dashboard: https://dash.cloudflare.com"
    echo "  Documentation: ./platform-specification/"
    echo
    echo -e "${GREEN}🎉 Happy coding!${NC}"
    echo
}

cleanup_on_error() {
    print_error "Setup failed. Please check the error messages above."
    echo "You can run the setup again or manually complete the remaining steps."
    exit 1
}

main() {
    # Trap errors
    trap cleanup_on_error ERR
    
    print_header
    
    # Run setup steps
    check_node_version
    install_system_dependencies
    setup_directories
    install_dependencies
    setup_environment_file
    setup_ssl_certificates
    
    # Database setup (optional, might require manual intervention)
    setup_database
    
    # Optional checks
    run_initial_checks
    
    show_next_steps
}

# Execute main function
main "$@"