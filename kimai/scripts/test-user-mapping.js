#!/usr/bin/env node

const UserMapping = require('./services/UserMapping');
const path = require('path');

async function testUserMapping() {
  console.log('🧪 Testing User Mapping System\n');
  
  const userMapping = new UserMapping();
  await userMapping.load();
  
  console.log('📋 Loaded Users:');
  console.log('-'.repeat(60));
  
  const users = userMapping.getActiveUsers();
  users.forEach(user => {
    console.log(`Kimai ID ${user.kimaiId}: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Pumble: ${user.pumbleId}`);
    console.log(`  Has valid Pumble ID: ${userMapping.hasPumbleId(user.kimaiId) ? '✅' : '❌'}`);
    console.log();
  });
  
  console.log('\n🔍 Testing Lookups:');
  console.log('-'.repeat(60));
  
  // Test Kimai ID lookup
  console.log('By Kimai ID 5:', userMapping.getName(5));
  console.log('By Kimai ID 99:', userMapping.getName(99)); // Should return "User 99"
  
  // Test email lookup
  const userByEmail = userMapping.getByEmail('mikhail@starthub.academy');
  console.log('\nBy email mikhail@starthub.academy:', userByEmail ? userByEmail.name : 'Not found');
  
  // Test name lookup
  const userByName = userMapping.getByName('john doe');
  console.log('By name "john doe":', userByName ? userByName.email : 'Not found');
  
  // Test Pumble ID lookup
  const userByPumble = userMapping.getByPumbleId('66908542f1798a06218c1fc5');
  console.log('By Pumble ID:', userByPumble ? userByPumble.name : 'Not found');
  
  console.log('\n✅ User mapping test complete!');
}

testUserMapping().catch(console.error);