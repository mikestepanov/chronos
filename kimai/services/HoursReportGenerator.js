/**
 * HoursReportGenerator - Generates compliance reports from timesheet data
 * 
 * This service is responsible for:
 * - Aggregating hours by user
 * - Calculating compliance against expected hours
 * - Formatting reports for display and storage
 */

const fs = require('fs');
const path = require('path');
const DateHelper = require('../../shared/date-helper');

class HoursReportGenerator {
  constructor(config) {
    this.config = config;
    this.users = config.users;
  }

  /**
   * Generate hours compliance report
   * @param {Array} timesheets - Processed timesheet entries
   * @param {Object} payPeriod - Pay period information
   * @returns {Object} Report data and formatted output
   */
  generateReport(timesheets, payPeriod) {
    // Aggregate hours by user
    const userHours = this.aggregateHoursByUser(timesheets);
    
    // Generate compliance data
    const reportData = this.generateComplianceData(userHours);
    
    // Format as table
    const table = this.formatAsTable(reportData);
    
    // Generate full report content
    const reportContent = this.generateFullReport(table, payPeriod, timesheets.length);
    
    return {
      data: reportData,
      table,
      content: reportContent,
      summary: this.generateSummary(reportData)
    };
  }

  /**
   * Aggregate hours by user
   */
  aggregateHoursByUser(timesheets) {
    const userHours = {};
    
    timesheets.forEach(entry => {
      const userId = entry.user;
      if (!userHours[userId]) {
        userHours[userId] = 0;
      }
      userHours[userId] += entry.duration / 3600; // Convert seconds to hours
    });
    
    return userHours;
  }

  /**
   * Generate compliance data for each user
   */
  generateComplianceData(userHours) {
    const report = [];
    
    Object.entries(userHours).forEach(([userId, hours]) => {
      // Find user details
      const user = this.users.users.find(u => 
        u.services?.kimai?.id === userId || 
        u.services?.kimai?.username === userId ||
        u.username === userId ||
        u.name === userId ||
        u.services?.kimai?.username?.toLowerCase() === userId?.toLowerCase() ||
        u.name?.toLowerCase() === userId?.toLowerCase()
      );
      
      if (user) {
        const expectedHours = user.expectedHours || 80;
        const difference = hours - expectedHours;
        const percentDeviation = ((difference / expectedHours) * 100).toFixed(1);
        
        // Check if within compliance threshold (±3 hours)
        const isCompliant = Math.abs(difference) <= 3;
        
        report.push({
          user: user.name || user.username,
          hoursWorked: hours,
          expectedHours: expectedHours,
          difference: difference,
          percentDeviation: percentDeviation,
          status: isCompliant
        });
      }
    });
    
    // Sort by hours worked descending
    report.sort((a, b) => b.hoursWorked - a.hoursWorked);
    
    return report;
  }

  /**
   * Format report data as a table
   */
  formatAsTable(reportData) {
    if (!reportData || reportData.length === 0) {
      return 'No data to display';
    }
    
    // Calculate column widths
    const headers = ['User', 'Hours Worked', 'Expected', 'Difference', '% Deviation', 'Status'];
    const colWidths = [
      Math.max(20, ...reportData.map(r => r.user.length)),
      12,
      8,
      10,
      11,
      6
    ];
    
    // Create header
    let table = '| ';
    headers.forEach((header, i) => {
      table += header.padEnd(colWidths[i]) + ' | ';
    });
    table += '\n|';
    colWidths.forEach(width => {
      table += '-'.repeat(width + 2) + '|';
    });
    table += '\n';
    
    // Add rows
    reportData.forEach(row => {
      table += '| ';
      table += row.user.padEnd(colWidths[0]) + ' | ';
      table += row.hoursWorked.toFixed(2).padStart(colWidths[1]) + ' | ';
      table += row.expectedHours.toFixed(2).padStart(colWidths[2]) + ' | ';
      
      const diffStr = (row.difference >= 0 ? '+' : '') + row.difference.toFixed(2);
      table += diffStr.padStart(colWidths[3]) + ' | ';
      
      const pctStr = (row.difference >= 0 ? '+' : '') + row.percentDeviation + '%';
      table += pctStr.padStart(colWidths[4]) + ' | ';
      
      table += (row.status ? '✓' : '✗').padStart(colWidths[5]) + ' |\n';
    });
    
    return table;
  }

  /**
   * Generate full report content
   */
  generateFullReport(table, payPeriod, entryCount) {
    const startDate = DateHelper.format(payPeriod.start, DateHelper.FORMATS.SHORT_DATE);
    const endDate = DateHelper.format(payPeriod.end, DateHelper.FORMATS.FULL_DATE);
    
    return `Hours Compliance Report - Pay Period #${payPeriod.number}
Period: ${startDate} - ${endDate}
Generated: ${new Date().toISOString()}
Source: Automated pull
Entries: ${entryCount}

${table}`;
  }

  /**
   * Generate summary statistics
   */
  generateSummary(reportData) {
    const total = reportData.length;
    const compliant = reportData.filter(r => r.status).length;
    const nonCompliant = total - compliant;
    
    const totalExpected = reportData.reduce((sum, r) => sum + r.expectedHours, 0);
    const totalWorked = reportData.reduce((sum, r) => sum + r.hoursWorked, 0);
    const totalDifference = totalWorked - totalExpected;
    
    return {
      totalUsers: total,
      compliantUsers: compliant,
      nonCompliantUsers: nonCompliant,
      complianceRate: ((compliant / total) * 100).toFixed(1) + '%',
      totalExpectedHours: totalExpected,
      totalWorkedHours: totalWorked.toFixed(2),
      totalDifference: totalDifference.toFixed(2),
      averageHoursPerUser: (totalWorked / total).toFixed(2)
    };
  }

  /**
   * Save report to file
   */
  async saveReport(reportContent, periodPath) {
    const reportPath = path.join(periodPath, 'hours-report.txt');
    await fs.promises.writeFile(reportPath, reportContent, 'utf8');
    return reportPath;
  }
}

module.exports = HoursReportGenerator;