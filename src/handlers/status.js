/**
 * Status API Handler
 * Returns current service status
 */

import { corsHeaders } from '../core/cors.js';

/**
 * Handle GET /api/status request
 * Returns summary of all service statuses
 */
export async function handleGetStatus(env, request) {
  // Note: KV has edge caching (minimum 60s), but HTTP cache headers prevent client/CDN caching
  const monitorDataJson = await env.HEARTBEAT_LOGS.get('monitor:data');
  const monitorData = monitorDataJson ? JSON.parse(monitorDataJson) : { summary: null };
  const summary = monitorData.summary || null;

  return new Response(JSON.stringify({ summary }, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

