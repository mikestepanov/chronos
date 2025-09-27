#!/usr/bin/env node

const KoyebDeployer = require('./KoyebDeployer');
const { execSync } = require('child_process');

/**
 * Koyeb CLI commands
 */
const commands = {
  deploy: async () => {
    const deployer = new KoyebDeployer();
    await deployer.deploy();
  },

  status: async () => {
    const deployer = new KoyebDeployer();
    const status = await deployer.getDeploymentStatus();
    
    console.log('📊 Deployment Status:');
    console.log(`   State: ${status?.status || 'Unknown'}`);
    console.log(`   Created: ${status?.created_at || 'N/A'}`);
    console.log(`   URL: https://${deployer.appName}.koyeb.app`);
  },

  logs: async (args) => {
    const deployer = new KoyebDeployer();
    const limit = args[0] || 100;
    const logs = await deployer.getLogs(limit);
    console.log(logs);
  },

  delete: async () => {
    const deployer = new KoyebDeployer();
    
    console.log('⚠️  WARNING: This will delete your Koyeb app!');
    console.log('Type "DELETE" to confirm: ');
    
    const confirm = await new Promise(resolve => {
      process.stdin.once('data', data => resolve(data.toString().trim()));
    });
    
    if (confirm === 'DELETE') {
      await deployer.deleteApp();
    } else {
      console.log('Deletion cancelled.');
    }
  },

  info: async () => {
    const deployer = new KoyebDeployer();
    const gitInfo = deployer.getGitInfo();
    
    console.log('ℹ️  Koyeb App Information:');
    console.log(`   App Name: ${deployer.appName}`);
    console.log(`   Repository: ${gitInfo.repository}`);
    console.log(`   Branch: ${gitInfo.branch}`);
    console.log(`   URL: https://${deployer.appName}.koyeb.app`);
    console.log(`   Dashboard: https://app.koyeb.com/apps/${deployer.appName}`);
  },

  help: () => {
    console.log(`
🚀 Koyeb CLI for Pay Period Bot

Usage: node koyeb/cli.js <command> [options]

Commands:
  deploy    Deploy the application to Koyeb
  status    Check deployment status
  logs      View application logs (optional: limit number)
  info      Show app information
  delete    Delete the Koyeb app
  help      Show this help message

Examples:
  node koyeb/cli.js deploy
  node koyeb/cli.js logs 50
  node koyeb/cli.js status

Environment:
  KOYEB_API_KEY    Your Koyeb API key (required)
`);
  }
};

// Main CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const commandArgs = args.slice(1);

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    commands.help();
    process.exit(1);
  }

  try {
    await commands[command](commandArgs);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}