import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleGetUptime } from '../../src/handlers/uptime.js';
import { env } from 'cloudflare:test';

const url = new URL('http://localhost/api/uptime?serviceId=svc-a');

describe('handleGetUptime placeholder', () => {
  it('uses unknownChecks (not unknownChecksAll) on empty placeholder days', async () => {
    // Seed monitor:data with empty days so handleGetUptime returns the placeholder shape
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify({
      uptime: { 'svc-a': { days: {} } }
    }));
    const res = await handleGetUptime(env, url);
    const body = await res.json();
    const day = body.days?.[0] ?? null;
    expect(day).not.toBeNull();
    expect(day).toHaveProperty('unknownChecks');
    expect(day).not.toHaveProperty('unknownChecksAll');
  });
});
