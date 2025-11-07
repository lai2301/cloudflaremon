#!/usr/bin/env node

/**
 * Seed test uptime data into KV for testing CSV export
 * Usage: node scripts/seed-test-data.js
 * 
 * This creates 30 days of sample uptime data for testing purposes
 */

const API_URL = 'http://localhost:8787'; // Change to your worker URL if deployed

// Generate mock uptime data for the last 30 days
function generateMockData(serviceId, days = 30) {
  const uptimeData = {};
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Simulate varying uptime (90-100% uptime)
    const totalChecks = 1440; // 1 check per minute for 24 hours
    const uptime = 0.90 + (Math.random() * 0.10); // 90-100% uptime
    const upChecks = Math.floor(totalChecks * uptime);
    const downChecks = totalChecks - upChecks;
    
    // Add some variation (occasionally some degraded states)
    let degradedChecks = 0;
    if (Math.random() > 0.7) {
      degradedChecks = Math.floor(Math.random() * 20);
      uptimeData[dateStr] = {
        totalChecks: totalChecks,
        upChecks: upChecks - degradedChecks,
        degradedChecks: degradedChecks,
        downChecks: downChecks,
        unknownChecks: 0
      };
    } else {
      uptimeData[dateStr] = {
        totalChecks: totalChecks,
        upChecks: upChecks,
        degradedChecks: 0,
        downChecks: downChecks,
        unknownChecks: 0
      };
    }
  }
  
  return uptimeData;
}

console.log('🌱 Seeding test uptime data...\n');
console.log('⚠️  Note: This script requires direct KV access.');
console.log('   For local dev, you can manually add this to wrangler CLI.\n');

// Generate data for both services
const service1Data = generateMockData('service-1', 30);
const service2Data = generateMockData('service-2', 30);

const mockKVData = {
  summary: [
    {
      serviceId: 'service-1',
      serviceName: 'Internal API',
      status: 'up',
      lastSeen: new Date().toISOString(),
      timeSinceLastHeartbeat: 30000,
      stalenessThreshold: 300000,
      timestamp: new Date().toISOString(),
      groupId: 'core-services',
      groupName: 'Core Services',
      uptimeThresholdSet: 'strict'
    },
    {
      serviceId: 'service-2',
      serviceName: 'Database Service',
      status: 'up',
      lastSeen: new Date().toISOString(),
      timeSinceLastHeartbeat: 45000,
      stalenessThreshold: 300000,
      timestamp: new Date().toISOString(),
      groupId: 'infrastructure',
      groupName: 'Infrastructure',
      uptimeThresholdSet: 'default'
    }
  ],
  uptime: {
    'service-1': {
      days: service1Data
    },
    'service-2': {
      days: service2Data
    }
  }
};

console.log('📊 Generated data structure:');
console.log(JSON.stringify(mockKVData, null, 2));

console.log('\n\n📝 To seed this data into your local KV:');
console.log('\n1. Save this JSON to a file:');
console.log('   node scripts/seed-test-data.js > test-data.json\n');
console.log('2. Use wrangler to put it in KV:');
console.log('   npx wrangler kv:key put --binding=HEARTBEAT_LOGS "monitor:data" --path=test-data.json --local\n');
console.log('   # Or for production:');
console.log('   npx wrangler kv:key put --binding=HEARTBEAT_LOGS "monitor:data" --path=test-data.json\n');
console.log('\n✅ After seeding, your CSV export should have 30 days of data!');

