#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const KimaiAPI = require('./services/KimaiAPI');
const { format } = require('date-fns');

async function findSuperAdmin() {
  const api = new KimaiAPI({
    baseUrl: process.env.KIMAI_URL || 'https://kimai.starthub.academy',
    apiKey: process.env.KIMAI_API_KEY
  });

  try {
    console.log('🔍 Searching for all user IDs in Kimai\n');
    
    // Try different approaches to find all users
    console.log('1. Checking current user info:');
    const headers = await api.getHeaders();
    const axios = require('axios');
    
    try {
      const meResponse = await axios.get(`${api.baseUrl}/api/users/me`, { headers });
      console.log(`   Current user: ${meResponse.data.username} (ID: ${meResponse.data.id})`);
      console.log(`   Roles: ${JSON.stringify(meResponse.data.roles)}`);
    } catch (e) {
      console.log('   Could not fetch current user info');
    }
    
    // Search last 180 days for more users
    console.log('\n2. Searching timesheets for last 180 days:');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 180);
    
    const timesheets = await api.getTimesheets(startDate, endDate);
    const userIds = new Set();
    
    timesheets.forEach(entry => {
      const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
      if (userId) userIds.add(userId);
    });
    
    console.log(`   Found user IDs: ${[...userIds].sort((a, b) => a - b).join(', ')}`);
    
    // Check if there's a pattern - maybe super admin is ID 0 or 1
    console.log('\n3. Checking for common admin IDs:');
    const commonAdminIds = [0, 1, 4, 6, 10, 13, 14, 15];
    
    for (const id of commonAdminIds) {
      if (!userIds.has(id)) {
        console.log(`   ID ${id}: Not found in timesheets (could be admin with no time entries)`);
      }
    }
    
    // Look for admin-like activities
    console.log('\n4. Looking for admin activities in descriptions:');
    const adminKeywords = ['admin', 'setup', 'configuration', 'user management', 'system'];
    const adminActivities = new Map();
    
    timesheets.forEach(entry => {
      if (entry.description) {
        const desc = entry.description.toLowerCase();
        if (adminKeywords.some(keyword => desc.includes(keyword))) {
          const userId = typeof entry.user === 'object' ? entry.user.id : entry.user;
          if (!adminActivities.has(userId)) {
            adminActivities.set(userId, []);
          }
          adminActivities.get(userId).push(entry.description.substring(0, 50));
        }
      }
    });
    
    if (adminActivities.size > 0) {
      console.log('   Found admin-like activities:');
      for (const [userId, activities] of adminActivities) {
        console.log(`   User ${userId}: ${activities.length} admin-related entries`);
      }
    }
    
    // Try to access user ID 1 specifically
    console.log('\n5. Common super admin IDs:');
    console.log('   ID 0: Often reserved for system');
    console.log('   ID 1: Often the first/super admin');
    console.log('   ID 4: Gap in sequence (2,3,5,7,8,9,11,12 exist)');
    console.log('   ID 6: Another gap in sequence');
    console.log('   ID 10: Gap between 9 and 11');
    
    console.log('\n📋 Summary of all known users:');
    console.log('   Active users with timesheets: ' + [...userIds].sort((a, b) => a - b).join(', '));
    console.log('   Missing IDs in sequence: 0, 1, 4, 6, 10');
    console.log('   Your account: mikhail (but which ID?)');
    console.log('   Super admin: Unknown (likely ID 0, 1, 4, or 6)');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findSuperAdmin();