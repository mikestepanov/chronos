#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parse/sync');

async function mapUsersFromExport() {
  console.log('🔍 Mapping Kimai Users from Export\n');

  try {
    // Read the export file
    const exportPath = '/home/mstepanov/Documents/GitHub/omega/20250705-kimai-export.csv';
    const exportContent = await fs.readFile(exportPath, 'utf-8');
    
    // Parse CSV
    const records = csv.parse(exportContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${records.length} entries in export\n`);
    
    // Create mapping of usernames from export
    const userMap = new Map();
    const userHours = new Map();
    
    records.forEach(record => {
      const username = record.User || record.Name;
      if (username && username.trim()) {
        if (!userMap.has(username)) {
          userMap.set(username, {
            name: record.Name || username,
            username: username,
            entries: 0,
            totalHours: 0,
            activities: new Set(),
            projects: new Set()
          });
        }
        
        const user = userMap.get(username);
        user.entries++;
        
        // Parse duration (format: "H:MM")
        const duration = record.Duration;
        if (duration) {
          const [hours, minutes] = duration.split(':').map(Number);
          user.totalHours += hours + (minutes / 60);
        }
        
        if (record.Activity) user.activities.add(record.Activity);
        if (record.Project) user.projects.add(record.Project);
      }
    });
    
    // Display user summary from export
    console.log('Users found in export:');
    console.log('=' .repeat(60));
    
    const sortedUsers = [...userMap.entries()].sort((a, b) => b[1].entries - a[1].entries);
    
    sortedUsers.forEach(([username, data]) => {
      console.log(`\n${data.name} (username: ${username})`);
      console.log(`  Entries: ${data.entries}`);
      console.log(`  Total hours: ${data.totalHours.toFixed(1)}`);
      console.log(`  Activities: ${[...data.activities].slice(0, 3).join(', ')}${data.activities.size > 3 ? '...' : ''}`);
      console.log(`  Projects: ${[...data.projects].slice(0, 3).join(', ')}${data.projects.size > 3 ? '...' : ''}`);
    });
    
    // Now try to match with our extracted data
    console.log('\n\n🔗 Matching with extracted Kimai data...\n');
    
    // Read our extracted CSV (simple parsing since it's our generated format)
    const extractedPath = path.join(__dirname, '../kimai-data/2025-06-15/v3.csv');
    const extractedContent = await fs.readFile(extractedPath, 'utf-8');
    const extractedLines = extractedContent.split('\n').filter(line => line.trim());
    const extractedRecords = [];
    
    // Skip header and parse manually
    for (let i = 1; i < extractedLines.length; i++) {
      const parts = extractedLines[i].split(',');
      if (parts.length >= 3) {
        extractedRecords.push({
          User: parts[1].replace(/"/g, ''),
          Duration: parts[2].replace(/"/g, '')
        });
      }
    }
    
    // Count hours by user in extracted data
    const extractedUserHours = new Map();
    extractedRecords.forEach(record => {
      const user = record.User;
      const hours = parseFloat(record.Duration) || 0;
      extractedUserHours.set(user, (extractedUserHours.get(user) || 0) + hours);
    });
    
    // Try to match based on total hours
    console.log('Attempting to match users based on work patterns:\n');
    
    // For June 15-28 period, calculate hours from export
    const juneExportHours = new Map();
    records.forEach(record => {
      const date = new Date(record.Date);
      if (date >= new Date('2025-06-15') && date <= new Date('2025-06-28')) {
        const username = record.User || record.Name;
        const duration = record.Duration;
        if (duration && username) {
          const [hours, minutes] = duration.split(':').map(Number);
          const totalHours = hours + (minutes / 60);
          juneExportHours.set(username, (juneExportHours.get(username) || 0) + totalHours);
        }
      }
    });
    
    // Display June period comparison
    console.log('June 15-28 Period Comparison:');
    console.log('-'.repeat(60));
    console.log('\nFrom Export:');
    [...juneExportHours.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([username, hours]) => {
        console.log(`  ${username}: ${hours.toFixed(1)} hours`);
      });
    
    console.log('\nFrom Extracted Data:');
    [...extractedUserHours.entries()]
      .sort((a, b) => b[1] - a[1])
      .forEach(([user, hours]) => {
        console.log(`  ${user}: ${hours.toFixed(1)} hours`);
      });
    
    // Suggest mappings
    console.log('\n\n📋 SUGGESTED MAPPINGS:');
    console.log('=' .repeat(60));
    
    // Manual mapping based on analysis
    const mappings = [
      { kimaiId: 5, exportName: 'Raheel Shahzad', confidence: 'HIGH', reason: 'Developer, mentions in descriptions' },
      { kimaiId: 3, exportName: 'Yulia', confidence: 'HIGH', reason: 'Designer, Graphics work, Mike meetings' },
      { kimaiId: 12, exportName: 'pauline', confidence: 'HIGH', reason: 'Designer, meets with Yulia, avatars work' },
      { kimaiId: 7, exportName: 'eddy', confidence: 'HIGH', reason: 'Designer, email templates, visual work' },
      { kimaiId: 9, exportName: 'Mori Isaac', confidence: 'MEDIUM', reason: 'Developer, Kimai work mentioned' },
      { kimaiId: 8, exportName: 'ariful', confidence: 'MEDIUM', reason: 'Developer, auth work' },
      { kimaiId: 2, exportName: 'Dharam Pal Singh', confidence: 'MEDIUM', reason: 'Developer, consistent hours' }
    ];
    
    mappings.forEach(m => {
      console.log(`\nUser ${m.kimaiId} → ${m.exportName}`);
      console.log(`  Confidence: ${m.confidence}`);
      console.log(`  Reason: ${m.reason}`);
    });
    
    // Generate updated mapping file
    console.log('\n\n📝 Updated user-mapping.csv content:');
    console.log('-'.repeat(60));
    console.log('kimai_id,name,email,pumble_id,active');
    
    mappings.forEach(m => {
      const exportUser = userMap.get(m.exportName);
      const email = `${m.exportName.toLowerCase().replace(' ', '.')}@starthub.academy`;
      console.log(`${m.kimaiId},${m.exportName},${email},PUMBLE_ID_HERE,true`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if csv-parse is installed
try {
  require('csv-parse');
  mapUsersFromExport();
} catch (e) {
  console.log('Installing csv-parse...');
  require('child_process').execSync('npm install csv-parse', { cwd: __dirname });
  mapUsersFromExport();
}