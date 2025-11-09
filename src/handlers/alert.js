/**
 * Alert API Handler
 * Handles alert-related API endpoints
 */

/**
 * Clean up old alerts based on configuration
 */
export function cleanupAlerts(alerts, config = {}) {
  // Default settings
  const maxAlerts = config.maxAlerts || 100;
  const maxAgeDays = config.maxAgeDays || 7;
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  
  let cleaned = alerts;
  
  // Remove alerts older than maxAgeDays
  cleaned = cleaned.filter(alert => {
    const alertTime = new Date(alert.timestamp).getTime();
    const age = now - alertTime;
    return age < maxAgeMs;
  });
  
  // Keep only last maxAlerts
  if (cleaned.length > maxAlerts) {
    cleaned = cleaned.slice(0, maxAlerts);
  }
  
  return cleaned;
}

/**
 * Store a recent alert for dashboard display
 */
export async function storeRecentAlert(env, alertData) {
  const timestamp = new Date().toISOString();
  const alertId = `alert:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  
  // Create alert record
  const alert = {
    id: alertId,
    title: alertData.title,
    message: alertData.message,
    severity: alertData.severity || 'warning',
    source: alertData.source || 'external',
    timestamp: timestamp,
    read: false
  };
  
  // Get existing alerts
  const alertsJson = await env.HEARTBEAT_LOGS.get('recent:alerts');
  let alerts = alertsJson ? JSON.parse(alertsJson) : [];
  
  // Add new alert at the beginning
  alerts.unshift(alert);
  
  // Load notification config for alert history settings
  const notificationsConfig = (await import('../../config/notifications.json')).default;
  const historyConfig = notificationsConfig?.settings?.alertHistory || {};
  
  // Clean up old/excess alerts if enabled
  if (historyConfig.cleanupOnAdd !== false) {
    alerts = cleanupAlerts(alerts, historyConfig);
  }
  
  // Store back
  await env.HEARTBEAT_LOGS.put('recent:alerts', JSON.stringify(alerts));
  
  console.log(`Stored alert for dashboard: ${alertData.title} (total: ${alerts.length})`);
}

/**
 * Get recent alerts
 */
export async function handleGetRecentAlerts(env, url) {
  try {
    const since = url.searchParams.get('since'); // Optional: get alerts since timestamp
    const limit = parseInt(url.searchParams.get('limit') || '20');
    
    // Get alerts from KV
    const alertsJson = await env.HEARTBEAT_LOGS.get('recent:alerts');
    let alerts = alertsJson ? JSON.parse(alertsJson) : [];
    
    // Filter by 'since' timestamp if provided
    if (since) {
      alerts = alerts.filter(alert => alert.timestamp > since);
    }
    
    // Limit results
    alerts = alerts.slice(0, limit);
    
    return new Response(JSON.stringify({
      success: true,
      alerts: alerts,
      count: alerts.length
    }, null, 2), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching recent alerts:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      alerts: [],
      count: 0
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
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
 * Handle custom alert from external tools (Alertmanager, Grafana, etc.)
 */
export async function handleCustomAlert(env, request) {
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
    const { sendCustomAlert } = await import('../core/notifications.js');
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

    // Store alert for dashboard notifications
    try {
      await storeRecentAlert(env, alertData);
    } catch (error) {
      console.error('Error storing alert for dashboard:', error);
      // Don't fail the request if storage fails
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

