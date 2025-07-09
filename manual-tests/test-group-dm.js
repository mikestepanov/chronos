#!/usr/bin/env node

const GroupDMService = require('./services/GroupDMService');
const { format } = require('date-fns');

async function testGroupDM() {
  try {
    console.log('Testing Group DM functionality...\n');
    
    // Initialize service
    const groupDMService = new GroupDMService();
    
    // Eugene's user data (from URL)
    const eugeneUser = {
      id: 'eugene-test',
      name: 'Eugene',
      services: {
        pumble: {
          id: '66ad3fc6fa0959319e3b5259'
        }
      }
    };
    
    // Test timesheet data
    const timesheetData = {
      hours: 32,
      missing: 8,
      period: {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-15'),
        id: '2024-01'
      }
    };
    
    console.log('Sending test group DM to:');
    console.log('- Bot (Agent Smith)');
    console.log('- Eugene (66ad3fc6fa0959319e3b5259)');
    console.log('- Mikhail (from users.json)\n');
    
    // Send the reminder
    await groupDMService.sendTimesheetReminder(eugeneUser, timesheetData);
    
    console.log('✅ Test message sent successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
if (require.main === module) {
  testGroupDM();
}