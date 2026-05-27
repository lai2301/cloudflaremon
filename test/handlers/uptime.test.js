import { describe, it, expect } from 'vitest';
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

describe('handleGetUptime key preference', () => {
  const today = new Date().toISOString().split('T')[0];
  const dayData = {
    date: today,
    totalChecks: 10,
    upChecks: 10,
    downChecks: 0,
    degradedChecks: 0,
    unknownChecks: 0,
    uptimePercentage: 100
  };

  it('reads from uptime:<serviceId> when only that key exists', async () => {
    await env.HEARTBEAT_LOGS.put('uptime:svc-a', JSON.stringify({ days: { [today]: dayData } }));

    const res = await handleGetUptime(env, url);
    const body = await res.json();

    expect(body.serviceId).toBe('svc-a');
    const found = body.days.find(d => d.date === today);
    expect(found).toBeDefined();
    expect(found.totalChecks).toBe(10);
  });

  it('falls back to monitor:data.uptime when uptime:<id> is absent', async () => {
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify({
      uptime: { 'svc-a': { days: { [today]: dayData } } }
    }));

    const res = await handleGetUptime(env, url);
    const body = await res.json();

    const found = body.days.find(d => d.date === today);
    expect(found).toBeDefined();
    expect(found.totalChecks).toBe(10);
  });

  it('prefers uptime:<id> over monitor:data when both exist', async () => {
    const newDayData = { ...dayData, totalChecks: 99 };
    const oldDayData = { ...dayData, totalChecks: 1 };

    await env.HEARTBEAT_LOGS.put('uptime:svc-a', JSON.stringify({ days: { [today]: newDayData } }));
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify({
      uptime: { 'svc-a': { days: { [today]: oldDayData } } }
    }));

    const res = await handleGetUptime(env, url);
    const body = await res.json();

    const found = body.days.find(d => d.date === today);
    expect(found.totalChecks).toBe(99);
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
