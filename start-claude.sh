#!/bin/bash

# Claude launcher for cloudflare-deployment worktree
# This script starts Claude with the correct prompt

clear
echo -e "\033[0;36m═══════════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;36m  🚀 Starting Claude for: cloudflare-deployment\033[0m"
echo -e "\033[0;36m═══════════════════════════════════════════════════════════\033[0m"
echo ""
echo -e "\033[1;33mWorkflow Pattern:\033[0m"
echo "  1. @agent-workflow-orchestrator-v2 orchestrates"
echo "  2. @agent-system-architect-tdd designs"
echo "  3. @agent-senior-engineer-tdd implements"
echo "  4. Specialized agents support"
echo "  5. @agent-code-review-analyzer reviews"
echo ""
echo -e "\033[0;32mThe prompt has been copied to your clipboard!\033[0m"
echo -e "\033[0;32mWhen Claude starts, paste it to begin work.\033[0m"
echo ""

# Copy prompt to clipboard
cat "/tmp/cloudflare-deployment_prompt.txt" | pbcopy

echo -e "\033[0;36mStarting Claude in 3 seconds...\033[0m"
sleep 3

# Start Claude
claude
