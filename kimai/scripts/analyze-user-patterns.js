#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const { format } = require('date-fns');

async function analyzeUserPatterns() {
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    // Get last 30 days of data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    console.log('🔍 Analyzing User Patterns (last 30 days)\n');
    console.log('This might help identify users based on their work patterns:\n');

    const timesheets = await api.getTimesheets(startDate, endDate);
    
    // Group by user
    const userStats = new Map();
    
    timesheets.forEach(entry => {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (!userStats.has(userId)) {
        userStats.set(userId, {
          id: userId,
          entries: [],
          projects: new Set(),
          activities: new Set(),
          totalHours: 0,
          descriptions: [],
          workDays: new Set()
        });
      }
      
      const stats = userStats.get(userId);
      stats.entries.push(entry);
      stats.totalHours += entry.duration / 3600;
      stats.workDays.add(format(new Date(entry.begin), 'yyyy-MM-dd'));
      
      if (entry.project) stats.projects.add(entry.project);
      if (entry.activity) stats.activities.add(entry.activity);
      if (entry.description) stats.descriptions.push(entry.description);
    });

    // Analyze each user
    for (const [userId, stats] of userStats) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`USER ${userId}`);
      console.log(`${'='.repeat(60)}`);
      
      console.log(`\n📊 Summary:`);
      console.log(`- Total hours: ${stats.totalHours.toFixed(1)}`);
      console.log(`- Days worked: ${stats.workDays.size}`);
      console.log(`- Number of entries: ${stats.entries.length}`);
      console.log(`- Average hours/day: ${(stats.totalHours / stats.workDays.size).toFixed(1)}`);
      
      // Show work patterns
      console.log(`\n📅 Work Pattern:`);
      const hoursByDay = {};
      stats.entries.forEach(entry => {
        const day = format(new Date(entry.begin), 'EEEE');
        hoursByDay[day] = (hoursByDay[day] || 0) + entry.duration / 3600;
      });
      Object.entries(hoursByDay)
        .sort((a, b) => b[1] - a[1])
        .forEach(([day, hours]) => {
          console.log(`  ${day}: ${hours.toFixed(1)} hours`);
        });
      
      // Show projects
      console.log(`\n📁 Projects (${stats.projects.size}):`);
      const projectCounts = {};
      stats.entries.forEach(entry => {
        if (entry.project) {
          projectCounts[entry.project] = (projectCounts[entry.project] || 0) + 1;
        }
      });
      Object.entries(projectCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([project, count]) => {
          console.log(`  Project ${project}: ${count} entries`);
        });
      
      // Show unique descriptions (might contain clues)
      console.log(`\n💬 Recent Task Descriptions (last 10 unique):`);
      const uniqueDescriptions = [...new Set(stats.descriptions)]
        .filter(d => d && d.trim())
        .slice(-10);
      uniqueDescriptions.forEach(desc => {
        console.log(`  - ${desc.substring(0, 60)}${desc.length > 60 ? '...' : ''}`);
      });
      
      // Show time patterns
      console.log(`\n⏰ Typical Work Hours:`);
      const hourCounts = {};
      stats.entries.forEach(entry => {
        const hour = new Date(entry.begin).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHours = Object.entries(hourCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([hour]) => `${hour}:00`);
      console.log(`  Most active hours: ${peakHours.join(', ')}`);
      
      // Look for identifying patterns
      console.log(`\n🔍 Identifying Clues:`);
      
      // Check for design-related tasks (might be Yulia)
      const designKeywords = ['design', 'figma', 'ui', 'ux', 'mockup', 'prototype', 'graphic'];
      const designTasks = stats.descriptions.filter(desc => 
        designKeywords.some(keyword => desc.toLowerCase().includes(keyword))
      );
      if (designTasks.length > 0) {
        console.log(`  🎨 Possible Designer - ${designTasks.length} design-related tasks`);
      }
      
      // Check for engineering tasks
      const devKeywords = ['code', 'implement', 'fix', 'bug', 'refactor', 'api', 'deploy'];
      const devTasks = stats.descriptions.filter(desc => 
        devKeywords.some(keyword => desc.toLowerCase().includes(keyword))
      );
      if (devTasks.length > 0) {
        console.log(`  💻 Possible Developer - ${devTasks.length} development tasks`);
      }
      
      // Check for coaching/meetings
      const meetingKeywords = ['meeting', 'sync', 'call', 'coaching', '1-on-1', 'standup'];
      const meetingTasks = stats.descriptions.filter(desc => 
        meetingKeywords.some(keyword => desc.toLowerCase().includes(keyword))
      );
      if (meetingTasks.length > 0) {
        console.log(`  📅 Frequent Meetings - ${meetingTasks.length} meeting entries`);
      }
    }
    
    console.log(`\n\n💡 SUGGESTIONS TO IDENTIFY USERS:`);
    console.log(`1. Look for unique work patterns (e.g., designers often mention Figma)`);
    console.log(`2. Check Slack/Pumble for who was working on specific tasks`);
    console.log(`3. Ask team members about their recent tasks`);
    console.log(`4. Check project assignments in your PM tool`);
    console.log(`5. Look at git commits around the same dates`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

analyzeUserPatterns();