import servicesConfig from '../services.json';
import uiConfig from '../ui.json';
import { checkAndSendNotifications, testNotification } from './notifications.js';

/**
 * Cloudflare Worker Heartbeat Monitor (Push-based)
 * Receives heartbeats from internal network services and monitors for staleness
 */

/**
 * Build services map with group configurations merged
 * Service-level settings override group-level settings
 */
function buildServicesWithGroups() {
  const groups = servicesConfig.groups || [];
  const services = servicesConfig.services || [];
  
  // Create a map of service ID to group
  const serviceToGroup = new Map();
  groups.forEach(group => {
    group.services?.forEach(serviceId => {
      serviceToGroup.set(serviceId, group);
    });
  });
  
  // Merge group config with service config
  const mergedServices = services.map(service => {
    const group = serviceToGroup.get(service.id);
    
    if (!group) {
      // No group, return service as-is
      return { ...service, groupId: null, groupName: 'Ungrouped', uptimeThresholdSet: 'default' };
    }
    
    // Deep merge: start with group defaults, override with service specifics
    const merged = {
      ...service,
      groupId: group.id,
      groupName: group.name,
      uptimeThresholdSet: group.uptimeThresholdSet || 'default',
      stalenessThreshold: service.stalenessThreshold ?? group.stalenessThreshold,
      notifications: {
        enabled: service.notifications?.enabled ?? group.notifications?.enabled ?? false,
        channels: service.notifications?.channels ?? group.notifications?.channels ?? [],
        events: service.notifications?.events ?? group.notifications?.events ?? []
      }
    };
    
    return merged;
  });
  
  return mergedServices;
}

// Build the merged services list
const processedServices = buildServicesWithGroups();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route handling
    if (url.pathname === '/') {
      return handleDashboard(env);
    } else if (url.pathname === '/api/heartbeat' && request.method === 'POST') {
      // Receive heartbeat from internal services
      return handleHeartbeat(request, env);
    } else if (url.pathname === '/api/status') {
      return handleGetStatus(env);
    } else if (url.pathname === '/api/uptime') {
      return handleGetUptime(env, url);
    } else if (url.pathname === '/api/services') {
      // List configured services
      return new Response(JSON.stringify(processedServices, null, 2), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    } else if (url.pathname === '/api/test-notification' && request.method === 'POST') {
      // Test notification system
      return handleTestNotification(env, request);
    } else if (url.pathname === '/api/alert' && request.method === 'POST') {
      // Receive external alerts (Alertmanager, Grafana, etc.)
      return handleCustomAlert(env, request);
    }

    return new Response('Not Found', { status: 404 });
  },

  async scheduled(event, env, ctx) {
    // This runs on the cron schedule defined in wrangler.toml
    // Check for stale heartbeats and update service status
    console.log('Scheduled staleness check triggered at:', new Date(event.scheduledTime).toISOString());
    
    ctx.waitUntil(checkHeartbeatStaleness(env));
  }
};

/**
 * Handle incoming heartbeat from internal service
 */
