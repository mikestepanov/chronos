#!/bin/bash

# Kimai Extraction System Setup Script

echo "Kimai Extraction System Setup"
echo "============================="
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "Error: Please run this script from the kimai directory"
    exit 1
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create data directory
echo "Creating data directory..."
mkdir -p ../../kimai-data

# Setup cron job
echo ""
echo "Do you want to set up automatic extraction? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Add cron job
    SCRIPT_PATH="$(pwd)/scheduler.js"
    CRON_CMD="0 10 * * * cd $(pwd) && /usr/bin/node $SCRIPT_PATH >> ../../logs/kimai-scheduler.log 2>&1"
    
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "kimai/scheduler.js"; then
        echo "Cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$CRON_CMD") | crontab -
        echo "✓ Cron job added (runs daily at 10:00 AM)"
    fi
fi

# Test configuration
echo ""
echo "Testing configuration..."
node cli.js test

echo ""
echo "Setup complete!"
echo ""
echo "Usage:"
echo "  ./cli.js extract    - Extract current period"
echo "  ./cli.js status     - Show system status"
echo "  ./cli.js help       - Show all commands"
echo ""
echo "Or use npm scripts:"
echo "  npm run extract"
echo "  npm run status"