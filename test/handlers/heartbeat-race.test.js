/**
 * Focused test suite for per-service KV key layout (race-fix).
 * Verifies that the heartbeat handler writes `latest:<serviceId>` keys
 * instead of the shared `monitor:latest` blob, eliminating the
 * read-modify-write race.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { handleHeartbeat } from '../../src/handlers/heartbeat.js';
import { withEnv, jsonRequest } from '../helpers/env.js';

// gmk-m6 belongs to k3s-cluster group which has auth.required: true.
// We use a wildcard API key so the auth path passes without extra complexity.
const SERVICE_A = 'gmk-m6';
const SERVICE_B = 'raspi4-8g';
const WILDCARD_KEY = 'testkey-race';
const AUTH_HEADERS = { Authorization: `Bearer ${WILDCARD_KEY}` };

function makeEnv() {
  return withEnv({ API_KEYS: JSON.stringify({ '*': WILDCARD_KEY }) });
}

const url = 'http://localhost/api/heartbeat';

describe('heartbeat writes per-service KV keys (race fix)', () => {
  // Case 1: single heartbeat writes `latest:<serviceId>`, not `monitor:latest`
  it('writes latest:<serviceId> for a single heartbeat', async () => {
    const testEnv = makeEnv();

    const req = jsonRequest(url, { serviceId: SERVICE_A }, AUTH_HEADERS);
    const res = await handleHeartbeat(req, testEnv);
    expect(res.status).toBe(200);

    // Per-service key must exist
    const perServiceVal = await testEnv.HEARTBEAT_LOGS.get(`latest:${SERVICE_A}`);
    expect(perServiceVal).not.toBeNull();
    // Value should be a parseable timestamp (ISO string stored as a string)
    expect(Number.isNaN(Number(perServiceVal))).toBe(true); // it is ISO, not a bare number
    // Still a truthy string
    expect(typeof perServiceVal).toBe('string');
    expect(perServiceVal.length).toBeGreaterThan(0);

    // monitor:latest must NOT be written by the heartbeat path
    const monitorLatest = await testEnv.HEARTBEAT_LOGS.get('monitor:latest');
    expect(monitorLatest).toBeNull();
  });

  // Case 2: two concurrent batches for different services both win
  // (the old code would overwrite one due to the RMW race)
  it('both concurrent batches survive — no KV write is lost', async () => {
    const testEnv = makeEnv();

    const reqA = jsonRequest(url, { serviceId: SERVICE_A }, AUTH_HEADERS);
    const reqB = jsonRequest(url, { serviceId: SERVICE_B }, AUTH_HEADERS);

    // Simulate concurrent execution by firing both without awaiting in sequence
    const [resA, resB] = await Promise.all([
      handleHeartbeat(reqA, testEnv),
      handleHeartbeat(reqB, testEnv),
    ]);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // Both per-service keys must be present
    const valA = await testEnv.HEARTBEAT_LOGS.get(`latest:${SERVICE_A}`);
    const valB = await testEnv.HEARTBEAT_LOGS.get(`latest:${SERVICE_B}`);

    expect(valA).not.toBeNull();
    expect(valB).not.toBeNull();
  });

  // Case 3: `monitor:latest` is NOT written by the heartbeat path
  it('does not write monitor:latest at all', async () => {
    const testEnv = makeEnv();

    // Send a batch heartbeat for both services
    const req = jsonRequest(
      url,
      { services: [SERVICE_A, SERVICE_B] },
      AUTH_HEADERS
    );
    const res = await handleHeartbeat(req, testEnv);
    expect(res.status).toBe(200);

    const monitorLatest = await testEnv.HEARTBEAT_LOGS.get('monitor:latest');
    expect(monitorLatest).toBeNull();
  });
});
