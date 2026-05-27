import { describe, it, expect } from 'vitest';
import { handleHeartbeat, timingSafeEqualStrings } from '../../src/handlers/heartbeat.js';
import { withEnv, jsonRequest } from '../helpers/env.js';

describe('timingSafeEqualStrings', () => {
  it('returns true for equal strings', async () => {
    expect(await timingSafeEqualStrings('abc', 'abc')).toBe(true);
  });
  it('returns false for different strings of equal length', async () => {
    expect(await timingSafeEqualStrings('abc', 'abd')).toBe(false);
  });
  it('returns false for strings of different length', async () => {
    expect(await timingSafeEqualStrings('abc', 'abcd')).toBe(false);
  });
  it('returns false when either argument is not a string', async () => {
    expect(await timingSafeEqualStrings(null, 'abc')).toBe(false);
    expect(await timingSafeEqualStrings('abc', undefined)).toBe(false);
    expect(await timingSafeEqualStrings(123, 'abc')).toBe(false);
  });
});

// All services in config/services.json belong to the k3s-cluster group which
// has auth.required: true, and the remaining service (unraid-n1) has no
// auth.required field so it defaults to true. There is no service with
// auth.required: false in the current config, so case 5 is skipped.
const AUTH_REQUIRED_ID = 'gmk-m6'; // member of k3s-cluster group (auth.required: true)

const url = 'http://localhost/api/heartbeat';

describe('handleHeartbeat fail-closed auth', () => {
  it('rejects when API_KEYS is unset and auth required', async () => {
    const env = withEnv({ API_KEYS: undefined });
    const req = jsonRequest(url, { services: [{ serviceId: AUTH_REQUIRED_ID }] });
    const res = await handleHeartbeat(req, env);
    const body = await res.json();
    const r = body.results.find(r => r.serviceId === AUTH_REQUIRED_ID);
    expect(r).toBeDefined();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/API_KEYS not set/);
  });

  it('rejects when API_KEYS has no matching key for the service', async () => {
    // API_KEYS is set but only has a key for a different service, no wildcard
    const env = withEnv({ API_KEYS: JSON.stringify({ 'other-service': 'somekey' }) });
    const req = jsonRequest(url, { services: [{ serviceId: AUTH_REQUIRED_ID }] });
    const res = await handleHeartbeat(req, env);
    const body = await res.json();
    const r = body.results.find(r => r.serviceId === AUTH_REQUIRED_ID);
    expect(r).toBeDefined();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/No API key configured for this service/);
  });

  it('accepts when wildcard key matches Authorization header', async () => {
    const sharedKey = 'sharedkey123';
    const env = withEnv({ API_KEYS: JSON.stringify({ '*': sharedKey }) });
    const req = jsonRequest(
      url,
      { services: [{ serviceId: AUTH_REQUIRED_ID }] },
      { Authorization: `Bearer ${sharedKey}` }
    );
    const res = await handleHeartbeat(req, env);
    const body = await res.json();
    // Single-entry batch returns results array; check success via top-level or results
    // The handler returns results array when multiple entries OR when there is a failure.
    // For single all-success, results is undefined. Check overall success.
    if (body.results) {
      const r = body.results.find(r => r.serviceId === AUTH_REQUIRED_ID);
      expect(r.success).toBe(true);
    } else {
      expect(body.success).toBe(true);
    }
  });

  it('rejects when wildcard key exists but wrong key provided', async () => {
    const sharedKey = 'sharedkey123';
    const env = withEnv({ API_KEYS: JSON.stringify({ '*': sharedKey }) });
    const req = jsonRequest(
      url,
      { services: [{ serviceId: AUTH_REQUIRED_ID }] },
      { Authorization: 'Bearer wrongkey' }
    );
    const res = await handleHeartbeat(req, env);
    const body = await res.json();
    const r = body.results.find(r => r.serviceId === AUTH_REQUIRED_ID);
    expect(r).toBeDefined();
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Invalid API key/);
  });

  // Skipped: no service in config/services.json has auth.required: false.
  // All services either inherit auth.required: true from their group (k3s-cluster)
  // or default to true (unraid-n1 has no auth field).
  it.skip('accepts auth-disabled service when API_KEYS is unset', async () => {
    // Would test a service with auth.required: false — none exist in current config.
    const env = withEnv({ API_KEYS: undefined });
    const req = jsonRequest(url, { services: [{ serviceId: 'auth-disabled-service' }] });
    const res = await handleHeartbeat(req, env);
    const body = await res.json();
    if (body.results) {
      const r = body.results.find(r => r.serviceId === 'auth-disabled-service');
      expect(r.success).toBe(true);
    } else {
      expect(body.success).toBe(true);
    }
  });
});
