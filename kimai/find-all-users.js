#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const { format } = require('date-fns');

async function findAllUsers() {
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    // Search last 90 days to find all users
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    console.log(`🔍 Searching for all Kimai users (last 90 days)\n`);
    console.log(`Period: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}\n`);
    
    const timesheets = await api.getTimesheets(startDate, endDate);
    console.log(`Found ${timesheets.length} timesheet entries\n`);

    // Collect all unique user IDs
    const users = new Map();
    
    timesheets.forEach(entry => {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (userId && !users.has(userId)) {
        users.set(userId, {
          id: userId,
          firstSeen: entry.begin,
          lastSeen: entry.begin,
          entries: 0,
          totalHours: 0
        });
      }
      
      if (userId) {
        const user = users.get(userId);
        user.entries++;
        user.totalHours += entry.duration / 3600;
        if (new Date(entry.begin) < new Date(user.firstSeen)) {
          user.firstSeen = entry.begin;
        }
        if (new Date(entry.begin) > new Date(user.lastSeen)) {
          user.lastSeen = entry.begin;
        }
      }
    });

    console.log(`Found ${users.size} unique users:\n`);
    console.log('ID | Entries | Total Hours | First Seen | Last Seen | Days Since Last Entry');
    console.log('-'.repeat(80));
    
    const sortedUsers = [...users.entries()].sort((a, b) => a[0] - b[0]);
    
    sortedUsers.forEach(([id, user]) => {
      const daysSinceLastEntry = Math.floor((new Date() - new Date(user.lastSeen)) / (1000 * 60 * 60 * 24));
      const status = daysSinceLastEntry > 14 ? '⚠️ ' : '✅ ';
      
      console.log(
        `${status}${id.toString().padEnd(3)} | ` +
        `${user.entries.toString().padEnd(7)} | ` +
        `${user.totalHours.toFixed(1).padEnd(11)} | ` +
        `${format(new Date(user.firstSeen), 'yyyy-MM-dd').padEnd(10)} | ` +
        `${format(new Date(user.lastSeen), 'yyyy-MM-dd').padEnd(10)} | ` +
        `${daysSinceLastEntry} days ago`
      );
    });
    
    // Check against our mapping
    console.log('\n\n📋 Checking against user-mapping.csv...\n');
    
    const UserMapping = require('./services/UserMapping');
    const mapping = new UserMapping();
    await mapping.load();
    
    const unmappedUsers = [];
    for (const [id] of users) {
      if (!mapping.getByKimaiId(id)) {
        unmappedUsers.push(id);
      }
    }
    
    if (unmappedUsers.length > 0) {
      console.log(`❌ Found ${unmappedUsers.length} unmapped user IDs: ${unmappedUsers.join(', ')}`);
      console.log('\nThese users need to be added to user-mapping.csv');
    } else {
      console.log('✅ All users are mapped!');
    }
    
    // Show inactive users
    const inactiveUsers = [];
    for (const [id, user] of users) {
      const daysSinceLastEntry = Math.floor((new Date() - new Date(user.lastSeen)) / (1000 * 60 * 60 * 24));
      if (daysSinceLastEntry > 30) {
        const mapped = mapping.getByKimaiId(id);
        inactiveUsers.push({
          id,
          name: mapped ? mapped.name : `User ${id}`,
          lastSeen: user.lastSeen,
          daysAgo: daysSinceLastEntry
        });
      }
    }
    
    if (inactiveUsers.length > 0) {
      console.log('\n\n⚠️  Inactive Users (no entries in 30+ days):');
      inactiveUsers.forEach(u => {
        console.log(`  - ${u.name} (ID: ${u.id}) - last seen ${u.daysAgo} days ago`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findAllUsers();