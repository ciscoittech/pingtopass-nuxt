#!/bin/bash

# Install agents for PingToPass + Twitter Growth System
# This script installs locally from the claude-code-templates repository

AGENTS_SOURCE="/Users/bhunt/development/claude/entrepreneur/fastmongo/claude-code-templates/cli-tool/components/agents"
AGENTS_TARGET="/Users/bhunt/development/claude/entrepreneur/fastmongo/.claude/agents"

# Create target directory
echo "Creating .claude/agents directory..."
mkdir -p "$AGENTS_TARGET"

# List of agents to install
AGENTS=(
  "ai-specialists/prompt-engineer"
  "database/database-optimizer"
  "security/api-security-audit"
  "devops-infrastructure/cloud-architect"
  "performance-testing/test-automator"
  "business-marketing/sales-automator"
  "podcast-creator-team/twitter-ai-influencer-manager"
  "business-marketing/content-marketer"
  "ai-specialists/search-specialist"
  "data-ai/data-scientist"
  "programming-languages/javascript-pro"
  "development-team/backend-architect"
)

# Install each agent
echo "Installing agents..."
for agent in "${AGENTS[@]}"; do
  # Extract filename from path
  filename=$(basename "$agent")
  source_file="$AGENTS_SOURCE/$agent.md"
  target_file="$AGENTS_TARGET/$filename.md"
  
  if [ -f "$source_file" ]; then
    cp "$source_file" "$target_file"
    echo "✓ Installed: $filename"
  else
    echo "✗ Not found: $agent"
  fi
done

echo ""
echo "🎉 Agent installation complete!"
echo "📁 Agents installed to: .claude/agents/"
echo ""
echo "Installed agents:"
ls -1 "$AGENTS_TARGET" | sed 's/^/  - /'