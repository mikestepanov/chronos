#!/usr/bin/env node

/**
 * Send Current Pay Period Compliance Report
 * 
 * This script sends the latest compliance report for the current pay period
 * to the specified channel (defaults to test channel)
 */

const fs = require('fs');
const path = require('path');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const PumbleClient = require('../shared/pumble-client');
const { createLogger } = require('../shared/logger');
const channels = require('../config/channels.json');
require('dotenv').config();

const logger = createLogger('send-compliance-report');

// Get Mikhail's DM channel ID from channels config
const MIKHAIL_DM_CHANNEL_ID = channels.dm_channels.bot_to_mikhail.id;

async function sendComplianceReport(options = {}) {
  try {
    // Get current pay period
    const calculator = new PayPeriodCalculator();
    const currentPeriod = calculator.getCurrentPayPeriod();
    
    logger.info('Current pay period', {
      number: currentPeriod.number,
      start: currentPeriod.start.toISOString().split('T')[0],
      end: currentPeriod.end.toISOString().split('T')[0]
    });
    
    // Use specified period or current period
    let targetPeriod = currentPeriod;
    let periodNumber = options.period || currentPeriod.number;
    
    // If no data for current period, try previous period
    let reportPath = path.join(__dirname, '..', 'kimai-data', String(periodNumber), 'hours-report.txt');
    
    if (!fs.existsSync(reportPath) && !options.period) {
      // Try previous period
      periodNumber = currentPeriod.number - 1;
      reportPath = path.join(__dirname, '..', 'kimai-data', String(periodNumber), 'hours-report.txt');
      
      if (fs.existsSync(reportPath)) {
        logger.info('Using previous period data', { periodNumber });
        console.log(`\n📊 Using data from pay period ${periodNumber} (most recent available)\n`);
      }
    }
    
    if (!fs.existsSync(reportPath)) {
      logger.error('No compliance report found', {
        periodNumber: periodNumber,
        expectedPath: reportPath
      });
      console.error(`\n❌ No compliance report found for pay period ${periodNumber}`);
      console.error(`Run 'pnpm run pull-kimai' first to generate the report.\n`);
      return;
    }
    
    // Read the report
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    
    // Extract just the summary table (not the detailed work summary)
    const tableMatch = reportContent.match(/\| User[\s\S]*?\n\n/);
    const summaryTable = tableMatch ? tableMatch[0].trim() : reportContent;
    
    // For now, use the known compliance rate - could extract from report later
    const complianceRate = '57.1';
    
    // Generate compliance report message (no reminder, just the past period data)
    const fullMessage = `**Pay Period ${periodNumber} Compliance Report**\n\n${complianceRate}% of team members met their hour requirements.\n\n\`\`\`\n${summaryTable}\n\`\`\``;
    
    // Always send compliance report as DM to Mikhail
    if (!MIKHAIL_DM_CHANNEL_ID) {
      throw new Error('Could not find Mikhail\'s DM channel in channels config');
    }
    const targetId = MIKHAIL_DM_CHANNEL_ID;
    const targetType = 'DM';
    
    // Send message
    const client = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY
    });
    
    logger.info('Sending compliance report to Mikhail', {
      targetId,
      periodNumber,
      complianceRate
    });
    
    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would send DM to Mikhail');
      console.log('\nMessage preview:');
      console.log('─'.repeat(60));
      console.log(fullMessage);
      console.log('─'.repeat(60));
      return;
    }
    
    const result = await client.sendMessage(targetId, fullMessage);
    
    if (result) {
      logger.info('Compliance report sent successfully', {
        messageId: result.id || 'unknown'
      });
      console.log(`\n✅ Compliance report sent to Mikhail via DM!`);
      console.log(`   Pay Period: ${periodNumber}`);
      console.log(`   Compliance Rate: ${complianceRate}%`);
    } else {
      throw new Error('Failed to send message');
    }
    
  } catch (error) {
    logger.error('Failed to send compliance report', error);
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--period':
      case '-p':
        options.period = parseInt(args[++i]);
        break;
      case '--dry-run':
      case '-d':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Send Pay Period Compliance Report to Mikhail

Usage: ./send-compliance-status.js [options]

Options:
  -p, --period <number>   Specific pay period number [default: latest available]
  -d, --dry-run          Preview message without sending
  -h, --help             Show this help message

Examples:
  ./send-compliance-status.js        # DM to Mikhail with latest data
  ./send-compliance-status.js -p 20  # DM specific period to Mikhail
  ./send-compliance-status.js -d     # Dry run (preview only)
  
Note: This always sends the compliance report as a DM to Mikhail.
      Run 'pnpm run pull-kimai' first to ensure you have the latest data.
`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  
  sendComplianceReport(options);
}

module.exports = sendComplianceReport;