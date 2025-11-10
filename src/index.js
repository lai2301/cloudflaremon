/**
 * Cloudflare Worker Heartbeat Monitor (Push-based)
 * Modular architecture with clear separation of concerns
 */

// Configuration
import { getUiConfig, buildServicesWithGroups } from './config/loader.js';

// Handlers
import { handleHeartbeat } from './handlers/heartbeat.js';
import { handleCustomAlert, handleGetRecentAlerts } from './handlers/alert.js';
import { handleGetStatus } from './handlers/status.js';
import { handleGetUptime } from './handlers/uptime.js';

// Core
import { checkHeartbeatStaleness } from './core/monitoring.js';

// Notifications
import { testNotification } from './core/notifications.js';

// Get UI config for dashboard
const uiConfig = getUiConfig();

/**
 * REMOVED: Functions now in modules
 * - buildServicesWithGroups() → config/loader.js
 * - handleHeartbeat() → handlers/heartbeat.js
 * - handleCustomAlert(), handleGetRecentAlerts(), storeRecentAlert(), cleanupAlerts() → handlers/alert.js
 * - handleGetStatus() → handlers/status.js
 * - handleGetUptime() → handlers/uptime.js
 * - checkHeartbeatStaleness(), updateMonitorData() → core/monitoring.js
 */