async function handleHeartbeat(request, env) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.serviceId) {
      return new Response(JSON.stringify({ error: 'serviceId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find service in config
    const service = processedServices.find(s => s.id === data.serviceId);
    if (!service) {
      return new Response(JSON.stringify({ error: 'Unknown serviceId' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate API key if configured in environment variable
    // API_KEYS should be a JSON string mapping service IDs to their API keys
    let expectedApiKey = null;
    
    if (env.API_KEYS) {
      try {
        const apiKeys = JSON.parse(env.API_KEYS);
        expectedApiKey = apiKeys[data.serviceId];
      } catch (error) {
        console.error('Error parsing API_KEYS:', error);
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    if (expectedApiKey) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${expectedApiKey}`) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const timestamp = new Date().toISOString();
    
    // Update latest heartbeat timestamp in single consolidated store
    try {
      const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
      const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : {
        latest: {},
        uptime: {},
        summary: null
      };
      
      if (!monitorData.latest) monitorData.latest = {};
      monitorData.latest[data.serviceId] = timestamp;
      
      await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify(monitorData));
    } catch (error) {
      console.error('Error updating latest heartbeat:', error);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Heartbeat received',
      timestamp: timestamp 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Check for stale heartbeats and update service status
 */
async function checkHeartbeatStaleness(env) {
  const results = [];
  const now = Date.now();
  const timestamp = new Date().toISOString();

  // Get all monitor data in a single read
  const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
  const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : {
    latest: {},
    uptime: {},
    summary: null
  };

  const latestData = monitorData.latest || {};

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
    } else {
      const lastHeartbeatDate = new Date(lastHeartbeatTime);
      timeSinceLastHeartbeat = now - lastHeartbeatDate.getTime();
      lastSeen = lastHeartbeatTime;
      
      if (timeSinceLastHeartbeat > stalenessThreshold) {
        status = 'down';
      } else {
        status = 'up';
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
  }

  // Update summary and uptime in the single store
  await updateMonitorData(env, monitorData, results, timestamp);

  // Check for status changes and send notifications
  await checkAndSendNotifications(env, results, monitorData, { services: processedServices });

  return results;
}

/**
 * Update all monitor data (summary and uptime) in a single write
 */
async function updateMonitorData(env, monitorData, results, timestamp) {
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

    // Update uptime data for each service
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

      // Increment counters
      dailyData.totalChecks++;
      if (result.status === 'up') {
        dailyData.upChecks++;
      } else if (result.status === 'down') {
        dailyData.downChecks++;
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
      const retentionDays = uiConfig.features.uptimeRetentionDays || 90;
      const dates = Object.keys(serviceData.days).sort();
      if (dates.length > retentionDays) {
        // Remove oldest days
        const daysToRemove = dates.slice(0, dates.length - retentionDays);
        daysToRemove.forEach(date => delete serviceData.days[date]);
      }
    }

    // Store everything in a single write operation
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify(monitorData));
  } catch (error) {
    console.error('Error updating monitor data:', error);
  }
}

/**
 * Handle test notification request
 */
async function handleTestNotification(env, request) {
  try {
    const body = await request.json();
    const { channelType, eventType = 'down' } = body;

    const result = await testNotification(env, channelType, eventType);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Test ${eventType} notification sent to ${result.channel}`,
      ...result
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Test notification error:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('disabled') ? 400 : 500;
    return new Response(JSON.stringify({ 
      success: false, 
      message: error.message 
    }), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle custom alert from external tools (Alertmanager, Grafana, etc.)
 */
async function handleCustomAlert(env, request) {
  // Optional authentication - if ALERT_API_KEY is set, require it
  if (env.ALERT_API_KEY) {
    const authHeader = request.headers.get('Authorization');
    const providedKey = authHeader?.replace('Bearer ', '');
    
    if (!providedKey || providedKey !== env.ALERT_API_KEY) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Unauthorized - Invalid or missing API key'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  try {
    const body = await request.json();
    
    // Detect alert source and parse accordingly
    // Order matters: check most specific formats first, generic format last
    let alertData;
    
    if (body.alerts && Array.isArray(body.alerts)) {
      // Alertmanager format: has 'alerts' array
      alertData = parseAlertmanagerPayload(body);
    } else if (body.evalMatches || (body.state && body.ruleName)) {
      // Grafana format: has 'evalMatches' OR both 'state' and 'ruleName'
      // Note: Don't check just 'message' as it would match generic format too
      alertData = parseGrafanaPayload(body);
    } else if (body.title && body.message) {
      // Generic format: has 'title' and 'message'
      // This is the catch-all format for custom integrations
      
      // Support both 'channel' (singular) and 'channels' (plural)
      let channels = body.channels || body.channel || [];
      // Ensure it's an array
      if (!Array.isArray(channels)) {
        channels = [channels];
      }
      
      alertData = {
        title: body.title,
        message: body.message,
        severity: body.severity || 'warning',
        source: body.source || 'external',
        labels: body.labels || {},
        annotations: body.annotations || {},
        channels: channels  // Optional: specify target channels
      };
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: 'Unsupported alert format. Use Alertmanager, Grafana, or generic format.'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Send notifications using the custom alert handler
    const { sendCustomAlert } = await import('./notifications.js');
    const result = await sendCustomAlert(env, alertData);

    // Handle validation errors
    if (result && !result.success) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Alert validation failed',
        errors: result.errors,
        availableChannels: result.availableChannels,
        alertTitle: alertData.title
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Alert processed and notifications sent',
      alertTitle: alertData.title,
      channelsSent: result?.channelsSent || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Custom alert error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Parse Alertmanager webhook payload
 */
function parseAlertmanagerPayload(body) {
  const alerts = body.alerts || [];
  const firingAlerts = alerts.filter(a => a.status === 'firing');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
  
  // Use first alert for details
  const alert = alerts[0] || {};
  const labels = alert.labels || {};
  const annotations = alert.annotations || {};
  
  // Check for channels in labels (e.g., channel="discord,slack")
  const channelsLabel = labels.channels || annotations.channels || '';
  const channels = channelsLabel ? channelsLabel.split(',').map(c => c.trim()) : [];
  
  return {
    title: annotations.summary || labels.alertname || 'Alert',
    message: annotations.description || annotations.message || 'No description',
    severity: labels.severity || 'warning',
    source: 'alertmanager',
    status: firingAlerts.length > 0 ? 'firing' : 'resolved',
    count: {
      firing: firingAlerts.length,
      resolved: resolvedAlerts.length
    },
    labels: labels,
    annotations: annotations,
    generatorURL: alert.generatorURL,
    channels: channels
  };
}

/**
 * Parse Grafana webhook payload
 */
function parseGrafanaPayload(body) {
  // Check for channels in tags
  const channelsTag = body.tags?.channels || '';
  const channels = channelsTag ? channelsTag.split(',').map(c => c.trim()) : [];
  
  return {
    title: body.title || body.ruleName || 'Grafana Alert',
    message: body.message || 'No message',
    severity: body.state === 'alerting' ? 'critical' : body.state === 'ok' ? 'info' : 'warning',
    source: 'grafana',
    status: body.state || 'unknown',
    labels: {
      ruleName: body.ruleName,
      ruleUrl: body.ruleUrl
    },
    annotations: {
      imageUrl: body.imageUrl,
      message: body.message
    },
    evalMatches: body.evalMatches || [],
    channels: channels
  };
}

/**
 * Handle dashboard page
 */
async function handleDashboard(env) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${uiConfig.branding.pageTitle}</title>
    <link rel="icon" href="${uiConfig.branding.favicon}">
    <style>
        :root {
            --bg-primary: ${uiConfig.theme.colors.light.primary};
            --bg-secondary: ${uiConfig.theme.colors.light.secondary};
            --bg-hover: #f3f4f6;
            --text-primary: ${uiConfig.theme.colors.light.text};
            --text-secondary: ${uiConfig.theme.colors.light.textSecondary};
            --text-tertiary: #9ca3af;
            --border-color: ${uiConfig.theme.colors.light.border};
            --status-up: ${uiConfig.theme.colors.light.statusUp};
            --status-up-bg: #d1fae5;
            --status-up-text: #065f46;
            --status-down: ${uiConfig.theme.colors.light.statusDown};
            --status-down-bg: #fee2e2;
            --status-down-text: #991b1b;
            --status-degraded: ${uiConfig.theme.colors.light.statusDegraded};
            --status-degraded-bg: #fed7aa;
            --status-degraded-text: #92400e;
            --status-unknown: #6b7280;
            --status-unknown-bg: #e5e7eb;
            --status-unknown-text: #374151;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        [data-theme="dark"] {
            --bg-primary: ${uiConfig.theme.colors.dark.primary};
            --bg-secondary: ${uiConfig.theme.colors.dark.secondary};
            --bg-hover: #036358;
            --text-primary: ${uiConfig.theme.colors.dark.text};
            --text-secondary: ${uiConfig.theme.colors.dark.textSecondary};
            --text-tertiary: #9ca3af;
            --border-color: ${uiConfig.theme.colors.dark.border};
            --status-up: ${uiConfig.theme.colors.dark.statusUp};
            --status-up-bg: #064e3b;
            --status-up-text: #6ee7b7;
            --status-down: ${uiConfig.theme.colors.dark.statusDown};
            --status-down-bg: #7f1d1d;
            --status-down-text: #fca5a5;
            --status-degraded: ${uiConfig.theme.colors.dark.statusDegraded};
            --status-degraded-bg: #78350f;
            --status-degraded-text: #fcd34d;
            --status-unknown-bg: #374151;
            --status-unknown-text: #d1d5db;
        }

        @media (prefers-color-scheme: dark) {
            :root:not([data-theme="light"]) {
                --bg-primary: ${uiConfig.theme.colors.dark.primary};
                --bg-secondary: ${uiConfig.theme.colors.dark.secondary};
                --bg-hover: #036358;
                --text-primary: ${uiConfig.theme.colors.dark.text};
                --text-secondary: ${uiConfig.theme.colors.dark.textSecondary};
                --text-tertiary: #9ca3af;
                --border-color: ${uiConfig.theme.colors.dark.border};
                --status-up: ${uiConfig.theme.colors.dark.statusUp};
                --status-up-bg: #064e3b;
                --status-up-text: #6ee7b7;
                --status-down: ${uiConfig.theme.colors.dark.statusDown};
                --status-down-bg: #7f1d1d;
                --status-down-text: #fca5a5;
                --status-degraded: ${uiConfig.theme.colors.dark.statusDegraded};
                --status-degraded-bg: #78350f;
                --status-degraded-text: #fcd34d;
                --status-unknown-bg: #374151;
                --status-unknown-text: #d1d5db;
            }
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        
        header {
            margin-bottom: 48px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        
        .logo {
            max-width: 120px;
            max-height: 80px;
            margin-bottom: 16px;
        }
        
        .header-links {
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 32px;
        }
        
        .header-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            font-weight: 500;
            transition: color 0.2s;
            padding: 8px 16px;
            border-radius: 6px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
        }
        
        .header-links a:hover {
            color: var(--text-primary);
            border-color: var(--text-tertiary);
        }
        
        h1 {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 8px;
            color: var(--text-primary);
        }
        
        .subtitle {
            color: var(--text-secondary);
            font-size: 16px;
            margin-bottom: 0;
        }
        
        .overall-status {
            background: var(--bg-primary);
            padding: 32px;
            border-radius: 12px;
            border: 1px solid var(--border-color);
            margin-bottom: 24px;
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            flex-shrink: 0;
        }
        
        .status-indicator.operational {
            background: var(--status-up);
            box-shadow: 0 0 0 4px var(--status-up-bg);
        }
        
        .status-indicator.issues {
            background: var(--status-down);
            box-shadow: 0 0 0 4px var(--status-down-bg);
        }
        
        .status-indicator.degraded {
            background: var(--status-degraded);
            box-shadow: 0 0 0 4px var(--status-degraded-bg);
        }
        
        .status-text {
            flex: 1;
        }
        
        .status-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
        }
        
        .status-description {
            font-size: 14px;
            color: var(--text-secondary);
        }
        
        .last-checked {
            font-size: 13px;
            color: var(--text-tertiary);
        }
        
        .services-container {
            background: var(--bg-primary);
            border-radius: 12px;
            border: 1px solid var(--border-color);
            overflow: hidden;
            margin-bottom: 24px;
        }
        
        .services-container:last-child {
            margin-bottom: 0;
        }
        
        .services-header {
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
        }
        
        .services-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .threshold-legend {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            font-size: 13px;
        }
        
        .threshold-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .threshold-badge {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            border: 1px solid;
        }
        
        .service-item {
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.15s ease;
        }
        
        .service-item:last-child {
            border-bottom: none;
        }
        
        .service-item:hover {
            background: var(--bg-hover);
        }
        
        .service-main {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .service-status-icon {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
        }
        
        .service-status-icon.up {
            background: var(--status-up);
            color: white;
        }
        
        .service-status-icon.down {
            background: var(--status-down);
            color: white;
        }
        
        .service-status-icon.degraded {
            background: var(--status-degraded);
            color: white;
        }
        
        .service-status-icon.unknown {
            background: var(--status-unknown);
            color: white;
        }
        
        .service-name {
            font-size: 16px;
            font-weight: 500;
            color: var(--text-primary);
            flex: 1;
        }
        
        .service-uptime {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        ${Object.values(uiConfig.uptimeThresholds).flatMap(thresholdSet => 
            thresholdSet.map(threshold => `
        .service-uptime.uptime-${threshold.name} {
            color: ${threshold.color};
            background: ${threshold.color}15;
            border: 1px solid ${threshold.color}40;
        }`)).join('\n')}
        
        .uptime-bar-container {
            margin-bottom: 12px;
        }
        
        .uptime-bar-wrapper {
            overflow-x: auto;
            overflow-y: hidden;
            margin-bottom: 8px;
            padding-bottom: 4px;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
            scrollbar-color: var(--border-color) var(--bg-secondary);
            scroll-behavior: smooth;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar {
            height: 6px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-track {
            background: var(--bg-secondary);
            border-radius: 3px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 3px;
        }
        
        .uptime-bar-wrapper::-webkit-scrollbar-thumb:hover {
            background: var(--text-tertiary);
        }
        
        .uptime-bar {
            display: flex;
            gap: 2px;
            height: 40px;
            min-width: 720px;
        }
        
        @media (max-width: 768px) {
            .uptime-bar {
                min-width: 600px;
            }
        }
        
        .uptime-day {
            flex: 1;
            min-width: 6px;
            background: var(--status-up);
            border-radius: 2px;
            transition: all 0.2s ease;
            position: relative;
            cursor: help;
        }
        
        .uptime-day.up {
            background: var(--status-up);
            opacity: 1;
        }
        
        .uptime-day.down {
            background: var(--status-down);
            opacity: 1;
        }
        
        .uptime-day.degraded {
            background: var(--status-degraded);
            opacity: 1;
        }
        
        .uptime-day.unknown {
            background: var(--border-color);
            opacity: 0.5;
        }
        
        .uptime-day:hover {
            opacity: 0.9;
            transform: scaleY(1.15);
            z-index: 10;
        }
        
        /* Custom tooltip */
        .custom-tooltip {
            position: fixed;
            background: var(--text-primary);
            color: var(--bg-primary);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            line-height: 1.4;
            pointer-events: none;
            z-index: 1000;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.1s ease;
        }
        
        .custom-tooltip.show {
            opacity: 1;
        }
        
        .uptime-labels {
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: var(--text-tertiary);
        }
        
        .service-meta {
            display: flex;
            gap: 24px;
            font-size: 13px;
            color: var(--text-secondary);
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .meta-label {
            color: var(--text-tertiary);
        }
        
        .loading {
            text-align: center;
            padding: 64px 20px;
            color: var(--text-secondary);
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-color);
            border-top-color: var(--text-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .theme-toggle-container {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 8px;
        }
        
        .theme-toggle, .export-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
        }
        
        .theme-toggle:hover, .export-btn:hover {
            background: var(--bg-hover);
            transform: scale(1.05);
        }
        
        .refresh-btn {
            background: var(--bg-primary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
        }
        
        .refresh-btn:hover {
            background: var(--bg-hover);
        }
        
        .refresh-btn:active {
            transform: scale(0.95);
        }
        
        /* Export Dialog Styles */
        .export-dialog {
            display: none;
            position: absolute;
            top: 60px;
            right: 20px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            width: 450px;
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 100px);
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideDown 0.2s ease-out;
        }
        
        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .export-dialog.active {
            display: block;
        }
        
        /* Backdrop for mobile */
        .export-backdrop {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9999;
        }
        
        .export-backdrop.active {
            display: block;
        }
        
        .export-dialog-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .export-dialog-title {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 0;
        }
        
        .export-dialog-close {
            background: none;
            border: none;
            font-size: 20px;
            cursor: pointer;
            color: var(--text-secondary);
            padding: 0;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .export-dialog-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .export-btn.active {
            background: var(--bg-hover);
            border-color: #3b82f6;
        }
        
        .export-form-group {
            margin-bottom: 20px;
        }
        
        .export-form-label {
            display: block;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .export-form-input, .export-form-select {
            width: 100%;
            padding: 10px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            box-sizing: border-box;
        }
        
        .export-form-input:focus, .export-form-select:focus {
            outline: none;
            border-color: #3b82f6;
        }
        
        .export-services-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            background: var(--bg-secondary);
        }
        
        .export-service-item {
            display: flex;
            align-items: center;
            padding: 8px;
            margin-bottom: 4px;
            border-radius: 6px;
            transition: background 0.2s;
        }
        
        .export-service-item:hover {
            background: var(--bg-hover);
        }
        
        .export-service-checkbox {
            margin-right: 10px;
            cursor: pointer;
        }
        
        .export-service-label {
            color: var(--text-primary);
            cursor: pointer;
            flex: 1;
        }
        
        .export-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
        }
        
        .export-btn-primary, .export-btn-secondary {
            flex: 1;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s;
            border: none;
        }
        
        .export-btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .export-btn-primary:hover {
            background: #2563eb;
        }
        
        .export-btn-primary:disabled {
            background: #6b7280;
            cursor: not-allowed;
            opacity: 0.5;
        }
        
        .export-btn-secondary {
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
        }
        
        .export-btn-secondary:hover {
            background: var(--bg-hover);
        }
        
        .export-date-range {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }
        
        .export-quick-ranges {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 8px;
        }
        
        .export-quick-btn {
            padding: 6px 12px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-secondary);
            transition: all 0.2s;
        }
        
        .export-quick-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
            border-color: #3b82f6;
        }
        
        @media (max-width: 768px) {
            .export-dialog {
                top: 50%;
                left: 50%;
                right: auto;
                transform: translate(-50%, -50%);
                width: calc(100vw - 40px);
                max-height: calc(100vh - 60px);
            }
            
            .export-dialog.active {
                transform: translate(-50%, -50%);
            }
        }
        
        footer {
            text-align: center;
            padding: 40px 20px 20px;
            color: var(--text-tertiary);
            font-size: 13px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--bg-primary);
            padding: 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            text-align: center;
        }

        .stat-value {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .stat-value.up { color: var(--status-up); }
        .stat-value.down { color: var(--status-down); }
        .stat-value.degraded { color: var(--status-degraded); }
        .stat-value.unknown { color: var(--status-unknown); }

        .stat-label {
            font-size: 12px;
            color: var(--text-tertiary);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        footer {
            margin-top: 80px;
            padding-top: 32px;
            border-top: 1px solid var(--border-color);
            text-align: center;
        }
        
        footer p {
            color: var(--text-tertiary);
            font-size: 14px;
            margin-bottom: 12px;
        }
        
        .footer-links {
            display: flex;
            gap: 24px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .footer-links a {
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 14px;
            transition: color 0.2s;
        }
        
        .footer-links a:hover {
            color: var(--text-primary);
        }
        
        /* Custom CSS from config */
        ${uiConfig.customCss}
    </style>
</head>
<body>
    <div class="container">
        ${uiConfig.theme.showToggle || uiConfig.features.showExportButton !== false ? `
        <div class="theme-toggle-container">
            <button class="export-btn" id="exportBtn" aria-label="Export data" title="Export CSV">
                <span>📊</span>
            </button>
            ${uiConfig.theme.showToggle ? `
            <button class="theme-toggle" id="themeToggle" aria-label="Toggle theme">
                <span id="themeIcon">🌙</span>
            </button>
            ` : ''}
        </div>
        ` : ''}
        <header>
            ${uiConfig.header.showLogo && uiConfig.header.logoUrl ? `<img src="${uiConfig.header.logoUrl}" alt="${uiConfig.header.logoAlt}" class="logo" />` : ''}
            ${uiConfig.header.links && uiConfig.header.links.length > 0 ? `
            <div class="header-links">
                ${uiConfig.header.links.map(link => `<a href="${link.url}" target="${link.url.startsWith('http') ? '_blank' : '_self'}" rel="${link.url.startsWith('http') ? 'noopener noreferrer' : ''}">${link.text}</a>`).join('')}
            </div>
            ` : ''}
            <h1>${uiConfig.header.title}</h1>
            <p class="subtitle">${uiConfig.header.subtitle}</p>
            ${uiConfig.customHtml.headerExtra}
        </header>
        
        <div class="overall-status" id="overallStatus">
            <div class="loading-spinner"></div>
            <div class="status-text">
                <div class="status-title">Loading status...</div>
            </div>
        </div>

        <div class="stats-grid" id="statsGrid" style="display: none;"></div>
        
        <div id="servicesGroups">
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Loading services...</p>
            </div>
        </div>
        
        <footer>
            <div id="lastUpdate" style="margin-bottom: 12px;"></div>
            <button class="refresh-btn" onclick="refreshStatus()">
                <span>↻</span>
                <span>Refresh</span>
            </button>
        </footer>
    </div>
    
    <!-- Export Backdrop -->
    <div id="exportBackdrop" class="export-backdrop" onclick="closeExportDialog()"></div>
    
    <!-- Export Dialog -->
    <div id="exportDialog" class="export-dialog">
        <div class="export-dialog-header">
            <h3 class="export-dialog-title">Export to CSV</h3>
            <button class="export-dialog-close" onclick="closeExportDialog()">×</button>
        </div>
            
            <div class="export-form-group">
                <label class="export-form-label">Time Period</label>
                <div class="export-quick-ranges">
                    <button class="export-quick-btn" onclick="setQuickRange(7)">Last 7 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange(30)">Last 30 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange(90)">Last 90 days</button>
                    <button class="export-quick-btn" onclick="setQuickRange('all')">All time</button>
                </div>
            </div>
            
            <div class="export-form-group">
                <label class="export-form-label">Custom Date Range</label>
                <div class="export-date-range">
                    <div>
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">From</label>
                        <input type="date" id="exportStartDate" class="export-form-input" />
                    </div>
                    <div>
                        <label style="font-size: 12px; color: var(--text-secondary); display: block; margin-bottom: 4px;">To</label>
                        <input type="date" id="exportEndDate" class="export-form-input" />
                    </div>
                </div>
            </div>
            
            <div class="export-form-group">
                <label class="export-form-label">
                    Select Services
                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: normal; margin-left: 8px;">
                        (<span id="selectedCount">0</span> selected)
                    </span>
                </label>
                <div style="margin-bottom: 8px;">
                    <button class="export-quick-btn" onclick="selectAllServices()">Select All</button>
                    <button class="export-quick-btn" onclick="deselectAllServices()">Deselect All</button>
                </div>
                <div id="exportServicesList" class="export-services-list">
                    <!-- Services will be populated dynamically -->
                </div>
            </div>
            
            <div class="export-actions">
                <button class="export-btn-secondary" onclick="closeExportDialog()">Cancel</button>
                <button class="export-btn-primary" id="exportButton" onclick="performExport()">Export CSV</button>
            </div>
    </div>
    
    <script>
        // Theme management
        const THEME_KEY = 'theme-preference';
        const defaultTheme = '${uiConfig.theme.defaultMode}';
        
        function getSystemTheme() {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        function getTheme() {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored && stored !== 'auto') return stored;
            return defaultTheme === 'auto' ? getSystemTheme() : defaultTheme;
        }
        
        function setTheme(theme) {
            if (theme === 'auto') {
                theme = getSystemTheme();
            }
            document.documentElement.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
        
        function updateThemeIcon(theme) {
            const icon = document.getElementById('themeIcon');
            if (icon) {
                icon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
        }
        
        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            localStorage.setItem(THEME_KEY, newTheme);
            setTheme(newTheme);
        }
        
        // Initialize theme
        setTheme(getTheme());
        
        // Add toggle listener
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const stored = localStorage.getItem(THEME_KEY);
            if (stored === 'auto' || !stored) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
        
        // Cache for uptime data
        const uptimeCache = {};

        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h ago\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m ago\`;
            if (minutes > 0) return \`\${minutes}m ago\`;
            return \`\${seconds}s ago\`;
        }

        function formatDate(dateStr) {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        // Custom tooltip functionality
        let tooltipElement = null;
        
        function initTooltip() {
            if (!tooltipElement) {
                tooltipElement = document.createElement('div');
                tooltipElement.className = 'custom-tooltip';
                document.body.appendChild(tooltipElement);
            }
        }
        
        function showTooltip(text, event) {
            if (!tooltipElement) initTooltip();
            tooltipElement.textContent = text;
            tooltipElement.classList.add('show');
            updateTooltipPosition(event);
        }
        
        function hideTooltip() {
            if (tooltipElement) {
                tooltipElement.classList.remove('show');
            }
        }
        
        function updateTooltipPosition(event) {
            if (!tooltipElement) return;
            const x = event.clientX + 10;
            const y = event.clientY + 10;
            tooltipElement.style.left = x + 'px';
            tooltipElement.style.top = y + 'px';
        }

        function generateUptimeBar(uptimeData) {
            if (!uptimeData || !uptimeData.days || uptimeData.days.length === 0) {
                // Fallback: generate days based on retention period with no data
                const retentionDays = ${uiConfig.features.uptimeRetentionDays};
                const today = new Date();
                let html = '';
                for (let i = retentionDays - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    const tooltipText = formatDate(dateStr) + ' - No data available';
                    html += '<div class="uptime-day unknown" data-tooltip="' + escapeHtml(tooltipText) + '"></div>';
                }
                return html;
            }

            let html = '';
            uptimeData.days.forEach(day => {
                let dayStatus = 'unknown';
                let tooltipText = formatDate(day.date) + ' - No data available';
                
                if (day.totalChecks > 0) {
                    const uptimePercent = parseFloat(day.uptimePercentage);
                    if (uptimePercent >= 99) {
                        dayStatus = 'up';
                    } else if (uptimePercent >= 90) {
                        dayStatus = 'degraded';
                    } else if (uptimePercent >= 0) {
                        dayStatus = 'down';
                    }
                    tooltipText = formatDate(day.date) + ' | Uptime: ' + day.uptimePercentage + '% | Checks: ' + day.totalChecks + ' (up:' + day.upChecks + ' down:' + day.downChecks + ')';
                }
                
                html += '<div class="uptime-day ' + dayStatus + '" data-tooltip="' + escapeHtml(tooltipText) + '"></div>';
            });
            
            return html;
        }
        
        function attachTooltipListeners() {
            document.addEventListener('mouseover', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    const tooltipText = e.target.getAttribute('data-tooltip');
                    if (tooltipText) {
                        showTooltip(tooltipText, e);
                    }
                }
            });
            
            document.addEventListener('mousemove', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    updateTooltipPosition(e);
                }
            });
            
            document.addEventListener('mouseout', function(e) {
                if (e.target.classList.contains('uptime-day')) {
                    hideTooltip();
                }
            });
        }

        async function fetchUptimeData(serviceId) {
            if (uptimeCache[serviceId]) {
                return uptimeCache[serviceId];
            }
            
            try {
                const response = await fetch(\`/api/uptime?serviceId=\${serviceId}\`);
                const data = await response.json();
                uptimeCache[serviceId] = data;
                return data;
            } catch (error) {
                console.error(\`Error fetching uptime for \${serviceId}:\`, error);
                return null;
            }
        }
        
        async function loadStatus() {
            try {
                const response = await fetch('/api/status');
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                const data = await response.json();
                
                if (!data.summary) {
                    document.getElementById('overallStatus').innerHTML = \`
                        <div class="status-indicator unknown"></div>
                        <div class="status-text">
                            <div class="status-title">No data available</div>
                            <div class="status-description">Waiting for first status check...</div>
                        </div>
                    \`;
                    document.getElementById('services').innerHTML = '<div class="loading"><p>No services data yet. Wait for the cron job to run.</p></div>';
                    document.getElementById('statsGrid').style.display = 'none';
                    return;
                }

                const summary = data.summary;
                const allUp = summary.servicesDown === 0 && summary.servicesDegraded === 0;
                const hasIssues = summary.servicesDown > 0;
                
                // Get list of down services
                const downServices = summary.results.filter(s => s.status === 'down');
                const degradedServices = summary.results.filter(s => s.status === 'degraded');
                
                // Update overall status
                const statusClass = hasIssues ? 'issues' : (summary.servicesDegraded > 0 ? 'degraded' : 'operational');
                const statusTitle = hasIssues ? 'Some systems are down' : (summary.servicesDegraded > 0 ? 'Degraded performance' : 'All systems operational');
                
                let statusDesc = '';
                if (hasIssues) {
                    const downList = downServices.map(s => s.serviceName).join(', ');
                    statusDesc = \`\${summary.servicesDown} service(s) down: \${downList}\`;
                } else if (summary.servicesDegraded > 0) {
                    const degradedList = degradedServices.map(s => s.serviceName).join(', ');
                    statusDesc = \`\${summary.servicesDegraded} service(s) degraded: \${degradedList}\`;
                } else {
                    statusDesc = 'All monitored services are running normally';
                }
                
                document.getElementById('overallStatus').innerHTML = \`
                    <div class="status-indicator \${statusClass}"></div>
                    <div class="status-text">
                        <div class="status-title">\${statusTitle}</div>
                        <div class="status-description">\${statusDesc}</div>
                    </div>
                    <div class="last-checked">
                        Updated \${formatDuration(Date.now() - new Date(summary.timestamp).getTime())}
                    </div>
                \`;

                // Update stats grid
                document.getElementById('statsGrid').style.display = 'grid';
                document.getElementById('statsGrid').innerHTML = \`
                    <div class="stat-card">
                        <div class="stat-value">\${summary.totalServices}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value up">\${summary.servicesUp}</div>
                        <div class="stat-label">Operational</div>
                    </div>
                    \${summary.servicesDegraded > 0 ? \`
                    <div class="stat-card">
                        <div class="stat-value degraded">\${summary.servicesDegraded}</div>
                        <div class="stat-label">Degraded</div>
                    </div>
                    \` : ''}
                    \${summary.servicesDown > 0 ? \`
                    <div class="stat-card">
                        <div class="stat-value down">\${summary.servicesDown}</div>
                        <div class="stat-label">Down</div>
                    </div>
                    \` : ''}
                    \${summary.servicesUnknown > 0 ? \`
                    <div class="stat-card">
                        <div class="stat-value unknown">\${summary.servicesUnknown}</div>
                        <div class="stat-label">Unknown</div>
                    </div>
                    \` : ''}
                \`;
                
                // Update services - fetch uptime data for each service
                document.getElementById('servicesGroups').innerHTML = '<div class="loading"><p>Loading uptime data...</p></div>';
                
                const servicesWithUptime = await Promise.all(summary.results.map(async (service) => {
                    try {
                        const uptimeData = await fetchUptimeData(service.serviceId);
                        return { service, uptimeData };
                    } catch (error) {
                        console.error(\`Error fetching uptime for \${service.serviceId}:\`, error);
                        return { service, uptimeData: null };
                    }
                }));
                
                // Group services by groupName and track threshold set
                const groupedServices = {};
                servicesWithUptime.forEach(({ service, uptimeData }) => {
                    const groupName = service.groupName || 'Ungrouped';
                    const thresholdSet = service.uptimeThresholdSet || 'default';
                    if (!groupedServices[groupName]) {
                        groupedServices[groupName] = {
                            thresholdSet: thresholdSet,
                            services: []
                        };
                    }
                    groupedServices[groupName].services.push({ service, uptimeData });
                });
                
                // All threshold sets for client-side use
                const allThresholds = ${JSON.stringify(uiConfig.uptimeThresholds)};
                
                // Generate HTML for each group
                const groupsHtml = Object.entries(groupedServices).map(([groupName, groupData]) => {
                    const thresholds = allThresholds[groupData.thresholdSet] || allThresholds['default'];
                    
                    const servicesHtml = groupData.services.map(({ service, uptimeData }) => {
                    try {
                        const icon = service.status === 'up' ? '✓' : (service.status === 'down' ? '✕' : '●');
                        const timeSince = service.lastSeen ? formatDuration(Date.now() - new Date(service.lastSeen).getTime()) : 'Never';
                        const uptime = uptimeData && uptimeData.overallUptime > 0 ? \`\${uptimeData.overallUptime}%\` : 'N/A';
                        
                        // Calculate uptime threshold class using group's threshold set
                        let uptimeClass = '';
                        if (uptimeData && uptimeData.overallUptime > 0) {
                            const percentage = uptimeData.overallUptime;
                            // Sort thresholds by min value descending and find the first match
                            const sortedThresholds = [...thresholds].sort((a, b) => b.min - a.min);
                            const matchedThreshold = sortedThresholds.find(t => percentage >= t.min);
                            if (matchedThreshold) {
                                uptimeClass = \`uptime-\${matchedThreshold.name}\`;
                            }
                        }
                        
                        return \`
                        <div class="service-item">
                            <div class="service-main">
                                <div class="service-status-icon \${service.status}">\${icon}</div>
                                <div class="service-name">\${service.serviceName}</div>
                                <div class="service-uptime \${uptimeClass}">\${uptime}</div>
                            </div>
                            <div class="uptime-bar-container">
                                <div class="uptime-bar-wrapper">
                                    <div class="uptime-bar">
                                        \${generateUptimeBar(uptimeData)}
                                    </div>
                                </div>
                                <div class="uptime-labels">
                                    <span>\${uptimeData?.retentionDays || ${uiConfig.features.uptimeRetentionDays}} days ago</span>
                                    <span>Today</span>
                                </div>
                            </div>
                            <div class="service-meta">
                                <div class="meta-item">
                                    <span class="meta-label">Last check:</span>
                                    <span>\${timeSince}</span>
                                </div>
                                <div class="meta-item">
                                    <span class="meta-label">Threshold:</span>
                                    <span>\${Math.floor(service.stalenessThreshold / 1000 / 60)}m</span>
                                </div>
                                \${uptimeData && uptimeData.totalDays > 0 ? \`
                                <div class="meta-item">
                                    <span class="meta-label">Tracked days:</span>
                                    <span>\${uptimeData.totalDays}/\${uptimeData.retentionDays || ${uiConfig.features.uptimeRetentionDays}}</span>
                                </div>
                                \` : ''}
                            </div>
                        </div>
                        \`;
                    } catch (error) {
                        console.error('Error rendering service:', service.serviceName, error);
                        return \`<div class="service-item"><div class="service-name">Error loading \${service.serviceName}</div></div>\`;
                    }
                    }).join('');
                    
                    // Generate threshold legend for this group
                    const legendHtml = thresholds.map(threshold => \`
                        <div class="threshold-item">
                            <div class="threshold-badge" style="background: \${threshold.color}15; border-color: \${threshold.color}40;"></div>
                            <span style="color: var(--text-secondary);">\${threshold.label} ≥\${threshold.min}%</span>
                        </div>
                    \`).join('');
                    
                    // Return the group container with header, legend, and services
                    return \`
                        <div class="services-container">
                            <div class="services-header">
                                <div class="services-title">\${groupName}</div>
                                <div class="threshold-legend">
                                    \${legendHtml}
                                </div>
                            </div>
                            <div class="services-list">
                                \${servicesHtml}
                            </div>
                        </div>
                    \`;
                }).join('');
                
                document.getElementById('servicesGroups').innerHTML = groupsHtml;
                document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date(summary.timestamp).toLocaleString()}\`;
                
                // Scroll all uptime bars to the right (most recent dates)
                setTimeout(() => {
                    const uptimeWrappers = document.querySelectorAll('.uptime-bar-wrapper');
                    uptimeWrappers.forEach(wrapper => {
                        wrapper.scrollLeft = wrapper.scrollWidth;
                    });
                }, 50);
                
            } catch (error) {
                console.error('Error loading status:', error);
                document.getElementById('overallStatus').innerHTML = \`
                    <div class="status-indicator issues"></div>
                    <div class="status-text">
                        <div class="status-title">Error loading data</div>
                        <div class="status-description">Failed to fetch status information. Check console for details.</div>
                    </div>
                \`;
                document.getElementById('services').innerHTML = \`
                    <div class="loading">
                        <p>Error: \${error.message}</p>
                        <p>Check browser console for more details</p>
                    </div>
                \`;
            }
        }
        
        // Clear cache and reload
        function refreshStatus() {
            // Clear uptime cache
            Object.keys(uptimeCache).forEach(key => delete uptimeCache[key]);
            loadStatus();
        }
        
        // Initialize tooltip system
        initTooltip();
        attachTooltipListeners();
        
        // Load status on page load
        loadStatus();
        
        // Auto-refresh based on config
        ${uiConfig.features.autoRefreshSeconds > 0 ? `setInterval(loadStatus, ${uiConfig.features.autoRefreshSeconds * 1000});` : ''}
        
        // Export functionality
        let exportServices = [];
        let exportDialogOpen = false;
        
        // Initialize export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', toggleExportDialog);
        }
        
        // Close dialog when clicking escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && exportDialogOpen) {
                closeExportDialog();
            }
        });
        
        function toggleExportDialog() {
            if (exportDialogOpen) {
                closeExportDialog();
            } else {
                openExportDialog();
            }
        }
        
        async function openExportDialog() {
            try {
                // Fetch services and populate the dialog
                const response = await fetch('/api/services');
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error(\`Expected JSON but received: \${contentType}\`);
                }
                
                const data = await response.json();
                
                if (!Array.isArray(data)) {
                    throw new Error('Invalid services data format');
                }
                
                exportServices = data.filter(s => s.enabled);
                
                if (exportServices.length === 0) {
                    alert('No enabled services found to export.');
                    return;
                }
                
                populateExportServices();
                
                // Set default dates
                const today = new Date();
                const thirtyDaysAgo = new Date(today);
                thirtyDaysAgo.setDate(today.getDate() - 30);
                
                document.getElementById('exportStartDate').valueAsDate = thirtyDaysAgo;
                document.getElementById('exportEndDate').valueAsDate = today;
                
                document.getElementById('exportDialog').classList.add('active');
                document.getElementById('exportBackdrop').classList.add('active');
                document.getElementById('exportBtn').classList.add('active');
                exportDialogOpen = true;
            } catch (err) {
                console.error('Error loading services for export:', err);
                alert(\`Failed to load services: \${err.message}\\n\\nPlease check the console for details.\`);
            }
        }
        
        function closeExportDialog() {
            document.getElementById('exportDialog').classList.remove('active');
            document.getElementById('exportBackdrop').classList.remove('active');
            document.getElementById('exportBtn').classList.remove('active');
            exportDialogOpen = false;
        }
        
        function populateExportServices() {
            const listContainer = document.getElementById('exportServicesList');
            listContainer.innerHTML = exportServices.map(service => \`
                <div class="export-service-item">
                    <input type="checkbox" 
                           class="export-service-checkbox" 
                           id="export-\${service.id}" 
                           value="\${service.id}"
                           onchange="updateSelectedCount()">
                    <label class="export-service-label" for="export-\${service.id}">
                        \${service.name}
                        <span style="color: var(--text-secondary); font-size: 12px; margin-left: 4px;">
                            (\${service.groupName || 'Ungrouped'})
                        </span>
                    </label>
                </div>
            \`).join('');
            
            // Select all by default
            selectAllServices();
        }
        
        function updateSelectedCount() {
            const checked = document.querySelectorAll('.export-service-checkbox:checked').length;
            document.getElementById('selectedCount').textContent = checked;
            document.getElementById('exportButton').disabled = checked === 0;
        }
        
        function selectAllServices() {
            document.querySelectorAll('.export-service-checkbox').forEach(cb => {
                cb.checked = true;
            });
            updateSelectedCount();
        }
        
        function deselectAllServices() {
            document.querySelectorAll('.export-service-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedCount();
        }
        
        function setQuickRange(days) {
            const endDate = new Date();
            let startDate = new Date();
            
            if (days === 'all') {
                // Set to earliest possible date (2020 or retention period)
                const retentionDays = ${uiConfig.features.uptimeRetentionDays || 90};
                startDate.setDate(endDate.getDate() - retentionDays);
            } else {
                startDate.setDate(endDate.getDate() - days);
            }
            
            document.getElementById('exportStartDate').valueAsDate = startDate;
            document.getElementById('exportEndDate').valueAsDate = endDate;
        }
        
        async function performExport() {
            const startDateInput = document.getElementById('exportStartDate').value;
            const endDateInput = document.getElementById('exportEndDate').value;
            const selectedServiceIds = Array.from(
                document.querySelectorAll('.export-service-checkbox:checked')
            ).map(cb => cb.value);
            
            if (!startDateInput || !endDateInput) {
                alert('Please select both start and end dates.');
                return;
            }
            
            if (selectedServiceIds.length === 0) {
                alert('Please select at least one service.');
                return;
            }
            
            const startDate = new Date(startDateInput);
            const endDate = new Date(endDateInput);
            
            if (startDate > endDate) {
                alert('Start date must be before end date.');
                return;
            }
            
            const exportButton = document.getElementById('exportButton');
            exportButton.disabled = true;
            exportButton.textContent = 'Exporting...';
            
            try {
                // Fetch uptime data for all selected services
                const uptimeDataPromises = selectedServiceIds.map(serviceId =>
                    fetch(\`/api/uptime?serviceId=\${serviceId}\`)
                        .then(res => res.json())
                        .then(data => ({ serviceId, data }))
                );
                
                const allUptimeData = await Promise.all(uptimeDataPromises);
                
                // Generate CSV
                const csv = generateCSV(allUptimeData, startDate, endDate);
                
                // Download CSV
                downloadCSV(csv, \`uptime-export-\${startDateInput}-to-\${endDateInput}.csv\`);
                
                closeExportDialog();
            } catch (error) {
                console.error('Error exporting data:', error);
                alert('Failed to export data. Please try again.');
            } finally {
                exportButton.disabled = false;
                exportButton.textContent = 'Export CSV';
            }
        }
        
        function generateCSV(allUptimeData, startDate, endDate) {
            const rows = [];
            
            // Header
            rows.push(['Date', 'Service Name', 'Service ID', 'Group', 'Status', 'Uptime %', 'Total Checks', 'Up Checks', 'Degraded Checks', 'Down Checks', 'Unknown Checks']);
            
            // Data rows
            allUptimeData.forEach(({ serviceId, data }) => {
                const service = exportServices.find(s => s.id === serviceId);
                const serviceName = service?.name || serviceId;
                const groupName = service?.groupName || 'Ungrouped';
                
                // If no data or no historical days, create empty rows for the date range
                if (!data || !data.historicalDays || data.historicalDays.length === 0) {
                    // Generate empty rows for each day in the range
                    const currentDate = new Date(startDate);
                    while (currentDate <= endDate) {
                        rows.push([
                            currentDate.toISOString().split('T')[0],
                            serviceName,
                            serviceId,
                            groupName,
                            'No Data',
                            'N/A',
                            0,
                            0,
                            0,
                            0,
                            0
                        ]);
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                    return;
                }
                
                data.historicalDays.forEach(day => {
                    const dayDate = new Date(day.date);
                    if (dayDate >= startDate && dayDate <= endDate) {
                        const totalChecks = day.totalChecks || 0;
                        const upChecks = day.upChecks || 0;
                        const degradedChecks = day.degradedChecks || 0;
                        const downChecks = day.downChecks || 0;
                        const unknownChecks = day.unknownChecks || 0;
                        const uptime = totalChecks > 0 
                            ? ((upChecks + degradedChecks) / totalChecks * 100).toFixed(2)
                            : 'N/A';
                        
                        let status = 'No Data';
                        if (totalChecks > 0) {
                            if (downChecks > 0) status = 'Down';
                            else if (degradedChecks > 0) status = 'Degraded';
                            else if (upChecks > 0) status = 'Up';
                        }
                        
                        rows.push([
                            day.date,
                            serviceName,
                            serviceId,
                            groupName,
                            status,
                            uptime,
                            totalChecks,
                            upChecks,
                            degradedChecks,
                            downChecks,
                            unknownChecks
                        ]);
                    }
                });
            });
            
            // Convert to CSV string
            return rows.map(row => 
                row.map(cell => {
                    const cellStr = String(cell);
                    // Escape quotes and wrap in quotes if contains comma, quote, or newline
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\\n')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(',')
            ).join('\\n');
        }
        
        function downloadCSV(csvContent, filename) {
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
        }
    </script>
    
    <footer>
        <p>${uiConfig.footer.text}</p>
        ${uiConfig.footer.links && uiConfig.footer.links.length > 0 ? `
        <div class="footer-links">
            ${uiConfig.footer.links.map(link => `<a href="${link.url}" target="${link.url.startsWith('http') ? '_blank' : '_self'}" rel="${link.url.startsWith('http') ? 'noopener noreferrer' : ''}">${link.text}</a>`).join('')}
        </div>
        ` : ''}
        ${uiConfig.customHtml.footerExtra}
    </footer>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle get status API
 */
async function handleGetStatus(env) {
  const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
  const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { summary: null };
  const summary = monitorData.summary || null;

  return new Response(JSON.stringify({ summary }, null, 2), {
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

/**
 * Handle get uptime history API
 */
async function handleGetUptime(env, url) {
  const serviceId = url.searchParams.get('serviceId');
  
  if (!serviceId) {
    return new Response(JSON.stringify({ error: 'serviceId parameter required' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    // Get all monitor data in a single read
    const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
    const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { uptime: {} };
    const allUptimeData = monitorData.uptime || {};
    const serviceData = allUptimeData[serviceId] || { days: {} };

    // Fill in missing days with null data up to retention period
    const retentionDays = uiConfig.features.uptimeRetentionDays || 90;
    const today = new Date();
    const historicalDays = [];
    let totalChecksAll = 0;
    let upChecksAll = 0;
    let degradedChecksAll = 0;
    let unknownChecksAll = 0;

    for (let i = retentionDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = serviceData.days[dateStr];
      if (dayData) {
        historicalDays.push(dayData);
        totalChecksAll += dayData.totalChecks;
        upChecksAll += dayData.upChecks;
        degradedChecksAll += dayData.degradedChecks;
        unknownChecksAll += dayData.unknownChecks;
      } else {
        historicalDays.push({
          date: dateStr,
          totalChecks: 0,
          upChecks: 0,
          downChecks: 0,
          degradedChecks: 0,
          unknownChecks: 0,
          uptimePercentage: null
        });
      }
    }

    // Calculate overall uptime percentage for the period
    const knownChecksAll = totalChecksAll - unknownChecksAll;
    let overallUptime = 0;
    if (knownChecksAll > 0) {
      overallUptime = parseFloat(((upChecksAll + degradedChecksAll * 0.5) / knownChecksAll * 100).toFixed(2));
    }

    return new Response(JSON.stringify({
      serviceId: serviceId,
      days: historicalDays,
      overallUptime: overallUptime,
      totalDays: historicalDays.filter(d => d.totalChecks > 0).length,
      retentionDays: retentionDays
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

