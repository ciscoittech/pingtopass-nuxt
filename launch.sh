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
