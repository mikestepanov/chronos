#!/usr/bin/env node

const FollowupReminderService = require('../kimai/services/FollowupReminderService');
const PayPeriodCalculator = require('../shared/pay-period-calculator');
const TimesheetAnalyzer = require('../shared/timesheet-analyzer');
const { differenceInHours } = require('date-fns');
const fs = require('fs').promises;
const path = require('path');

/**
 * Follow-up Reminder Cron Job
 * Runs daily at 3 PM CST
 * 
 * This cronjob handles all scheduling logic:
 * - Checks if today is the last day of pay period (skip if yes)
 * - Gets incomplete users from timesheet analyzer
 * - Tracks when users were first seen as incomplete
 * - Only sends follow-ups to users incomplete for 24+ hours
 * - Calls the reminder service with eligible users only
 */

async function run() {
  const payPeriodCalc = new PayPeriodCalculator();
  const timesheetAnalyzer = new TimesheetAnalyzer();
  const trackingFile = path.join(__dirname, '../kimai/data/followup-tracking.json');
  
  try {
    console.log(`[${new Date().toISOString()}] Running follow-up reminder check`);
    
    // Check if today is the last day of pay period
    const today = new Date();
    const dayOfMonth = today.getDate();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    if (dayOfMonth === 15 || dayOfMonth === lastDay) {
      console.log('ℹ️  Last day of pay period, skipping follow-ups');
      process.exit(0);
    }
    
    // Get current pay period
    const payPeriod = payPeriodCalc.getCurrentPayPeriod();
    
    // Get all incomplete users
    const incompleteUsers = await timesheetAnalyzer.getIncompleteUsers(payPeriod);
    
    if (incompleteUsers.length === 0) {
      console.log('✅ All users have complete timesheets');
      process.exit(0);
    }
    
    // Load tracking data
    let tracking = {};
    try {
      const data = await fs.readFile(trackingFile, 'utf8');
      tracking = JSON.parse(data);
    } catch {
      // No tracking file yet
    }
    
    const periodTracking = tracking[payPeriod.id] || {};
    const now = new Date();
    const usersNeedingFollowup = [];
    
    // Process each incomplete user
    for (const userData of incompleteUsers) {
      const user = userData.user;
      const userTracking = periodTracking[user.id];
      
      if (!userTracking) {
        // First time seeing this user as incomplete
        periodTracking[user.id] = {
          firstSeen: now.toISOString(),
          followupSent: false
        };
      } else if (!userTracking.followupSent) {
        // Check if it's been 24 hours
        const hoursSinceFirst = differenceInHours(now, new Date(userTracking.firstSeen));
        if (hoursSinceFirst >= 24) {
          usersNeedingFollowup.push(userData);
        }
      }
    }
    
    // Send follow-ups if any users need them
    let result = { sent: 0, total: incompleteUsers.length };
    if (usersNeedingFollowup.length > 0) {
      const service = new FollowupReminderService();
      result = await service.run(usersNeedingFollowup, payPeriod);
      
      // Mark users as sent
      for (const userData of usersNeedingFollowup) {
        periodTracking[userData.user.id].followupSent = true;
        periodTracking[userData.user.id].followupSentAt = now.toISOString();
      }
    }
    
    // Save updated tracking
    tracking[payPeriod.id] = periodTracking;
    await fs.mkdir(path.dirname(trackingFile), { recursive: true });
    await fs.writeFile(trackingFile, JSON.stringify(tracking, null, 2));
    
    console.log(`✅ Follow-up check completed: ${result.sent} sent, ${incompleteUsers.length} total incomplete`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  run();
}