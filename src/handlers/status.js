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
  // Prefer the focused monitor:summary key (written since Task 17).
  // Fall back to the legacy monitor:data blob during the migration window.
  // Note: KV has edge caching (minimum 60s), but HTTP cache headers prevent client/CDN caching
  const summaryJson = await env.HEARTBEAT_LOGS.get('monitor:summary');
  let summary = summaryJson ? JSON.parse(summaryJson) : null;
  if (!summary) {
    const legacyJson = await env.HEARTBEAT_LOGS.get('monitor:data');
    summary = legacyJson ? JSON.parse(legacyJson).summary : null;
  }

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

