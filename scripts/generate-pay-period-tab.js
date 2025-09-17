#!/usr/bin/env node

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

function readKimaiData(periodNumber) {
    const kimaiPath = path.join(__dirname, '..', 'kimai-data', periodNumber.toString());
    const hoursReportPath = path.join(kimaiPath, 'hours-report.txt');
    
    if (!fs.existsSync(hoursReportPath)) {
        throw new Error(`Hours report not found for period ${periodNumber}: ${hoursReportPath}`);
    }
    
    const hoursReport = fs.readFileSync(hoursReportPath, 'utf8');
    
    // Parse the report to extract user data
    const lines = hoursReport.split('\n');
    const users = [];
    
    // Find the table section
    let inTable = false;
    for (const line of lines) {
        if (line.includes('| User') && line.includes('| Hours Worked')) {
            inTable = true;
            continue;
        }
        if (inTable && line.includes('|') && !line.includes('---')) {
            const parts = line.split('|').map(p => p.trim()).filter(p => p);
            if (parts.length >= 5) {
                const [user, hoursWorked, expected, difference, deviation, status] = parts;
                if (user !== 'User') {
                    users.push({
                        name: user,
                        hoursWorked: parseFloat(hoursWorked),
                        expected: parseFloat(expected),
                        difference: difference,
                        deviation: deviation,
                        status: status
                    });
                }
            }
        }
        if (inTable && line.trim() === '') {
            break;
        }
    }
    
    return { users, report: hoursReport };
}

function mapKimaiNameToPayrollName(kimaiName) {
    const nameMapping = {
        'Ariful': 'Ariful Islam',
        'Pauline Nguyen': 'Pauline Nguyen',
        'Raheel Shahzad': 'Raheel Shahzad',
        'Dharam Pal Singh': 'Dharam Pal',
        'Mori Isaac': 'Mori Wesonga',
        'Yulia': 'Yulia McCoy',
        'Eddy': 'Edward Obi'
    };
    
    return nameMapping[kimaiName] || kimaiName;
}

function calculateActualExpense(user, baseRates) {
    const payrollName = mapKimaiNameToPayrollName(user.name);
    const rate = baseRates[payrollName];
    
    if (!rate) {
        console.warn(`No rate found for ${payrollName}, using 0`);
        return 0;
    }
    
    // For most users, actual expense = hours worked * rate
    // Special handling might be needed for equity vs paid hours
    return Math.round(user.hoursWorked * rate.baseRate);
}

