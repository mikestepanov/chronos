#!/usr/bin/env node

/**
 * Custom date range pull for Aug 18-22
 */

const { pullKimaiData } = require('./scripts/pull-kimai');

async function pullCustomRange() {
  // Define custom periods for each day
  const periods = [
    {
      name: "Aug 18 (Single Day)",
      number: "custom-aug18",
      start: new Date('2025-08-18T05:00:00.000Z'),
      end: new Date('2025-08-18T05:00:00.000Z')
    },
    {
      name: "Aug 19 (Single Day)", 
      number: "custom-aug19",
      start: new Date('2025-08-19T05:00:00.000Z'),
      end: new Date('2025-08-19T05:00:00.000Z')
    },
    {
      name: "Aug 20 (Single Day)",
      number: "custom-aug20", 
      start: new Date('2025-08-20T05:00:00.000Z'),
      end: new Date('2025-08-20T05:00:00.000Z')
    },
    {
      name: "Aug 21 (Single Day)",
      number: "custom-aug21",
      start: new Date('2025-08-21T05:00:00.000Z'), 
      end: new Date('2025-08-21T05:00:00.000Z')
    },
    {
      name: "Aug 22 (Single Day)",
      number: "custom-aug22",
      start: new Date('2025-08-22T05:00:00.000Z'),
      end: new Date('2025-08-22T05:00:00.000Z')
    },
    {
      name: "Aug 18-22 (Full Range)",
      number: "custom-aug18-22",
      start: new Date('2025-08-18T05:00:00.000Z'),
      end: new Date('2025-08-22T05:00:00.000Z')
    }
  ];

  console.log('🔍 Pulling data for custom date ranges...\n');

  for (const period of periods) {
    console.log(`\n📊 === ${period.name} ===`);
    try {
      const result = await pullKimaiData({
        period: period,
        displayReport: true
      });
      
      console.log(`✅ Successfully pulled ${period.name}`);
      console.log(`   Records: ${result.stats.filteredRecords} filtered from ${result.stats.totalRecords}`);
      
    } catch (error) {
      console.error(`❌ Failed to pull ${period.name}:`, error.message);
    }
  }
}

// Run the custom pull
pullCustomRange()
  .then(() => {
    console.log('\n✨ All custom pulls completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Custom pull failed:', error.message);
    process.exit(1);
  });