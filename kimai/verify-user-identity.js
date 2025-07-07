#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const readline = require('readline');
const { format } = require('date-fns');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const prompt = (question) => new Promise(resolve => rl.question(question, resolve));

async function verifyUserIdentity() {
  console.log('🔍 Kimai User Identity Verification Tool\n');
  console.log('This tool helps verify user identities by searching for specific clues.\n');

  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    // Get recent data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // Last 60 days

    console.log('Loading timesheet data...\n');
    const timesheets = await api.getTimesheets(startDate, endDate);

    while (true) {
      console.log('\nOptions:');
      console.log('1. Search by keyword in descriptions');
      console.log('2. Find who worked on a specific date');
      console.log('3. Find who works with specific projects');
      console.log('4. Search for design-related work');
      console.log('5. Compare work schedules');
      console.log('6. Exit');

      const choice = await prompt('\nSelect option (1-6): ');

      switch (choice.trim()) {
        case '1':
          await searchByKeyword(timesheets);
          break;
        case '2':
          await searchByDate(timesheets);
          break;
        case '3':
          await searchByProject(timesheets);
          break;
        case '4':
          await findDesigners(timesheets);
          break;
        case '5':
          await compareSchedules(timesheets);
          break;
        case '6':
          console.log('\nGoodbye!');
          rl.close();
          return;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    rl.close();
  }
}

async function searchByKeyword(timesheets) {
  const keyword = await prompt('\nEnter keyword to search (e.g., "Yulia", "Figma", "design"): ');
  
  console.log(`\nSearching for "${keyword}"...\n`);
  
  const matches = new Map();
  
  timesheets.forEach(entry => {
    if (entry.description && entry.description.toLowerCase().includes(keyword.toLowerCase())) {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (!matches.has(userId)) {
        matches.set(userId, []);
      }
      matches.get(userId).push({
        date: format(new Date(entry.begin), 'yyyy-MM-dd'),
        description: entry.description,
        hours: (entry.duration / 3600).toFixed(1)
      });
    }
  });
  
  if (matches.size === 0) {
    console.log('No matches found.');
  } else {
    for (const [userId, entries] of matches) {
      console.log(`\nUser ${userId} - ${entries.length} matches:`);
      entries.slice(0, 5).forEach(e => {
        console.log(`  ${e.date}: "${e.description.substring(0, 60)}..." (${e.hours}h)`);
      });
      if (entries.length > 5) {
        console.log(`  ... and ${entries.length - 5} more`);
      }
    }
  }
}

async function searchByDate(timesheets) {
  const dateStr = await prompt('\nEnter date (YYYY-MM-DD): ');
  
  console.log(`\nWork entries on ${dateStr}:\n`);
  
  const userWork = new Map();
  
  timesheets.forEach(entry => {
    const entryDate = format(new Date(entry.begin), 'yyyy-MM-dd');
    if (entryDate === dateStr) {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (!userWork.has(userId)) {
        userWork.set(userId, { hours: 0, tasks: [] });
      }
      userWork.get(userId).hours += entry.duration / 3600;
      userWork.get(userId).tasks.push(entry.description || 'No description');
    }
  });
  
  if (userWork.size === 0) {
    console.log('No entries found for this date.');
  } else {
    for (const [userId, work] of userWork) {
      console.log(`User ${userId}: ${work.hours.toFixed(1)} hours`);
      work.tasks.forEach(task => {
        console.log(`  - ${task.substring(0, 60)}${task.length > 60 ? '...' : ''}`);
      });
      console.log();
    }
  }
}

async function findDesigners(timesheets) {
  console.log('\nSearching for design-related work...\n');
  
  const designKeywords = ['design', 'figma', 'ui', 'ux', 'mockup', 'prototype', 'graphic', 'layout', 'visual', 'adobe', 'sketch'];
  const userDesignWork = new Map();
  
  timesheets.forEach(entry => {
    const desc = (entry.description || '').toLowerCase();
    const isDesignWork = designKeywords.some(keyword => desc.includes(keyword));
    
    if (isDesignWork) {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (!userDesignWork.has(userId)) {
        userDesignWork.set(userId, { count: 0, samples: [] });
      }
      const work = userDesignWork.get(userId);
      work.count++;
      if (work.samples.length < 5) {
        work.samples.push({
          date: format(new Date(entry.begin), 'yyyy-MM-dd'),
          description: entry.description
        });
      }
    }
  });
  
  // Sort by design work count
  const sorted = [...userDesignWork.entries()].sort((a, b) => b[1].count - a[1].count);
  
  console.log('Users with design-related work:\n');
  sorted.forEach(([userId, work]) => {
    console.log(`User ${userId}: ${work.count} design entries`);
    console.log('Sample tasks:');
    work.samples.forEach(s => {
      console.log(`  ${s.date}: ${s.description.substring(0, 60)}...`);
    });
    console.log();
  });
}

async function searchByProject(timesheets) {
  // First, show available projects
  const projects = new Set();
  timesheets.forEach(entry => {
    if (entry.project) projects.add(entry.project);
  });
  
  console.log('\nAvailable project IDs:', [...projects].sort((a, b) => a - b).join(', '));
  
  const projectId = await prompt('\nEnter project ID: ');
  const pid = parseInt(projectId);
  
  const userHours = new Map();
  
  timesheets.forEach(entry => {
    if (entry.project === pid) {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      userHours.set(userId, (userHours.get(userId) || 0) + entry.duration / 3600);
    }
  });
  
  console.log(`\nUsers working on Project ${pid}:\n`);
  const sorted = [...userHours.entries()].sort((a, b) => b[1] - a[1]);
  sorted.forEach(([userId, hours]) => {
    console.log(`User ${userId}: ${hours.toFixed(1)} hours`);
  });
}

async function compareSchedules(timesheets) {
  console.log('\nComparing work schedules (last 30 days)...\n');
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const userSchedules = new Map();
  
  timesheets
    .filter(entry => new Date(entry.begin) > thirtyDaysAgo)
    .forEach(entry => {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      const hour = new Date(entry.begin).getHours();
      const day = format(new Date(entry.begin), 'EEEE');
      
      if (!userSchedules.has(userId)) {
        userSchedules.set(userId, {
          totalHours: 0,
          daysWorked: new Set(),
          hourDistribution: {},
          dayDistribution: {}
        });
      }
      
      const schedule = userSchedules.get(userId);
      schedule.totalHours += entry.duration / 3600;
      schedule.daysWorked.add(format(new Date(entry.begin), 'yyyy-MM-dd'));
      schedule.hourDistribution[hour] = (schedule.hourDistribution[hour] || 0) + 1;
      schedule.dayDistribution[day] = (schedule.dayDistribution[day] || 0) + entry.duration / 3600;
    });
  
  // Show schedules
  for (const [userId, schedule] of userSchedules) {
    console.log(`\nUser ${userId}:`);
    console.log(`- Total: ${schedule.totalHours.toFixed(1)} hours over ${schedule.daysWorked.size} days`);
    console.log(`- Average: ${(schedule.totalHours / schedule.daysWorked.size).toFixed(1)} hours/day`);
    
    // Most active hours
    const topHours = Object.entries(schedule.hourDistribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([hour]) => `${hour}:00`);
    console.log(`- Peak hours: ${topHours.join(', ')}`);
    
    // Work days
    const workDays = Object.entries(schedule.dayDistribution)
      .filter(([_, hours]) => hours > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([day, hours]) => `${day} (${hours.toFixed(1)}h)`);
    console.log(`- Work pattern: ${workDays.slice(0, 3).join(', ')}`);
  }
}

// Run the tool
verifyUserIdentity().catch(console.error);