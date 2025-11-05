import servicesConfig from '../services.json';

/**
 * Cloudflare Worker Heartbeat Monitor (Push-based)
 * Receives heartbeats from internal network services and monitors for staleness
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route handling
    if (url.pathname === '/') {
      return handleDashboard(env);
    } else if (url.pathname === '/api/heartbeat' && request.method === 'POST') {
      // Receive heartbeat from internal services
      return handleHeartbeat(request, env);
    } else if (url.pathname === '/api/logs') {
      return handleGetLogs(env, url);
    } else if (url.pathname === '/api/status') {
      return handleGetStatus(env);
    } else if (url.pathname === '/api/uptime') {
      return handleGetUptime(env, url);
    } else if (url.pathname === '/api/services') {
      // List configured services
      return new Response(JSON.stringify(servicesConfig.services, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });
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
    const service = servicesConfig.services.find(s => s.id === data.serviceId);
    if (!service) {
      return new Response(JSON.stringify({ error: 'Unknown serviceId' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate API key if configured
    if (service.apiKey) {
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== `Bearer ${service.apiKey}`) {
        return new Response(JSON.stringify({ error: 'Invalid API key' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const timestamp = new Date().toISOString();
    
    // Create heartbeat record
    const heartbeat = {
      serviceId: data.serviceId,
      serviceName: service.name,
      timestamp: timestamp,
      status: data.status || 'up',
      metadata: data.metadata || {},
      message: data.message || null
    };

    // Store heartbeat
    await storeHeartbeat(env, heartbeat);
    
    // Update latest heartbeat timestamp
    await env.HEARTBEAT_LOGS.put(`latest:${data.serviceId}`, timestamp);

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

  for (const service of servicesConfig.services) {
    if (!service.enabled) {
      continue;
    }

    // Get latest heartbeat timestamp
    const lastHeartbeatTime = await env.HEARTBEAT_LOGS.get(`latest:${service.id}`);
    
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
      timestamp: timestamp
    };

    results.push(result);

    // Store result in logs
    await storeHeartbeatLog(env, service.id, result);
  }

  // Store summary
  await storeSummary(env, results, timestamp);

  // Store daily uptime statistics
  await storeDailyUptime(env, results, timestamp);

  return results;
}

/**
 * Store individual heartbeat in KV
 */
async function storeHeartbeat(env, heartbeat) {
  const heartbeatKey = `heartbeats:${heartbeat.serviceId}`;
  
  try {
    // Get existing heartbeats
    const existingHeartbeatsJson = await env.HEARTBEAT_LOGS.get(heartbeatKey);
    let heartbeats = existingHeartbeatsJson ? JSON.parse(existingHeartbeatsJson) : [];

    // Add new heartbeat
    heartbeats.unshift(heartbeat);

    // Keep only the most recent entries
    const maxEntries = 100;
    if (heartbeats.length > maxEntries) {
      heartbeats = heartbeats.slice(0, maxEntries);
    }

    // Store back to KV
    await env.HEARTBEAT_LOGS.put(heartbeatKey, JSON.stringify(heartbeats));
  } catch (error) {
    console.error(`Error storing heartbeat for ${heartbeat.serviceId}:`, error);
  }
}

/**
 * Store heartbeat log in KV
 */
async function storeHeartbeatLog(env, serviceId, result) {
  const logKey = `logs:${serviceId}`;
  
  try {
    // Get existing logs
    const existingLogsJson = await env.HEARTBEAT_LOGS.get(logKey);
    let logs = existingLogsJson ? JSON.parse(existingLogsJson) : [];

    // Add new log entry
    logs.unshift(result);

    // Keep only the most recent entries (configurable via MAX_LOG_ENTRIES)
    const maxEntries = parseInt(env.MAX_LOG_ENTRIES) || 100;
    if (logs.length > maxEntries) {
      logs = logs.slice(0, maxEntries);
    }

    // Store back to KV
    await env.HEARTBEAT_LOGS.put(logKey, JSON.stringify(logs));
  } catch (error) {
    console.error(`Error storing log for ${serviceId}:`, error);
  }
}

