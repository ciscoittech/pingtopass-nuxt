#!/bin/bash

# GitHub Secrets Setup Script for PingToPass CI/CD Pipeline
# This script helps you set up all required GitHub secrets for the workflows

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# GitHub CLI check
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed. Please install it first:${NC}"
    echo -e "${BLUE}  https://cli.github.com/${NC}"
    exit 1
fi

# Check if logged in to GitHub CLI
if ! gh auth status &> /dev/null; then
    echo -e "${RED}❌ You are not logged in to GitHub CLI. Please run:${NC}"
    echo -e "${BLUE}  gh auth login${NC}"
    exit 1
fi

echo -e "${BLUE}🔧 PingToPass CI/CD - GitHub Secrets Setup${NC}"
echo -e "${BLUE}===========================================${NC}"
echo ""

# Get repository info
REPO=$(gh repo view --json owner,name --jq '.owner.login + "/" + .name')
echo -e "${GREEN}Repository: $REPO${NC}"
echo ""

# Function to set secret securely
set_secret() {
    local secret_name="$1"
    local description="$2"
    local example="$3"
    local required="$4"
    
    echo -e "${PURPLE}🔐 Setting up: $secret_name${NC}"
    echo -e "${YELLOW}Description: $description${NC}"
    
    if [ -n "$example" ]; then
        echo -e "${YELLOW}Example: $example${NC}"
    fi
    
    echo -n "Enter value for $secret_name: "
    read -s secret_value
    echo ""
    
    if [ -z "$secret_value" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ This secret is required!${NC}"
            return 1
        else
            echo -e "${YELLOW}⏭️  Skipping optional secret${NC}"
            echo ""
            return 0
        fi
    fi
    
    # Set the secret using GitHub CLI
    echo "$secret_value" | gh secret set "$secret_name" --body -
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully set $secret_name${NC}"
    else
        echo -e "${RED}❌ Failed to set $secret_name${NC}"
        return 1
    fi
    
    echo ""
}

# Function to check if secret exists
secret_exists() {
    local secret_name="$1"
    gh secret list --json name | jq -r '.[].name' | grep -q "^$secret_name$"
}

echo -e "${BLUE}📋 Required Secrets Checklist${NC}"
echo -e "${BLUE}=============================${NC}"

# Check existing secrets
echo -e "${YELLOW}Checking existing secrets...${NC}"
existing_secrets=$(gh secret list --json name --jq '.[].name' | sort)
if [ -n "$existing_secrets" ]; then
    echo -e "${GREEN}Existing secrets:${NC}"
    echo "$existing_secrets" | sed 's/^/  - /'
else
    echo -e "${YELLOW}No existing secrets found${NC}"
fi
echo ""

echo -e "${BLUE}🌐 CLOUDFLARE CONFIGURATION${NC}"
echo -e "${BLUE}============================${NC}"

# Cloudflare API Token
if secret_exists "CLOUDFLARE_API_TOKEN"; then
    echo -e "${GREEN}✅ CLOUDFLARE_API_TOKEN already exists${NC}"
else
    echo -e "${YELLOW}How to get your Cloudflare API Token:${NC}"
    echo "1. Go to https://dash.cloudflare.com/profile/api-tokens"
    echo "2. Click 'Create Token'"
    echo "3. Use 'Edit Cloudflare Workers' template"
    echo "4. Select your account and zone"
    echo "5. Copy the generated token"
    echo ""
    set_secret "CLOUDFLARE_API_TOKEN" "Cloudflare API token with Workers permissions" "abcdef1234567890..." "true"
fi

# Cloudflare Account ID
if secret_exists "CLOUDFLARE_ACCOUNT_ID"; then
    echo -e "${GREEN}✅ CLOUDFLARE_ACCOUNT_ID already exists${NC}"
else
    echo -e "${YELLOW}How to get your Cloudflare Account ID:${NC}"
    echo "1. Go to https://dash.cloudflare.com/"
    echo "2. Select your domain"
    echo "3. Look for 'Account ID' in the right sidebar"
    echo "4. Copy the ID"
    echo ""
    set_secret "CLOUDFLARE_ACCOUNT_ID" "Cloudflare account ID" "1234567890abcdef..." "true"
fi

echo -e "${BLUE}🗄️  DATABASE CONFIGURATION (TURSO)${NC}"
echo -e "${BLUE}==================================${NC}"

# Turso Database URL (Production)
if secret_exists "TURSO_DATABASE_URL"; then
    echo -e "${GREEN}✅ TURSO_DATABASE_URL already exists${NC}"
else
    echo -e "${YELLOW}How to get your Turso Database URL:${NC}"
    echo "1. Run: turso db show pingtopass-prod --url"
    echo "2. Copy the libsql:// URL"
    echo ""
    set_secret "TURSO_DATABASE_URL" "Production Turso database URL" "libsql://pingtopass-prod.turso.io" "true"
fi

# Turso Auth Token (Production)
if secret_exists "TURSO_AUTH_TOKEN"; then
    echo -e "${GREEN}✅ TURSO_AUTH_TOKEN already exists${NC}"
else
    echo -e "${YELLOW}How to get your Turso Auth Token:${NC}"
    echo "1. Run: turso db tokens create pingtopass-prod"
    echo "2. Copy the generated token"
    echo ""
    set_secret "TURSO_AUTH_TOKEN" "Production Turso database auth token" "eyJ0eXAiOiJKV1QiLCJhbG..." "true"
fi

# Optional: Preview/Staging Database
echo -e "${YELLOW}Optional: Preview/Staging Database Credentials${NC}"

if secret_exists "TURSO_DATABASE_URL_PREVIEW"; then
    echo -e "${GREEN}✅ TURSO_DATABASE_URL_PREVIEW already exists${NC}"
else
    echo -e "${YELLOW}For preview deployments (optional):${NC}"
    echo "1. Create preview database: turso db create pingtopass-preview"
    echo "2. Get URL: turso db show pingtopass-preview --url"
    echo ""
    set_secret "TURSO_DATABASE_URL_PREVIEW" "Preview Turso database URL (optional)" "libsql://pingtopass-preview.turso.io" "false"
fi

if secret_exists "TURSO_AUTH_TOKEN_PREVIEW"; then
    echo -e "${GREEN}✅ TURSO_AUTH_TOKEN_PREVIEW already exists${NC}"
else
    echo -e "${YELLOW}Preview database auth token (optional):${NC}"
    set_secret "TURSO_AUTH_TOKEN_PREVIEW" "Preview Turso database auth token (optional)" "eyJ0eXAiOiJKV1QiLCJhbG..." "false"
fi

echo -e "${BLUE}🔒 OPTIONAL SECURITY SCANNING${NC}"
echo -e "${BLUE}============================${NC}"

if secret_exists "SNYK_TOKEN"; then
    echo -e "${GREEN}✅ SNYK_TOKEN already exists${NC}"
else
    echo -e "${YELLOW}Snyk Token (optional for enhanced security scanning):${NC}"
    echo "1. Sign up at https://snyk.io/"
    echo "2. Go to Account Settings > API Token"
    echo "3. Copy your token"
    echo ""
    set_secret "SNYK_TOKEN" "Snyk API token for vulnerability scanning (optional)" "12345678-1234-1234-1234-123456789012" "false"
fi

echo -e "${BLUE}🎯 SETUP COMPLETE!${NC}"
echo -e "${BLUE}==================${NC}"

# List all secrets again
echo -e "${GREEN}All configured secrets:${NC}"
gh secret list --json name --jq '.[].name' | sort | sed 's/^/  ✅ /'

echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Create a Pull Request to test the workflows"
echo "2. Check the Actions tab to see workflows running"
echo "3. Review the deployment environments in GitHub Settings"
echo "4. Set up branch protection rules for main/develop branches"
echo ""
echo -e "${YELLOW}📚 Useful Commands:${NC}"
echo "  List secrets:     gh secret list"
echo "  Delete secret:    gh secret delete SECRET_NAME"
echo "  View workflows:   gh workflow list"
echo "  Run workflow:     gh workflow run deploy.yml"
echo ""
echo -e "${GREEN}✨ Your CI/CD pipeline is ready to go!${NC}"