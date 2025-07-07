const { differenceInDays, parseISO, isWeekend } = require('date-fns');

class TimesheetAnalyzer {
  constructor(config) {
    this.minHoursExpected = config.minHoursExpected || 70;
    this.minDaysExpected = config.minDaysExpected || 10;
    this.payPeriodDays = config.payPeriodDays || 14;
  }

  analyzeTimesheets(timesheets, users = []) {
    const analysis = {
      summary: {
        totalEntries: timesheets.length,
        totalUsers: 0,
        usersWithIssues: 0,
        missingSubmissions: []
      },
      userReports: {}
    };

    // Build user lookup map
    const userMap = {};
    users.forEach(user => {
      userMap[user.id] = user;
    });

    // Process timesheet entries
    const userEntries = this.groupEntriesByUser(timesheets);

    // Analyze each user's entries
    Object.entries(userEntries).forEach(([userId, entries]) => {
      const userReport = this.analyzeUserEntries(userId, entries, userMap[userId]);
      analysis.userReports[userId] = userReport;
      
      if (userReport.issues.length > 0) {
        analysis.summary.usersWithIssues++;
      }
    });

    // Check for users with no submissions
    users.forEach(user => {
      if (!userEntries[user.id]) {
        analysis.summary.missingSubmissions.push({
          userId: user.id,
          name: user.username || user.email,
          email: user.email
        });
      }
    });

    analysis.summary.totalUsers = Object.keys(userEntries).length;

    return analysis;
  }

  groupEntriesByUser(timesheets) {
    const grouped = {};

    timesheets.forEach(entry => {
      const userId = entry.user || entry.user_id || entry.userId;
      if (!grouped[userId]) {
        grouped[userId] = [];
      }
      grouped[userId].push(entry);
    });

    return grouped;
  }

  analyzeUserEntries(userId, entries, userInfo) {
    const report = {
      userId,
      name: userInfo?.username || userInfo?.name || `User ${userId}`,
      email: userInfo?.email || '',
      totalHours: 0,
      totalDays: new Set(),
      entries: [],
      issues: [],
      statistics: {
        averageHoursPerDay: 0,
        weekendHours: 0,
        entriesWithoutDescription: 0,
        projectBreakdown: {}
      }
    };

    // Process each entry
    entries.forEach(entry => {
      const hours = this.parseHours(entry);
      const date = this.parseDate(entry);
      const project = entry.project || entry.projectName || 'Unknown';
      const description = entry.description || entry.notes || '';

      report.totalHours += hours;
      report.totalDays.add(date.toISOString().split('T')[0]);
      
      // Track weekend work
      if (isWeekend(date)) {
        report.statistics.weekendHours += hours;
      }

      // Track empty descriptions
      if (!description.trim()) {
        report.statistics.entriesWithoutDescription++;
      }

      // Track project breakdown
      if (!report.statistics.projectBreakdown[project]) {
        report.statistics.projectBreakdown[project] = 0;
      }
      report.statistics.projectBreakdown[project] += hours;

      report.entries.push({
        date: date.toISOString().split('T')[0],
        hours,
        project,
        description,
        activity: entry.activity || entry.activityName || ''
      });
    });

    // Calculate statistics
    report.statistics.averageHoursPerDay = report.totalDays.size > 0 
      ? report.totalHours / report.totalDays.size 
      : 0;

    // Check for issues
    this.checkForIssues(report);

    return report;
  }

  parseHours(entry) {
    if (entry.duration) {
      // If duration is in seconds
      if (entry.duration > 1000) {
        return entry.duration / 3600;
      }
      return parseFloat(entry.duration);
    }
    if (entry.hours) {
      return parseFloat(entry.hours);
    }
    return 0;
  }

  parseDate(entry) {
    const dateStr = entry.date || entry.begin || entry.start;
    return parseISO(dateStr);
  }

  checkForIssues(report) {
    // Check total hours
    if (report.totalHours < this.minHoursExpected) {
      report.issues.push({
        type: 'LOW_HOURS',
        severity: 'high',
        message: `Only ${report.totalHours.toFixed(1)} hours logged (minimum expected: ${this.minHoursExpected})`,
        value: report.totalHours
      });
    }

    // Check number of days with entries
    if (report.totalDays.size < this.minDaysExpected) {
      report.issues.push({
        type: 'MISSING_DAYS',
        severity: 'medium',
        message: `Entries for only ${report.totalDays.size} days (expected at least ${this.minDaysExpected})`,
        value: report.totalDays.size
      });
    }

    // Check for empty descriptions
    if (report.statistics.entriesWithoutDescription > 3) {
      report.issues.push({
        type: 'EMPTY_DESCRIPTIONS',
        severity: 'low',
        message: `${report.statistics.entriesWithoutDescription} entries without descriptions`,
        value: report.statistics.entriesWithoutDescription
      });
    }

    // Check for excessive weekend work
    if (report.statistics.weekendHours > 16) {
      report.issues.push({
        type: 'EXCESSIVE_WEEKEND',
        severity: 'info',
        message: `${report.statistics.weekendHours.toFixed(1)} hours logged on weekends`,
        value: report.statistics.weekendHours
      });
    }

    // Check daily average
    if (report.statistics.averageHoursPerDay > 10) {
      report.issues.push({
        type: 'HIGH_DAILY_AVERAGE',
        severity: 'info',
        message: `Average ${report.statistics.averageHoursPerDay.toFixed(1)} hours per day`,
        value: report.statistics.averageHoursPerDay
      });
    }
  }

  generateSummaryStats(analysis) {
    const stats = {
      totalHours: 0,
      averageHoursPerUser: 0,
      usersUnderMinimum: [],
      topPerformers: [],
      projectTotals: {}
    };

    Object.values(analysis.userReports).forEach(report => {
      stats.totalHours += report.totalHours;
      
      if (report.totalHours < this.minHoursExpected) {
        stats.usersUnderMinimum.push({
          name: report.name,
          hours: report.totalHours
        });
      }

      // Aggregate project hours
      Object.entries(report.statistics.projectBreakdown).forEach(([project, hours]) => {
        if (!stats.projectTotals[project]) {
          stats.projectTotals[project] = 0;
        }
        stats.projectTotals[project] += hours;
      });
    });

    stats.averageHoursPerUser = analysis.summary.totalUsers > 0 
      ? stats.totalHours / analysis.summary.totalUsers 
      : 0;

    // Find top performers
    stats.topPerformers = Object.values(analysis.userReports)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 3)
      .map(r => ({ name: r.name, hours: r.totalHours }));

    return stats;
  }
}

module.exports = TimesheetAnalyzer;