# Koyeb Deployment Module

This module handles all Koyeb-specific deployment and management tasks for the Pay Period Bot.

## Setup

1. Get your Koyeb API key from https://app.koyeb.com/account/api
2. Add to your `.env` file:
   ```
   KOYEB_API_KEY=your-api-key-here
   ```

## Usage

### Interactive Deployment
```bash
node koyeb/deploy.js
```

### CLI Commands
```bash
# Deploy application
node koyeb/cli.js deploy

# Check deployment status
node koyeb/cli.js status

# View logs
node koyeb/cli.js logs
node koyeb/cli.js logs 200  # Last 200 lines

# Get app info
node koyeb/cli.js info

# Delete app (careful!)
node koyeb/cli.js delete
```

### Programmatic Usage
```javascript
const KoyebDeployer = require('./koyeb/KoyebDeployer');

const deployer = new KoyebDeployer({
  apiKey: process.env.KOYEB_API_KEY,
  appName: 'my-bot'
});

// Deploy
await deployer.deploy();

// Get logs
const logs = await deployer.getLogs();
```

## Features

- ✅ API-based deployment (no CLI dependency)
- ✅ Automatic environment variable configuration
- ✅ Git repository detection
- ✅ Health check configuration
- ✅ Free tier deployment
- ✅ Log streaming
- ✅ Status monitoring

## Architecture

```
koyeb/
├── KoyebDeployer.js   # Core deployment class
├── deploy.js          # Interactive deployment script
├── cli.js            # CLI commands
└── README.md         # This file
```

## Environment Variables

The deployer automatically reads your `.env` file and configures all variables in Koyeb.

## Troubleshooting

1. **API Key Issues**
   - Ensure `KOYEB_API_KEY` is set
   - Check key permissions at https://app.koyeb.com/account/api

2. **Git Repository**
   - Must have a git remote origin
   - Repository must be public or Koyeb must have access

3. **Deployment Failures**
   - Check logs: `node koyeb/cli.js logs`
   - Verify build commands in `package.json`