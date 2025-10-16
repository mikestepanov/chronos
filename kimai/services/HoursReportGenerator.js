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
const XLSX = require('xlsx');

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
    
    // Aggregate work details by user
    const userWorkDetails = this.aggregateWorkDetailsByUser(timesheets);
    
    // Generate compliance data
    const reportData = this.generateComplianceData(userHours, userWorkDetails);
    
    // Format as table
    const table = this.formatAsTable(reportData);
    
    // Generate detailed table with work summary
    const detailedTable = this.formatAsDetailedTable(reportData);
    
    // Generate full report content
    const reportContent = this.generateFullReport(table, detailedTable, payPeriod, timesheets.length);
    
    return {
      data: reportData,
      table,
      detailedTable,
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
   * Aggregate work details by user
   */
  aggregateWorkDetailsByUser(timesheets) {
    const userWorkDetails = {};
    
    timesheets.forEach(entry => {
      const userId = entry.user;
      if (!userWorkDetails[userId]) {
        userWorkDetails[userId] = [];
      }
      
      // Create a work summary combining project, activity, and description
      const workSummary = `${entry.project} - ${entry.activity}${entry.description ? ': ' + entry.description.trim() : ''}`;
      userWorkDetails[userId].push(workSummary);
    });
    
    // Remove duplicates and join with semicolons
    Object.keys(userWorkDetails).forEach(userId => {
      userWorkDetails[userId] = [...new Set(userWorkDetails[userId])].join('; ');
    });
    
    return userWorkDetails;
  }

  /**
   * Generate compliance data for each user
   */
  generateComplianceData(userHours, userWorkDetails) {
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
          status: isCompliant,
          workDetails: userWorkDetails[userId] || 'No work details available'
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
   * Format report data as a detailed table with work summary
   */
  formatAsDetailedTable(reportData) {
    if (!reportData || reportData.length === 0) {
      return 'No data to display';
    }
    
    let table = '\n=== DETAILED WORK SUMMARY ===\n\n';
    
    // Add each user's detailed information
    reportData.forEach(row => {
      table += `\n${row.user}\n`;
      table += '-'.repeat(row.user.length) + '\n';
      table += `Expected Hours: ${row.expectedHours.toFixed(2)}\n`;
      table += `Actual Hours: ${row.hoursWorked.toFixed(2)}\n`;
      table += `Status: ${row.status ? '✓ PASS' : '✗ FAIL'}\n`;
      table += `Work Summary:\n`;
      
      // Split work details by semicolon and display each on its own line
      const workItems = row.workDetails.split('; ');
      workItems.forEach(item => {
        table += `  • ${item}\n`;
      });
      table += '\n';
    });
    
    return table;
  }

  /**
   * Generate full report content
   */
  generateFullReport(table, detailedTable, payPeriod, entryCount) {
    const startDate = DateHelper.format(payPeriod.start, DateHelper.FORMATS.SHORT_DATE);
    const endDate = DateHelper.format(payPeriod.end, DateHelper.FORMATS.FULL_DATE);
    
    return `Hours Compliance Report - Pay Period #${payPeriod.number}
Period: ${startDate} - ${endDate}
Generated: ${new Date().toISOString()}
Source: Automated pull
Entries: ${entryCount}

${table}

${detailedTable}`;
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
   * Generate pay period tab CSV format
   */
  generatePayPeriodCSV(reportData, payPeriod) {
    // Base rates and expected expenses (could be moved to config)
    const baseRates = {
      'Dharam Pal': { baseRate: 17.5, expectedExpense: 700 },
      'Ariful Islam': { baseRate: 10, expectedExpense: 400 },
      'Raheel Shahzad': { baseRate: 15, expectedExpense: 600 },
      'Mori Wesonga': { baseRate: 15, expectedExpense: 600 },
      'Yulia McCoy': { baseRate: 20, expectedExpense: 200 },
      'Pauline Nguyen': { baseRate: 25, expectedExpense: 1000 },
      'Edward Obi': { baseRate: 20, expectedExpense: 200 },
      'Dennis': { baseRate: 0, expectedExpense: 0 },
      'Forrest': { baseRate: 0, expectedExpense: 0 }
    };

    const rows = [];
    
    // Header section
    rows.push(['Summary Overview Link', `https://docs.google.com/document/d/[PLACEHOLDER_FOR_${payPeriod.number}_PERIOD]`]);
    rows.push(['CSV', 'https://drive.google.com/drive/folders/[PLACEHOLDER]', '', '', '', '', '7']);
    rows.push(['ACTUAL EXPENSE REFS']);
    rows.push(['Name', 'Time Tracking', 'Payment Processing', 'Actual Expense (M)', 'Actual Pay Period (Combined) Hours (C)', 'Actual Paid Hours (M)', 'Actual Equity Hours (M)', 'Comments']);
    
    // Calculate totals
    let totalExpense = 0;
    const actualExpenseRows = [];
    
    reportData.forEach(user => {
      const payrollName = this.mapKimaiNameToPayrollName(user.user);
      const rate = baseRates[payrollName];
      const actualExpense = this.calculateActualExpense(user, baseRates);
      totalExpense += actualExpense;
      
      // Split hours between paid and equity
      let paidHours, equityHours;
      if (payrollName === 'Yulia McCoy') {
        paidHours = Math.min(10, user.hoursWorked);
        equityHours = Math.max(0, user.hoursWorked - 10);
      } else if (payrollName === 'Edward Obi') {
        paidHours = 0;
        equityHours = user.hoursWorked;
      } else {
        paidHours = user.hoursWorked / 2;
        equityHours = user.hoursWorked / 2;
      }
      
      let comments = '';
      if (!user.status) {
        const diff = Math.abs(user.difference);
        if (user.difference > 0) {
          comments = `Extra ${diff.toFixed(2)} hours carry over`;
        } else {
          comments = `Short ${diff.toFixed(2)} hours`;
        }
      }
      
      actualExpenseRows.push([
        payrollName,
        'Kimai',
        'Gusto',
        actualExpense || '',
        user.hoursWorked.toFixed(2),
        paidHours.toFixed(2),
        equityHours.toFixed(2),
        comments
      ]);
    });
    
    rows.push(['Total', '', '', totalExpense]);
    actualExpenseRows.forEach(row => rows.push(row));
    
    // Expected expenses section
    rows.push(['EXPECTED EXPENSES']);
    rows.push(['Name', 'Expected Pay Period Expense (C)', 'Weekly Expected Expense (C)', 'Total Paid Weekly Hours (M)', 'Total Expense Rate, with Tax (C)', 'Pre-Tax Employee Rate (C)', 'Base Rate (M)', 'Upwork fee (multiplier) (M)', 'US FTE bonus (multiplier) (M)', 'Taxes (multiplier, approximately) (M)']);
    rows.push(['Total', '200', '100']);
    
    Object.entries(baseRates).forEach(([name, rate]) => {
      const weeklyHours = name === 'Yulia McCoy' ? 5 : 20;
      rows.push([
        name,
        rate.expectedExpense,
        rate.expectedExpense / 2,
        weeklyHours,
        rate.baseRate,
        rate.baseRate,
        rate.baseRate,
        1,
        1,
        1
      ]);
    });
    
    // Hours analysis
    rows.push(['HOURS']);
    rows.push(['Coloring', '3 hours max is acceptable difference', '3 hour+ difference']);
    rows.push(['Name', 'Inconsistency Ratio (C)', 'Pay Period Hours Difference (C)', 'Equity Hours Difference (C)', 'Pay Period Expected Hours (C)', 'Total Expected Weekly Hours (C)', 'Total Expected Weekly Equity Hours (M)', 'Total Expected Paid Weekly Hours (C)']);
    
    // Calculate averages
    let totalHoursDiff = 0;
    let nonCompliantCount = 0;
    reportData.forEach(user => {
      if (!user.status) {
        totalHoursDiff += Math.abs(user.difference);
        nonCompliantCount++;
      }
    });
    
    const avgMissedPct = nonCompliantCount > 0 ? (totalHoursDiff / reportData.length).toFixed(2) : 0;
    
    rows.push(['Grand Total', `Average ${avgMissedPct}% Missed`, totalHoursDiff || '', '', '440', '220', '140', '80']);
    rows.push(['Dev Total', `Average ${avgMissedPct}% Missed`, totalHoursDiff || '', '', '400', '200', '120', '80']);
    
    // Individual hours analysis
    reportData.forEach(user => {
      const payrollName = this.mapKimaiNameToPayrollName(user.user);
      const expectedHours = user.expectedHours;
      const weeklyHours = expectedHours / 2;
      const equityWeeklyHours = payrollName === 'Yulia McCoy' ? 20 : weeklyHours;
      const paidWeeklyHours = payrollName === 'Yulia McCoy' ? 0 : weeklyHours / 2;
      
      const status = user.status ? 'No Difference' : `${user.percentDeviation}% Missed`;
      const hoursDiff = !user.status ? (user.difference >= 0 ? '+' : '') + user.difference.toFixed(2) : '';
      
      rows.push([
        payrollName,
        status,
        hoursDiff,
        '',
        expectedHours,
        weeklyHours,
        equityWeeklyHours,
        paidWeeklyHours
      ]);
    });
    
    // Add team leads
    rows.push(['Mikhail Stepanov', 'No Difference', '', '', '40', '20', '20', '']);
    rows.push(['Anatoly Stepanov', 'No Difference', '', '', '40', '20', '20', '']);
    rows.push(['Design Total', 'Average No Difference', '', '', '40', '20', '20', '']);
    
    // Actual expenses section
    rows.push(['ACTUAL EXPENSES']);
    rows.push(['Name', 'Inconsistency Expense (C)', 'Expected Pay Period Expense (C)', 'Actual Expense (C)', 'Actual Expense Paid (M)', 'Expense Difference (C)']);
    
    let totalInconsistency = 0;
    let totalExpected = 0;
    let totalActual = 0;
    
    reportData.forEach(user => {
      const payrollName = this.mapKimaiNameToPayrollName(user.user);
      const rate = baseRates[payrollName];
      const actualExpense = this.calculateActualExpense(user, baseRates);
      const expectedExpense = rate?.expectedExpense || 0;
      const inconsistency = !user.status ? Math.abs(actualExpense - expectedExpense) : 0;
      
      totalInconsistency += inconsistency;
      totalExpected += expectedExpense;
      totalActual += actualExpense;
      
      let comments = '';
      if (!user.status && user.difference > 0) {
        comments = `Extra ${user.difference.toFixed(2)} carry over`;
      }
      
      rows.push([
        payrollName,
        inconsistency || '',
        expectedExpense,
        actualExpense,
        actualExpense,
        '',
        comments
      ]);
    });
    
    // Insert grand totals
    const expenseIndex = rows.length - reportData.length;
    rows.splice(expenseIndex, 0, ['Grand Total', totalInconsistency, totalExpected, totalActual, totalActual, '']);
    rows.splice(expenseIndex + 1, 0, ['Dev Total', totalInconsistency, totalExpected - 1200, totalActual - (baseRates['Yulia McCoy'].expectedExpense + baseRates['Pauline Nguyen'].expectedExpense), totalActual - (baseRates['Yulia McCoy'].expectedExpense + baseRates['Pauline Nguyen'].expectedExpense), '']);
    
    // Add team leads
    rows.push(['Mikhail Stepanov', '', '', '', '', '']);
    rows.push(['Anatoly Stepanov', '', '', '', '', '']);
    rows.push(['Design Total', '', '1200', '1200', '1200', '']);
    
    return this.formatAsCSV(rows);
  }

  /**
   * Map Kimai names to payroll names
   */
  mapKimaiNameToPayrollName(kimaiName) {
    const nameMapping = {
      'Ariful': 'Ariful Islam',
      'Pauline Nguyen': 'Pauline Nguyen',
      'Raheel Shahzad': 'Raheel Shahzad',
      'Dharam Pal Singh': 'Dharam Pal',
      'Mori Isaac': 'Mori Wesonga',
      'Yulia': 'Yulia McCoy',
      'Eddy': 'Edward Obi',
      'Dennis': 'Dennis',
      'Forrest': 'Forrest'
    };
    
    return nameMapping[kimaiName] || kimaiName;
  }

  /**
   * Calculate actual expense for a user
   */
  calculateActualExpense(user, baseRates) {
    const payrollName = this.mapKimaiNameToPayrollName(user.user);
    const rate = baseRates[payrollName];
    
    if (!rate) {
      console.warn(`No rate found for ${payrollName}, using 0`);
      return 0;
    }
    
    return Math.round(user.hoursWorked * rate.baseRate);
  }

  /**
   * Format rows as CSV string
   */
  formatAsCSV(rows) {
    return rows.map(row => 
      row.map(cell => {
        const stringCell = String(cell || '');
        if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
          return `"${stringCell.replace(/"/g, '""')}"`;
        }
        return stringCell;
      }).join(',')
    ).join('\n');
  }

  /**
   * Save report to file
   */
  async saveReport(reportContent, periodPath) {
    const reportPath = path.join(periodPath, 'hours-report.txt');
    await fs.promises.writeFile(reportPath, reportContent, 'utf8');
    return reportPath;
  }

  /**
   * Generate pay period tab as XLSX with exact formulas mirroring 20th period
   */
  generatePayPeriodXLSX(reportData, payPeriod) {
    
    // Base rates and expected expenses
    const baseRates = {
      'Dharam Pal': { baseRate: 17.5, expectedExpense: 700, weeklyHours: 20 },
      'Ariful Islam': { baseRate: 10, expectedExpense: 400, weeklyHours: 20 },
      'Raheel Shahzad': { baseRate: 15, expectedExpense: 600, weeklyHours: 20 },
      'Mori Wesonga': { baseRate: 15, expectedExpense: 600, weeklyHours: 20 },
      'Yulia McCoy': { baseRate: 20, expectedExpense: 200, weeklyHours: 5 },
      'Pauline Nguyen': { baseRate: 25, expectedExpense: 1000, weeklyHours: 20 },
      'Edward Obi': { baseRate: 20, expectedExpense: 200, weeklyHours: 20 },
      'Dennis': { baseRate: 0, expectedExpense: 0, weeklyHours: 20 },
      'Forrest': { baseRate: 0, expectedExpense: 0, weeklyHours: 0 }
    };

    // Create workbook and worksheet with exact structure
    const workbook = XLSX.utils.book_new();
    const worksheet = {};
    
    // Helper function to set cell with formula or value
    const setCell = (addr, value, formula) => {
      if (formula) {
        worksheet[addr] = { t: 'n', f: formula };
      } else if (typeof value === 'number') {
        worksheet[addr] = { t: 'n', v: value };
      } else if (value !== null && value !== undefined) {
        worksheet[addr] = { t: 's', v: String(value) };
      }
    };
    
    // Header section (rows 1-4)
    setCell('A1', 'Summary Overview Link');
    setCell('B1', `https://docs.google.com/document/d/[PLACEHOLDER_FOR_${payPeriod.number}_PERIOD]`);
    
    setCell('A2', 'CSV');
    setCell('B2', 'https://drive.google.com/drive/folders/[PLACEHOLDER]');
    setCell('H2', '7');
    
    setCell('A3', 'ACTUAL EXPENSE REFS');
    
    setCell('A4', 'Name');
    setCell('B4', 'Time Tracking');
    setCell('C4', 'Payment Processing');
    setCell('D4', 'Actual Expense (M)');
    setCell('E4', 'Actual Pay Period (Combined) Hours (C)');
    setCell('F4', 'Actual Paid Hours (M)');
    setCell('G4', 'Actual Equity Hours (M)');
    setCell('H4', 'Comments');
    
    // Total row (row 5) with formula
    setCell('A5', 'Total');
    worksheet['D5'] = { t: 'n', f: 'SUM(D6:D12)' };
    
    // User data rows (rows 6-12) with exact formulas
    const userRows = [];
    let rowIndex = 6;
    
    // Sort users to match expected order
    const sortedUsers = [...reportData].sort((a, b) => {
      const orderMap = {
        'Dharam Pal Singh': 1,
        'Ariful': 2, 
        'Raheel Shahzad': 3,
        'Mori Isaac': 4,
        'Yulia': 5,
        'Pauline Nguyen': 6,
        'Eddy': 7
      };
      return (orderMap[a.user] || 99) - (orderMap[b.user] || 99);
    });
    
    sortedUsers.forEach((user, index) => {
      const payrollName = this.mapKimaiNameToPayrollName(user.user);
      const rate = baseRates[payrollName];
      const row = rowIndex + index;
      const rateRow = 19 + index; // Expected expenses start at row 19
      
      setCell(`A${row}`, payrollName);
      setCell(`B${row}`, 'Kimai');
      setCell(`C${row}`, 'Gusto');
      
      // Actual expense formula: =F{row} * F{rateRow} (hours * rate)
      if (payrollName === 'Edward Obi') {
        worksheet[`D${row}`] = { t: 'n', f: `F${row} * G${rateRow + 7}` }; // Special case for Edward
      } else {
        worksheet[`D${row}`] = { t: 'n', f: `F${row} * F${rateRow}` };
      }
      
      // Combined hours - just the value
      setCell(`F${row}`, user.hoursWorked);
      
      // Paid hours and equity hours
      if (payrollName === 'Yulia McCoy') {
        setCell(`G${row}`, Math.min(10, user.hoursWorked));
        setCell(`H${row}`, Math.max(0, user.hoursWorked - 10));
      } else if (payrollName === 'Edward Obi') {
        setCell(`G${row}`, '');
        setCell(`H${row}`, user.hoursWorked);
      } else {
        setCell(`G${row}`, user.hoursWorked / 2);
        setCell(`H${row}`, user.hoursWorked / 2);
      }
      
      // Combined hours formula: =F{row} + G{row}
      worksheet[`E${row}`] = { t: 'n', f: `F${row} + G${row}` };
      
      // Comments
      let comments = '';
      if (!user.status) {
        const diff = Math.abs(user.difference);
        if (user.difference > 0) {
          comments = `Extra ${diff.toFixed(2)} hours carry over`;
        } else {
          comments = `Short ${diff.toFixed(2)} hours`;
        }
      }
      setCell(`I${row}`, comments);
      
      userRows.push(row);
    });
    
    // Expected expenses section (starts at row 13)
    setCell('A13', 'EXPECTED EXPENSES');
    setCell('A14', 'Name');
    setCell('B14', 'Expected Pay Period Expense (C)');
    setCell('C14', 'Weekly Expected Expense (C)');
    setCell('D14', 'Total Paid Weekly Hours (M)');
    setCell('E14', 'Total Expense Rate, with Tax (C)');
    setCell('F14', 'Pre-Tax Employee Rate (C)');
    setCell('G14', 'Base Rate (M)');
    setCell('H14', 'Upwork fee (multiplier) (M)');
    setCell('I14', 'US FTE bonus (multiplier) (M)');
    setCell('J14', 'Taxes (multiplier, approximately) (M)');
    
    // Expected expenses totals
    setCell('A15', 'Total');
    setCell('B15', null, 'SUM(B16)');
    setCell('C15', null, 'SUM(C16)');
    
    // Expected expenses data with formulas (rows 16-22)
    let expenseRowIndex = 16;
    Object.entries(baseRates).forEach(([name, rate], index) => {
      const row = expenseRowIndex + index;
      
      setCell(`A${row}`, name);
      setCell(`B${row}`, rate.expectedExpense);
      
      // Weekly expense formula: =B{row} * 2
      setCell(`C${row}`, null, `C${row} * 2`);
      
      setCell(`D${row}`, rate.weeklyHours);
      
      // Rate calculations with ROUND formulas
      setCell(`E${row}`, null, `ROUND(F${row} * J${row}, 2)`);
      setCell(`F${row}`, null, `ROUND(G${row} * H${row} * I${row}, 2)`);
      setCell(`G${row}`, rate.baseRate);
      setCell(`H${row}`, 1);
      setCell(`I${row}`, 1);
      setCell(`J${row}`, 1);
    });
    
    // Hours section (starts around row 23)
    const hoursStartRow = 23;
    setCell(`A${hoursStartRow}`, 'HOURS');
    setCell(`A${hoursStartRow + 1}`, 'Coloring');
    setCell(`B${hoursStartRow + 1}`, '3 hours max is acceptable difference');
    setCell(`C${hoursStartRow + 1}`, '3 hour+ difference');
    
    setCell(`A${hoursStartRow + 2}`, 'Name');
    setCell(`B${hoursStartRow + 2}`, 'Inconsistency Ratio (C)');
    setCell(`C${hoursStartRow + 2}`, 'Pay Period Hours Difference (C)');
    setCell(`D${hoursStartRow + 2}`, 'Equity Hours Difference (C)');
    setCell(`E${hoursStartRow + 2}`, 'Pay Period Expected Hours (C)');
    setCell(`F${hoursStartRow + 2}`, 'Total Expected Weekly Hours (C)');
    setCell(`G${hoursStartRow + 2}`, 'Total Expected Weekly Equity Hours (M)');
    setCell(`H${hoursStartRow + 2}`, 'Total Expected Paid Weekly Hours (C)');
    
    // Grand totals with complex IF formulas
    const grandTotalRow = hoursStartRow + 3;
    setCell(`A${grandTotalRow}`, 'Grand Total');
    
    // Complex conditional formula for status
    setCell(`B${grandTotalRow}`, null, 
      `IF(C${grandTotalRow} > 0, "Average " & TEXT(C${grandTotalRow} / E${grandTotalRow} * 100, "0.00") & "% Missed", IF(C${grandTotalRow} < 0, "Average " & TEXT(-C${grandTotalRow} / E${grandTotalRow} * 100, "0.00") & "% Overworked", "Average No Difference"))`
    );
    
    // Hours difference totals
    setCell(`C${grandTotalRow}`, null, `SUM(C${grandTotalRow + 2} + C${grandTotalRow + 10})`);
    setCell(`D${grandTotalRow}`, null, `SUM(D${grandTotalRow + 2} + D${grandTotalRow + 10})`);
    setCell(`E${grandTotalRow}`, 440);
    setCell(`F${grandTotalRow}`, 220);
    setCell(`G${grandTotalRow}`, 140);
    setCell(`H${grandTotalRow}`, 80);
    
    // Dev total row
    const devTotalRow = grandTotalRow + 1;
    setCell(`A${devTotalRow}`, 'Dev Total');
    setCell(`B${devTotalRow}`, null,
      `IF(C${devTotalRow} > 0, "Average " & TEXT(C${devTotalRow} / E${devTotalRow} * 100, "0.00") & "% Missed", IF(C${devTotalRow} < 0, "Average " & TEXT(-C${devTotalRow} / E${devTotalRow} * 100, "0.00") & "% Overworked", "Average No Difference"))`
    );
    setCell(`C${devTotalRow}`, null, `SUM(C${devTotalRow + 1}:C${devTotalRow + 6})`);
    setCell(`E${devTotalRow}`, 400);
    setCell(`F${devTotalRow}`, 200);
    setCell(`G${devTotalRow}`, 120);
    setCell(`H${devTotalRow}`, 80);
    
    // Individual user analysis with exact formulas
    sortedUsers.forEach((user, index) => {
      const payrollName = this.mapKimaiNameToPayrollName(user.user);
      const userDataRow = 6 + index; // Row in actual expense section
      const analysisRow = devTotalRow + 1 + index;
      const expectedExpenseRow = 16 + index;
      
      setCell(`A${analysisRow}`, payrollName);
      
      // Complex status formula
      setCell(`B${analysisRow}`, null,
        `IF(C${analysisRow} > 0, TEXT(C${analysisRow} / E${analysisRow} * 100, "0.00") & "% Missed", IF(C${analysisRow} < 0, TEXT(-C${analysisRow} / E${analysisRow} * 100, "0.00") & "% Overworked", "No Difference"))`
      );
      
      // Hours difference: =E{analysisRow} - E{userDataRow}
      setCell(`C${analysisRow}`, null, `E${analysisRow} - E${userDataRow}`);
      
      // Equity difference: =(G{analysisRow} * 2) - G{userDataRow}
      setCell(`D${analysisRow}`, null, `(G${analysisRow} * 2) - G${userDataRow}`);
      
      // Expected hours: =F{analysisRow} * 2
      setCell(`E${analysisRow}`, null, `F${analysisRow} * 2`);
      
      // Total expected weekly hours: =G{analysisRow} + H{analysisRow}
      setCell(`F${analysisRow}`, null, `G${analysisRow} + H${analysisRow}`);
      
      // Expected equity hours (from expected expenses table)
      const rate = baseRates[payrollName];
      setCell(`G${analysisRow}`, rate.weeklyHours);
      setCell(`H${analysisRow}`, null, `D${expectedExpenseRow}`);
    });
    
    // Set worksheet range
    const range = XLSX.utils.decode_range('A1:J50');
    worksheet['!ref'] = XLSX.utils.encode_range(range);
    
    // Add to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, `${payPeriod.number}st Pay Period`);
    
    return workbook;
  }

  /**
   * Save pay period CSV to file
   */
  async savePayPeriodCSV(csvContent, periodPath, periodNumber) {
    const csvPath = path.join(periodPath, `pay-period-${periodNumber}.csv`);
    await fs.promises.writeFile(csvPath, csvContent, 'utf8');
    return csvPath;
  }

  /**
   * Save pay period XLSX to file
   */
  async savePayPeriodXLSX(workbook, periodPath, periodNumber) {
    const xlsxPath = path.join(periodPath, `pay-period-${periodNumber}.xlsx`);
    XLSX.writeFile(workbook, xlsxPath);
    return xlsxPath;
  }
}

module.exports = HoursReportGenerator;