# Installed Agents for PingToPass + Twitter Growth System

This directory contains specialized AI agents to help with your development.

## Core Platform Agents

1. **prompt-engineer** - Optimize LangChain prompts for exam questions
2. **database-optimizer** - Turso/SQLite query optimization
3. **api-security-audit** - Secure your certification platform
4. **cloud-architect** - Cloudflare edge deployment best practices
5. **test-automator** - TDD implementation with Vitest
6. **javascript-pro** - Nuxt 3/Vue best practices
7. **backend-architect** - Nitro server API design

## Twitter Growth Agents

8. **sales-automator** - Growth automation workflows
9. **twitter-ai-influencer-manager** - Twitter-specific automation
10. **content-marketer** - Content strategy for engagement
11. **search-specialist** - Competitor analysis & trends
12. **data-scientist** - Analyze metrics and ROI

## Usage

These agents are now available in your Claude Code conversations. Simply reference them when you need specialized help in their domains.

## Manual Installation

To manually install these agents, run:

```bash
# From the claude-code-templates repository
cd /Users/bhunt/development/claude/entrepreneur/fastmongo

# Install via npx (when available)
npx claude-code-templates@latest --agent=<agent-name> --yes

# Or copy directly from local repository
cp claude-code-templates/cli-tool/components/agents/<category>/<agent>.md .claude/agents/
```