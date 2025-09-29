#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const KoyebDeployer = require('./KoyebDeployer');
const config = require('./config');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

/**
 * Interactive Koyeb deployment script
 */
async function main() {
  console.log('🚀 Chronos Koyeb Deployment');
  console.log('===========================\n');

  try {
    // Check for API key
    if (!process.env.KOYEB_API_KEY) {
      console.log('❌ KOYEB_API_KEY not found in environment');
      console.log('Please add it to your .env file or export it:');
      console.log('export KOYEB_API_KEY=your-api-key-here\n');
      process.exit(1);
    }

    // Check which service to deploy
    console.log('Which service would you like to deploy?');
    console.log('1. Koyeb Cron Server (koyeb-cron-server.js)');
    console.log('2. Custom path\n');

    const choice = await question('Select (1-2): ');

    let deployPath, appName;

    switch(choice) {
      case '1':
        deployPath = path.join(__dirname, '..');
        appName = 'chronos-bot';
        break;
      case '2':
        deployPath = await question('Enter path: ');
        appName = await question('Enter app name: ');
        break;
      default:
        console.log('Invalid choice');
        process.exit(1);
    }

    // Initialize deployer with config
    const deployer = new KoyebDeployer({
      appName,
      ...config
    });

    // Show current config
    console.log('\n📋 Deployment Configuration:');
    console.log(`   App Name: ${appName}`);
    console.log(`   Deploy Path: ${deployPath}`);
    console.log(`   Git Branch: ${deployer.getGitInfo().branch}`);
    console.log(`   Instance: ${config.service.instanceType}`);
    console.log(`   Build: ${config.build.buildCommand}`);
    console.log(`   Run: ${config.build.runCommand}\n`);

    // Confirm deployment
    const confirm = await question('Deploy to Koyeb? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Deployment cancelled.');
      process.exit(0);
    }

    // Change to deployment directory
    process.chdir(deployPath);

    // Deploy
    await deployer.deploy();

    console.log('\n✅ Deployment complete!');
    console.log(`🌐 Your app: https://${appName}.koyeb.app`);
    console.log(`📊 Dashboard: https://app.koyeb.com/apps/${appName}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };