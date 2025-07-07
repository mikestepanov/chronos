#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const axios = require('axios');

async function fetchTeams() {
  const baseUrl = process.env.KIMAI_URL || 'https://kimai.starthub.academy';
  const apiKey = process.env.KIMAI_API_KEY;

  try {
    const headers = { 'Authorization': `Bearer ${apiKey}` };
    
    // Fetch teams
    const teamsResponse = await axios.get(`${baseUrl}/api/teams`, { headers });
    console.log(`Found ${teamsResponse.data.length} teams:\n`);
    
    teamsResponse.data.forEach(team => {
      console.log(`Team: ${team.name} (ID: ${team.id})`);
      if (team.users && team.users.length > 0) {
        console.log('  Members:');
        team.users.forEach(user => {
          console.log(`    - ${JSON.stringify(user)}`);
        });
      }
      console.log('  Full data:', JSON.stringify(team, null, 2));
      console.log('---\n');
    });

    // Also fetch projects to see if they have user info
    const projectsResponse = await axios.get(`${baseUrl}/api/projects`, { headers });
    console.log('\nChecking first project for user info:');
    console.log(JSON.stringify(projectsResponse.data[0], null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

fetchTeams();