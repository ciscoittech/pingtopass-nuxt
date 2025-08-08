#!/bin/bash

# Production Deployment Validation Script
# Ensures the deployment is ready for production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
FAILED_CHECKS=0
WARNINGS=0

echo -e "${BLUE}🔍 PingToPass Production Validation${NC}"
echo -e "${BLUE}================================${NC}"
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"
echo ""

# Function to check a condition
check() {
    local description=$1
    local command=$2
    local critical=${3:-true}
    
    echo -n "Checking $description... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        if [ "$critical" = true ]; then
            echo -e "${RED}✗${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${YELLOW}⚠${NC} (warning)"
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    fi
}

# Function to check file exists
check_file() {
    local file=$1
    local description=$2
    check "$description" "[ -f $file ]"
}

# Function to check command exists
check_command() {
    local cmd=$1
    check "$cmd installed" "command -v $cmd"
}

echo -e "${BLUE}1. Prerequisites Check${NC}"
echo "----------------------"
check_command "node"
check_command "pnpm"
check_command "wrangler"
check_command "turso"
check_command "gh"
echo ""

echo -e "${BLUE}2. Configuration Files${NC}"
echo "----------------------"
check_file "wrangler.toml" "wrangler.toml exists"
check_file "nuxt.config.ts" "nuxt.config.ts exists"
check_file "package.json" "package.json exists"
check_file "drizzle.config.ts" "drizzle.config.ts exists"
echo ""

echo -e "${BLUE}3. Build Verification${NC}"
echo "--------------------"
check "dependencies installed" "[ -d node_modules ]"
check "build succeeds" "pnpm build"
check "output directory created" "[ -d .output ]"
check "server bundle exists" "[ -f .output/server/index.mjs ]"
echo ""

echo -e "${BLUE}4. Environment Variables${NC}"
echo "-----------------------"
# Check if secrets are set (can't check values for security)
if [ "$ENVIRONMENT" = "production" ]; then
    check "TURSO_DATABASE_URL configured" "wrangler secret list --env production | grep -q TURSO_DATABASE_URL" false
    check "GOOGLE_CLIENT_SECRET configured" "wrangler secret list --env production | grep -q GOOGLE_CLIENT_SECRET" false
    check "OPENROUTER_API_KEY configured" "wrangler secret list --env production | grep -q OPENROUTER_API_KEY" false
    check "JWT_SECRET configured" "wrangler secret list --env production | grep -q JWT_SECRET"
fi
echo ""

echo -e "${BLUE}5. Test Suite${NC}"
echo "------------"
check "unit tests pass" "pnpm test:unit" false
check "lint passes" "pnpm lint" false
check "type check passes" "pnpm typecheck"
echo ""

echo -e "${BLUE}6. Security Checks${NC}"
echo "-----------------"
check "no npm vulnerabilities" "npm audit --audit-level=high" false
check "no exposed secrets in code" "! grep -r 'sk-\|pk_test\|GOCSPX' --include='*.ts' --include='*.js' --include='*.vue' . 2>/dev/null"
check ".env not in git" "! git ls-files | grep -q '^\.env$'"
echo ""

echo -e "${BLUE}7. Database Connectivity${NC}"
echo "-----------------------"
if [ "$ENVIRONMENT" = "production" ]; then
    check "production database accessible" "turso db show pingtopass-prod" false
    check "database has replicas" "turso db show pingtopass-prod --replicas | grep -q 'ams\|sjc'" false
fi
echo ""

echo -e "${BLUE}8. Performance Checks${NC}"
echo "--------------------"
check "bundle size < 10MB" "[ $(du -m .output | tail -1 | cut -f1) -lt 10 ]" false
check "no large dependencies" "! pnpm list --depth=0 | grep -E 'moment|lodash[^-]'" false
echo ""

echo -e "${BLUE}9. GitHub Checks${NC}"
echo "---------------"
check "on correct branch" "[ \"$ENVIRONMENT\" != \"production\" ] || git branch --show-current | grep -qE '^(main|master)$'" false
check "no uncommitted changes" "git diff-index --quiet HEAD --"
check "remote is up-to-date" "git fetch && [ $(git rev-list HEAD...origin/$(git branch --show-current) --count) -eq 0 ]" false
echo ""

echo -e "${BLUE}10. Monitoring Setup${NC}"
echo "-------------------"
check "health endpoint configured" "grep -q '/api/monitoring/health' server/api/" false
check "error handler configured" "[ -f server/middleware/error-handler.ts ]" false
check "logging configured" "[ -f server/utils/logger.ts ]" false
echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}================================${NC}"

if [ $FAILED_CHECKS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}Ready for production deployment.${NC}"
    exit 0
elif [ $FAILED_CHECKS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warnings${NC}"
    echo -e "${YELLOW}Review warnings before deploying to production.${NC}"
    exit 0
else
    echo -e "${RED}❌ Validation failed!${NC}"
    echo -e "${RED}Critical issues: $FAILED_CHECKS${NC}"
    echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
    echo ""
    echo -e "${RED}Please fix critical issues before deploying.${NC}"
    exit 1
fi