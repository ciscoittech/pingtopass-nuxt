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
