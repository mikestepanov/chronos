#!/bin/bash

echo "Installing Playwright for Kimai automation..."
echo ""

# No need to check for npm as it comes with Node.js

# Install dependencies
echo "📦 Installing dependencies with npm..."
if npm install; then
    echo "✅ Dependencies installed"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Install browser binaries
echo ""
echo "🌐 Installing Chromium browser..."
if npx playwright install chromium; then
    echo "✅ Chromium installed"
else
    echo "❌ Failed to install Chromium"
    echo ""
    echo "Try manual installation:"
    echo "npx playwright install chromium"
    exit 1
fi

echo ""
echo "✨ Installation complete! You can now run:"
echo "npm run pull-kimai"