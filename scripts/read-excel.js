#!/usr/bin/env node

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

function readExcelFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }

    console.log(`📊 Reading Excel file: ${filePath}`);
    
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log(`📋 Found ${sheetNames.length} tabs:`, sheetNames);
    
    const data = {};
    
    sheetNames.forEach(sheetName => {
        console.log(`\n🔍 Processing tab: ${sheetName}`);
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Filter out empty rows
        const filteredData = jsonData.filter(row => 
            row.some(cell => cell !== undefined && cell !== null && cell !== '')
        );
        
        data[sheetName] = {
            headers: filteredData[0] || [],
            rows: filteredData.slice(1),
            totalRows: filteredData.length - 1
        };
        
        console.log(`  - Headers: ${data[sheetName].headers.join(', ')}`);
        console.log(`  - Data rows: ${data[sheetName].totalRows}`);
    });
    
    return data;
}

function saveTabAsCSV(tabData, tabName, outputDir = './output') {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const csvPath = path.join(outputDir, `${tabName.replace(/[^a-zA-Z0-9-_]/g, '_')}.csv`);
    
    // Convert to CSV format
    const csvRows = [tabData.headers, ...tabData.rows];
    const csvContent = csvRows.map(row => 
        row.map(cell => {
            // Handle cells that contain commas or quotes
            const stringCell = String(cell || '');
            if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n')) {
                return `"${stringCell.replace(/"/g, '""')}"`;
            }
            return stringCell;
        }).join(',')
    ).join('\n');
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`💾 Saved ${tabName} as CSV: ${csvPath}`);
    
    return csvPath;
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('Usage: node read-excel.js <excel-file-path> [--save-csv]');
        console.log('');
        console.log('Options:');
        console.log('  --save-csv    Save each tab as a separate CSV file');
        console.log('');
        console.log('Examples:');
        console.log('  node read-excel.js data.xlsx');
        console.log('  node read-excel.js data.xlsx --save-csv');
        process.exit(1);
    }
    
    const filePath = args[0];
    const saveCsv = args.includes('--save-csv');
    
    try {
        const data = readExcelFile(filePath);
        
        if (saveCsv) {
            console.log('\n💾 Saving tabs as CSV files...');
            Object.keys(data).forEach(tabName => {
                saveTabAsCSV(data[tabName], tabName);
            });
        }
        
        console.log('\n✅ Excel file processed successfully!');
        
        // Return data for programmatic use
        if (typeof module !== 'undefined' && module.exports) {
            return data;
        }
        
    } catch (error) {
        console.error('❌ Error processing Excel file:', error.message);
        process.exit(1);
    }
}

module.exports = { readExcelFile, saveTabAsCSV };