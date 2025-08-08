#!/bin/bash

# ============================================
# PingToPass Worktree Merge Process
# ============================================
# This script safely merges completed worktree work
# back to main branch with proper conflict resolution
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
MAIN_REPO="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-nuxt"

# Function to check worktree status
check_worktree() {
    local worktree_name="$1"
    local worktree_path="$2"
    
    echo -e "${CYAN}Checking $worktree_name...${NC}"
    cd "$worktree_path"
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        echo -e "${YELLOW}  ⚠️  Has uncommitted changes${NC}"
        git status --short
        return 1
    else
        echo -e "${GREEN}  ✅ Clean (no uncommitted changes)${NC}"
        
        # Check if branch has commits ahead of main
        local ahead=$(git rev-list --count origin/main..HEAD)
        if [[ $ahead -gt 0 ]]; then
            echo -e "${GREEN}  📦 $ahead commits ahead of main${NC}"
            return 0
        else
            echo -e "${YELLOW}  ⏸  No new commits${NC}"
            return 2
        fi
    fi
}

# Function to commit changes in worktree
commit_worktree_changes() {
    local worktree_name="$1"
    local worktree_path="$2"
    local commit_message="$3"
    
    echo -e "${CYAN}Committing changes in $worktree_name...${NC}"
    cd "$worktree_path"
    
    # Add all changes
    git add -A
    
    # Show what will be committed
    echo -e "${YELLOW}Files to be committed:${NC}"
    git status --short
    
    # Commit with message
    git commit -m "$commit_message" -m "🤖 Generated with Claude Code" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
    
    echo -e "${GREEN}✅ Committed successfully${NC}"
}

# Function to merge worktree to main
merge_to_main() {
    local worktree_name="$1"
    local branch_name="$2"
    
    echo -e "${CYAN}Merging $worktree_name to main...${NC}"
    cd "$MAIN_REPO"
    
    # Ensure we're on main
    git checkout main
    
    # Pull latest main
    echo "Pulling latest main..."
    git pull origin main || true
    
    # Merge the branch
    echo "Merging $branch_name..."
    if git merge "$branch_name" --no-ff -m "Merge $worktree_name: $branch_name"; then
        echo -e "${GREEN}✅ Merged successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ Merge conflict detected${NC}"
        return 1
    fi
}

# Function to show worktree summary
show_summary() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║         📊 Worktree Status Summary                        ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    local worktrees=("foundation:feature/foundation-setup" 
                     "database-layer:feature/database-layer" 
                     "testing-setup:feature/testing-setup" 
                     "cloudflare-deployment:feature/cloudflare-deployment")
    
    for worktree_spec in "${worktrees[@]}"; do
        IFS=':' read -r name branch <<< "$worktree_spec"
        local path="$WORKTREE_BASE/$name"
        
        if [[ -d "$path" ]]; then
            cd "$path"
            local changes=$(git status --porcelain | wc -l | tr -d ' ')
            local ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
            
            echo -e "${GREEN}$name${NC} ($branch)"
            echo "  📝 Uncommitted changes: $changes files"
            echo "  📦 Commits ahead of main: $ahead"
            
            if [[ $changes -gt 0 ]]; then
                echo -e "  Status: ${YELLOW}Needs commit${NC}"
            elif [[ $ahead -gt 0 ]]; then
                echo -e "  Status: ${GREEN}Ready to merge${NC}"
            else
                echo -e "  Status: ${CYAN}Up to date${NC}"
            fi
            echo ""
        fi
    done
}

# Function to handle Phase 1 (Foundation)
handle_foundation() {
    local worktree_path="$WORKTREE_BASE/foundation"
    
    echo -e "${BLUE}═══ PHASE 1: FOUNDATION ═══${NC}"
    
    if check_worktree "foundation" "$worktree_path"; then
        if [[ $? -eq 1 ]]; then
            read -p "Commit foundation changes? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                commit_worktree_changes "foundation" "$worktree_path" \
                    "feat: Complete foundation setup with Turso and environment configuration"
            fi
        fi
        
        read -p "Merge foundation to main? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            merge_to_main "foundation" "feature/foundation-setup"
        fi
    fi
}

