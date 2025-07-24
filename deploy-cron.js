#!/usr/bin/env node

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const KoyebDeployer = require('./koyeb/KoyebDeployer');

async function deployChronosCron() {
  console.log('🚀 Deploying Chronos Cron Server to Koyeb...\n');
  
  try {
    const deployer = new KoyebDeployer({
      apiKey: process.env.KOYEB_API_KEY,
      appName: 'chronos-bot'
    });
    
    const deployment = await deployer.deploy({
      definition: {
        name: 'chronos-bot',
        type: 'WEB',
        env: [
          { key: 'PUMBLE_API_KEY', value: process.env.PUMBLE_API_KEY },
          { key: 'KIMAI_USERNAME', value: process.env.KIMAI_USERNAME },
          { key: 'KIMAI_PASSWORD', value: process.env.KIMAI_PASSWORD },
          { key: 'ENABLE_TEST_CRON', value: 'true' },
          { key: 'ENABLE_MONDAY_REMINDER', value: 'false' },
          { key: 'WEBHOOK_SECRET', value: 'test-secret-123' },
          { key: 'NODE_ENV', value: 'production' },
          { key: 'DEV_CHANNEL_ID', value: '66934de10aeebd36fe26f468' },
          { key: 'DESIGN_CHANNEL_ID', value: '66b6450b791a8769092d6f89' }
        ],
        instance_types: [{
          type: 'free'
        }],
        ports: [{
          port: 3000,
          protocol: 'http'
        }],
        health_checks: [{
          protocol: 'http',
          port: 3000,
          path: '/health',
          interval: 60
        }],
        build: {
          build_command: 'npm install',
          run_command: 'node koyeb-cron-server.js'
        }
      }
    });
    
    console.log('\n✅ Deployment successful!');
    console.log('🌐 App URL: https://chronos-bot.koyeb.app');
    console.log('📋 Health check: https://chronos-bot.koyeb.app/health');
    console.log('\n📝 Next steps:');
    console.log('1. Monitor bot-testing channel for messages every 5 minutes');
    console.log('2. Check logs at https://app.koyeb.com/apps/chronos-bot');
    console.log('3. Once tested, update ENABLE_TEST_CRON=false and ENABLE_MONDAY_REMINDER=true');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    console.error('\nMake sure you have:');
    console.error('1. Valid KOYEB_API_KEY in .env');
    console.error('2. Git repository with remote origin');
    console.error('3. Committed all changes');
    process.exit(1);
  }
}

deployChronosCron();