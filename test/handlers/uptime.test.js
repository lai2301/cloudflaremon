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

describe('handleGetUptime error responses', () => {
  it('does not leak error.message on internal failure', async () => {
    // Force a throw by corrupting KV data that causes parse error
    await env.HEARTBEAT_LOGS.put('monitor:data', 'not-valid-json');
    const res = await handleGetUptime(env, url);
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    // Should not contain JSON parse error details
    expect(bodyStr).not.toMatch(/Unexpected token|SyntaxError|JSON\.parse/i);
    // Should still contain an error field
    expect(body.error).toBeDefined();
  });
});