function generatePayPeriodTab(periodNumber, kimaiData, previousTabData) {
    const { users } = kimaiData;
    
    // Base rates from previous tabs (could be extracted from Excel or hardcoded)
    const baseRates = {
        'Dharam Pal': { baseRate: 17.5, expectedExpense: 700 },
        'Ariful Islam': { baseRate: 10, expectedExpense: 400 },
        'Raheel Shahzad': { baseRate: 15, expectedExpense: 600 },
        'Mori Wesonga': { baseRate: 15, expectedExpense: 600 },
        'Yulia McCoy': { baseRate: 20, expectedExpense: 200 },
        'Pauline Nguyen': { baseRate: 25, expectedExpense: 1000 },
        'Edward Obi': { baseRate: 20, expectedExpense: 0 }
    };
    
    const data = [];
    
    // Header rows
    data.push(['Summary Overview Link', `https://docs.google.com/document/d/[PLACEHOLDER_FOR_21ST_PERIOD]`]);
    data.push(['CSV', 'https://drive.google.com/drive/folders/[PLACEHOLDER]', '', '', '', '', '7']);
    data.push(['ACTUAL EXPENSE REFS']);
    data.push(['Name', 'Time Tracking', 'Payment Processing', 'Actual Expense (M)', 'Actual Pay Period (Combined) Hours (C)', 'Actual Paid Hours (M)', 'Actual Equity Hours (M)', 'Comments']);
    
    // Calculate totals
    let totalExpense = 0;
    const actualExpenseRows = [];
    
    users.forEach(user => {
        const payrollName = mapKimaiNameToPayrollName(user.name);
        const rate = baseRates[payrollName];
        const actualExpense = calculateActualExpense(user, baseRates);
        totalExpense += actualExpense;
        
        // Split hours between paid and equity (simplified logic)
        let paidHours, equityHours;
        if (payrollName === 'Yulia McCoy') {
            // Yulia has different split
            paidHours = Math.min(10, user.hoursWorked);
            equityHours = Math.max(0, user.hoursWorked - 10);
        } else if (payrollName === 'Edward Obi') {
            // Eddy is all equity
            paidHours = 0;
            equityHours = user.hoursWorked;
        } else {
            // Others split 50/50
            paidHours = user.hoursWorked / 2;
            equityHours = user.hoursWorked / 2;
        }
        
        let comments = '';
        if (user.status === '✗') {
            const diff = parseFloat(user.difference.replace('+', '').replace('-', ''));
            if (user.difference.startsWith('+')) {
                comments = `Extra ${diff} hours carry over`;
            } else {
                comments = `Short ${diff} hours`;
            }
        }
        
        actualExpenseRows.push([
            payrollName,
            'Kimai',
            'Gusto',
            actualExpense || '',
            user.hoursWorked,
            paidHours,
            equityHours,
            comments
        ]);
    });
    
    data.push(['Total', '', '', totalExpense]);
    actualExpenseRows.forEach(row => data.push(row));
    
    // Expected expenses section
    data.push(['EXPECTED EXPENSES']);
    data.push(['Name', 'Expected Pay Period Expense (C)', 'Weekly Expected Expense (C)', 'Total Paid Weekly Hours (M)', 'Total Expense Rate, with Tax (C)', 'Pre-Tax Employee Rate (C)', 'Base Rate (M)', 'Upwork fee (multiplier) (M)', 'US FTE bonus (multiplier) (M)', 'Taxes (multiplier, approximately) (M)']);
    data.push(['Total', '200', '100']);
    
    Object.entries(baseRates).forEach(([name, rate]) => {
        const weeklyHours = name === 'Yulia McCoy' ? 5 : 20;
        data.push([
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
    data.push(['HOURS']);
    data.push(['Coloring', '3 hours max is acceptable difference', '3 hour+ difference']);
    data.push(['Name', 'Inconsistency Ratio (C)', 'Pay Period Hours Difference (C)', 'Equity Hours Difference (C)', 'Pay Period Expected Hours (C)', 'Total Expected Weekly Hours (C)', 'Total Expected Weekly Equity Hours (M)', 'Total Expected Paid Weekly Hours (C)']);
    
    // Calculate grand totals and team averages
    let totalHoursDiff = 0;
    let nonCompliantCount = 0;
    users.forEach(user => {
        if (user.status === '✗') {
            const diff = parseFloat(user.difference.replace('+', '').replace('-', ''));
            totalHoursDiff += diff;
            nonCompliantCount++;
        }
    });
    
    const avgMissedPct = nonCompliantCount > 0 ? (totalHoursDiff / users.length).toFixed(2) : 0;
    
    data.push(['Grand Total', `Average ${avgMissedPct}% Missed`, totalHoursDiff || '', '', '440', '220', '140', '80']);
    data.push(['Dev Total', `Average ${avgMissedPct}% Missed`, totalHoursDiff || '', '', '400', '200', '120', '80']);
    
    // Individual hours analysis
    users.forEach(user => {
        const payrollName = mapKimaiNameToPayrollName(user.name);
        const expectedHours = user.expected;
        const weeklyHours = expectedHours / 2;
        const equityWeeklyHours = payrollName === 'Yulia McCoy' ? 20 : weeklyHours;
        const paidWeeklyHours = payrollName === 'Yulia McCoy' ? 0 : weeklyHours / 2;
        
        const status = user.status === '✓' ? 'No Difference' : `${user.deviation} Missed`;
        const hoursDiff = user.status === '✗' ? user.difference : '';
        
        data.push([
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
    
    // Add team leads (from previous data)
    data.push(['Mikhail Stepanov', 'No Difference', '', '', '40', '20', '20', '']);
    data.push(['Anatoly Stepanov', 'No Difference', '', '', '40', '20', '20', '']);
    data.push(['Design Total', 'Average No Difference', '', '', '40', '20', '20', '']);
    
    // Actual expenses section
    data.push(['ACTUAL EXPENSES']);
    data.push(['Name', 'Inconsistency Expense (C)', 'Expected Pay Period Expense (C)', 'Actual Expense (C)', 'Actual Expense Paid (M)', 'Expense Difference (C)']);
    
    let totalInconsistency = 0;
    let totalExpected = 0;
    let totalActual = 0;
    
    users.forEach(user => {
        const payrollName = mapKimaiNameToPayrollName(user.name);
        const rate = baseRates[payrollName];
        const actualExpense = calculateActualExpense(user, baseRates);
        const expectedExpense = rate?.expectedExpense || 0;
        const inconsistency = user.status === '✗' ? Math.abs(actualExpense - expectedExpense) : 0;
        
        totalInconsistency += inconsistency;
        totalExpected += expectedExpense;
        totalActual += actualExpense;
        
        let comments = '';
        if (user.status === '✗') {
            const diff = parseFloat(user.difference.replace('+', '').replace('-', ''));
            if (user.difference.startsWith('+')) {
                comments = `Extra ${diff} carry over`;
            }
        }
        
        data.push([
            payrollName,
            inconsistency || '',
            expectedExpense,
            actualExpense,
            actualExpense,
            '',
            comments
        ]);
    });
    
    // Insert grand totals at the beginning of this section
    data.splice(-users.length, 0, ['Grand Total', totalInconsistency, totalExpected, totalActual, totalActual, '']);
    data.splice(-users.length, 0, ['Dev Total', totalInconsistency, totalExpected - 1200, totalActual - (baseRates['Yulia McCoy'].expectedExpense + baseRates['Pauline Nguyen'].expectedExpense), totalActual - (baseRates['Yulia McCoy'].expectedExpense + baseRates['Pauline Nguyen'].expectedExpense), '']);
    
    // Add team leads
    data.push(['Mikhail Stepanov', '', '', '', '', '']);
    data.push(['Anatoly Stepanov', '', '', '', '', '']);
    data.push(['Design Total', '', '1200', '1200', '1200', '']);
    
    return data;
}

function insertTabIntoExcel(excelPath, newTabName, newTabData, insertAfter = '20th Pay Period') {
    console.log(`📊 Reading Excel file: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    
    // Check if tab already exists
    const existingTabIndex = workbook.SheetNames.indexOf(newTabName);
    if (existingTabIndex !== -1) {
        console.log(`🔄 Tab "${newTabName}" already exists, overwriting...`);
        // Remove existing sheet
        delete workbook.Sheets[newTabName];
        workbook.SheetNames.splice(existingTabIndex, 1);
    }
    
    // Create new worksheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(newTabData);
    
    // Determine where to insert the new tab
    const sheetNames = workbook.SheetNames;
    const insertAfterIndex = sheetNames.indexOf(insertAfter);
    
    if (insertAfterIndex !== -1) {
        // Insert right after the specified tab
        const targetIndex = insertAfterIndex + 1;
        sheetNames.splice(targetIndex, 0, newTabName);
        workbook.SheetNames = sheetNames;
        workbook.Sheets[newTabName] = newWorksheet;
        console.log(`📍 Inserted "${newTabName}" after "${insertAfter}"`);
    } else {
        // If insertAfter tab not found, add at the beginning
        XLSX.utils.book_append_sheet(workbook, newWorksheet, newTabName);
        console.log(`📍 Added "${newTabName}" at the end (${insertAfter} not found)`);
    }
    
    // Save the updated workbook
    const backupPath = excelPath.replace('.xlsx', '_backup.xlsx');
    fs.copyFileSync(excelPath, backupPath);
    console.log(`💾 Backup created: ${backupPath}`);
    
    XLSX.writeFile(workbook, excelPath);
    console.log(`✅ Added ${newTabName} tab to ${excelPath}`);
    
    return excelPath;
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('Usage: node generate-pay-period-tab.js <period-number> <excel-file-path>');
        console.log('');
        console.log('Example:');
        console.log('  node generate-pay-period-tab.js 21 "Burnrate & Expense Overview.xlsx"');
        process.exit(1);
    }
    
    const periodNumber = parseInt(args[0]);
    const excelPath = args[1];
    
    try {
        console.log(`🔍 Processing pay period ${periodNumber}`);
        
        // Read Kimai data
        const kimaiData = readKimaiData(periodNumber);
        console.log(`📋 Found ${kimaiData.users.length} users in Kimai data`);
        
        // Generate tab data
        const tabData = generatePayPeriodTab(periodNumber, kimaiData);
        console.log(`📊 Generated ${tabData.length} rows for pay period tab`);
        
        // Insert into Excel
        const tabName = `${periodNumber}st Pay Period`;
        insertTabIntoExcel(excelPath, tabName, tabData);
        
        console.log(`✅ Successfully added ${tabName} tab!`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

module.exports = { generatePayPeriodTab, insertTabIntoExcel, readKimaiData };