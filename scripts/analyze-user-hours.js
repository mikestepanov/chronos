#!/usr/bin/env node

const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Read CSV file path from command line
const csvPath = process.argv[2] || 'kimai-data/2025-07-08/v1.csv';

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

// Parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Analyze by user
const userStats = {};

records.forEach(record => {
  if (!record.Date || !/^\d{4}-\d{2}-\d{2}$/.test(record.Date)) return;
  
  const user = record.User || 'Unknown';
  
  if (!userStats[user]) {
    userStats[user] = {
      totalHours: 0,
      entries: 0,
      daysWorked: new Set(),
      projects: new Set(),
      activities: new Set(),
      earliestTime: null,
      latestTime: null
    };
  }
  
  // Parse duration
  const durationParts = (record.Duration || '0:00').split(':');
  const hours = parseInt(durationParts[0] || 0) + parseInt(durationParts[1] || 0) / 60;
  
  userStats[user].totalHours += hours;
  userStats[user].entries++;
  userStats[user].daysWorked.add(record.Date);
  userStats[user].projects.add(record.Project);
  userStats[user].activities.add(record.Activity);
  
  // Track earliest/latest work times
  const startTime = record.From;
  const endTime = record.To;
  
  if (!userStats[user].earliestTime || startTime < userStats[user].earliestTime) {
    userStats[user].earliestTime = startTime;
  }
  
  if (!userStats[user].latestTime || endTime > userStats[user].latestTime) {
    userStats[user].latestTime = endTime;
  }
});

// Convert to array and sort by total hours
const sortedUsers = Object.entries(userStats)
  .map(([name, stats]) => ({
    name,
    ...stats,
    daysWorked: stats.daysWorked.size,
    projects: Array.from(stats.projects).join(', '),
    activities: Array.from(stats.activities).join(', ')
  }))
  .sort((a, b) => b.totalHours - a.totalHours);

// Print detailed table
console.log('\n| User | Total Hours | Days | Entries | Avg/Day | Avg/Entry | Projects | Activities | Work Times |');
console.log('|------|-------------|------|---------|---------|-----------|----------|------------|------------|');

sortedUsers.forEach(user => {
  const avgPerDay = user.totalHours / user.daysWorked;
  const avgPerEntry = user.totalHours / user.entries;
  const workTimes = `${user.earliestTime || 'N/A'}-${user.latestTime || 'N/A'}`;
  
  console.log(
    `| ${user.name.padEnd(20)} ` +
    `| ${user.totalHours.toFixed(2).padStart(11)} ` +
    `| ${user.daysWorked.toString().padStart(4)} ` +
    `| ${user.entries.toString().padStart(7)} ` +
    `| ${avgPerDay.toFixed(2).padStart(7)} ` +
    `| ${avgPerEntry.toFixed(2).padStart(9)} ` +
    `| ${user.projects.substring(0, 8).padEnd(8)} ` +
    `| ${user.activities.substring(0, 10).padEnd(10)} ` +
    `| ${workTimes.padEnd(10)} |`
  );
});

// Summary statistics
const totalHours = sortedUsers.reduce((sum, user) => sum + user.totalHours, 0);
const totalEntries = sortedUsers.reduce((sum, user) => sum + user.entries, 0);

console.log('\n--- Summary ---');
console.log(`Total Hours: ${totalHours.toFixed(2)}`);
console.log(`Total Entries: ${totalEntries}`);
console.log(`Total Users: ${sortedUsers.length}`);