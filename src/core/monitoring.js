/**
 * Core Monitoring Logic
 * Handles heartbeat staleness checking and status updates
 */

import { buildServicesWithGroups, getUiConfig } from '../config/loader.js';
import { checkAndSendNotifications } from './notifications.js';

/**
 * Check for stale heartbeats and update service status
 * This function runs on every cron schedule and checks ALL enabled services,
 * regardless of their current status (up, down, degraded, or unknown).
 * This ensures continuous monitoring and accurate uptime statistics.
 */
export async function checkHeartbeatStaleness(env) {
  const processedServices = buildServicesWithGroups();
  const results = [];
  const now = Date.now();
  const timestamp = new Date().toISOString();

  // Read from separate KV keys to avoid race conditions
  const [latestJson, dataJson] = await Promise.all([
    env.HEARTBEAT_LOGS.get('monitor:latest'),
    env.HEARTBEAT_LOGS.get('monitor:data')
  ]);
  
  const latestData = latestJson ? JSON.parse(latestJson) : {};
  const monitorData = dataJson ? JSON.parse(dataJson) : {
    uptime: {},
    summary: null
  };

  const existingSummaryTimestamp = monitorData.summary?.timestamp;
  console.log(`Cron: Read KV - Summary timestamp: ${existingSummaryTimestamp || 'null'}, Latest count: ${Object.keys(latestData).length}`);
  
  // Track statistics for logging
  let checkedCount = 0;
  let upCount = 0;
  let downCount = 0;
  let unknownCount = 0;

  // Check ALL enabled services (including those currently down)
  // This ensures we continue recording downtime in statistics
  for (const service of processedServices) {
    if (!service.enabled) {
      continue;
    }

    // Get latest heartbeat timestamp
    const lastHeartbeatTime = latestData[service.id];
    
    const stalenessThreshold = (service.stalenessThreshold || 300) * 1000; // Default 5 minutes
    
    let status, lastSeen, timeSinceLastHeartbeat;
    
    if (!lastHeartbeatTime) {
      status = 'unknown';
      lastSeen = null;
      timeSinceLastHeartbeat = null;
      unknownCount++;
    } else {
      const lastHeartbeatDate = new Date(lastHeartbeatTime);
      timeSinceLastHeartbeat = now - lastHeartbeatDate.getTime();
      lastSeen = lastHeartbeatTime;
      
      if (timeSinceLastHeartbeat > stalenessThreshold) {
        status = 'down';
        downCount++;
      } else {
        status = 'up';
        upCount++;
      }
    }

    const result = {
      serviceId: service.id,
      serviceName: service.name,
      status: status,
      lastSeen: lastSeen,
      timeSinceLastHeartbeat: timeSinceLastHeartbeat,
      stalenessThreshold: stalenessThreshold,
      timestamp: timestamp,
      groupId: service.groupId || null,
      groupName: service.groupName || 'Ungrouped',
      uptimeThresholdSet: service.uptimeThresholdSet || 'default'
    };

    results.push(result);
    checkedCount++;
  }

  // Log check summary (helpful for debugging and confirming continuous monitoring)
  console.log(`Staleness check completed: ${checkedCount} services checked (Up: ${upCount}, Down: ${downCount}, Unknown: ${unknownCount})`);

  // Update summary and uptime in the single store
  // This records the current check for ALL services, including down ones
  await updateMonitorData(env, monitorData, results, timestamp);

  // Check for status changes and send notifications
  await checkAndSendNotifications(env, results, monitorData, { services: processedServices });

  return results;
}

/**
 * Update all monitor data (summary and uptime) in a single write
 * This function processes ALL service check results and increments counters
 * for up/down/degraded/unknown checks, ensuring accurate statistics even
 * for services that remain down over multiple check cycles.
 */
async function updateMonitorData(env, monitorData, results, timestamp) {
  const uiConfig = getUiConfig();
  const today = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD format

  try {
    // Initialize structure if needed
    if (!monitorData.uptime) monitorData.uptime = {};
    
    // Update summary
    monitorData.summary = {
      timestamp: timestamp,
      totalServices: results.length,
      servicesUp: results.filter(r => r.status === 'up').length,
      servicesDegraded: results.filter(r => r.status === 'degraded').length,
      servicesDown: results.filter(r => r.status === 'down').length,
      servicesUnknown: results.filter(r => r.status === 'unknown').length,
      results: results
    };

    // Update uptime data for each service (including down services)
    // Every check is recorded to maintain accurate uptime percentages
    for (const result of results) {
      // Initialize service data if not exists
      if (!monitorData.uptime[result.serviceId]) {
        monitorData.uptime[result.serviceId] = {
          serviceId: result.serviceId,
          serviceName: result.serviceName,
          days: {}
        };
      }

      const serviceData = monitorData.uptime[result.serviceId];

      // Get or create today's data
      if (!serviceData.days[today]) {
        serviceData.days[today] = {
          date: today,
          totalChecks: 0,
          upChecks: 0,
          downChecks: 0,
          degradedChecks: 0,
          unknownChecks: 0,
          uptimePercentage: 0
        };
      }

      const dailyData = serviceData.days[today];

      // Increment counters for ALL check results
      // This includes recording down checks for services that remain offline
      dailyData.totalChecks++;
      if (result.status === 'up') {
        dailyData.upChecks++;
      } else if (result.status === 'down') {
        dailyData.downChecks++;
        // Log down service checks for visibility (helpful for debugging)
        console.log(`Recording down check for service: ${result.serviceName} (${result.serviceId}) - Down checks today: ${dailyData.downChecks}`);
      } else if (result.status === 'degraded') {
        dailyData.degradedChecks++;
      } else {
        dailyData.unknownChecks++;
      }

      // Calculate uptime percentage (exclude unknown from calculation)
      const knownChecks = dailyData.totalChecks - dailyData.unknownChecks;
      if (knownChecks > 0) {
        dailyData.uptimePercentage = parseFloat(((dailyData.upChecks + dailyData.degradedChecks * 0.5) / knownChecks * 100).toFixed(2));
      }

      dailyData.lastUpdate = timestamp;

      // Keep only last N days for this service (configurable retention period)
      const retentionDays = uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90;
      const dates = Object.keys(serviceData.days).sort();
      if (dates.length > retentionDays) {
        // Remove oldest days
        const daysToRemove = dates.slice(0, dates.length - retentionDays);
        daysToRemove.forEach(date => delete serviceData.days[date]);
      }
    }

    // Store only summary and uptime (latest is stored separately by heartbeat handler)
    // This structure eliminates race conditions with concurrent heartbeat updates
    const dataToStore = {
      summary: monitorData.summary,
      uptime: monitorData.uptime
    };
    
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify(dataToStore));
    console.log(`Cron: Wrote monitor:data - Summary timestamp: ${timestamp}, Uptime services: ${Object.keys(monitorData.uptime || {}).length}`);
    console.log(`Monitor data updated successfully at ${timestamp}`);
  } catch (error) {
    console.error('Error updating monitor data:', error);
    console.error('Error stack:', error.stack);
    // Re-throw to make the cron fail visibly
    throw error;
  }
}