// Build the merged services list (now imported from config/loader.js)
const processedServices = buildServicesWithGroups();

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
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
          return await handleGetRecentAlerts(env, url, uiConfig);
        }
        return new Response(JSON.stringify({ error: 'Alert history API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/status' && request.method === 'GET') {
        if (uiConfig.api?.enableStatusEndpoint !== false) {
          return await handleGetStatus(env);
        }
        return new Response(JSON.stringify({ error: 'Status API is disabled' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      if (url.pathname === '/api/uptime' && request.method === 'GET') {
        if (uiConfig.api?.enableUptimeEndpoint !== false) {
          return await handleGetUptime(env, url);
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
              'Access-Control-Allow-Origin': '*',
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
        error: 'Internal server error',
        message: error.message 
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

/*
 * ============================================================================
 * FUNCTIONS EXTRACTED TO MODULES
 * ============================================================================
 * The following functions have been moved to separate modules for better
 * organization and maintainability:
 * 
 * - handleHeartbeat() → src/handlers/heartbeat.js
 * - checkHeartbeatStaleness() → src/core/monitoring.js
 * - updateMonitorData() → src/core/monitoring.js
 * - storeRecentAlert() → src/handlers/alert.js
 * - cleanupAlerts() → src/handlers/alert.js
 * - handleCustomAlert() → src/handlers/alert.js
 * - handleGetRecentAlerts() → src/handlers/alert.js
 * - parseAlertmanagerPayload() → src/handlers/alert.js
 * - parseGrafanaPayload() → src/handlers/alert.js
 * - handleGetStatus() → src/handlers/status.js
 * - handleGetUptime() → src/handlers/uptime.js
 * 
 * All functions are imported at the top of this file and used in the
 * export default routing above.
 * ============================================================================
 */

/**
 * Dashboard Handler
 * All API handlers have been moved to separate modules (see imports above)
 * This file now contains only routing and the dashboard HTML generation
 */

/**
 * Handle dashboard page
 * Embeds monitor data directly to avoid API calls and caching issues
 */
async function handleDashboard(env) {
  // Fetch monitor data directly from KV
  const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
  const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : {
    latest: {},
    uptime: {},
    summary: null
  };
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
    <meta http-equiv="Pragma" content="no-cache">
    <meta http-equiv="Expires" content="0">
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
        
        .theme-toggle, .export-btn, .auto-refresh-btn, .alert-history-btn {
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
            position: relative;
        }
        
        .theme-toggle:hover, .export-btn:hover, .auto-refresh-btn:hover, .alert-history-btn:hover {
            background: var(--bg-hover);
            transform: scale(1.05);
        }
        
        .auto-refresh-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #163d92;
        }
        
        .auto-refresh-btn.active:hover {
            background:#163d92;
        }
        
        .auto-refresh-timer {
            position: absolute;
            bottom: -2px;
            right: -2px;
            background: #10b981;
            color: white;
            font-size: 9px;
            font-weight: 600;
            padding: 2px 4px;
            border-radius: 4px;
            min-width: 18px;
            text-align: center;
        }
        
        /* Auto-refresh dropdown menu */
        .auto-refresh-menu {
            display: none;
            position: absolute;
            top: 52px;
            right: 0;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px;
            min-width: 180px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideDown 0.2s ease-out;
        }
        
        .auto-refresh-menu.show {
            display: block;
        }
        
        .auto-refresh-menu-item {
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            color: var(--text-primary);
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background 0.2s;
        }
        
        .auto-refresh-menu-item:hover {
            background: var(--bg-hover);
        }
        
        .auto-refresh-menu-item.active {
            background: #3b82f620;
            color: #3b82f6;
            font-weight: 500;
        }
        
        .auto-refresh-menu-item.active::after {
            content: '✓';
            margin-left: 8px;
        }
        
        .auto-refresh-menu-divider {
            height: 1px;
            background: var(--border-color);
            margin: 8px 0;
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
        
        /* Alert Toast Notifications */
        .alert-toast-container {
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 10001;
            display: flex;
            flex-direction: column;
            gap: 12px;
            max-width: 400px;
        }
        
        .alert-toast {
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease-out;
            position: relative;
            display: flex;
            gap: 12px;
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .alert-toast.closing {
            animation: slideOutRight 0.3s ease-out forwards;
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .alert-toast-icon {
            font-size: 24px;
            flex-shrink: 0;
            line-height: 1;
        }
        
        .alert-toast-content {
            flex: 1;
            min-width: 0;
        }
        
        .alert-toast-title {
            font-weight: 600;
            font-size: 14px;
            margin-bottom: 4px;
            color: var(--text-primary);
        }
        
        .alert-toast-message {
            font-size: 13px;
            color: var(--text-secondary);
            word-wrap: break-word;
        }
        
        .alert-toast-time {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-top: 4px;
        }
        
        .alert-toast-close {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 18px;
            line-height: 1;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s;
        }
        
        .alert-toast-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .alert-toast.severity-critical {
            border-left: 4px solid #ef4444;
        }
        
        .alert-toast.severity-warning {
            border-left: 4px solid #f59e0b;
        }
        
        .alert-toast.severity-info {
            border-left: 4px solid #3b82f6;
        }
        
        /* Alert History Modal */
        .alert-history-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            align-items: center;
            justify-content: center;
        }
        
        .alert-history-modal.active {
            display: flex;
        }
        
        .alert-history-content {
            background: var(--bg-primary);
            border-radius: 12px;
            max-width: 900px;
            width: 90%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        
        .alert-history-header {
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .alert-history-header h2 {
            margin: 0;
            font-size: 20px;
            color: var(--text-primary);
        }
        
        .alert-history-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: var(--text-secondary);
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .alert-history-close:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .alert-history-filters {
            padding: 16px 24px;
            border-bottom: 1px solid var(--border-color);
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }
        
        .filter-btn {
            padding: 6px 12px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
            color: var(--text-primary);
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        
        .filter-btn:hover {
            background: var(--bg-hover);
        }
        
        .filter-btn.active {
            background: #3b82f6;
            color: white;
            border-color: #3b82f6;
        }
        
        .alert-history-body {
            padding: 16px 24px;
            overflow-y: auto;
            flex: 1;
        }
        
        .alert-history-item {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid #6b7280;
            transition: all 0.2s;
        }
        
        .alert-history-item:hover {
            transform: translateX(4px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .alert-history-item.severity-critical {
            border-left-color: #ef4444;
        }
        
        .alert-history-item.severity-warning {
            border-left-color: #f59e0b;
        }
        
        .alert-history-item.severity-info {
            border-left-color: #3b82f6;
        }
        
        .alert-history-item-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .alert-history-item-title {
            font-weight: 600;
            color: var(--text-primary);
            font-size: 15px;
            flex: 1;
        }
        
        .alert-history-item-badge {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            margin-left: 12px;
        }
        
        .alert-history-item-badge.critical {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .alert-history-item-badge.warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .alert-history-item-badge.info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        [data-theme="dark"] .alert-history-item-badge.critical {
            background: #7f1d1d;
            color: #fecaca;
        }
        
        [data-theme="dark"] .alert-history-item-badge.warning {
            background: #78350f;
            color: #fde68a;
        }
        
        [data-theme="dark"] .alert-history-item-badge.info {
            background: #1e3a8a;
            color: #bfdbfe;
        }
        
        .alert-history-item-message {
            color: var(--text-secondary);
            font-size: 14px;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        
        .alert-history-item-footer {
            display: flex;
            gap: 16px;
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .alert-history-item-source {
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .alert-history-empty {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-secondary);
        }
        
        .alert-history-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
        }
        
        @media (max-width: 768px) {
            .alert-toast-container {
                left: 20px;
                right: 20px;
                max-width: none;
            }
            
            .alert-history-content {
                width: 95%;
                max-height: 90vh;
            }
            
            .alert-history-filters {
                flex-direction: column;
            }
            
            .filter-btn {
                width: 100%;
            }
        }
        
        /* Custom CSS from config */
        ${uiConfig.customCss}
    </style>
</head>
<body>
    <!-- Alert Toast Container -->
    <div class="alert-toast-container" id="alertToastContainer"></div>
    
    <!-- Alert History Modal -->
    <div class="alert-history-modal" id="alertHistoryModal">
        <div class="alert-history-content">
            <div class="alert-history-header">
                <h2>📋 Alert History</h2>
                <button class="alert-history-close" onclick="closeAlertHistory()" aria-label="Close">×</button>
            </div>
            <div class="alert-history-filters">
                <button class="filter-btn active" data-filter="all" onclick="filterAlerts('all')">All</button>
                <button class="filter-btn" data-filter="critical" onclick="filterAlerts('critical')">🚨 Critical</button>
                <button class="filter-btn" data-filter="warning" onclick="filterAlerts('warning')">⚠️ Warning</button>
                <button class="filter-btn" data-filter="info" onclick="filterAlerts('info')">ℹ️ Info</button>
                <button class="filter-btn" data-filter="heartbeat-monitor" onclick="filterAlerts('heartbeat-monitor')">💓 Service Status</button>
                <button class="filter-btn" data-filter="external" onclick="filterAlerts('external')">📡 External</button>
            </div>
            <div class="alert-history-body" id="alertHistoryBody">
                <div class="alert-history-empty">
                    <div class="alert-history-empty-icon">📭</div>
                    <div>Loading alerts...</div>
                </div>
            </div>
        </div>
    </div>
    
    <div class="container">
        ${uiConfig.theme.showToggle || uiConfig.features.showExportButton !== false || uiConfig.features.showAlertHistoryButton !== false ? `
        <div class="theme-toggle-container">
            ${uiConfig.features.showExportButton !== false && uiConfig.api?.enableUptimeEndpoint !== false ? `
            <button class="export-btn" id="exportBtn" aria-label="Export data" title="Export CSV">
                <span>📊</span>
            </button>
            ` : ''}
            ${uiConfig.features.showAlertHistoryButton !== false && uiConfig.api?.enableAlertHistoryEndpoint !== false ? `
            <button class="alert-history-btn" id="alertHistoryBtn" aria-label="Alert history" title="Alert History">
                <span>🔔</span>
            </button>
            ` : ''}
            ${uiConfig.features.showRefreshButton !== false && (uiConfig.api?.enableStatusEndpoint !== false || uiConfig.api?.enableUptimeEndpoint !== false) ? `
            <button class="auto-refresh-btn" id="autoRefreshBtn" aria-label="Toggle auto-refresh" title="Auto-refresh">
                <span id="autoRefreshIcon">🔄</span>
                <span class="auto-refresh-timer" id="autoRefreshTimer" style="display: none;"></span>
            </button>
            ` : ''}
            <div class="auto-refresh-menu" id="autoRefreshMenu">
                <div class="auto-refresh-menu-item" data-seconds="0">
                    <span>Off</span>
                </div>
                <div class="auto-refresh-menu-divider"></div>
                <div class="auto-refresh-menu-item" data-seconds="10">
                    <span>10 seconds</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="30">
                    <span>30 seconds</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="60">
                    <span>1 minute</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="300">
                    <span>5 minutes</span>
                </div>
                <div class="auto-refresh-menu-item" data-seconds="600">
                    <span>10 minutes</span>
                </div>
            </div>
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
            ${uiConfig.features.showRefreshButton !== false && (uiConfig.api?.enableStatusEndpoint !== false || uiConfig.api?.enableUptimeEndpoint !== false) ? `
            <button class="refresh-btn" onclick="refreshStatus()">
                <span>↻</span>
                <span>Refresh</span>
            </button>
            ` : ''}
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
        // Embedded services configuration (avoids API call if Cloudflare Access is enabled)
        const SERVICES_CONFIG = ${JSON.stringify(processedServices)};
        
        // Embedded monitor data (eliminates API calls and caching issues)
        const EMBEDDED_MONITOR_DATA = ${JSON.stringify(monitorData)};
        
        // Alert notification configuration
        const ALERT_NOTIFICATION_CONFIG = ${JSON.stringify(uiConfig.alertNotifications)};
        
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
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
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
            
            // Check if embedded data has uptime for this service
            if (typeof EMBEDDED_MONITOR_DATA !== 'undefined' && EMBEDDED_MONITOR_DATA && EMBEDDED_MONITOR_DATA.uptime && EMBEDDED_MONITOR_DATA.uptime[serviceId]) {
                const serviceUptime = EMBEDDED_MONITOR_DATA.uptime[serviceId];
                const existingDays = serviceUptime.days || {};
                
                // Fill in missing days up to retention period (same as API does)
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
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
                    
                    const dayData = existingDays[dateStr];
                    if (dayData) {
                        historicalDays.push(dayData);
                        totalChecksAll += dayData.totalChecks || 0;
                        upChecksAll += dayData.upChecks || 0;
                        degradedChecksAll += dayData.degradedChecks || 0;
                        unknownChecksAll += dayData.unknownChecks || 0;
                    } else {
                        // Fill in missing days with empty data
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
                
                // Calculate overall uptime
                const knownChecksAll = totalChecksAll - unknownChecksAll;
                const overallUptime = knownChecksAll > 0 
                    ? parseFloat(((upChecksAll + degradedChecksAll * 0.5) / knownChecksAll * 100).toFixed(2))
                    : 0;
                
                const data = {
                    serviceId: serviceId,
                    days: historicalDays,
                    overallUptime: overallUptime,
                    totalDays: historicalDays.filter(d => d.totalChecks > 0).length,
                    retentionDays: retentionDays
                };
                
                uptimeCache[serviceId] = data;
                return data;
            }
            
            // Fallback to API if embedded data not available
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
                // Use embedded data if available (initial page load), otherwise fetch from API (refresh)
                let data;
                if (typeof EMBEDDED_MONITOR_DATA !== 'undefined' && EMBEDDED_MONITOR_DATA && EMBEDDED_MONITOR_DATA.summary) {
                    data = { summary: EMBEDDED_MONITOR_DATA.summary };
                    //console.log('Using embedded monitor data (no API call needed)');
                } else {
                    const response = await fetch('/api/status');
                    if (!response.ok) {
                        throw new Error(\`HTTP error! status: \${response.status}\`);
                    }
                    data = await response.json();
                    console.log('Fetched fresh data from API');
                }
                
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
                                    <span>\${uptimeData?.retentionDays || ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90}} days ago</span>
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
                                    <span>\${uptimeData.totalDays}/\${uptimeData.retentionDays || ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90}}</span>
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
        
        // Auto-refresh functionality
        const AUTO_REFRESH_KEY = 'auto-refresh-interval';
        const DEFAULT_REFRESH_SECONDS = ${uiConfig.features.autoRefreshSeconds || 0};
        let autoRefreshInterval = null;
        let autoRefreshCountdown = null;
        let autoRefreshSecondsLeft = 0;
        
        function getAutoRefreshInterval() {
            const stored = localStorage.getItem(AUTO_REFRESH_KEY);
            return stored !== null ? parseInt(stored) : DEFAULT_REFRESH_SECONDS;
        }
        
        function setAutoRefreshInterval(seconds) {
            localStorage.setItem(AUTO_REFRESH_KEY, seconds.toString());
            startAutoRefresh(seconds);
            updateAutoRefreshUI(seconds);
        }
        
        function startAutoRefresh(seconds) {
            // Clear existing intervals
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            if (autoRefreshCountdown) clearInterval(autoRefreshCountdown);
            
            const btn = document.getElementById('autoRefreshBtn');
            const timer = document.getElementById('autoRefreshTimer');
            
            if (seconds > 0) {
                // Enable auto-refresh
                btn.classList.add('active');
                timer.style.display = 'block';
                autoRefreshSecondsLeft = seconds;
                
                // Update countdown every second
                autoRefreshCountdown = setInterval(() => {
                    autoRefreshSecondsLeft--;
                    timer.textContent = autoRefreshSecondsLeft;
                    
                    if (autoRefreshSecondsLeft <= 0) {
                        autoRefreshSecondsLeft = seconds;
                    }
                }, 1000);
                
                // Refresh data at interval
                autoRefreshInterval = setInterval(() => {
                    loadStatus();
                    autoRefreshSecondsLeft = seconds;
                }, seconds * 1000);
                
                timer.textContent = seconds;
            } else {
                // Disable auto-refresh
                btn.classList.remove('active');
                timer.style.display = 'none';
                autoRefreshSecondsLeft = 0;
            }
        }
        
        function updateAutoRefreshUI(currentSeconds) {
            const menuItems = document.querySelectorAll('.auto-refresh-menu-item');
            menuItems.forEach(item => {
                const seconds = parseInt(item.getAttribute('data-seconds'));
                if (seconds === currentSeconds) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        }
        
        // Initialize auto-refresh
        const initialRefreshInterval = getAutoRefreshInterval();
        startAutoRefresh(initialRefreshInterval);
        updateAutoRefreshUI(initialRefreshInterval);
        
        // Toggle auto-refresh menu
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        const autoRefreshMenu = document.getElementById('autoRefreshMenu');
        let autoRefreshMenuOpen = false;
        
        if (autoRefreshBtn) {
            autoRefreshBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                autoRefreshMenuOpen = !autoRefreshMenuOpen;
                if (autoRefreshMenuOpen) {
                    autoRefreshMenu.classList.add('show');
                } else {
                    autoRefreshMenu.classList.remove('show');
                }
            });
        }
        
        // Handle menu item clicks
        document.querySelectorAll('.auto-refresh-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const seconds = parseInt(item.getAttribute('data-seconds'));
                setAutoRefreshInterval(seconds);
                autoRefreshMenu.classList.remove('show');
                autoRefreshMenuOpen = false;
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (autoRefreshMenuOpen && !autoRefreshMenu.contains(e.target) && !autoRefreshBtn.contains(e.target)) {
                autoRefreshMenu.classList.remove('show');
                autoRefreshMenuOpen = false;
            }
        });
        
        // Alert Notifications
        const ALERT_CHECK_INTERVAL = (ALERT_NOTIFICATION_CONFIG.pollingIntervalSeconds || 10) * 1000;
        const LAST_ALERT_TIMESTAMP_KEY = ALERT_NOTIFICATION_CONFIG.localStorageKey || 'last-alert-timestamp';
        const SEVERITY_FILTER = ALERT_NOTIFICATION_CONFIG.severityFilter || [];
        const ENABLE_TOAST_NOTIFICATIONS = ALERT_NOTIFICATION_CONFIG.enableToastNotifications !== false;
        const ENABLE_BROWSER_NOTIFICATIONS = ALERT_NOTIFICATION_CONFIG.enableBrowserNotifications !== false;
        let alertCheckInterval = null;
        
        function getLastAlertTimestamp() {
            return localStorage.getItem(LAST_ALERT_TIMESTAMP_KEY) || new Date(0).toISOString();
        }
        
        function setLastAlertTimestamp(timestamp) {
            localStorage.setItem(LAST_ALERT_TIMESTAMP_KEY, timestamp);
        }
        
        function shouldShowNotification(alert) {
            // If no severity filter is set (empty array), show all alerts
            if (!SEVERITY_FILTER || SEVERITY_FILTER.length === 0) {
                return true;
            }
            // Check if alert severity matches any in the filter
            return SEVERITY_FILTER.includes(alert.severity?.toLowerCase());
        }
        
        function getSeverityIcon(severity) {
            const icons = {
                'critical': '🚨',
                'error': '❌',
                'warning': '⚠️',
                'info': 'ℹ️',
                'success': '✅'
            };
            return icons[severity?.toLowerCase()] || '🔔';
        }
        
        function showToastNotification(alert) {
            // Check if toast notifications are enabled
            if (!ENABLE_TOAST_NOTIFICATIONS) return;
            
            // Check if alert passes severity filter
            if (!shouldShowNotification(alert)) return;
            
            const container = document.getElementById('alertToastContainer');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = \`alert-toast severity-\${alert.severity}\`;
            toast.innerHTML = \`
                <div class="alert-toast-icon">\${getSeverityIcon(alert.severity)}</div>
                <div class="alert-toast-content">
                    <div class="alert-toast-title">\${alert.title}</div>
                    <div class="alert-toast-message">\${alert.message}</div>
                    <div class="alert-toast-time">\${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
                <button class="alert-toast-close" onclick="closeToast(this.parentElement)">×</button>
            \`;
            
            container.appendChild(toast);
            
            // Auto-dismiss after 10 seconds
            setTimeout(() => {
                closeToast(toast);
            }, 10000);
        }
        
        window.closeToast = function(toast) {
            toast.classList.add('closing');
            setTimeout(() => {
                toast.remove();
            }, 300);
        };
        
        function showBrowserNotification(alert) {
            // Check if browser notifications are enabled
            if (!ENABLE_BROWSER_NOTIFICATIONS) return;
            
            // Check if alert passes severity filter
            if (!shouldShowNotification(alert)) return;
            
            // Check if browser supports notifications
            if (!('Notification' in window)) {
                return;
            }
            
            // Check if permission is granted
            if (Notification.permission === 'granted') {
                new Notification(alert.title, {
                    body: alert.message,
                    icon: getSeverityIcon(alert.severity),
                    tag: alert.id,
                    timestamp: new Date(alert.timestamp).getTime()
                });
            } else if (Notification.permission !== 'denied') {
                // Request permission
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification(alert.title, {
                            body: alert.message,
                            icon: getSeverityIcon(alert.severity),
                            tag: alert.id
                        });
                    }
                });
            }
        }
        
        async function checkForNewAlerts() {
            try {
                const since = getLastAlertTimestamp();
                const response = await fetch(\`/api/alerts/recent?since=\${encodeURIComponent(since)}&limit=10\`);
                const data = await response.json();
                
                if (data.success && data.alerts && data.alerts.length > 0) {
                    // Show notifications for new alerts
                    data.alerts.forEach(alert => {
                        showToastNotification(alert);
                        showBrowserNotification(alert);
                    });
                    
                    // Update last seen timestamp to the most recent alert
                    const latestTimestamp = data.alerts[0].timestamp;
                    setLastAlertTimestamp(latestTimestamp);
                }
            } catch (error) {
                console.error('Error checking for alerts:', error);
            }
        }
        
        // Start checking for alerts
        checkForNewAlerts();
        alertCheckInterval = setInterval(checkForNewAlerts, ALERT_CHECK_INTERVAL);
        
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
        
        function openExportDialog() {
            try {
                // Use embedded services configuration (no API call needed)
                if (!Array.isArray(SERVICES_CONFIG)) {
                    throw new Error('Invalid services configuration');
                }
                
                exportServices = SERVICES_CONFIG.filter(s => s.enabled);
                
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
                const retentionDays = ${uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90};
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
                if (!data || !data.days || data.days.length === 0) {
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
                
                data.days.forEach(day => {
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
        
        // Alert History functionality
        let allAlerts = [];
        let currentFilter = 'all';
        
        async function openAlertHistory() {
            const modal = document.getElementById('alertHistoryModal');
            modal.classList.add('active');
            
            // Load alerts
            await loadAlertHistory();
        }
        
        function closeAlertHistory() {
            const modal = document.getElementById('alertHistoryModal');
            modal.classList.remove('active');
        }
        
        async function loadAlertHistory() {
            const bodyElement = document.getElementById('alertHistoryBody');
            bodyElement.innerHTML = '<div class="alert-history-empty"><div class="alert-history-empty-icon">⏳</div><div>Loading alerts...</div></div>';
            
            try {
                const response = await fetch('/api/alerts/recent?limit=1000');
                const data = await response.json();
                
                if (data.success) {
                    allAlerts = data.alerts || [];
                    renderAlertHistory();
                } else {
                    bodyElement.innerHTML = '<div class="alert-history-empty"><div class="alert-history-empty-icon">❌</div><div>Failed to load alerts</div></div>';
                }
            } catch (error) {
                console.error('Error loading alert history:', error);
                bodyElement.innerHTML = '<div class="alert-history-empty"><div class="alert-history-empty-icon">❌</div><div>Error loading alerts</div></div>';
            }
        }
        
        function filterAlerts(filter) {
            currentFilter = filter;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                if (btn.dataset.filter === filter) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            
            renderAlertHistory();
        }
        
        function renderAlertHistory() {
            const bodyElement = document.getElementById('alertHistoryBody');
            
            if (allAlerts.length === 0) {
                bodyElement.innerHTML = '<div class="alert-history-empty"><div class="alert-history-empty-icon">📭</div><div>No alerts found</div></div>';
                return;
            }
            
            // Filter alerts
            let filteredAlerts = allAlerts;
            
            if (currentFilter !== 'all') {
                if (currentFilter === 'external') {
                    // Show all non-heartbeat-monitor alerts
                    filteredAlerts = allAlerts.filter(alert => alert.source !== 'heartbeat-monitor');
                } else if (currentFilter === 'heartbeat-monitor') {
                    // Show only heartbeat-monitor alerts
                    filteredAlerts = allAlerts.filter(alert => alert.source === 'heartbeat-monitor');
                } else {
                    // Filter by severity
                    filteredAlerts = allAlerts.filter(alert => alert.severity === currentFilter);
                }
            }
            
            if (filteredAlerts.length === 0) {
                bodyElement.innerHTML = '<div class="alert-history-empty"><div class="alert-history-empty-icon">🔍</div><div>No alerts match this filter</div></div>';
                return;
            }
            
            // Render alerts
            const html = filteredAlerts.map(alert => {
                const timestamp = new Date(alert.timestamp);
                const formattedDate = timestamp.toLocaleString();
                const severityIcon = alert.severity === 'critical' ? '🚨' : 
                                     alert.severity === 'warning' ? '⚠️' : 'ℹ️';
                const sourceIcon = alert.source === 'heartbeat-monitor' ? '💓' : '📡';
                const sourceName = alert.source === 'heartbeat-monitor' ? 'Service Monitor' : 
                                  alert.source === 'grafana' ? 'Grafana' :
                                  alert.source === 'alertmanager' ? 'Alertmanager' :
                                  alert.source || 'External';
                
                return \`
                    <div class="alert-history-item severity-\${alert.severity}">
                        <div class="alert-history-item-header">
                            <div class="alert-history-item-title">
                                \${severityIcon} \${alert.title}
                            </div>
                            <div class="alert-history-item-badge \${alert.severity}">
                                \${alert.severity}
                            </div>
                        </div>
                        <div class="alert-history-item-message">
                            \${alert.message}
                        </div>
                        <div class="alert-history-item-footer">
                            <div class="alert-history-item-source">
                                <span>\${sourceIcon}</span>
                                <span>\${sourceName}</span>
                            </div>
                            <div>
                                <span>🕐</span>
                                <span>\${formattedDate}</span>
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
            
            bodyElement.innerHTML = html;
        }
        
        // Alert history button click handler
        document.getElementById('alertHistoryBtn')?.addEventListener('click', openAlertHistory);
        
        // Close modal on backdrop click
        document.getElementById('alertHistoryModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'alertHistoryModal') {
                closeAlertHistory();
            }
        });
        
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('alertHistoryModal');
                if (modal?.classList.contains('active')) {
                    closeAlertHistory();
                }
            }
        });
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
    headers: { 
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'Vary': 'Accept-Encoding'
    }
  });
}

