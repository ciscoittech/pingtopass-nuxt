#!/bin/bash
# PingToPass Secret Management Script
# Manages secrets across all environments with safety checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENTS=("development" "preview" "staging" "production")
REQUIRED_SECRETS=("TURSO_DATABASE_URL" "TURSO_AUTH_TOKEN" "GOOGLE_CLIENT_SECRET" "JWT_SECRET" "OPENROUTER_API_KEY")
PRODUCTION_SECRETS=("STRIPE_SECRET_KEY" "STRIPE_WEBHOOK_SECRET")

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
    
    # Check for wrangler authentication
    wrangler whoami >/dev/null 2>&1 || { log_error "Not authenticated with Wrangler. Run 'wrangler login' first."; exit 1; }
    
    log_info "Prerequisites check passed."
}

# Validate environment
validate_environment() {
    local env=$1
    
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment: $env"
        echo "Valid environments: ${ENVIRONMENTS[@]}"
        exit 1
    fi
}

# List current secrets
list_secrets() {
    local env=$1
    
    log_step "Listing secrets for $env environment..."
    
    if [ "$env" = "development" ]; then
        wrangler secret list
    else
        wrangler secret list --env $env
    fi
}

# Set a single secret
set_secret() {
    local env=$1
    local secret_name=$2
    local secret_value=$3
    
    log_info "Setting $secret_name for $env environment..."
    
    if [ -z "$secret_value" ]; then
        read -s -p "Enter value for $secret_name: " secret_value
        echo
    fi
    
    if [ "$env" = "development" ]; then
        wrangler secret put "$secret_name" <<< "$secret_value"
    else
        wrangler secret put "$secret_name" --env "$env" <<< "$secret_value"
    fi
    
    log_info "$secret_name set successfully."
}

# Set all required secrets for environment
set_all_secrets() {
    local env=$1
    
    log_step "Setting all secrets for $env environment..."
    
    # Get all required secrets
    local all_secrets=("${REQUIRED_SECRETS[@]}")
    
    # Add production secrets if needed
    if [ "$env" = "production" ]; then
        all_secrets+=("${PRODUCTION_SECRETS[@]}")
    fi
    
    # Set each secret
    for secret in "${all_secrets[@]}"; do
        echo
        set_secret "$env" "$secret"
    done
    
    log_info "All secrets set for $env environment."
}

# Delete a secret
delete_secret() {
    local env=$1
    local secret_name=$2
    
    log_warn "Deleting $secret_name from $env environment..."
    
    read -p "Are you sure you want to delete $secret_name? (y/n): " confirmation
    if [ "$confirmation" != "y" ]; then
        log_info "Secret deletion cancelled."
        return 0
    fi
    
    if [ "$env" = "development" ]; then
        wrangler secret delete "$secret_name"
    else
        wrangler secret delete "$secret_name" --env "$env"
    fi
    
    log_info "$secret_name deleted from $env environment."
}

# Backup secrets (list and save to file)
backup_secrets() {
    local env=$1
    local backup_file="secrets-backup-$env-$(date +%Y%m%d-%H%M%S).txt"
    
    log_step "Backing up secrets list for $env environment..."
    
    echo "# PingToPass Secrets Backup - $env Environment" > "$backup_file"
    echo "# Generated: $(date)" >> "$backup_file"
    echo "# Note: Only secret names are backed up, not values" >> "$backup_file"
    echo >> "$backup_file"
    
    if [ "$env" = "development" ]; then
        wrangler secret list >> "$backup_file"
    else
        wrangler secret list --env "$env" >> "$backup_file"
    fi
    
    log_info "Secrets list backed up to: $backup_file"
}

# Rotate JWT secret
rotate_jwt_secret() {
    local env=$1
    
    log_step "Rotating JWT secret for $env environment..."
    
    # Generate new JWT secret
    local new_jwt_secret=$(openssl rand -base64 32)
    
    log_warn "This will invalidate all existing user sessions!"
    read -p "Are you sure you want to rotate the JWT secret? (y/n): " confirmation
    if [ "$confirmation" != "y" ]; then
        log_info "JWT secret rotation cancelled."
        return 0
    fi
    
    # Set new JWT secret
    set_secret "$env" "JWT_SECRET" "$new_jwt_secret"
    
    log_info "JWT secret rotated successfully."
    log_warn "Remember to deploy the application to activate the new secret."
}

