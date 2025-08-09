#!/bin/bash

# PingToPass Nuxt - Worktree Setup Automation Script
# Automates the creation and configuration of git worktrees for parallel development

set -euo pipefail

# Configuration
REPO_URL="https://github.com/ciscoittech/pingtopass-nuxt.git"
BASE_DIR="/Users/bhunt/development/claude/entrepreneur/fastmongo"
WORKTREES_DIR="${BASE_DIR}/pingtopass-worktrees"
MAIN_REPO_DIR="${BASE_DIR}/pingtopass-nuxt"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Worktree definitions
declare -A WORKTREES
WORKTREES[foundation]="feature/foundation-setup"
WORKTREES[database-layer]="feature/database-layer"
WORKTREES[testing-setup]="feature/testing-setup"
WORKTREES[cloudflare-deployment]="feature/cloudflare-deployment"

# Issue assignments
declare -A ISSUE_ASSIGNMENTS
ISSUE_ASSIGNMENTS[foundation]="7,18"
ISSUE_ASSIGNMENTS[database-layer]="8,17,19"
ISSUE_ASSIGNMENTS[testing-setup]="9"
ISSUE_ASSIGNMENTS[cloudflare-deployment]="16,20"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check for required tools
    for tool in git gh; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is not installed. Please install it first."
        fi
    done
    
    # Check GitHub authentication
    if ! gh auth status &> /dev/null; then
        error "GitHub CLI not authenticated. Please run 'gh auth login' first."
    fi
    
    # Check if main repository exists
    if [[ ! -d "$MAIN_REPO_DIR" ]]; then
        error "Main repository not found at $MAIN_REPO_DIR"
    fi
    
    success "Prerequisites check passed"
}

# Create GitHub branches
create_branches() {
    log "Creating GitHub branches..."
    
    cd "$MAIN_REPO_DIR"
    git fetch origin
    
    # Get main branch SHA
    local main_sha
    main_sha=$(git rev-parse origin/main)
    
    for worktree in "${!WORKTREES[@]}"; do
        local branch="${WORKTREES[$worktree]}"
        
        # Check if branch already exists
        if gh api repos/ciscoittech/pingtopass-nuxt/branches/"${branch}" &> /dev/null; then
            warn "Branch $branch already exists, skipping creation"
        else
            log "Creating branch: $branch"
            gh api repos/ciscoittech/pingtopass-nuxt/git/refs \
                -X POST \
                -f ref="refs/heads/${branch}" \
                -f sha="$main_sha" > /dev/null
            success "Created branch: $branch"
        fi
    done
    
    # Fetch new branches
    git fetch origin
}

# Create GitHub labels
create_labels() {
    log "Creating GitHub labels..."
    
    # Worktree labels
    declare -A WORKTREE_LABELS
    WORKTREE_LABELS[worktree:foundation]="0E8A16"
    WORKTREE_LABELS[worktree:database-layer]="1D76DB"
    WORKTREE_LABELS[worktree:testing-setup]="FBCA04"
    WORKTREE_LABELS[worktree:cloudflare-deployment]="D93F0B"
    
    # Phase labels
    declare -A PHASE_LABELS
    PHASE_LABELS[phase:foundation]="B4A7D6"
    PHASE_LABELS[phase:parallel-development]="7057FF"
    
    # Create worktree labels
    for label in "${!WORKTREE_LABELS[@]}"; do
        local color="${WORKTREE_LABELS[$label]}"
        local description="Issues assigned to ${label#worktree:} worktree"
        
        if gh label create "$label" --description "$description" --color "$color" &> /dev/null; then
            success "Created label: $label"
        else
            warn "Label $label already exists"
        fi
    done
    
    # Create phase labels
    for label in "${!PHASE_LABELS[@]}"; do
        local color="${PHASE_LABELS[$label]}"
        local description="${label#phase:} development phase"
        
        if gh label create "$label" --description "$description" --color "$color" &> /dev/null; then
            success "Created label: $label"
        else
            warn "Label $label already exists"
        fi
    done
}

# Create worktrees
create_worktrees() {
    log "Creating worktrees..."
    
    # Create worktrees directory
    mkdir -p "$WORKTREES_DIR"
    
    cd "$MAIN_REPO_DIR"
    
    for worktree in "${!WORKTREES[@]}"; do
        local branch="${WORKTREES[$worktree]}"
        local worktree_path="${WORKTREES_DIR}/${worktree}"
        
        # Check if worktree already exists
        if [[ -d "$worktree_path" ]]; then
            warn "Worktree $worktree already exists at $worktree_path"
            continue
        fi
        
        log "Creating worktree: $worktree"
        
        # Create worktree
        git worktree add "$worktree_path" "origin/${branch}"
        
        # Set up branch tracking
        cd "$worktree_path"
        git checkout -b "$branch" --track "origin/${branch}"
        
        success "Created worktree: $worktree -> $worktree_path"
        cd "$MAIN_REPO_DIR"
    done
}

