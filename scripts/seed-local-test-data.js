#!/usr/bin/env node

/**
 * Seed test data into local KV for local development testing
 * Usage: node scripts/seed-local-test-data.js
 * 
 * This creates sample data matching your configured services
 * and writes it directly to local KV using wrangler CLI
 */

import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Load services configuration
const servicesConfig = JSON.parse(
  readFileSync(join(projectRoot, 'config/services.json'), 'utf8')
);

// Load settings for retention days
const settingsConfig = JSON.parse(
  readFileSync(join(projectRoot, 'config/settings.json'), 'utf8')
);

const retentionDays = settingsConfig.uptime?.retentionDays || 60;

/**
 * Build services with group information (matching the loader logic)
 */
function buildServicesWithGroups() {
  const groups = servicesConfig.groups || [];
  const services = servicesConfig.services || [];
  
  const serviceToGroup = new Map();
  groups.forEach(group => {
    group.services?.forEach(serviceId => {
      serviceToGroup.set(serviceId, group);
    });
  });
  
  return services
    .filter(s => s.enabled !== false)
    .map(service => {
      const group = serviceToGroup.get(service.id);
      
      if (!group) {
        return { 
          ...service, 
          groupId: null, 
          groupName: 'Ungrouped', 
          uptimeThresholdSet: 'default',
          stalenessThreshold: service.stalenessThreshold || 300
        };
      }
      
      return {
        ...service,
        groupId: group.id,
        groupName: group.name,
        uptimeThresholdSet: service.uptimeThresholdSet || group.uptimeThresholdSet || 'default',
        stalenessThreshold: service.stalenessThreshold || group.stalenessThreshold || 300
      };
    });
}

/**
 * Generate mock uptime data for a service
 */
function generateUptimeData(serviceId, serviceName, days = retentionDays) {
  const uptimeData = {};
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Simulate realistic uptime (95-100% for most services)
    // Some services have occasional issues
    const baseUptime = Math.random() > 0.1 ? 0.98 : 0.90; // 90% chance of 98%+ uptime
    const totalChecks = 144; // 6 checks per hour * 24 hours (if checking every 10 minutes)
    const uptime = baseUptime + (Math.random() * 0.02); // 98-100% or 90-92%
    const upChecks = Math.floor(totalChecks * uptime);
    const downChecks = Math.floor(totalChecks * (1 - uptime) * 0.7);
    const degradedChecks = totalChecks - upChecks - downChecks;
    
    uptimeData[dateStr] = {
      date: dateStr,
      totalChecks: totalChecks,
      upChecks: upChecks,
      degradedChecks: degradedChecks,
      downChecks: downChecks,
      unknownChecks: 0,
      uptimePercentage: parseFloat((uptime * 100).toFixed(2)),
      lastUpdate: new Date(date.getTime() + 12 * 60 * 60 * 1000).toISOString() // Noon that day
    };
  }
  
  return uptimeData;
}

/**
 * Generate sample data matching the actual structure
 */
function generateSampleData() {
  const services = buildServicesWithGroups();
  const now = Date.now();
  const timestamp = new Date().toISOString();
  
  // Generate monitor:latest (recent heartbeats)
  const latestData = {};
  services.forEach(service => {
    // Most services have recent heartbeats (within last 2 minutes)
    // One service might be slightly older (3 minutes ago) to show variation
    const minutesAgo = Math.random() > 0.2 ? Math.floor(Math.random() * 2) : 3;
    latestData[service.id] = new Date(now - minutesAgo * 60 * 1000).toISOString();
  });
  
  // Generate monitor:data (summary + uptime)
  const summaryResults = services.map(service => {
    const lastHeartbeatTime = latestData[service.id];
    const lastHeartbeatDate = new Date(lastHeartbeatTime);
    const timeSinceLastHeartbeat = now - lastHeartbeatDate.getTime();
    const stalenessThreshold = (service.stalenessThreshold || 300) * 1000;
    
    let status = 'up';
    if (timeSinceLastHeartbeat > stalenessThreshold) {
      status = 'down';
    }
    
    return {
      serviceId: service.id,
      serviceName: service.name,
      status: status,
      lastSeen: lastHeartbeatTime,
      timeSinceLastHeartbeat: timeSinceLastHeartbeat,
      stalenessThreshold: stalenessThreshold,
      timestamp: timestamp,
      groupId: service.groupId || null,
      groupName: service.groupName || 'Ungrouped',
      uptimeThresholdSet: service.uptimeThresholdSet || 'default'
    };
  });
  
  const summary = {
    timestamp: timestamp,
    totalServices: summaryResults.length,
    servicesUp: summaryResults.filter(r => r.status === 'up').length,
    servicesDegraded: summaryResults.filter(r => r.status === 'degraded').length,
    servicesDown: summaryResults.filter(r => r.status === 'down').length,
    servicesUnknown: summaryResults.filter(r => r.status === 'unknown').length,
    results: summaryResults
  };
  
  // Generate uptime data for each service
  const uptimeData = {};
  services.forEach(service => {
    uptimeData[service.id] = {
      serviceId: service.id,
      serviceName: service.name,
      days: generateUptimeData(service.id, service.name, retentionDays)
    };
  });
  
  return {
    latest: latestData,
    data: {
      summary: summary,
      uptime: uptimeData
    }
  };
}

/**
 * Write data to local KV using wrangler CLI
 */
function writeToLocalKV(key, data) {
  const tempFile = join(projectRoot, `.temp-${key.replace(/:/g, '-')}.json`);
  
  try {
    // Write data to temp file
    writeFileSync(tempFile, JSON.stringify(data, null, 2));
    
    // Use wrangler to put it in local KV
    const command = `npx wrangler kv key put "${key}" --path="${tempFile}" --binding=HEARTBEAT_LOGS --local`;
    console.log(`\n📝 Writing ${key} to local KV...`);
    execSync(command, { 
      cwd: projectRoot,
      stdio: 'inherit'
    });
    
    console.log(`✅ Successfully wrote ${key}`);
  } catch (error) {
    console.error(`❌ Error writing ${key}:`, error.message);
    throw error;
  } finally {
    // Clean up temp file
    try {
      unlinkSync(tempFile);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

// Main execution
console.log('🌱 Seeding local KV with test data...\n');
console.log(`📊 Found ${buildServicesWithGroups().length} enabled services:`);
buildServicesWithGroups().forEach(s => {
  console.log(`   - ${s.name} (${s.id})`);
});

const sampleData = generateSampleData();

console.log(`\n📈 Generating ${retentionDays} days of uptime data for each service...`);

try {
  // Write monitor:latest
  writeToLocalKV('monitor:latest', sampleData.latest);
  
  // Write monitor:data
  writeToLocalKV('monitor:data', sampleData.data);
  
  console.log('\n✅ Successfully seeded local KV with test data!');
  console.log('\n🚀 You can now:');
  console.log('   1. Start the dev server: npm run dev');
  console.log('   2. Open http://localhost:8787 in your browser');
  console.log('   3. You should see your services with sample data');
  console.log('\n💡 Note: The data is stored in local KV, so it persists until you clear it.');
  
} catch (error) {
  console.error('\n❌ Failed to seed data:', error.message);
  console.error('\n💡 Make sure:');
  console.error('   1. Wrangler is installed: npm install');
  console.error('   2. You are authenticated: npx wrangler login');
  console.error('   3. The KV namespace is configured in wrangler.toml');
  process.exit(1);
}

