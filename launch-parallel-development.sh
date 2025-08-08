#!/bin/bash

# ============================================
# PingToPass Parallel Development Launcher
# ============================================
# This script launches multiple Warp terminal sessions
# for parallel development using git worktrees
#
# Usage: ./launch-parallel-development.sh [phase]
# phase: 1 (foundation only) or 2 (parallel streams) or all
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Base directories
PROJECT_ROOT="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-nuxt"
WORKTREE_BASE="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees"

# Function to print colored messages
print_message() {
    echo -e "${2}${1}${NC}"
}

# Function to check if Warp is installed
check_warp() {
    if ! command -v warp &> /dev/null; then
        print_message "❌ Warp terminal is not installed or not in PATH" "$RED"
        print_message "Please install Warp from https://www.warp.dev/" "$YELLOW"
        exit 1
    fi
    print_message "✅ Warp terminal found" "$GREEN"
}

# Function to check if worktrees exist
check_worktrees() {
    local missing=0
    
    if [[ ! -d "$WORKTREE_BASE/foundation" ]]; then
        print_message "❌ Foundation worktree not found" "$RED"
        missing=1
    fi
    
    if [[ "$1" == "2" ]] || [[ "$1" == "all" ]]; then
        if [[ ! -d "$WORKTREE_BASE/database-layer" ]]; then
            print_message "❌ Database-layer worktree not found" "$RED"
            missing=1
        fi
        if [[ ! -d "$WORKTREE_BASE/testing-setup" ]]; then
            print_message "❌ Testing-setup worktree not found" "$RED"
            missing=1
        fi
        if [[ ! -d "$WORKTREE_BASE/cloudflare-deployment" ]]; then
            print_message "❌ Cloudflare-deployment worktree not found" "$RED"
            missing=1
        fi
    fi
    
    if [[ $missing -eq 1 ]]; then
        print_message "Please run ./scripts/setup-worktrees.sh first" "$YELLOW"
        exit 1
    fi
    
    print_message "✅ All required worktrees found" "$GREEN"
}

# Function to launch Warp with a specific command and title
launch_warp_session() {
    local worktree_path="$1"
    local session_name="$2"
    local task_description="$3"
    local color="$4"
    
    print_message "🚀 Launching $session_name..." "$color"
    
    # Create a temporary script for this session
    local temp_script="/tmp/warp_session_${session_name// /_}.sh"
    
    cat > "$temp_script" << EOF
#!/bin/bash
clear
echo -e "${color}============================================${NC}"
echo -e "${color}🚀 $session_name${NC}"
echo -e "${color}============================================${NC}"
echo ""
echo -e "${CYAN}📋 Tasks:${NC} $task_description"
echo -e "${CYAN}📂 Directory:${NC} $worktree_path"
echo ""
echo -e "${YELLOW}Starting Claude Code in 3 seconds...${NC}"
echo -e "${YELLOW}Press Ctrl+C to cancel and work manually${NC}"
echo ""
sleep 3
cd "$worktree_path"
echo -e "${GREEN}✅ Ready for development!${NC}"
echo ""
echo -e "${PURPLE}Commands available:${NC}"
echo "  claude         - Start Claude Code"
echo "  npm run dev    - Start development server"
echo "  git status     - Check git status"
echo "  gh issue list  - View GitHub issues"
echo ""
echo -e "${CYAN}Starting Claude Code...${NC}"
echo ""
claude
EOF
    
    chmod +x "$temp_script"
    
    # Launch Warp with the script
    # Using AppleScript to open a new Warp window and run the command
    osascript <<END
tell application "Warp"
    activate
    delay 0.5
    tell application "System Events"
        keystroke "t" using command down
        delay 0.5
        keystroke "cd $worktree_path && bash $temp_script"
        key code 36
    end tell
end tell
END
    
    sleep 2
}

# Function to launch Phase 1 (Foundation)
launch_phase1() {
    print_message "\n📦 PHASE 1: Foundation Setup" "$BLUE"
    print_message "================================" "$BLUE"
    
    launch_warp_session \
        "$WORKTREE_BASE/foundation" \
        "Phase 1: Foundation Setup" \
        "Issue #7 (Setup Local Dev), Issue #18 (Create Turso Databases)" \
        "$BLUE"
}

