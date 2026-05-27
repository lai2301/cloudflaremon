import { describe, it, expect } from 'vitest';
import { handleGetStatus } from '../../src/handlers/status.js';
import { env } from 'cloudflare:test';

const req = new Request('http://localhost/api/status');

const fakeSummary = {
  timestamp: new Date().toISOString(),
  totalServices: 1,
  servicesUp: 1,
  servicesDegraded: 0,
  servicesDown: 0,
  servicesUnknown: 0,
  results: []
};

describe('handleGetStatus key preference', () => {
  it('reads from monitor:summary when only that key exists', async () => {
    await env.HEARTBEAT_LOGS.put('monitor:summary', JSON.stringify(fakeSummary));

    const res = await handleGetStatus(env, req);
    const body = await res.json();

    expect(body.summary).not.toBeNull();
    expect(body.summary.totalServices).toBe(1);
  });

  it('falls back to monitor:data.summary when monitor:summary is absent', async () => {
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify({ summary: fakeSummary, uptime: {} }));

    const res = await handleGetStatus(env, req);
    const body = await res.json();

    expect(body.summary).not.toBeNull();
    expect(body.summary.totalServices).toBe(1);
  });

  it('prefers monitor:summary over monitor:data when both exist', async () => {
    const newSummary = { ...fakeSummary, totalServices: 99 };
    const oldSummary = { ...fakeSummary, totalServices: 1 };

    await env.HEARTBEAT_LOGS.put('monitor:summary', JSON.stringify(newSummary));
    await env.HEARTBEAT_LOGS.put('monitor:data', JSON.stringify({ summary: oldSummary, uptime: {} }));

    const res = await handleGetStatus(env, req);
    const body = await res.json();

    expect(body.summary.totalServices).toBe(99);
  });

  it('returns null summary when neither key exists', async () => {
    const res = await handleGetStatus(env, req);
    const body = await res.json();

    expect(body.summary).toBeNull();
  });
});