# Assign issues to worktrees
assign_issues() {
    log "Assigning issues to worktrees..."
    
    for worktree in "${!ISSUE_ASSIGNMENTS[@]}"; do
        local issues="${ISSUE_ASSIGNMENTS[$worktree]}"
        local worktree_label="worktree:${worktree}"
        
        # Determine phase
        local phase_label
        if [[ "$worktree" == "foundation" ]]; then
            phase_label="phase:foundation"
        else
            phase_label="phase:parallel-development"
        fi
        
        # Process each issue
        IFS=',' read -ra issue_array <<< "$issues"
        for issue in "${issue_array[@]}"; do
            log "Assigning issue #$issue to $worktree worktree"
            
            # Add labels to issue
            gh issue edit "$issue" --add-label "$worktree_label,$phase_label"
            
            # Add comment to issue
            local comment="**Assigned to ${worktree^} Worktree**

This issue has been assigned to the $worktree worktree.

**Worktree Location:** ${WORKTREES_DIR}/${worktree}
**Branch:** ${WORKTREES[$worktree]}
**Phase:** ${phase_label#phase:}

Generated by automated worktree setup script."
            
            gh issue comment "$issue" --body "$comment"
            
            success "Assigned issue #$issue to $worktree worktree"
        done
    done
}

# Create README for worktrees
create_worktree_readme() {
    log "Creating worktree README..."
    
    local readme_path="${WORKTREES_DIR}/README.md"
    
    cat > "$readme_path" << 'EOF'
# PingToPass Nuxt - Git Worktrees

This directory contains git worktrees for parallel development of the PingToPass Nuxt project.

## Worktree Structure

```
pingtopass-worktrees/
├── foundation/             # Phase 1: Foundation setup
├── database-layer/         # Phase 2: Database layer (Drizzle ORM)
├── testing-setup/          # Phase 2: Testing framework
├── cloudflare-deployment/  # Phase 2: Cloudflare deployment
└── README.md              # This file
```

## Development Phases

### Phase 1: Foundation (Sequential)
- **foundation/** - Must complete first
- Issues: #7 (Local Dev), #18 (Turso Databases)

### Phase 2: Parallel Development
- **database-layer/** - Issues: #8, #17, #19 (Drizzle ORM setup and migrations)
- **testing-setup/** - Issue: #9 (Testing framework)
- **cloudflare-deployment/** - Issues: #16, #20 (Workers deployment)

## Usage

### Starting Work in a Worktree
```bash
cd /Users/bhunt/development/claude/entrepreneur/fastmongo/pingtopass-worktrees/[worktree-name]
npm install  # if needed
code .       # open in VS Code
```

### Claude Code Sessions
You can run multiple Claude Code sessions simultaneously:
- One session per worktree for parallel development
- Each session works in isolation
- Changes are automatically tracked in separate branches

### Branch Management
Each worktree has its own branch:
- `feature/foundation-setup`
- `feature/database-layer`
- `feature/testing-setup`
- `feature/cloudflare-deployment`

### Synchronization
```bash
# In each worktree
git pull origin [branch-name]  # Get updates
git push origin [branch-name]  # Push changes

# Create PR when ready
gh pr create --fill
```

## Cleanup

### Remove a Worktree
```bash
cd /Users/bhunt/development/claude/entrepreneur/fastmongo
git worktree remove pingtopass-worktrees/[worktree-name]
```

### Clean All Worktrees
```bash
./scripts/cleanup-worktrees.sh
```

---
Generated by automated worktree setup script
EOF

    success "Created worktree README at $readme_path"
}

# Generate cleanup script
generate_cleanup_script() {
    log "Generating cleanup script..."
    
    local cleanup_script="${MAIN_REPO_DIR}/scripts/cleanup-worktrees.sh"
    
    cat > "$cleanup_script" << 'EOF'
#!/bin/bash

# PingToPass Nuxt - Worktree Cleanup Script

set -euo pipefail

BASE_DIR="/Users/bhunt/development/claude/entrepreneur/fastmongo"
WORKTREES_DIR="${BASE_DIR}/pingtopass-worktrees"
MAIN_REPO_DIR="${BASE_DIR}/pingtopass-nuxt"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "\033[0;34m[$(date +'%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

echo "PingToPass Nuxt - Worktree Cleanup"
echo "=================================="
echo

read -p "Are you sure you want to remove all worktrees? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

cd "$MAIN_REPO_DIR"

log "Listing current worktrees..."
git worktree list

log "Removing worktrees..."
for worktree in foundation database-layer testing-setup cloudflare-deployment; do
    worktree_path="${WORKTREES_DIR}/${worktree}"
    
    if [[ -d "$worktree_path" ]]; then
        log "Removing worktree: $worktree"
        git worktree remove "$worktree_path" --force
        success "Removed: $worktree"
    else
        warn "Worktree not found: $worktree"
    fi
done

if [[ -d "$WORKTREES_DIR" ]] && [[ -z "$(ls -A "$WORKTREES_DIR")" ]]; then
    log "Removing empty worktrees directory..."
    rmdir "$WORKTREES_DIR"
    success "Removed worktrees directory"
fi

log "Final worktree status:"
git worktree list

success "Cleanup completed!"
EOF

    chmod +x "$cleanup_script"
    success "Generated cleanup script at $cleanup_script"
}

# Main execution
main() {
    echo "PingToPass Nuxt - Worktree Setup"
    echo "================================="
    echo
    
    check_prerequisites
    create_branches
    create_labels
    create_worktrees
    assign_issues
    create_worktree_readme
    generate_cleanup_script
    
    echo
    success "Worktree setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Start Phase 1 development in the foundation worktree"
    echo "2. Once Phase 1 is complete, begin Phase 2 parallel development"
    echo "3. Use multiple Claude Code sessions for parallel work"
    echo
    echo "Worktree locations:"
    for worktree in "${!WORKTREES[@]}"; do
        echo "  - $worktree: ${WORKTREES_DIR}/${worktree}"
    done
    echo
}

# Run main function
main "$@"