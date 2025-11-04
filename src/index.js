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
 * Handle dashboard page
 */
async function handleDashboard(env) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Heartbeat Monitor Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        header {
            background: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .subtitle {
            color: #666;
            font-size: 14px;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        
        .summary-card .value {
            font-size: 32px;
            font-weight: bold;
        }
        
        .value.up { color: #10b981; }
        .value.degraded { color: #f59e0b; }
        .value.down { color: #ef4444; }
        .value.unknown { color: #6b7280; }
        
        .services {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .service-item {
            padding: 20px;
            border-left: 4px solid #ddd;
            margin-bottom: 15px;
            background: #f9fafb;
            border-radius: 5px;
        }
        
        .service-item.up { border-left-color: #10b981; }
        .service-item.degraded { border-left-color: #f59e0b; }
        .service-item.down { border-left-color: #ef4444; }
        .service-item.unknown { border-left-color: #6b7280; }
        
        .service-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        
        .service-name {
            font-size: 18px;
            font-weight: 600;
            color: #333;
        }
        
        .status-badge {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-badge.up {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-badge.degraded {
            background: #fed7aa;
            color: #92400e;
        }
        
        .status-badge.down {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .status-badge.unknown {
            background: #e5e7eb;
            color: #374151;
        }
        
        .service-details {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            font-size: 14px;
            color: #666;
        }
        
        .detail-item {
            display: flex;
            flex-direction: column;
        }
        
        .detail-label {
            font-weight: 600;
            margin-bottom: 3px;
        }
        
        .loading {
            text-align: center;
            padding: 50px;
            color: white;
            font-size: 18px;
        }
        
        .refresh-btn {
            background: #667eea;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 20px;
        }
        
        .refresh-btn:hover {
            background: #5568d3;
        }
        
        .last-update {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🔍 Heartbeat Monitor Dashboard</h1>
            <p class="subtitle">Real-time monitoring of internal network services</p>
            <div class="last-update" id="lastUpdate"></div>
        </header>
        
        <button class="refresh-btn" onclick="loadStatus()">🔄 Refresh Now</button>
        
        <div class="summary" id="summary">
            <div class="loading">Loading status...</div>
        </div>
        
        <div class="services" id="services"></div>
    </div>
    
    <script>
        function formatDuration(ms) {
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return \`\${days}d \${hours % 24}h\`;
            if (hours > 0) return \`\${hours}h \${minutes % 60}m\`;
            if (minutes > 0) return \`\${minutes}m \${seconds % 60}s\`;
            return \`\${seconds}s\`;
        }
        
        async function loadStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                if (!data.summary) {
                    document.getElementById('summary').innerHTML = '<div class="loading">No data available yet. Waiting for first check...</div>';
                    return;
                }
                
                // Update summary
                const summaryHtml = \`
                    <div class="summary-card">
                        <h3>Total Services</h3>
                        <div class="value">\${data.summary.totalServices}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Services Up</h3>
                        <div class="value up">\${data.summary.servicesUp}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Degraded</h3>
                        <div class="value degraded">\${data.summary.servicesDegraded}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Services Down</h3>
                        <div class="value down">\${data.summary.servicesDown}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Unknown</h3>
                        <div class="value unknown">\${data.summary.servicesUnknown || 0}</div>
                    </div>
                \`;
                document.getElementById('summary').innerHTML = summaryHtml;
                
                // Update services
                const servicesHtml = data.summary.results.map(service => {
                    const timeSince = service.timeSinceLastHeartbeat ? 
                        formatDuration(service.timeSinceLastHeartbeat) : 'Never';
                    const lastSeenDate = service.lastSeen ? 
                        new Date(service.lastSeen).toLocaleString() : 'Never';
                    
                    return \`
                    <div class="service-item \${service.status}">
                        <div class="service-header">
                            <div class="service-name">\${service.serviceName}</div>
                            <span class="status-badge \${service.status}">\${service.status}</span>
                        </div>
                        <div class="service-details">
                            <div class="detail-item">
                                <span class="detail-label">Service ID</span>
                                <span>\${service.serviceId}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Last Heartbeat</span>
                                <span>\${lastSeenDate}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Time Since</span>
                                <span>\${timeSince}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Staleness Threshold</span>
                                <span>\${formatDuration(service.stalenessThreshold)}</span>
                            </div>
                        </div>
                    </div>
                    \`;
                }).join('');
                
                document.getElementById('services').innerHTML = servicesHtml;
                document.getElementById('lastUpdate').textContent = \`Last updated: \${new Date(data.summary.timestamp).toLocaleString()}\`;
                
            } catch (error) {
                console.error('Error loading status:', error);
                document.getElementById('summary').innerHTML = '<div class="loading">Error loading data</div>';
            }
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

