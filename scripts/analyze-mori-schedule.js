#!/usr/bin/env node

const fs = require('fs');
const { parse } = require('csv-parse/sync');

// Read CSV
const csvPath = 'kimai-data/2025-07-08/v1.csv';
const csvContent = fs.readFileSync(csvPath, 'utf8');
const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Filter Mori's entries
const moriEntries = records.filter(r => 
  r.User && r.User.toLowerCase().includes('mori') && 
  r.Date && /^\d{4}-\d{2}-\d{2}$/.test(r.Date)
);

// Group by date
const dailySchedule = {};

moriEntries.forEach(entry => {
  const date = entry.Date;
  
  if (!dailySchedule[date]) {
    dailySchedule[date] = {
      totalHours: 0,
      entries: []
    };
  }
  
  // Parse duration
  const [hours, minutes] = entry.Duration.split(':').map(Number);
  const duration = hours + minutes / 60;
  
  dailySchedule[date].totalHours += duration;
  dailySchedule[date].entries.push({
    time: `${entry.From}-${entry.To}`,
    duration: entry.Duration,
    hours: duration,
    activity: entry.Activity,
    description: entry.Description,
    project: entry.Project
  });
});

// Display daily breakdown
console.log("Mori Isaac's Daily Work Schedule:\n");

const dates = Object.keys(dailySchedule).sort();
dates.forEach(date => {
  const day = dailySchedule[date];
  console.log(`${date}: ${day.totalHours.toFixed(2)} hours (${day.entries.length} entries)`);
  
  day.entries.forEach(entry => {
    console.log(`  ${entry.time} (${entry.duration}) - ${entry.activity}: ${entry.description}`);
  });
  console.log();
});

// Summary
const totalDays = dates.length;
const totalHours = Object.values(dailySchedule).reduce((sum, day) => sum + day.totalHours, 0);
const avgHoursPerDay = totalHours / totalDays;

console.log("--- Summary ---");
console.log(`Days worked: ${totalDays}`);
console.log(`Total hours: ${totalHours.toFixed(2)}`);
console.log(`Average hours per day: ${avgHoursPerDay.toFixed(2)}`);

// Check for 8-hour days
const exactlyEightHourDays = dates.filter(date => 
  Math.abs(dailySchedule[date].totalHours - 8) < 0.1
);

console.log(`\nDays with exactly 8 hours: ${exactlyEightHourDays.length}`);
if (exactlyEightHourDays.length > 0) {
  console.log(`Dates: ${exactlyEightHourDays.join(', ')}`);
}