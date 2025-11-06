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

  for (const service of servicesConfig.services) {
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
      timestamp: timestamp
    };

    results.push(result);
  }

  // Update summary and uptime in the single store
  await updateMonitorData(env, monitorData, results, timestamp);

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

      // Keep only last 90 days for this service
      const dates = Object.keys(serviceData.days).sort();
      if (dates.length > 90) {
        // Remove oldest days
        const daysToRemove = dates.slice(0, dates.length - 90);
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
                --bg-hover: #036358;
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
            height: 40px;
            margin-bottom: 8px;
        }
        
        .uptime-day {
            flex: 1;
            min-width: 3px;
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
                // Fallback: generate 90 days with dates but no data
                const today = new Date();
                let html = '';
                for (let i = 89; i >= 0; i--) {
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
                document.getElementById('services').innerHTML = '<div class="loading"><p>Loading uptime data...</p></div>';
                
                const servicesWithUptime = await Promise.all(summary.results.map(async (service) => {
                    try {
                        const uptimeData = await fetchUptimeData(service.serviceId);
                        return { service, uptimeData };
                    } catch (error) {
                        console.error(\`Error fetching uptime for \${service.serviceId}:\`, error);
                        return { service, uptimeData: null };
                    }
                }));
                
                const servicesHtml = servicesWithUptime.map(({ service, uptimeData }) => {
                    try {
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
                    } catch (error) {
                        console.error('Error rendering service:', service.serviceName, error);
                        return \`<div class="service-item"><div class="service-name">Error loading \${service.serviceName}</div></div>\`;
                    }
                }).join('');
                
                document.getElementById('services').innerHTML = servicesHtml;
                document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date(summary.timestamp).toLocaleString()}\`;
                
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
 * Handle get status API
 */
async function handleGetStatus(env) {
  const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
  const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { summary: null };
  const summary = monitorData.summary || null;

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
    // Get all monitor data in a single read
    const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
    const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { uptime: {} };
    const allUptimeData = monitorData.uptime || {};
    const serviceData = allUptimeData[serviceId] || { days: {} };

    // Fill in missing days with null data up to 90 days
    const today = new Date();
    const last90Days = [];
    let totalChecksAll = 0;
    let upChecksAll = 0;
    let degradedChecksAll = 0;
    let unknownChecksAll = 0;

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = serviceData.days[dateStr];
      if (dayData) {
        last90Days.push(dayData);
        totalChecksAll += dayData.totalChecks;
        upChecksAll += dayData.upChecks;
        degradedChecksAll += dayData.degradedChecks;
        unknownChecksAll += dayData.unknownChecks;
      } else {
        last90Days.push({
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

