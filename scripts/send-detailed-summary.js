#!/usr/bin/env node

/**
 * Send Detailed Work Summary
 *
 * This script sends a comprehensive summary of what each person worked on
 * during the pay period, including compliance stats and detailed work descriptions.
 */

const fs = require('fs');
const path = require('path');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const PumbleClient = require('../shared/pumble-client');
const { createLogger } = require('../shared/logger');
const channels = require('../config/channels.json');
require('dotenv').config();

const logger = createLogger('send-detailed-summary');

// Get Mikhail's DM channel ID from channels config
const MIKHAIL_DM_CHANNEL_ID = channels.dm_channels.bot_to_mikhail.id;

/**
 * Parse the hours report to extract compliance data and work summaries
 */
function parseHoursReport(reportContent) {
  // Extract metadata
  const periodMatch = reportContent.match(/Period: (.+)/);
  const entriesMatch = reportContent.match(/Entries: (\d+)/);

  const period = periodMatch ? periodMatch[1] : 'Unknown';
  const entries = entriesMatch ? entriesMatch[1] : '0';

  // Extract compliance table
  const tableMatch = reportContent.match(/\| User[\s\S]*?\n\n/);
  const complianceTable = tableMatch ? tableMatch[0].trim() : '';

  // Extract individual summaries
  const summaries = [];
  const detailedSection = reportContent.split('=== DETAILED WORK SUMMARY ===')[1];

  if (detailedSection) {
    // Split by person sections (name followed by dashes)
    const personBlocks = detailedSection.split(/\n\n(?=[A-Z])/);

    for (const block of personBlocks) {
      if (!block.trim()) continue;

      const lines = block.split('\n');
      let name = '';
      let expected = '0';
      let hours = '0';
      let status = '?';
      let workLines = [];
      let inWorkSection = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Name is first non-empty line (not dashes)
        if (!name && trimmed && !trimmed.startsWith('-')) {
          name = trimmed;
        }
        // Expected hours
        else if (trimmed.startsWith('Expected Hours:')) {
          expected = trimmed.match(/[\d.]+/)?.[0] || '0';
        }
        // Actual hours
        else if (trimmed.startsWith('Actual Hours:')) {
          hours = trimmed.match(/[\d.]+/)?.[0] || '0';
        }
        // Status
        else if (trimmed.startsWith('Status:')) {
          status = trimmed.replace('Status:', '').trim();
        }
        // Work summary section
        else if (trimmed === 'Work Summary:') {
          inWorkSection = true;
        }
        // Collect work items
        else if (inWorkSection && trimmed.startsWith('•')) {
          workLines.push(trimmed);
        }
      }

      if (name && name !== '---' && !name.startsWith('-')) {
        summaries.push({
          name,
          hours,
          expected,
          status,
          work: workLines.length > 0 ? workLines.join('\n') : 'No details available'
        });
      }
    }
  }

  return {
    period,
    entries,
    complianceTable,
    summaries
  };
}

/**
 * Format a detailed summary message for Pumble
 */
function formatDetailedSummary(data) {
  const { period, entries, complianceTable, summaries } = data;

  // Count compliant vs non-compliant
  const compliant = summaries.filter(s => s.status.includes('✓')).length;
  const total = summaries.length;
  const complianceRate = total > 0 ? ((compliant / total) * 100).toFixed(1) : '0.0';

  let message = `# Pay Period Work Summary\n`;
  message += `**Period:** ${period}\n`;
  message += `**Compliance:** ${complianceRate}% (${compliant}/${total})\n`;
  message += `**Total Entries:** ${entries}\n\n`;

  message += `## Compliance Overview\n\`\`\`\n${complianceTable}\n\`\`\`\n\n`;

  message += `## Detailed Work Breakdown\n\n`;

  // Sort summaries: compliant first, then by hours descending
  summaries.sort((a, b) => {
    const aCompliant = a.status.includes('✓') ? 1 : 0;
    const bCompliant = b.status.includes('✓') ? 1 : 0;
    if (aCompliant !== bCompliant) return bCompliant - aCompliant;
    return parseFloat(b.hours) - parseFloat(a.hours);
  });

  for (const person of summaries) {
    const statusIcon = person.status.includes('✓') ? '✓' : '✗';
    const deviation = ((parseFloat(person.hours) - parseFloat(person.expected)) / parseFloat(person.expected) * 100).toFixed(1);
    const deviationStr = deviation > 0 ? `+${deviation}%` : `${deviation}%`;

    message += `### ${statusIcon} **${person.name}** - ${person.hours}/${person.expected}h (${deviationStr})\n`;
    message += `${person.work}\n\n`;
    message += `---\n\n`;
  }

  return message;
}

async function sendDetailedSummary(options = {}) {
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
      console.error(`Run 'npm run pull-kimai' first to generate the report.\n`);
      return;
    }

    // Read and parse the report
    const reportContent = fs.readFileSync(reportPath, 'utf8');
    const parsedData = parseHoursReport(reportContent);
    const message = formatDetailedSummary(parsedData);

    // Always send to Mikhail's DM
    if (!MIKHAIL_DM_CHANNEL_ID) {
      throw new Error('Could not find Mikhail\'s DM channel in channels config');
    }

    logger.info('Sending detailed summary to Mikhail', {
      targetId: MIKHAIL_DM_CHANNEL_ID,
      periodNumber,
      summaryCount: parsedData.summaries.length
    });

    if (options.dryRun) {
      console.log('\n🔍 DRY RUN - Would send DM to Mikhail');
      console.log('\nMessage preview:');
      console.log('─'.repeat(80));
      console.log(message);
      console.log('─'.repeat(80));
      return;
    }

    const client = new PumbleClient({
      apiKey: process.env.PUMBLE_API_KEY
    });

    const result = await client.sendMessage(MIKHAIL_DM_CHANNEL_ID, message);

    if (result) {
      logger.info('Detailed summary sent successfully', {
        messageId: result.id || 'unknown'
      });
      console.log(`\n✅ Detailed summary sent to Mikhail via DM!`);
      console.log(`   Pay Period: ${periodNumber}`);
      console.log(`   Team Members: ${parsedData.summaries.length}`);
    } else {
      throw new Error('Failed to send message');
    }

  } catch (error) {
    logger.error('Failed to send detailed summary', error);
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
Send Detailed Work Summary to Mikhail

Usage: ./send-detailed-summary.js [options]

Options:
  -p, --period <number>   Specific pay period number [default: latest available]
  -d, --dry-run          Preview message without sending
  -h, --help             Show this help message

Examples:
  ./send-detailed-summary.js        # DM to Mikhail with latest data
  ./send-detailed-summary.js -p 27  # DM specific period to Mikhail
  ./send-detailed-summary.js -d     # Dry run (preview only)

Note: This always sends the detailed summary as a DM to Mikhail.
      Run 'npm run pull-kimai' first to ensure you have the latest data.
`);
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  sendDetailedSummary(options);
}

module.exports = sendDetailedSummary;
