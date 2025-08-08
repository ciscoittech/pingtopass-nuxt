#!/bin/bash

# ============================================
# PingToPass Development Launcher with Prompts
# ============================================
# This script launches Warp terminals with the correct
# prompts for each worktree, following your workflow
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
WORKTREE_BASE="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees"
PROJECT_ROOT="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-nuxt"
PROMPT_FILE="/Users/bhunt/development/claude/entrepreneur/fastmongo/WORKTREE_PROMPTS.md"

# Function to extract prompt from markdown file
extract_prompt() {
    local worktree_name="$1"
    local temp_file="/tmp/${worktree_name}_prompt.txt"
    
    case "$worktree_name" in
        "foundation")
            cat > "$temp_file" << 'EOF'
You are working in the foundation worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: foundation
- Branch: feature/foundation-setup
- Tech stack: Nuxt 3, Cloudflare Workers, Drizzle ORM, Turso

TASKS TO COMPLETE:
1. Issue #7: Setup Local Development Environment
2. Issue #18: Create and Configure Turso Databases with CLI

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to coordinate everything
- @agent-system-architect-tdd to design the system architecture
- @agent-senior-engineer-tdd to implement the code
- @agent-devops-docker-cloud for environment and deployment setup
- @agent-database-optimizer for Turso database optimization
- @agent-code-review-analyzer after implementation

EXECUTION ORDER:
1. First, use @agent-workflow-orchestrator-v2 to plan the entire foundation setup
2. Have @agent-system-architect-tdd design the architecture
3. Use @agent-senior-engineer-tdd to implement the design
4. Setup local development environment with proper .env configuration
5. Install all dependencies using pnpm
6. Create Turso databases (dev and prod) using Turso CLI
7. Configure Drizzle ORM connection
8. Test database connectivity
9. Create initial migration
10. Document setup process in README

Start by calling @agent-workflow-orchestrator-v2 to orchestrate this work.
EOF
            ;;
        "database-layer")
            cat > "$temp_file" << 'EOF'
You are working in the database-layer worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: database-layer
- Branch: feature/database-layer
- Foundation setup is complete (Turso databases exist, .env configured)

TASKS TO COMPLETE (SEQUENTIAL):
1. Issue #8: Setup Drizzle ORM with Turso Database
2. Issue #17: Migrate Database Queries to Drizzle ORM
3. Issue #19: Implement Type-Safe Database Queries with Drizzle

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to coordinate the database migration
- @agent-system-architect-tdd to design the database architecture
- @agent-senior-engineer-tdd to implement Drizzle ORM and queries
- @agent-database-optimizer for query and schema optimization
- @agent-sql-pro for complex SQL operations
- @agent-code-review-analyzer after implementation

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to plan database layer implementation
2. Have @agent-system-architect-tdd design the database schema and query patterns
3. Use @agent-senior-engineer-tdd to implement the architecture with TDD
4. Create complete Drizzle schema in server/database/schema.ts
5. Generate and apply migrations
6. Create database utility functions with type safety
7. Implement all CRUD operations with Drizzle
8. Write comprehensive tests for database layer
9. Optimize queries with proper indexing

Start by calling @agent-workflow-orchestrator-v2 to orchestrate this work.
EOF
            ;;
        "testing-setup")
            cat > "$temp_file" << 'EOF'
You are working in the testing-setup worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: testing-setup
- Branch: feature/testing-setup
- Can work in parallel with other Phase 2 worktrees

TASK TO COMPLETE:
- Issue #9: Configure Testing Framework with Vitest and Playwright

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to plan testing strategy
- @agent-system-architect-tdd to design the testing architecture
- @agent-senior-engineer-tdd to implement test framework and write tests
- @agent-frontend-developer for Vue/Nuxt component testing
- @agent-backend-architect for Nitro server API testing
- @agent-code-review-analyzer for test quality review

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to design comprehensive testing strategy
2. Have @agent-system-architect-tdd design the testing architecture
3. Use @agent-senior-engineer-tdd to implement with TDD approach
4. Setup Vitest for unit testing
5. Configure Playwright for E2E testing
6. Create test utilities and factories
7. Write unit tests for existing components
8. Create E2E test scenarios
9. Setup CI/CD test pipeline

