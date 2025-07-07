#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');

async function testEndpoints() {
  const apiKey = process.env.AGENTSMITH_API_KEY;
  const baseUrl = 'https://pumble-api-keys.addons.marketplace.cake.com';
  
  console.log('🧪 Testing Pumble API endpoints...\n');
  
  const endpoints = [
    { method: 'GET', path: '/listChannels', description: 'List channels' },
    { method: 'GET', path: '/listUsers', description: 'List users' },
    { method: 'GET', path: '/listMessages', description: 'List messages' },
    { method: 'POST', path: '/sendMessage', description: 'Send message' },
    { method: 'POST', path: '/sendReply', description: 'Send reply' },
    { method: 'POST', path: '/deleteMessage', description: 'Delete message' },
    { method: 'DELETE', path: '/messages', description: 'Delete message (REST)' },
    { method: 'POST', path: '/updateMessage', description: 'Update message' },
    { method: 'GET', path: '/help', description: 'API help' },
    { method: 'GET', path: '/api', description: 'API info' },
  ];
  
  for (const endpoint of endpoints) {
    console.log(`Testing ${endpoint.method} ${endpoint.path} - ${endpoint.description}`);
    
    try {
      const config = {
        headers: { 'Api-Key': apiKey }
      };
      
      let response;
      if (endpoint.method === 'GET') {
        response = await axios.get(`${baseUrl}${endpoint.path}`, config);
      } else if (endpoint.method === 'POST') {
        // Send minimal valid data
        const data = endpoint.path === '/sendMessage' ? 
          { channelId: 'test', text: 'test' } : {};
        response = await axios.post(`${baseUrl}${endpoint.path}`, data, config);
      } else if (endpoint.method === 'DELETE') {
        response = await axios.delete(`${baseUrl}${endpoint.path}/test`, config);
      }
      
      console.log(`✅ Endpoint exists (Status: ${response.status})`);
    } catch (error) {
      const status = error.response?.status;
      if (status === 400 || status === 403) {
        console.log(`✅ Endpoint exists (requires valid params)`);
      } else if (status === 404) {
        console.log(`❌ Endpoint not found`);
      } else if (status === 405) {
        console.log(`⚠️  Wrong method`);
      } else {
        console.log(`❓ Error: ${status || error.message}`);
      }
    }
  }
}

testEndpoints();