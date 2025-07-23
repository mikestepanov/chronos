const fs = require('fs');
const csv = require('csv-parse/sync');

// Read the CSV file
const csvContent = fs.readFileSync('/home/mstepanov/Documents/GitHub/chronos/20250710-kimai-export.csv', 'utf-8');

// Parse CSV
const records = csv.parse(csvContent, {
  columns: true,
  skip_empty_lines: true
});

// Function to convert duration H:MM to decimal hours
function durationToHours(duration) {
  const [hours, minutes] = duration.split(':').map(Number);
  return hours + (minutes / 60);
}

// Calculate total hours per user
const hoursPerUser = {};

records.forEach(record => {
  const user = record.User;
  const duration = record.Duration;
  
  if (user && duration) {
    const hours = durationToHours(duration);
    
    if (!hoursPerUser[user]) {
      hoursPerUser[user] = 0;
    }
    
    hoursPerUser[user] += hours;
  }
});

// Convert to array and sort by hours descending
const sortedUsers = Object.entries(hoursPerUser)
  .map(([user, hours]) => ({
    user,
    hours: Number(hours.toFixed(2))
  }))
  .sort((a, b) => b.hours - a.hours);

// Create formatted table
console.log('\nTotal Hours Worked by User (July 1-7, 2025)');
console.log('='.repeat(50));
console.log(`${'User'.padEnd(25)} | ${'Hours Worked'.padStart(12)}`);
console.log('-'.repeat(50));

sortedUsers.forEach(({ user, hours }) => {
  console.log(`${user.padEnd(25)} | ${hours.toFixed(2).padStart(12)}`);
});

console.log('-'.repeat(50));
console.log(`${'TOTAL'.padEnd(25)} | ${sortedUsers.reduce((sum, { hours }) => sum + hours, 0).toFixed(2).padStart(12)}`);
console.log('='.repeat(50));

// Additional statistics
console.log('\nSummary Statistics:');
console.log(`Total number of users: ${sortedUsers.length}`);
console.log(`Average hours per user: ${(sortedUsers.reduce((sum, { hours }) => sum + hours, 0) / sortedUsers.length).toFixed(2)}`);
console.log(`Highest hours: ${sortedUsers[0].hours} (${sortedUsers[0].user})`);
console.log(`Lowest hours: ${sortedUsers[sortedUsers.length - 1].hours} (${sortedUsers[sortedUsers.length - 1].user})`);