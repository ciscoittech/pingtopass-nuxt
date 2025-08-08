#!/bin/bash

# ============================================
# Advanced Warp Terminal Launcher for PingToPass
# ============================================
# This script uses Warp's CLI to create organized
# workspace sessions with proper layouts
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
PROJECT_NAME="PingToPass Development"

# Function to create Warp launch configuration
create_warp_config() {
    local config_file="/tmp/pingtopass_warp_config.json"
    
    cat > "$config_file" << 'EOF'
{
  "workspace": {
    "name": "PingToPass Parallel Development",
    "tabs": [
      {
        "name": "📦 Phase 1: Foundation",
        "directory": "/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/foundation",
        "command": "echo '🚀 Foundation Setup - Issues #7, #18' && echo 'Run: claude' && bash"
      },
      {
        "name": "🗄️ Database Layer",
        "directory": "/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/database-layer",
        "command": "echo '💾 Database Layer - Issues #8, #17, #19' && echo 'Run: claude' && bash"
      },
      {
        "name": "🧪 Testing Setup",
        "directory": "/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/testing-setup",
        "command": "echo '🧪 Testing Framework - Issue #9' && echo 'Run: claude' && bash"
      },
      {
        "name": "☁️ Cloudflare Deploy",
        "directory": "/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/cloudflare-deployment",
        "command": "echo '☁️ Cloudflare Workers - Issues #16, #20' && echo 'Run: claude' && bash"
      },
      {
        "name": "📊 Monitor",
        "directory": "/Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-nuxt",
        "command": "watch -n 5 'for dir in ../pingtopass-worktrees/*; do echo \"$(basename $dir): $(cd $dir && git status -s | wc -l) changes\"; done'"
      }
    ]
  }
}
EOF
    
    echo "$config_file"
}

# Function to launch using Warp URI scheme
launch_with_warp_uri() {
    local phase="$1"
    
    echo -e "${CYAN}🚀 Launching Warp sessions using URI scheme...${NC}"
    
    case "$phase" in
        1)
            # Phase 1: Foundation only
            open "warp://action=new_tab&working_directory=$WORKTREE_BASE/foundation&command=clear%3B%20echo%20'Phase%201%3A%20Foundation%20Setup'%3B%20echo%20'Issues%3A%20%237%2C%20%2318'%3B%20echo%20''%3B%20echo%20'Run%3A%20claude'%3B%20bash"
            ;;
        2)
            # Phase 2: Parallel streams
            open "warp://action=new_tab&working_directory=$WORKTREE_BASE/database-layer&command=clear%3B%20echo%20'Database%20Layer'%3B%20echo%20'Issues%3A%20%238%2C%20%2317%2C%20%2319'%3B%20bash"
            sleep 1
            open "warp://action=new_tab&working_directory=$WORKTREE_BASE/testing-setup&command=clear%3B%20echo%20'Testing%20Setup'%3B%20echo%20'Issue%3A%20%239'%3B%20bash"
            sleep 1
            open "warp://action=new_tab&working_directory=$WORKTREE_BASE/cloudflare-deployment&command=clear%3B%20echo%20'Cloudflare%20Deployment'%3B%20echo%20'Issues%3A%20%2316%2C%20%2320'%3B%20bash"
            ;;
        all)
            # All phases
            open "warp://action=new_window"
            sleep 2
            
            # Create all tabs
            for worktree in foundation database-layer testing-setup cloudflare-deployment; do
                open "warp://action=new_tab&working_directory=$WORKTREE_BASE/$worktree"
                sleep 1
            done
            ;;
    esac
}

