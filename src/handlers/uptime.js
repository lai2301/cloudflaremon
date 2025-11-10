/**
 * Uptime API Handler
 * Returns uptime statistics and history
 */

import { getUiConfig } from '../config/loader.js';

/**
 * Handle GET /api/uptime request
 * Returns uptime history for a specific service
 */
export async function handleGetUptime(env, url) {
  const serviceId = url.searchParams.get('serviceId');
  
  if (!serviceId) {
    return new Response(JSON.stringify({ error: 'serviceId parameter required' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  try {
    const uiConfig = getUiConfig();
    
    // Get all monitor data in a single read
    // Note: KV has minimum 60s edge caching, but HTTP cache headers prevent client/CDN caching
    const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
    const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { uptime: {} };
    const allUptimeData = monitorData.uptime || {};
    const serviceData = allUptimeData[serviceId] || { days: {} };

    // Fill in missing days with null data up to retention period
    const retentionDays = uiConfig.uptimeRetentionDays || uiConfig.features?.uptimeRetentionDays || 90;
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
          unknownChecksAll: 0,
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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}

