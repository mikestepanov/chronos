#!/bin/bash
# Start Discord Claude Code bot
# 
# Required environment variables (set in .env):
# - DISCORD_TOKEN
# - ALLOWED_USER_ID
# - BASE_FOLDER

# Load environment variables from root .env
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -E '^(DISCORD_TOKEN|ALLOWED_USER_ID|BASE_FOLDER)' | xargs)
fi

# Check required variables
if [ -z "$DISCORD_TOKEN" ]; then
    echo "Error: DISCORD_TOKEN not set in .env file"
    exit 1
fi

if [ -z "$ALLOWED_USER_ID" ]; then
    echo "Error: ALLOWED_USER_ID not set in .env file"
    exit 1
fi

# Set default base folder if not specified
if [ -z "$BASE_FOLDER" ]; then
    export BASE_FOLDER="/home/mstepanov/Documents/GitHub"
fi

cd /home/mstepanov/Documents/GitHub/claude-code-discord-bot
export PATH="$HOME/.bun/bin:$PATH"
bun start