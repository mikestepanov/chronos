#!/bin/bash

# Trigger Monday reminder GitHub Action
GITHUB_TOKEN="${GITHUB_TOKEN:-$GITHUB_PAT}"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "Error: GITHUB_TOKEN or GITHUB_PAT not set"
    exit 1
fi

echo "🔔 Triggering Monday reminder at $(date)"

# Trigger the workflow
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/mikestepanov/omega/actions/workflows/monday-reminder.yml/dispatches \
  -d '{"ref":"main","inputs":{"action":"both"}}'

echo "✅ Workflow triggered"