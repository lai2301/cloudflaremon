/**
 * Cloudflare Worker Heartbeat Monitor (Push-based)
 * Modular architecture with clear separation of concerns
 */

// Configuration
import { uiConfig, servicesWithGroups } from './config/loader.js';

// Handlers
import { handleHeartbeat } from './handlers/heartbeat.js';
import { handleCustomAlert, handleGetRecentAlerts } from './handlers/alert.js';
import { handleGetStatus } from './handlers/status.js';
import { handleGetUptime } from './handlers/uptime.js';
import { handleDashboard } from './handlers/dashboard/index.js';

// Core
import { checkHeartbeatStaleness } from './core/monitoring.js';
import { corsHeaders } from './core/cors.js';

// Notifications
import { testNotification } from './core/notifications.js';

// Use cached config values from module init
const processedServices = servicesWithGroups;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders(request),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    try {
      // API Routes (using imported handlers from modules)
      // Check if API endpoints are enabled in settings
      
      if (url.pathname === '/api/heartbeat' && request.method === 'POST') {
        if (uiConfig.api?.enableHeartbeatEndpoint !== false) {
          return await handleHeartbeat(request, env);
        }
        return new Response(JSON.stringify({ error: 'Heartbeat API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/alert' && request.method === 'POST') {
        if (uiConfig.api?.enableAlertEndpoint !== false) {
          return await handleCustomAlert(env, request);
        }
        return new Response(JSON.stringify({ error: 'Alert API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/alerts/recent' && request.method === 'GET') {
        if (uiConfig.api?.enableAlertHistoryEndpoint !== false) {
          return await handleGetRecentAlerts(env, url, uiConfig, request);
        }
        return new Response(JSON.stringify({ error: 'Alert history API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/status' && request.method === 'GET') {
        if (uiConfig.api?.enableStatusEndpoint !== false) {
          return await handleGetStatus(env, request);
        }
        return new Response(JSON.stringify({ error: 'Status API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/uptime' && request.method === 'GET') {
        if (uiConfig.api?.enableUptimeEndpoint !== false) {
          return await handleGetUptime(env, url, request);
        }
        return new Response(JSON.stringify({ error: 'Uptime API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/test-notification' && request.method === 'POST') {
        // Test notification is enabled for debugging only
        if (uiConfig.api?.enableTestNotificationEndpoint !== false) {
          return await testNotification(env, request);
        }
        return new Response(JSON.stringify({ error: 'Test notification API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/services' && request.method === 'GET') {
        if (uiConfig.api?.enableServicesEndpoint !== false) {
          return new Response(JSON.stringify(processedServices, null, 2), {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders(request),
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type'
            }
          });
        }
        return new Response(JSON.stringify({ error: 'Services API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Default: Dashboard
      if (url.pathname === '/' || url.pathname === '') {
        return await handleDashboard(env);
      }

      return new Response('Not Found', { status: 404 });
      
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      console.log('Cron trigger: Starting heartbeat staleness check...', new Date(event.scheduledTime).toISOString());
      
      // Check all services for staleness (now using imported function from core/monitoring.js)
      await checkHeartbeatStaleness(env);
      
      console.log('Cron trigger: Completed successfully');
    } catch (error) {
      console.error('Error in cron trigger:', error);
      throw error; // Re-throw to mark cron execution as failed
    }
  }
};
