#!/bin/bash

# PingToPass Testing Framework Setup Script
# This script installs dependencies and configures the testing environment

set -e

echo "🚀 Setting up PingToPass Testing Framework..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🎭 Installing Playwright browsers..."
npx playwright install

echo "🔧 Setting up test environment..."
if [ ! -f .env.test.local ]; then
    cp .env.test .env.test.local
    echo "✅ Created .env.test.local from template"
else
    echo "ℹ️  .env.test.local already exists"
fi

echo "🧪 Validating test configuration..."

# Test Vitest configuration
echo "Checking Vitest setup..."
npx vitest --version

# Test Playwright configuration
echo "Checking Playwright setup..."
npx playwright --version

echo "🎯 Running smoke tests..."

# Create a simple smoke test to verify setup
cat > /tmp/smoke-test.js << 'EOF'
import { test, expect } from 'vitest'

test('testing framework is working', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
})

test('environment variables are loaded', () => {
    expect(process.env.NODE_ENV).toBe('test')
})
EOF

# Run the smoke test
npx vitest run /tmp/smoke-test.js --reporter=verbose

# Clean up
rm /tmp/smoke-test.js

echo ""
echo "✅ Testing framework setup complete!"
echo ""
echo "🎯 Available commands:"
echo "  npm run test              - Run unit tests"
echo "  npm run test:watch        - Run tests in watch mode"
echo "  npm run test:coverage     - Run tests with coverage"
echo "  npm run test:e2e          - Run E2E tests"
echo "  npm run test:perf         - Run performance tests"
echo "  npm run test:visual       - Run visual regression tests"
echo "  npm run test:a11y         - Run accessibility tests"
echo "  npm run test:all          - Run complete test suite"
echo ""
echo "📚 Documentation: tests/README.md"
echo "🐛 Debug tests: npm run test:e2e:debug"
echo ""
echo "Happy testing! 🧪"