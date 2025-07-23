#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const { format } = require('date-fns');

async function searchNames() {
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    // Search last 60 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);

    console.log(`Searching from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}\n`);
    
    const timesheets = await api.getTimesheets(startDate, endDate);
    console.log(`Found ${timesheets.length} timesheet entries\n`);

    // Common names to search for
    const names = ['Yulia', 'Yuliya', 'Julia', 'Mike', 'Mikhail', 'Raheel', 'Avraham', 'Hamin', 'John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Eve'];
    
    console.log('Searching for name mentions in descriptions:\n');
    
    const nameMatches = new Map();
    
    timesheets.forEach(entry => {
      if (!entry.description) return;
      
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      
      names.forEach(name => {
        if (entry.description.toLowerCase().includes(name.toLowerCase())) {
          const key = `${userId}-${name}`;
          if (!nameMatches.has(key)) {
            nameMatches.set(key, {
              userId,
              name,
              matches: []
            });
          }
          
          nameMatches.get(key).matches.push({
            date: format(new Date(entry.begin), 'yyyy-MM-dd'),
            description: entry.description
          });
        }
      });
    });
    
    // Group by user and show results
    const userNameMentions = new Map();
    
    for (const data of nameMatches.values()) {
      if (!userNameMentions.has(data.userId)) {
        userNameMentions.set(data.userId, new Map());
      }
      userNameMentions.get(data.userId).set(data.name, data.matches);
    }
    
    // Display results
    for (const [userId, mentions] of userNameMentions) {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`USER ${userId} mentions these names:`);
      console.log(`${'='.repeat(50)}`);
      
      for (const [name, matches] of mentions) {
        console.log(`\n"${name}" (${matches.length} times):`);
        matches.slice(0, 3).forEach(m => {
          console.log(`  ${m.date}: ${m.description.substring(0, 80)}...`);
        });
        if (matches.length > 3) {
          console.log(`  ... and ${matches.length - 3} more mentions`);
        }
      }
    }
    
    // Also search for role indicators
    console.log(`\n\n${'='.repeat(50)}`);
    console.log('ROLE INDICATORS:');
    console.log(`${'='.repeat(50)}`);
    
    const roleKeywords = {
      'Designer': ['design', 'figma', 'ui', 'ux', 'graphic', 'mockup', 'visual'],
      'Developer': ['code', 'implement', 'bug', 'fix', 'api', 'deploy', 'refactor'],
      'Manager': ['meeting', 'sync', '1-on-1', 'coaching', 'review', 'planning']
    };
    
    const userRoles = new Map();
    
    timesheets.forEach(entry => {
      if (!entry.description) return;
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      
      if (!userRoles.has(userId)) {
        userRoles.set(userId, {
          Designer: 0,
          Developer: 0,
          Manager: 0
        });
      }
      
      const desc = entry.description.toLowerCase();
      for (const [role, keywords] of Object.entries(roleKeywords)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
          userRoles.get(userId)[role]++;
        }
      }
    });
    
    for (const [userId, roles] of userRoles) {
      const total = roles.Designer + roles.Developer + roles.Manager;
      if (total > 0) {
        console.log(`\nUser ${userId}:`);
        console.log(`  Designer: ${((roles.Designer / total) * 100).toFixed(0)}% (${roles.Designer} tasks)`);
        console.log(`  Developer: ${((roles.Developer / total) * 100).toFixed(0)}% (${roles.Developer} tasks)`);
        console.log(`  Manager: ${((roles.Manager / total) * 100).toFixed(0)}% (${roles.Manager} tasks)`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

searchNames();