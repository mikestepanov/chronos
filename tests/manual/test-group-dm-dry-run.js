#!/usr/bin/env node

const UserService = require('../../config/users/UserService');
const { format } = require('date-fns');

async function testGroupDMDryRun() {
  console.log('Testing Group DM functionality (DRY RUN)...\n');
  
  // Get participants
  const userService = new UserService();
  const mikhail = userService.getActiveUsers().find(u => u.id === 'mikhail-stepanov');
  
  const participants = {
    bot: {
      id: require('../../shared/bots').DEFAULT_BOT_ID,
      name: 'Agent Smith'
    },
    eugene: {
      id: '66ad3fc6fa0959319e3b5259',
      name: 'Eugene'
    },
    mikhail: {
      id: mikhail.services.pumble.id,
      name: mikhail.name
    }
  };
  
  console.log('Group DM Participants:');
  console.log(`1. Bot: ${participants.bot.name} (${participants.bot.id})`);
  console.log(`2. User: ${participants.eugene.name} (${participants.eugene.id})`);
  console.log(`3. Manager: ${participants.mikhail.name} (${participants.mikhail.id})`);
  
  // Test message content
  const testData = {
    hours: 32,
    missing: 8,
    period: {
      start: new Date('2024-01-01'),
      end: new Date('2024-01-15')
    }
  };
  
  const message = `⚠️ **Timesheet Follow-up**

Hi Eugene, this is a friendly reminder that your timesheet is incomplete.

**Current Status:**
• Hours logged: ${testData.hours}h
• Hours needed: ${testData.missing}h more
• Pay period: ${format(testData.period.start, 'MMM d')} - ${format(testData.period.end, 'MMM d')}

Please complete your timesheet by EOD today. If you have any questions or issues, please reach out to Mikhail.

Thank you!`;

  console.log('\nMessage to be sent:');
  console.log('-------------------');
  console.log(message);
  console.log('-------------------');
  
  console.log('\n✅ Dry run completed successfully!');
  console.log('\nTo actually send this message, ensure:');
  console.log('1. PUMBLE_API_KEY is set in .env');
  console.log('2. The bot has permissions to create group DMs');
}

// Run the test
if (require.main === module) {
  testGroupDMDryRun();
}