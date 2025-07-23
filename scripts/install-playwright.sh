#!/bin/bash

echo "Installing Playwright for Kimai automation..."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies
echo "📦 Installing dependencies with pnpm..."
if pnpm install; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Install browser binaries
echo ""
echo "🌐 Installing Chromium browser..."
if pnpm exec playwright install chromium; then
    echo "✅ Chromium installed"
else
    echo "❌ Failed to install Chromium"
    echo ""
    echo "Try manual installation:"
    echo "pnpm exec playwright install chromium"
    exit 1
fi

echo ""
echo "✨ Installation complete! You can now run:"
echo "pnpm run pull-kimai"