/**
 * Store summary of all checks
 */
async function storeSummary(env, results, timestamp) {
  const summary = {
    timestamp: timestamp,
    totalServices: results.length,
    servicesUp: results.filter(r => r.status === 'up').length,
    servicesDegraded: results.filter(r => r.status === 'degraded').length,
    servicesDown: results.filter(r => r.status === 'down').length,
    servicesUnknown: results.filter(r => r.status === 'unknown').length,
    results: results
  };

  try {
    // Store latest summary
    await env.HEARTBEAT_LOGS.put('summary:latest', JSON.stringify(summary));

    // Store in history
    const summaryKey = `summary:history`;
    const existingHistoryJson = await env.HEARTBEAT_LOGS.get(summaryKey);
    let history = existingHistoryJson ? JSON.parse(existingHistoryJson) : [];

    history.unshift(summary);

    // Keep last 1000 summaries
    if (history.length > 1000) {
      history = history.slice(0, 1000);
    }

    await env.HEARTBEAT_LOGS.put(summaryKey, JSON.stringify(history));
  } catch (error) {
    console.error('Error storing summary:', error);
  }
}

/**
 * Store daily uptime statistics
 */
async function storeDailyUptime(env, results, timestamp) {
  const today = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD format

  for (const result of results) {
    const uptimeKey = `uptime:${result.serviceId}:${today}`;
    
    try {
      // Get existing data for today
      const existingDataJson = await env.HEARTBEAT_LOGS.get(uptimeKey);
      let dailyData = existingDataJson ? JSON.parse(existingDataJson) : {
        date: today,
        serviceId: result.serviceId,
        serviceName: result.serviceName,
        totalChecks: 0,
        upChecks: 0,
        downChecks: 0,
        degradedChecks: 0,
        unknownChecks: 0,
        uptimePercentage: 0
      };

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
        dailyData.uptimePercentage = ((dailyData.upChecks + dailyData.degradedChecks * 0.5) / knownChecks * 100).toFixed(2);
      }

      dailyData.lastUpdate = timestamp;

      // Store updated data
      await env.HEARTBEAT_LOGS.put(uptimeKey, JSON.stringify(dailyData));

      // Also update the service's uptime history index
      await updateUptimeHistory(env, result.serviceId, today);
    } catch (error) {
      console.error(`Error storing daily uptime for ${result.serviceId}:`, error);
    }
  }
}

/**
 * Update uptime history index for a service
 */
