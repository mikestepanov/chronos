#!/usr/bin/env node

/**
 * Send Message CLI
 * 
 * Unified command-line interface for sending messages via Pumble
 * 
 * Usage:
 *   send-message --channel dev --message "Hello team!"
 *   send-message --user mikhail --preset hi
 *   send-message --template timesheet-reminder --user john --set hoursLogged=45
 *   send-message --group-dm "john,jane" --message "Quick sync?"
 *   send-message --channel bot-testing --preset test --schedule "1pm"
 *   send-message --list templates
 */

const { program } = require('commander');
const MessageSender = require('../services/MessageSender');
require('dotenv').config();

// Configure CLI
program
  .name('send-message')
  .description('Send messages via Pumble with templates and presets')
  .version('1.0.0');

// Send command
program
  .command('send', { isDefault: true })
  .description('Send a message')
  .option('-c, --channel <name>', 'Send to channel (name or ID)')
  .option('-u, --user <name>', 'Send DM to user')
  .option('-g, --group-dm <users>', 'Send to group DM (comma-separated users)')
  .option('-m, --message <text>', 'Message text')
  .option('-t, --template <name>', 'Use message template')
  .option('-p, --preset <name>', 'Use message preset')
  .option('-s, --set <vars...>', 'Set template variables (key=value)')
  .option('--schedule <time>', 'Schedule for later (e.g., "1pm", "5m", "2h")')
  .option('--dry-run', 'Preview without sending')
  .option('-v, --verbose', 'Verbose output')
  .action(handleSend);

// List command
program
  .command('list <type>')
  .description('List available resources')
  .action(handleList);

// Interactive mode
program
  .command('interactive')
  .alias('i')
  .description('Interactive message builder')
  .action(handleInteractive);

// Examples command
program
  .command('examples')
  .description('Show usage examples')
  .action(showExamples);

// Parse arguments
program.parse();

/**
 * Handle send command
 */
async function handleSend(options) {
  try {
    const sender = new MessageSender({
      dryRun: options.dryRun,
      verbose: options.verbose
    });

    // Parse variables
    const variables = {};
    if (options.set) {
      options.set.forEach(varDef => {
        const [key, ...valueParts] = varDef.split('=');
        variables[key] = valueParts.join('=');
      });
    }

    // Parse group DM users
    let groupDM;
    if (options.groupDm) {
      groupDM = options.groupDm.split(',').map(u => u.trim());
    }

    // Send message
    const result = await sender.send({
      channel: options.channel,
      user: options.user,
      groupDM,
      message: options.message,
      template: options.template,
      preset: options.preset,
      variables,
      schedule: options.schedule
    });

    if (!options.dryRun && !result.scheduledFor) {
      console.log('\n✅ Message sent successfully!');
      if (result.messageId) {
        console.log(`   Message ID: ${result.messageId}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

/**
 * Handle list command
 */
async function handleList(type) {
  const sender = new MessageSender();

  switch (type.toLowerCase()) {
    case 'templates':
    case 'template':
      sender.listTemplates();
      break;
    
    case 'channels':
    case 'channel':
      sender.listChannels();
      break;
    
    case 'users':
    case 'user':
      sender.listUsers();
      break;
    
    case 'presets':
    case 'preset':
      sender.listTemplates(); // Shows both templates and presets
      break;
    
    default:
      console.error(`Unknown type: ${type}`);
      console.log('Available types: templates, presets, channels, users');
      process.exit(1);
  }
}

/**
 * Handle interactive mode
 */
async function handleInteractive() {
  const { Select, Input, Confirm } = require('enquirer');
  const sender = new MessageSender({ verbose: true });

  try {
    // Choose recipient type
    const recipientType = await new Select({
      message: 'Send to:',
      choices: ['Channel', 'User (DM)', 'Group DM']
    }).run();

    let recipient = {};
    
    if (recipientType === 'Channel') {
      const channels = Object.keys(sender.channels);
      recipient.channel = await new Select({
        message: 'Select channel:',
        choices: channels
      }).run();
    } else if (recipientType === 'User (DM)') {
      const users = sender.users.users.filter(u => u.active).map(u => u.id);
      recipient.user = await new Select({
        message: 'Select user:',
        choices: users
      }).run();
    } else {
      const userList = await new Input({
        message: 'Enter usernames (comma-separated):'
      }).run();
      recipient.groupDM = userList.split(',').map(u => u.trim());
    }

    // Choose message type
    const messageType = await new Select({
      message: 'Message type:',
      choices: ['Simple message', 'Use preset', 'Use template']
    }).run();

    let messageOptions = {};

    if (messageType === 'Simple message') {
      messageOptions.message = await new Input({
        message: 'Enter message:'
      }).run();
    } else if (messageType === 'Use preset') {
      const presets = Object.keys(sender.templates.presets);
      messageOptions.preset = await new Select({
        message: 'Select preset:',
        choices: presets
      }).run();
    } else {
      const templates = Object.keys(sender.templates.templates);
      messageOptions.template = await new Select({
        message: 'Select template:',
        choices: templates
      }).run();

      // Get template variables
      const template = sender.templates.templates[messageOptions.template];
      messageOptions.variables = {};
      
      for (const variable of template.variables) {
        messageOptions.variables[variable] = await new Input({
          message: `Enter value for '${variable}':`
        }).run();
      }
    }

    // Schedule?
    const shouldSchedule = await new Confirm({
      message: 'Schedule for later?'
    }).run();

    if (shouldSchedule) {
      messageOptions.schedule = await new Input({
        message: 'When? (e.g., "1pm", "5m", "2h"):'
      }).run();
    }

    // Dry run?
    const dryRun = await new Confirm({
      message: 'Dry run? (preview without sending)'
    }).run();

    // Send
    const result = await sender.send({
      ...recipient,
      ...messageOptions,
      dryRun
    });

    if (!dryRun && !result.scheduledFor) {
      console.log('\n✅ Message sent!');
    }

  } catch (error) {
    if (error.message === 'Cancelled') {
      console.log('\n👋 Cancelled');
    } else {
      console.error('\n❌ Error:', error.message);
    }
  }
}

/**
 * Show usage examples
 */
function showExamples() {
  console.log(`
📚 Send Message Examples

Simple Messages:
  send-message -c bot-testing -m "Hello world!"
  send-message -u mikhail -p hi
  send-message -g "john,jane" -m "Team sync at 3pm"

Using Templates:
  send-message -u john -t timesheet-reminder \\
    -s user=John hoursLogged=45 periodNumber=20

Using Presets:
  send-message -c dev -p test
  send-message -c bot-testing -p reminder-80h

Scheduling:
  send-message -c general -m "Standup time!" --schedule "9am"
  send-message -u boss -m "Report ready" --schedule "5m"

Other Options:
  send-message -c dev -p test --dry-run        # Preview without sending
  send-message -u jane -m "Hi" -v              # Verbose output
  send-message list templates                   # List available templates
  send-message list channels                    # List available channels
  send-message interactive                      # Interactive mode
`);
}

// Show help if no arguments
if (process.argv.length === 2) {
  program.help();
}