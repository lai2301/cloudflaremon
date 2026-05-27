/**
 * Tests for per-service KV aggregation in monitoring.js.
 * The aggregateLatestKeys helper is extracted from checkHeartbeatStaleness
 * so it can be unit-tested without the full cron machinery (notification
 * dispatch, fetch stubs, service config, etc.).
 */
import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { aggregateLatestKeys } from '../../src/core/monitoring.js';

describe('aggregateLatestKeys', () => {
  // Case 4: pre-seeded per-service keys are merged into monitor:latest
  it('merges latest:* keys into monitor:latest', async () => {
    const tsA = '2026-05-27T10:00:00.000Z';
    const tsB = '2026-05-27T11:00:00.000Z';
    await env.HEARTBEAT_LOGS.put('latest:svc-a', tsA);
    await env.HEARTBEAT_LOGS.put('latest:svc-b', tsB);

    await aggregateLatestKeys(env);

    const raw = await env.HEARTBEAT_LOGS.get('monitor:latest');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed['svc-a']).toBe(tsA);
    expect(parsed['svc-b']).toBe(tsB);
  });

  // Case 5: aggregated (per-service) wins over stale blob; unrelated keys preserved
  it('aggregated wins over stale blob entry; unrelated blob keys are preserved', async () => {
    const staleTs = '2026-05-27T08:00:00.000Z';
    const freshTs = '2026-05-27T10:00:00.000Z';
    const untouchedTs = '2026-05-27T09:00:00.000Z';

    // Seed the legacy blob with stale svc-a and an unrelated svc-c
    await env.HEARTBEAT_LOGS.put(
      'monitor:latest',
      JSON.stringify({ 'svc-a': staleTs, 'svc-c': untouchedTs })
    );
    // Seed a newer per-service key for svc-a (should win)
    await env.HEARTBEAT_LOGS.put('latest:svc-a', freshTs);
    // svc-c has no per-service key

    await aggregateLatestKeys(env);

    const raw = await env.HEARTBEAT_LOGS.get('monitor:latest');
    const parsed = JSON.parse(raw);

    // aggregated wins: freshTs, not staleTs
    expect(parsed['svc-a']).toBe(freshTs);
    // svc-c preserved from existing blob
    expect(parsed['svc-c']).toBe(untouchedTs);
  });
});