Start by calling @agent-workflow-orchestrator-v2 to orchestrate this work.
EOF
            ;;
        "cloudflare-deployment")
            cat > "$temp_file" << 'EOF'
You are working in the cloudflare-deployment worktree for PingToPass Nuxt project.

CONTEXT:
- Repository: https://github.com/ciscoittech/pingtopass-nuxt
- Current worktree: cloudflare-deployment
- Branch: feature/cloudflare-deployment
- Using Cloudflare Workers (NOT Pages - Pages is discontinued)

TASKS TO COMPLETE (SEQUENTIAL):
1. Issue #16: Configure Cloudflare Workers Deployment
2. Issue #20: Update Wrangler Configuration for Workers Deployment

REQUIRED AGENTS TO USE:
- @agent-workflow-orchestrator-v2 to plan deployment strategy
- @agent-system-architect-tdd to design the deployment architecture
- @agent-senior-engineer-tdd to implement deployment configurations
- @agent-cloud-architect for Cloudflare Workers optimization
- @agent-devops-docker-cloud for deployment pipeline
- @agent-git-devops-workflow for CI/CD and GitHub Actions
- @agent-deployment-engineer for deployment scripts
- @agent-code-review-analyzer for configuration review

EXECUTION ORDER:
1. Use @agent-workflow-orchestrator-v2 to design deployment architecture
2. Have @agent-system-architect-tdd design the deployment strategy
3. Use @agent-senior-engineer-tdd to implement configurations
4. Configure wrangler.toml for Workers deployment
5. Setup environment variables and secrets
6. Configure build process for Workers
7. Create deployment scripts
8. Setup GitHub Actions for CI/CD
9. Configure preview deployments

Start by calling @agent-workflow-orchestrator-v2 to orchestrate this work.
EOF
            ;;
    esac
    
    echo "$temp_file"
}

