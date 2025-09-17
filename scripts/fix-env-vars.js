#!/usr/bin/env node

/**
 * Fix all obsolete environment variable references
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Files to fix
const patterns = [
  'monday-reminder/*.js',
  'shared/*.js',
  'tests/manual/*.js',
  'kimai/**/*.js',
  'docs/*.md'
];

// Fixes to apply
const fixes = [
  // Fix BOT_ID references
  {
    file: 'monday-reminder/monday-reminder-daemon.js',
    find: /botId: process\.env\.AGENTSMITH_ID/g,
    replace: "botId: require('../shared/bots').DEFAULT_BOT_ID"
  },
  {
    file: 'monday-reminder/monday-reminder-scheduler.js',
    find: /botId: process\.env\.AGENTSMITH_ID/g,
    replace: "botId: require('../shared/bots').DEFAULT_BOT_ID"
  },
  {
    file: 'kimai/services/GroupDMService.js',
    find: /process\.env\.PUMBLE_BOT_ID \|\| config\.botId/g,
    replace: "require('../../shared/bots').DEFAULT_BOT_ID"
  },
  {
    file: 'kimai/cli/send-message.js',
    find: /process\.env\.PUMBLE_BOT_USER_ID \|\| process\.env\.AGENTSMITH_ID \|\|/g,
    replace: ''
  },
  // Fix channel ID references in getChannelName functions
  {
    file: 'shared/smart-scheduler.js',
    find: /\[process\.env\.DEV_CHANNEL_ID\]: '#dev',\s*\[process\.env\.DESIGN_CHANNEL_ID\]: '#design',\s*\[process\.env\.ADMIN_CHANNEL_ID\]: '#admin',/g,
    replace: `[require('./channels').DEV]: '#dev',
      [require('./channels').DESIGN]: '#design',`
  },
  {
    file: 'shared/notification-wrapper.js',
    find: /\[process\.env\.DEV_CHANNEL_ID\]: '#dev',\s*\[process\.env\.DESIGN_CHANNEL_ID\]: '#design',\s*\[process\.env\.ADMIN_CHANNEL_ID\]: '#admin',\s*\[process\.env\.BOT_TO_MIKHAIL_DM_CHANNEL_ID\]: 'DM with Mikhail',\s*\[process\.env\.MIKHAIL_PERSONAL_DM_CHANNEL_ID\]: 'Mikhail Personal DM'/g,
    replace: `[require('./channels').DEV]: '#dev',
      [require('./channels').DESIGN]: '#design',
      [require('./channels').BOT_TO_MIKHAIL]: 'DM with Mikhail'`
  },
  // Fix test files
  {
    file: 'tests/manual/send-at-1pm.js',
    find: /const DEV_CHANNEL_ID = channels\.pumble\.dev\.id;\s*const DESIGN_CHANNEL_ID = channels\.pumble\.design\.id;/g,
    replace: `const DEV_CHANNEL_ID = channels.DEV;
const DESIGN_CHANNEL_ID = channels.DESIGN;`
  },
  {
    file: 'tests/manual/send-to-dev-design-now.js',
    find: /const DEV_CHANNEL_ID = channels\.pumble\.dev\.id;\s*const DESIGN_CHANNEL_ID = channels\.pumble\.design\.id;/g,
    replace: `const DEV_CHANNEL_ID = channels.DEV;
const DESIGN_CHANNEL_ID = channels.DESIGN;`
  },
  // Fix error messages
  {
    file: 'monday-reminder/monday-reminder.js',
    find: /throw new Error\('BOT_TO_MIKHAIL_DM_CHANNEL_ID not configured'\);/g,
    replace: "throw new Error('bot_to_mikhail channel not configured in channels.json');"
  },
  {
    file: 'tests/manual/dm-mikhail-via-channel.js',
    find: /throw new Error\('BOT_TO_MIKHAIL_DM_CHANNEL_ID not found in \.env'\);/g,
    replace: "throw new Error('bot_to_mikhail channel not configured');"
  }
];

console.log('🔧 Fixing obsolete environment variable references...\n');

// Apply targeted fixes
fixes.forEach(({ file, find, replace }) => {
  const filePath = path.join(__dirname, '..', file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (find.test(content)) {
      content = content.replace(find, replace);
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed: ${file}`);
    }
  }
});

// Remove process.env.PUMBLE_BOT_ID fallbacks
const testFiles = glob.sync(path.join(__dirname, '..', 'tests/manual/*.js'));
testFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Remove process.env.PUMBLE_BOT_ID || part
  if (content.includes('process.env.PUMBLE_BOT_ID ||')) {
    content = content.replace(/botId: process\.env\.PUMBLE_BOT_ID \|\| /g, 'botId: ');
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`✅ Cleaned: ${path.basename(file)}`);
  }
});

console.log('\n✨ Environment variable fixes complete!');
console.log('\n📝 Remember to update:');
console.log('- Documentation files manually');
console.log('- Any deployment configurations');
console.log('- Remove DEV_CHANNEL_ID and DESIGN_CHANNEL_ID from deploy-cron.js if they\'re loaded from config');