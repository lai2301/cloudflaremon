// Success-path test (case 4) stubs globalThis.fetch via vi.stubGlobal because
// handleCustomAlert imports and calls sendCustomAlert from src/core/notifications.js,
// which makes outbound HTTP calls to notification channels. Stubbing fetch prevents
// real network requests and isolates the auth/routing logic under test.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { handleCustomAlert, handleGetRecentAlerts } from '../../src/handlers/alert.js';
import { withEnv, jsonRequest } from '../helpers/env.js';
import { env } from 'cloudflare:test';

const url = 'http://localhost/api/alert';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('handleCustomAlert fail-closed auth', () => {
  it('returns 503 when ALERT_API_KEY is not set', async () => {
    const env = withEnv({ ALERT_API_KEY: undefined });
    const req = jsonRequest(url, { title: 't', message: 'm' });
    const res = await handleCustomAlert(env, req);
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/ALERT_API_KEY not set/);
  });

  it('returns 401 when ALERT_API_KEY is set but no Authorization header is provided', async () => {
    const env = withEnv({ ALERT_API_KEY: 'secret' });
    const req = jsonRequest(url, { title: 't', message: 'm' });
    const res = await handleCustomAlert(env, req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 401 when ALERT_API_KEY is set but wrong key is provided', async () => {
    const env = withEnv({ ALERT_API_KEY: 'secret' });
    const req = jsonRequest(url, { title: 't', message: 'm' }, {
      Authorization: 'Bearer wrongkey'
    });
    const res = await handleCustomAlert(env, req);
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it('returns 200 with success:true when correct key and valid body are provided', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    const env = withEnv({ ALERT_API_KEY: 'secret' });
    const req = jsonRequest(url, { title: 't', message: 'm' }, {
      Authorization: 'Bearer secret'
    });
    const res = await handleCustomAlert(env, req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('does not leak error.message on internal failure', async () => {
    // Force a throw by sending malformed JSON body
    const env = withEnv({ ALERT_API_KEY: 'secret' });
    const req = new Request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret'
      },
      body: 'not-valid-json',
    });
    const res = await handleCustomAlert(env, req);
    const body = await res.json();
    const bodyStr = JSON.stringify(body);
    // Should not contain JSON parse error details
    expect(bodyStr).not.toMatch(/Unexpected token|SyntaxError|JSON\.parse/i);
    // Should still contain a message or error field
    expect(body.success).toBe(false);
    expect(body.message || body.error).toBeDefined();
  });
});

describe('handleGetRecentAlerts CORS', () => {
  it('does not return Access-Control-Allow-Origin: * when no Origin header is sent', async () => {
    const alertsUrl = new URL('http://localhost/api/alerts/recent');
    // No Origin header on the request — allowedOrigins defaults to [] so no CORS header emitted
    const req = new Request('http://localhost/api/alerts/recent');
    const res = await handleGetRecentAlerts(env, alertsUrl, {}, req);
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
  });
});