# Function to launch Phase 2 (Parallel Streams)
launch_phase2() {
    print_message "\n⚡ PHASE 2: Parallel Development" "$PURPLE"
    print_message "===================================" "$PURPLE"
    
    # Database Layer
    launch_warp_session \
        "$WORKTREE_BASE/database-layer" \
        "Stream A: Database Layer" \
        "Issues #8, #17, #19 (Drizzle ORM Setup)" \
        "$GREEN"
    
    # Testing Setup
    launch_warp_session \
        "$WORKTREE_BASE/testing-setup" \
        "Stream B: Testing Framework" \
        "Issue #9 (Vitest & Playwright)" \
        "$YELLOW"
    
    # Cloudflare Deployment
    launch_warp_session \
        "$WORKTREE_BASE/cloudflare-deployment" \
        "Stream C: Cloudflare Workers" \
        "Issues #16, #20 (Workers Deployment)" \
        "$CYAN"
}

# Function to show dashboard
show_dashboard() {
    clear
    print_message "╔══════════════════════════════════════════════════════════╗" "$PURPLE"
    print_message "║         🚀 PingToPass Parallel Development Launcher       ║" "$PURPLE"
    print_message "╚══════════════════════════════════════════════════════════╝" "$PURPLE"
    echo ""
    print_message "📊 Worktree Strategy Overview:" "$CYAN"
    echo ""
    print_message "  Phase 1: Foundation Setup (Sequential)" "$BLUE"
    print_message "    └─ Issues: #7 (Local Dev), #18 (Turso DB)" "$BLUE"
    echo ""
    print_message "  Phase 2: Parallel Development Streams" "$GREEN"
    print_message "    ├─ Database Layer: #8, #17, #19" "$GREEN"
    print_message "    ├─ Testing Setup: #9" "$YELLOW"
    print_message "    └─ Cloudflare: #16, #20" "$CYAN"
    echo ""
}

# Function to create monitoring script
create_monitor_script() {
    local monitor_script="$PROJECT_ROOT/monitor-development.sh"
    
    cat > "$monitor_script" << 'EOF'
#!/bin/bash

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

WORKTREE_BASE="/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees"

clear
echo -e "${CYAN}📊 Development Progress Monitor${NC}"
echo "================================"
echo ""

for worktree in foundation database-layer testing-setup cloudflare-deployment; do
    if [[ -d "$WORKTREE_BASE/$worktree" ]]; then
        echo -e "${GREEN}📂 $worktree:${NC}"
        cd "$WORKTREE_BASE/$worktree"
        
        # Show git status
        branch=$(git branch --show-current)
        changes=$(git status --porcelain | wc -l | tr -d ' ')
        
        echo "   Branch: $branch"
        echo "   Changes: $changes files modified"
        
        # Check if Claude is running
        if pgrep -f "claude.*$worktree" > /dev/null; then
            echo -e "   Status: ${GREEN}✅ Claude Active${NC}"
        else
            echo -e "   Status: ${YELLOW}⏸  Claude Inactive${NC}"
        fi
        echo ""
    fi
done

echo -e "${CYAN}Press Ctrl+C to exit monitor${NC}"
EOF
    
    chmod +x "$monitor_script"
    print_message "✅ Created monitor script: $monitor_script" "$GREEN"
}

# Main execution
main() {
    local phase="${1:-all}"
    
    show_dashboard
    
    # Check prerequisites
    check_warp
    check_worktrees "$phase"
    
    # Create monitoring script
    create_monitor_script
    
    # Launch based on phase
    case "$phase" in
        1)
            print_message "\n🎯 Launching Phase 1 only..." "$BLUE"
            launch_phase1
            print_message "\n✅ Phase 1 launched!" "$GREEN"
            print_message "Complete Phase 1 before starting Phase 2" "$YELLOW"
            ;;
        2)
            print_message "\n🎯 Launching Phase 2 parallel streams..." "$PURPLE"
            launch_phase2
            print_message "\n✅ All Phase 2 streams launched!" "$GREEN"
            ;;
        all)
            print_message "\n🎯 Launching all development sessions..." "$CYAN"
            launch_phase1
            sleep 3
            launch_phase2
            print_message "\n✅ All development sessions launched!" "$GREEN"
            ;;
        *)
            print_message "Usage: $0 [1|2|all]" "$RED"
            print_message "  1   - Launch Phase 1 (Foundation) only" "$YELLOW"
            print_message "  2   - Launch Phase 2 (Parallel streams) only" "$YELLOW"
            print_message "  all - Launch all sessions" "$YELLOW"
            exit 1
            ;;
    esac
    
    echo ""
    print_message "📊 Monitor Progress:" "$CYAN"
    print_message "  Run: ./monitor-development.sh" "$CYAN"
    echo ""
    print_message "🔄 Merge Work:" "$YELLOW"
    print_message "  After completion, run: ./scripts/cleanup-worktrees.sh" "$YELLOW"
    echo ""
    print_message "Happy coding! 🚀" "$GREEN"
}

# Run main function
main "$@"