# Function to create individual launch scripts for each worktree
create_individual_launchers() {
    echo -e "${CYAN}📝 Creating individual launcher scripts...${NC}"
    
    # Foundation launcher
    cat > "$WORKTREE_BASE/foundation/launch.sh" << 'EOF'
#!/bin/bash
clear
echo "📦 PHASE 1: FOUNDATION SETUP"
echo "============================"
echo ""
echo "Tasks:"
echo "  • Issue #7: Setup Local Development Environment"
echo "  • Issue #18: Create and Configure Turso Databases"
echo ""
echo "Commands:"
echo "  claude              - Start Claude Code"
echo "  npm install         - Install dependencies"
echo "  npm run dev         - Start dev server"
echo "  turso db create     - Create database"
echo ""
echo "Starting Claude in 3 seconds... (Ctrl+C to cancel)"
sleep 3
claude
EOF
    
    # Database layer launcher
    cat > "$WORKTREE_BASE/database-layer/launch.sh" << 'EOF'
#!/bin/bash
clear
echo "🗄️ STREAM A: DATABASE LAYER"
echo "============================"
echo ""
echo "Tasks (Sequential):"
echo "  1. Issue #8: Setup Drizzle ORM with Turso"
echo "  2. Issue #17: Migrate Database Queries to Drizzle"
echo "  3. Issue #19: Implement Type-Safe Queries"
echo ""
echo "Commands:"
echo "  claude              - Start Claude Code"
echo "  npm run db:generate - Generate migrations"
echo "  npm run db:push     - Push to database"
echo "  npm run db:studio   - Open Drizzle Studio"
echo ""
echo "Starting Claude in 3 seconds... (Ctrl+C to cancel)"
sleep 3
claude
EOF
    
    # Testing setup launcher
    cat > "$WORKTREE_BASE/testing-setup/launch.sh" << 'EOF'
#!/bin/bash
clear
echo "🧪 STREAM B: TESTING FRAMEWORK"
echo "==============================="
echo ""
echo "Tasks:"
echo "  • Issue #9: Configure Testing Framework"
echo "    - Setup Vitest for unit tests"
echo "    - Setup Playwright for E2E tests"
echo "    - Create test utilities"
echo ""
echo "Commands:"
echo "  claude              - Start Claude Code"
echo "  npm run test:unit   - Run unit tests"
echo "  npm run test:e2e    - Run E2E tests"
echo "  npm run test:watch  - Watch mode"
echo ""
echo "Starting Claude in 3 seconds... (Ctrl+C to cancel)"
sleep 3
claude
EOF
    
    # Cloudflare deployment launcher
    cat > "$WORKTREE_BASE/cloudflare-deployment/launch.sh" << 'EOF'
#!/bin/bash
clear
echo "☁️ STREAM C: CLOUDFLARE DEPLOYMENT"
echo "==================================="
echo ""
echo "Tasks (Sequential):"
echo "  1. Issue #16: Configure Cloudflare Workers"
echo "  2. Issue #20: Update Wrangler Configuration"
echo ""
echo "Commands:"
echo "  claude              - Start Claude Code"
echo "  wrangler dev        - Local development"
echo "  wrangler deploy     - Deploy to Workers"
echo "  wrangler tail       - View logs"
echo ""
echo "Starting Claude in 3 seconds... (Ctrl+C to cancel)"
sleep 3
claude
EOF
    
    # Make all scripts executable
    chmod +x "$WORKTREE_BASE"/*/launch.sh
    
    echo -e "${GREEN}✅ Individual launcher scripts created in each worktree${NC}"
}

# Function to create a tmux-style launcher for Warp
create_split_screen_launcher() {
    local launcher="$WORKTREE_BASE/launch-split-screen.sh"
    
    cat > "$launcher" << 'EOF'
#!/bin/bash

# This script opens Warp with a specific layout
# Since Warp doesn't support splits via CLI, we use tabs

echo "🚀 Opening Warp with multiple tabs..."
echo ""
echo "Layout:"
echo "  Tab 1: Foundation (Phase 1)"
echo "  Tab 2: Database Layer (Phase 2)"
echo "  Tab 3: Testing Setup (Phase 2)"
echo "  Tab 4: Cloudflare Deploy (Phase 2)"
echo "  Tab 5: Monitor (Overview)"
echo ""

# Open Warp and create tabs
osascript << 'END'
tell application "Warp"
    activate
    
    -- Create new window
    tell application "System Events"
        keystroke "n" using command down
        delay 1
    end tell
    
    -- Tab 1: Foundation
    tell application "System Events"
        keystroke "cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/foundation && ./launch.sh"
        key code 36
        delay 1
        
        -- Tab 2: Database
        keystroke "t" using command down
        delay 0.5
        keystroke "cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/database-layer && ./launch.sh"
        key code 36
        delay 1
        
        -- Tab 3: Testing
        keystroke "t" using command down
        delay 0.5
        keystroke "cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/testing-setup && ./launch.sh"
        key code 36
        delay 1
        
        -- Tab 4: Cloudflare
        keystroke "t" using command down
        delay 0.5
        keystroke "cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/cloudflare-deployment && ./launch.sh"
        key code 36
        delay 1
        
        -- Tab 5: Monitor
        keystroke "t" using command down
        delay 0.5
        keystroke "cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-nuxt && ./monitor-development.sh"
        key code 36
    end tell
end tell
END

echo "✅ All tabs created!"
echo ""
echo "Tips:"
echo "  • Use Cmd+[number] to switch between tabs"
echo "  • Use Cmd+Shift+[ or ] to navigate tabs"
echo "  • Each tab has its own launch.sh script"
echo "  • Monitor tab shows real-time progress"
EOF
    
    chmod +x "$launcher"
    echo -e "${GREEN}✅ Split-screen launcher created: $launcher${NC}"
}

# Main menu
show_menu() {
    clear
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║         🚀 PingToPass Warp Terminal Launcher              ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}Select launch option:${NC}"
    echo ""
    echo "  1) Launch Phase 1 only (Foundation)"
    echo "  2) Launch Phase 2 only (Parallel Streams)"
    echo "  3) Launch All Phases"
    echo "  4) Create individual launchers (run manually)"
    echo "  5) Open split-screen layout (all tabs)"
    echo "  6) Exit"
    echo ""
    read -p "Enter choice [1-6]: " choice
    
    case "$choice" in
        1)
            launch_with_warp_uri 1
            echo -e "${GREEN}✅ Phase 1 launched!${NC}"
            ;;
        2)
            launch_with_warp_uri 2
            echo -e "${GREEN}✅ Phase 2 parallel streams launched!${NC}"
            ;;
        3)
            launch_with_warp_uri all
            echo -e "${GREEN}✅ All phases launched!${NC}"
            ;;
        4)
            create_individual_launchers
            create_split_screen_launcher
            echo ""
            echo -e "${YELLOW}To launch individually:${NC}"
            echo "  cd [worktree-directory]"
            echo "  ./launch.sh"
            ;;
        5)
            create_individual_launchers
            create_split_screen_launcher
            echo -e "${CYAN}Launching split-screen layout...${NC}"
            bash "$WORKTREE_BASE/launch-split-screen.sh"
            ;;
        6)
            echo -e "${YELLOW}Goodbye!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}Invalid choice. Please try again.${NC}"
            sleep 2
            show_menu
            ;;
    esac
}

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

# Run menu
show_menu