# Function to create launcher script for each worktree
create_launcher_script() {
    local worktree_name="$1"
    local worktree_path="$2"
    local prompt_file=$(extract_prompt "$worktree_name")
    local launcher_script="$worktree_path/start-claude.sh"
    
    cat > "$launcher_script" << EOF
#!/bin/bash

# Claude launcher for $worktree_name worktree
# This script starts Claude with the correct prompt

clear
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  🚀 Starting Claude for: $worktree_name${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Workflow Pattern:${NC}"
echo "  1. @agent-workflow-orchestrator-v2 orchestrates"
echo "  2. @agent-system-architect-tdd designs"
echo "  3. @agent-senior-engineer-tdd implements"
echo "  4. Specialized agents support"
echo "  5. @agent-code-review-analyzer reviews"
echo ""
echo -e "${GREEN}The prompt has been copied to your clipboard!${NC}"
echo -e "${GREEN}When Claude starts, paste it to begin work.${NC}"
echo ""

# Copy prompt to clipboard
cat "$prompt_file" | pbcopy

echo -e "${CYAN}Starting Claude in 3 seconds...${NC}"
sleep 3

# Start Claude
claude
EOF
    
    chmod +x "$launcher_script"
    echo -e "${GREEN}✅ Created launcher: $launcher_script${NC}"
}

# Function to launch Warp with auto-prompt
launch_warp_with_prompt() {
    local worktree_name="$1"
    local worktree_path="$2"
    local tab_title="$3"
    
    echo -e "${CYAN}🚀 Launching $tab_title...${NC}"
    
    # Create the launcher script first
    create_launcher_script "$worktree_name" "$worktree_path"
    
    # Use AppleScript to open Warp and run the launcher
    osascript <<END
tell application "Warp"
    activate
    delay 0.5
    tell application "System Events"
        keystroke "t" using command down
        delay 0.5
        keystroke "cd $worktree_path && ./start-claude.sh"
        key code 36
    end tell
end tell
END
    
    sleep 2
}

# Function to show menu
show_menu() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║     🚀 PingToPass Development Launcher with Prompts       ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Your Workflow:${NC}"
    echo "  1. Orchestrator plans → 2. Architect designs → 3. Engineer implements"
    echo ""
    echo -e "${YELLOW}Select what to launch:${NC}"
    echo ""
    echo "  1) Phase 1: Foundation Setup"
    echo "  2) Phase 2A: Database Layer"
    echo "  3) Phase 2B: Testing Framework"
    echo "  4) Phase 2C: Cloudflare Deployment"
    echo "  5) All Phase 2 (parallel)"
    echo "  6) Everything (all worktrees)"
    echo "  7) Create launcher scripts only"
    echo "  8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
    
    case "$choice" in
        1)
            launch_warp_with_prompt "foundation" \
                "$WORKTREE_BASE/foundation" \
                "Phase 1: Foundation"
            echo -e "${GREEN}✅ Foundation worktree launched with prompt!${NC}"
            ;;
        2)
            launch_warp_with_prompt "database-layer" \
                "$WORKTREE_BASE/database-layer" \
                "Database Layer"
            echo -e "${GREEN}✅ Database layer launched with prompt!${NC}"
            ;;
        3)
            launch_warp_with_prompt "testing-setup" \
                "$WORKTREE_BASE/testing-setup" \
                "Testing Framework"
            echo -e "${GREEN}✅ Testing setup launched with prompt!${NC}"
            ;;
        4)
            launch_warp_with_prompt "cloudflare-deployment" \
                "$WORKTREE_BASE/cloudflare-deployment" \
                "Cloudflare Deployment"
            echo -e "${GREEN}✅ Cloudflare deployment launched with prompt!${NC}"
            ;;
        5)
            echo -e "${CYAN}Launching all Phase 2 worktrees...${NC}"
            launch_warp_with_prompt "database-layer" "$WORKTREE_BASE/database-layer" "Database Layer"
            launch_warp_with_prompt "testing-setup" "$WORKTREE_BASE/testing-setup" "Testing Framework"
            launch_warp_with_prompt "cloudflare-deployment" "$WORKTREE_BASE/cloudflare-deployment" "Cloudflare"
            echo -e "${GREEN}✅ All Phase 2 worktrees launched!${NC}"
            ;;
        6)
            echo -e "${CYAN}Launching all worktrees...${NC}"
            launch_warp_with_prompt "foundation" "$WORKTREE_BASE/foundation" "Foundation"
            launch_warp_with_prompt "database-layer" "$WORKTREE_BASE/database-layer" "Database"
            launch_warp_with_prompt "testing-setup" "$WORKTREE_BASE/testing-setup" "Testing"
            launch_warp_with_prompt "cloudflare-deployment" "$WORKTREE_BASE/cloudflare-deployment" "Cloudflare"
            echo -e "${GREEN}✅ All worktrees launched!${NC}"
            ;;
        7)
            echo -e "${CYAN}Creating launcher scripts...${NC}"
            create_launcher_script "foundation" "$WORKTREE_BASE/foundation"
            create_launcher_script "database-layer" "$WORKTREE_BASE/database-layer"
            create_launcher_script "testing-setup" "$WORKTREE_BASE/testing-setup"
            create_launcher_script "cloudflare-deployment" "$WORKTREE_BASE/cloudflare-deployment"
            echo ""
            echo -e "${GREEN}✅ Launcher scripts created in each worktree!${NC}"
            echo ""
            echo "To use manually:"
            echo "  cd [worktree-path]"
            echo "  ./start-claude.sh"
            ;;
        8)
            echo -e "${YELLOW}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            sleep 2
            show_menu
            ;;
    esac
    
    echo ""
    echo -e "${CYAN}Tips:${NC}"
    echo "  • The prompt is automatically copied to clipboard"
    echo "  • Paste it when Claude starts"
    echo "  • Follow the workflow: Orchestrator → Architect → Engineer"
    echo "  • Monitor progress with: ./monitor-development.sh"
}

# Check prerequisites
check_prerequisites() {
    # Check if Warp is installed
    if ! open -Ra "Warp" 2>/dev/null; then
        echo -e "${RED}❌ Warp is not installed${NC}"
        echo "Please install Warp from: https://www.warp.dev/"
        exit 1
    fi
    
    # Check if worktrees exist
    if [[ ! -d "$WORKTREE_BASE" ]]; then
        echo -e "${RED}❌ Worktrees not found at: $WORKTREE_BASE${NC}"
        echo "Please run setup-worktrees.sh first"
        exit 1
    fi
    
    # Check if Claude is available
    if ! command -v claude &> /dev/null; then
        echo -e "${YELLOW}⚠️  Claude CLI not found in PATH${NC}"
        echo "Make sure Claude is installed and available"
    fi
}

# Main execution
main() {
    check_prerequisites
    show_menu
}

# Run
main