# Validate required secrets
validate_secrets() {
    local env=$1
    
    log_step "Validating secrets for $env environment..."
    
    # Get current secrets list
    local current_secrets
    if [ "$env" = "development" ]; then
        current_secrets=$(wrangler secret list --format json 2>/dev/null || echo '[]')
    else
        current_secrets=$(wrangler secret list --env "$env" --format json 2>/dev/null || echo '[]')
    fi
    
    # Check required secrets
    local missing_secrets=()
    local all_required=("${REQUIRED_SECRETS[@]}")
    
    if [ "$env" = "production" ]; then
        all_required+=("${PRODUCTION_SECRETS[@]}")
    fi
    
    for secret in "${all_required[@]}"; do
        if ! echo "$current_secrets" | grep -q "\"$secret\""; then
            missing_secrets+=("$secret")
        fi
    done
    
    if [ ${#missing_secrets[@]} -eq 0 ]; then
        log_info "All required secrets are present for $env environment."
        return 0
    else
        log_error "Missing secrets in $env environment:"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
        return 1
    fi
}

# Copy secrets from one environment to another
copy_secrets() {
    local source_env=$1
    local target_env=$2
    
    validate_environment "$source_env"
    validate_environment "$target_env"
    
    log_step "Copying secrets from $source_env to $target_env..."
    
    log_warn "This operation cannot copy secret values automatically."
    log_warn "You will need to manually enter each secret value."
    
    read -p "Do you want to continue? (y/n): " confirmation
    if [ "$confirmation" != "y" ]; then
        log_info "Secret copying cancelled."
        return 0
    fi
    
    # Get secrets from source environment
    log_info "Getting secret list from $source_env..."
    
    # Set all required secrets in target environment
    set_all_secrets "$target_env"
    
    log_info "Secrets copied from $source_env to $target_env."
}

# Interactive secret management menu
interactive_menu() {
    local env=$1
    
    while true; do
        echo
        echo "======================================"
        echo "  Secret Management - $env"
        echo "======================================"
        echo "1. List current secrets"
        echo "2. Set a single secret"
        echo "3. Set all required secrets"
        echo "4. Delete a secret"
        echo "5. Rotate JWT secret"
        echo "6. Validate secrets"
        echo "7. Backup secrets list"
        echo "8. Return to main menu"
        echo
        read -p "Choose an option (1-8): " choice
        
        case $choice in
            1)
                list_secrets "$env"
                ;;
            2)
                read -p "Enter secret name: " secret_name
                set_secret "$env" "$secret_name"
                ;;
            3)
                set_all_secrets "$env"
                ;;
            4)
                read -p "Enter secret name to delete: " secret_name
                delete_secret "$env" "$secret_name"
                ;;
            5)
                rotate_jwt_secret "$env"
                ;;
            6)
                validate_secrets "$env"
                ;;
            7)
                backup_secrets "$env"
                ;;
            8)
                break
                ;;
            *)
                log_error "Invalid option. Please choose 1-8."
                ;;
        esac
    done
}

# Main menu
main_menu() {
    while true; do
        echo
        echo "============================================"
        echo "   PingToPass Secret Management Script"
        echo "============================================"
        echo "1. Manage development secrets"
        echo "2. Manage preview secrets"
        echo "3. Manage staging secrets"
        echo "4. Manage production secrets"
        echo "5. Copy secrets between environments"
        echo "6. Validate all environments"
        echo "7. Exit"
        echo
        read -p "Choose an option (1-7): " choice
        
        case $choice in
            1)
                interactive_menu "development"
                ;;
            2)
                interactive_menu "preview"
                ;;
            3)
                interactive_menu "staging"
                ;;
            4)
                log_warn "Managing PRODUCTION secrets!"
                read -p "Are you sure? Type 'yes' to continue: " confirmation
                if [ "$confirmation" = "yes" ]; then
                    interactive_menu "production"
                fi
                ;;
            5)
                echo "Available environments: ${ENVIRONMENTS[@]}"
                read -p "Source environment: " source_env
                read -p "Target environment: " target_env
                copy_secrets "$source_env" "$target_env"
                ;;
            6)
                for env in "${ENVIRONMENTS[@]}"; do
                    echo
                    validate_secrets "$env"
                done
                ;;
            7)
                log_info "Goodbye!"
                exit 0
                ;;
            *)
                log_error "Invalid option. Please choose 1-7."
                ;;
        esac
    done
}

# Command line interface
if [ $# -gt 0 ]; then
    ACTION=$1
    ENVIRONMENT=$2
    SECRET_NAME=$3
    SECRET_VALUE=$4
    
    case $ACTION in
        list)
            validate_environment "$ENVIRONMENT"
            list_secrets "$ENVIRONMENT"
            ;;
        set)
            validate_environment "$ENVIRONMENT"
            if [ -z "$SECRET_NAME" ]; then
                log_error "Secret name is required"
                echo "Usage: $0 set <environment> <secret_name> [secret_value]"
                exit 1
            fi
            set_secret "$ENVIRONMENT" "$SECRET_NAME" "$SECRET_VALUE"
            ;;
        set-all)
            validate_environment "$ENVIRONMENT"
            set_all_secrets "$ENVIRONMENT"
            ;;
        delete)
            validate_environment "$ENVIRONMENT"
            if [ -z "$SECRET_NAME" ]; then
                log_error "Secret name is required"
                echo "Usage: $0 delete <environment> <secret_name>"
                exit 1
            fi
            delete_secret "$ENVIRONMENT" "$SECRET_NAME"
            ;;
        validate)
            if [ -z "$ENVIRONMENT" ]; then
                # Validate all environments
                for env in "${ENVIRONMENTS[@]}"; do
                    validate_secrets "$env"
                done
            else
                validate_environment "$ENVIRONMENT"
                validate_secrets "$ENVIRONMENT"
            fi
            ;;
        backup)
            validate_environment "$ENVIRONMENT"
            backup_secrets "$ENVIRONMENT"
            ;;
        rotate-jwt)
            validate_environment "$ENVIRONMENT"
            rotate_jwt_secret "$ENVIRONMENT"
            ;;
        *)
            echo "Usage: $0 <action> [environment] [options]"
            echo
            echo "Actions:"
            echo "  list <env>                    - List secrets for environment"
            echo "  set <env> <name> [value]      - Set a secret"
            echo "  set-all <env>                 - Set all required secrets"
            echo "  delete <env> <name>           - Delete a secret"
            echo "  validate [env]                - Validate secrets (all envs if not specified)"
            echo "  backup <env>                  - Backup secrets list"
            echo "  rotate-jwt <env>              - Rotate JWT secret"
            echo
            echo "Environments: ${ENVIRONMENTS[@]}"
            echo
            echo "Run without arguments for interactive mode."
            exit 1
            ;;
    esac
else
    # Interactive mode
    check_prerequisites
    main_menu
fi