# Function to handle Phase 2 worktrees
handle_phase2() {
    echo -e "${PURPLE}═══ PHASE 2: PARALLEL DEVELOPMENT ═══${NC}"
    
    local worktrees=("database-layer:feature/database-layer:Complete Drizzle ORM setup and database schema" 
                     "testing-setup:feature/testing-setup:Configure Vitest and Playwright testing framework" 
                     "cloudflare-deployment:feature/cloudflare-deployment:Setup Cloudflare Workers deployment")
    
    for worktree_spec in "${worktrees[@]}"; do
        IFS=':' read -r name branch message <<< "$worktree_spec"
        local path="$WORKTREE_BASE/$name"
        
        echo ""
        echo -e "${CYAN}Processing $name...${NC}"
        
        if [[ -d "$path" ]]; then
            cd "$path"
            local changes=$(git status --porcelain | wc -l | tr -d ' ')
            
            if [[ $changes -gt 0 ]]; then
                echo -e "${YELLOW}Found uncommitted changes:${NC}"
                git status --short | head -10
                
                read -p "Commit these changes? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    commit_worktree_changes "$name" "$path" "feat: $message"
                fi
            fi
            
            # Check if ready to merge
            local ahead=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
            if [[ $ahead -gt 0 ]]; then
                read -p "Merge $name to main? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    merge_to_main "$name" "$branch"
                fi
            fi
        fi
    done
}

# Function to push to GitHub
push_to_github() {
    echo -e "${CYAN}Pushing to GitHub...${NC}"
    cd "$MAIN_REPO"
    
    git push origin main
    
    # Also push all feature branches
    local branches=("feature/foundation-setup" 
                   "feature/database-layer" 
                   "feature/testing-setup" 
                   "feature/cloudflare-deployment")
    
    for branch in "${branches[@]}"; do
        if git show-ref --verify --quiet "refs/heads/$branch"; then
            git push origin "$branch" || true
        fi
    done
    
    echo -e "${GREEN}✅ Pushed to GitHub${NC}"
}

# Function to clean up merged worktrees
cleanup_worktrees() {
    echo -e "${CYAN}Cleaning up merged worktrees...${NC}"
    
    read -p "Remove merged worktrees? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cd "$MAIN_REPO"
        
        local worktrees=("foundation" "database-layer" "testing-setup" "cloudflare-deployment")
        
        for worktree in "${worktrees[@]}"; do
            if git worktree list | grep -q "$worktree"; then
                echo "Removing worktree: $worktree"
                git worktree remove "../pingtopass-worktrees/$worktree" --force || true
            fi
        done
        
        echo -e "${GREEN}✅ Worktrees cleaned up${NC}"
    fi
}

# Main menu
show_menu() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║         🔄 PingToPass Worktree Merge Manager              ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    show_summary
    
    echo -e "${YELLOW}Select action:${NC}"
    echo ""
    echo "  1) Commit all uncommitted changes"
    echo "  2) Merge Phase 1 (Foundation) only"
    echo "  3) Merge Phase 2 (All parallel worktrees)"
    echo "  4) Merge everything (Phase 1 + Phase 2)"
    echo "  5) Push to GitHub"
    echo "  6) Clean up merged worktrees"
    echo "  7) Full process (commit, merge, push, cleanup)"
    echo "  8) Exit"
    echo ""
    read -p "Enter choice [1-8]: " choice
    
    case "$choice" in
        1)
            handle_phase2
            echo -e "${GREEN}✅ Commits complete${NC}"
            ;;
        2)
            handle_foundation
            echo -e "${GREEN}✅ Foundation merge complete${NC}"
            ;;
        3)
            handle_phase2
            echo -e "${GREEN}✅ Phase 2 merge complete${NC}"
            ;;
        4)
            handle_foundation
            handle_phase2
            echo -e "${GREEN}✅ All merges complete${NC}"
            ;;
        5)
            push_to_github
            ;;
        6)
            cleanup_worktrees
            ;;
        7)
            echo -e "${CYAN}Starting full merge process...${NC}"
            handle_foundation
            handle_phase2
            push_to_github
            cleanup_worktrees
            echo -e "${GREEN}✅ Full process complete!${NC}"
            ;;
        8)
            echo -e "${YELLOW}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice${NC}"
            sleep 2
            show_menu
            ;;
    esac
    
    echo ""
    read -p "Press Enter to continue..."
    show_menu
}

# Check prerequisites
if [[ ! -d "$WORKTREE_BASE" ]]; then
    echo -e "${RED}❌ Worktrees not found at: $WORKTREE_BASE${NC}"
    exit 1
fi

if [[ ! -d "$MAIN_REPO" ]]; then
    echo -e "${RED}❌ Main repository not found at: $MAIN_REPO${NC}"
    exit 1
fi

# Start
show_menu