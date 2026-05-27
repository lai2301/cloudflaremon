// Success-path test (case 4) stubs globalThis.fetch via vi.stubGlobal because
// handleCustomAlert imports and calls sendCustomAlert from src/core/notifications.js,
// which makes outbound HTTP calls to notification channels. Stubbing fetch prevents
// real network requests and isolates the auth/routing logic under test.

import { describe, it, expect, afterEach, vi } from 'vitest';
import { handleCustomAlert } from '../../src/handlers/alert.js';
import { withEnv, jsonRequest } from '../helpers/env.js';

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
});