async function updateUptimeHistory(env, serviceId, date) {
  try {
    const historyKey = `uptime:${serviceId}:index`;
    const historyJson = await env.HEARTBEAT_LOGS.get(historyKey);
    let dates = historyJson ? JSON.parse(historyJson) : [];

    // Add date if not already present
    if (!dates.includes(date)) {
      dates.push(date);
      // Keep only last 90 days
      dates.sort();
      if (dates.length > 90) {
        dates = dates.slice(-90);
      }
      await env.HEARTBEAT_LOGS.put(historyKey, JSON.stringify(dates));
    }
  } catch (error) {
    console.error(`Error updating uptime history for ${serviceId}:`, error);
  }
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
    <title>Status Monitor</title>
    <style>
        :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --bg-hover: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #6b7280;
            --text-tertiary: #9ca3af;
            --border-color: #e5e7eb;
            --status-up: #10b981;
            --status-up-bg: #d1fae5;
            --status-up-text: #065f46;
            --status-down: #ef4444;
            --status-down-bg: #fee2e2;
            --status-down-text: #991b1b;
            --status-degraded: #f59e0b;
            --status-degraded-bg: #fed7aa;
            --status-degraded-text: #92400e;
            --status-unknown: #6b7280;
            --status-unknown-bg: #e5e7eb;
            --status-unknown-text: #374151;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --bg-primary: #111827;
                --bg-secondary: #1f2937;
                --bg-hover: #374151;
                --text-primary: #f9fafb;
                --text-secondary: #d1d5db;
                --text-tertiary: #9ca3af;
                --border-color: #374151;
                --status-up-bg: #064e3b;
                --status-up-text: #6ee7b7;
                --status-down-bg: #7f1d1d;
                --status-down-text: #fca5a5;
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
        }
        
        .services-header {
            padding: 24px 32px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .services-title {
            font-size: 20px;
            font-weight: 600;
            color: var(--text-primary);
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
            font-weight: 500;
            color: var(--text-secondary);
        }
        
        .uptime-bar-container {
            margin-bottom: 12px;
        }
        
        .uptime-bar {
            display: flex;
            gap: 2px;
            height: 32px;
            margin-bottom: 8px;
        }
        
        .uptime-day {
            flex: 1;
            background: var(--status-up);
            border-radius: 2px;
            transition: opacity 0.2s ease;
            position: relative;
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
            opacity: 0.8;
            cursor: pointer;
            transform: scaleY(1.1);
        }
        
        .uptime-day[title] {
            white-space: pre-line;
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
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Service Status</h1>
            <p class="subtitle">Real-time monitoring dashboard</p>
        </header>
        
        <div class="overall-status" id="overallStatus">
            <div class="loading-spinner"></div>
            <div class="status-text">
                <div class="status-title">Loading status...</div>
            </div>
        </div>

        <div class="stats-grid" id="statsGrid" style="display: none;"></div>
        
        <div class="services-container">
            <div class="services-header">
                <div class="services-title">Services</div>
            </div>
            <div id="services">
                <div class="loading">
                    <div class="loading-spinner"></div>
                    <p>Loading services...</p>
                </div>
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
    
    <script>
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

        function generateUptimeBar(uptimeData) {
            if (!uptimeData || !uptimeData.days) {
                // Fallback to empty bars if no data
                let html = '';
                for (let i = 0; i < 90; i++) {
                    html += \`<div class="uptime-day unknown" title="No data"></div>\`;
                }
                return html;
            }

            let html = '';
            uptimeData.days.forEach(day => {
                let dayStatus = 'unknown';
                let tooltipText = \`\${formatDate(day.date)}: No data\`;
                
                if (day.totalChecks > 0) {
                    const uptimePercent = parseFloat(day.uptimePercentage);
                    if (uptimePercent >= 99) {
                        dayStatus = 'up';
                    } else if (uptimePercent >= 90) {
                        dayStatus = 'degraded';
                    } else if (uptimePercent >= 0) {
                        dayStatus = 'down';
                    }
                    tooltipText = \`\${formatDate(day.date)}\\nUptime: \${day.uptimePercentage}%\\nChecks: \${day.totalChecks} (↑\${day.upChecks} ↓\${day.downChecks})\`;
                }
                
                html += \`<div class="uptime-day \${dayStatus}" title="\${tooltipText}"></div>\`;
            });
            
            return html;
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
                const data = await response.json();
                
                if (!data.summary) {
                    document.getElementById('overallStatus').innerHTML = \`
                        <div class="status-indicator unknown"></div>
                        <div class="status-text">
                            <div class="status-title">No data available</div>
                            <div class="status-description">Waiting for first status check...</div>
                        </div>
                    \`;
                    document.getElementById('services').innerHTML = '<div class="loading"><p>No services data yet</p></div>';
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
                document.getElementById('services').innerHTML = '<div class="loading"><p>Loading uptime data...</p></div>';
                
                const servicesWithUptime = await Promise.all(summary.results.map(async (service) => {
                    const uptimeData = await fetchUptimeData(service.serviceId);
                    return { service, uptimeData };
                }));
                
                const servicesHtml = servicesWithUptime.map(({ service, uptimeData }) => {
                    const icon = service.status === 'up' ? '✓' : (service.status === 'down' ? '✕' : '●');
                    const timeSince = service.lastSeen ? formatDuration(Date.now() - new Date(service.lastSeen).getTime()) : 'Never';
                    const uptime = uptimeData && uptimeData.overallUptime > 0 ? \`\${uptimeData.overallUptime}%\` : 'N/A';
                    
                    return \`
                    <div class="service-item">
                        <div class="service-main">
                            <div class="service-status-icon \${service.status}">\${icon}</div>
                            <div class="service-name">\${service.serviceName}</div>
                            <div class="service-uptime">\${uptime}</div>
                        </div>
                        <div class="uptime-bar-container">
                            <div class="uptime-bar">
                                \${generateUptimeBar(uptimeData)}
                            </div>
                            <div class="uptime-labels">
                                <span>90 days ago</span>
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
                                <span>\${uptimeData.totalDays}/90</span>
                            </div>
                            \` : ''}
                        </div>
                    </div>
                    \`;
                }).join('');
                
                document.getElementById('services').innerHTML = servicesHtml;
                document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date(summary.timestamp).toLocaleString()}\`;
                
            } catch (error) {
                console.error('Error loading status:', error);
                document.getElementById('overallStatus').innerHTML = \`
                    <div class="status-indicator issues"></div>
                    <div class="status-text">
                        <div class="status-title">Error loading data</div>
                        <div class="status-description">Failed to fetch status information</div>
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
        
        // Load status on page load
        loadStatus();
        
        // Auto-refresh every 30 seconds
        setInterval(loadStatus, 30000);
    </script>
</body>
</html>
  `;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' }
  });
}

/**
 * Handle get logs API
 */
async function handleGetLogs(env, url) {
  const serviceId = url.searchParams.get('serviceId');
  
  if (!serviceId) {
    return new Response(JSON.stringify({ error: 'serviceId parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const logKey = `logs:${serviceId}`;
  const logsJson = await env.HEARTBEAT_LOGS.get(logKey);
  const logs = logsJson ? JSON.parse(logsJson) : [];

  return new Response(JSON.stringify(logs, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Handle get status API
 */
async function handleGetStatus(env) {
  const summaryJson = await env.HEARTBEAT_LOGS.get('summary:latest');
  const summary = summaryJson ? JSON.parse(summaryJson) : null;

  return new Response(JSON.stringify({ summary }, null, 2), {
    headers: { 'Content-Type': 'application/json' }
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
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Get the list of dates for this service
    const historyKey = `uptime:${serviceId}:index`;
    const historyJson = await env.HEARTBEAT_LOGS.get(historyKey);
    const dates = historyJson ? JSON.parse(historyJson) : [];

    // Fetch uptime data for all dates
    const uptimeData = [];
    for (const date of dates) {
      const uptimeKey = `uptime:${serviceId}:${date}`;
      const dataJson = await env.HEARTBEAT_LOGS.get(uptimeKey);
      if (dataJson) {
        uptimeData.push(JSON.parse(dataJson));
      }
    }

    // Fill in missing days with null data up to 90 days
    const today = new Date();
    const last90Days = [];
    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const existingData = uptimeData.find(d => d.date === dateStr);
      if (existingData) {
        last90Days.push(existingData);
      } else {
        last90Days.push({
          date: dateStr,
          serviceId: serviceId,
          totalChecks: 0,
          upChecks: 0,
          downChecks: 0,
          degradedChecks: 0,
          unknownChecks: 0,
          uptimePercentage: null,
          status: 'no-data'
        });
      }
    }

    // Calculate overall uptime percentage for the period
    const totalChecksAll = uptimeData.reduce((sum, d) => sum + d.totalChecks, 0);
    const upChecksAll = uptimeData.reduce((sum, d) => sum + d.upChecks, 0);
    const degradedChecksAll = uptimeData.reduce((sum, d) => sum + d.degradedChecks, 0);
    const unknownChecksAll = uptimeData.reduce((sum, d) => sum + d.unknownChecks, 0);
    const knownChecksAll = totalChecksAll - unknownChecksAll;
    
    let overallUptime = 0;
    if (knownChecksAll > 0) {
      overallUptime = ((upChecksAll + degradedChecksAll * 0.5) / knownChecksAll * 100).toFixed(2);
    }

    return new Response(JSON.stringify({
      serviceId: serviceId,
      days: last90Days,
      overallUptime: overallUptime,
      totalDays: last90Days.filter(d => d.totalChecks > 0).length
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching uptime data:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

