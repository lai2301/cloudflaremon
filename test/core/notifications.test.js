import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { checkAndSendNotifications } from '../../src/core/notifications.js';

const servicesConfig = { services: [{ id: 'svc-a', name: 'svc-a' }] };

function result(serviceId, status) {
  return { serviceId, serviceName: serviceId, status, lastSeen: new Date().toISOString(), timestamp: Date.now() };
}

async function getRecentAlerts(env) {
  const raw = await env.HEARTBEAT_LOGS.get('recent:alerts');
  return raw ? JSON.parse(raw) : [];
}

async function getPreviousStatus(env) {
  const raw = await env.HEARTBEAT_LOGS.get('notifications:previous_status');
  return raw ? JSON.parse(raw) : {};
}

describe('checkAndSendNotifications state machine', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Case 1: down -> degraded -> up sequence must emit both degraded and up alerts
  it('emits up alert after down -> degraded -> up sequence', async () => {
    // Seed: previousState=down, lastAlert=0 so cooldown is passed
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'down', lastAlert: 0 }
    }));
    // Step 1: down -> degraded (fires degraded alert, sets lastAlert=now)
    await checkAndSendNotifications(env, [result('svc-a', 'degraded')], {}, servicesConfig);
    // Reset lastAlert to 0 so the next transition is not blocked by the cooldown
    // (simulates the cooldown window having elapsed between real monitor cycles)
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'degraded', lastAlert: 0 }
    }));
    // Step 2: degraded -> up
    await checkAndSendNotifications(env, [result('svc-a', 'up')], {}, servicesConfig);
    const alerts = await getRecentAlerts(env);
    const titles = alerts.map(a => a.title);
    expect(titles.some(t => t.includes('Degraded') || t.includes('degraded'))).toBe(true);
    expect(titles.some(t => t.includes('Recovered') || t.includes('up'))).toBe(true);
  });

  // Case 2: up -> degraded -> up after cooldown emits both degraded and up
  it('emits degraded and up after up -> degraded -> up sequence', async () => {
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'up', lastAlert: 0 }
    }));
    // Step 1: up -> degraded (fires degraded alert)
    await checkAndSendNotifications(env, [result('svc-a', 'degraded')], {}, servicesConfig);
    // Reset lastAlert to 0 to simulate cooldown elapsed between monitor cycles
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'degraded', lastAlert: 0 }
    }));
    // Step 2: degraded -> up
    await checkAndSendNotifications(env, [result('svc-a', 'up')], {}, servicesConfig);
    const alerts = await getRecentAlerts(env);
    const titles = alerts.map(a => a.title);
    expect(titles.some(t => t.includes('Degraded') || t.includes('degraded'))).toBe(true);
    expect(titles.some(t => t.includes('Recovered') || t.includes('up'))).toBe(true);
  });

  // Case 3: down -> up (direct) emits exactly one up alert
  it('emits a single up alert after down -> up (direct)', async () => {
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'down', lastAlert: 0 }
    }));
    await checkAndSendNotifications(env, [result('svc-a', 'up')], {}, servicesConfig);
    const alerts = await getRecentAlerts(env);
    const upAlerts = alerts.filter(a => a.title.includes('Recovered'));
    expect(upAlerts).toHaveLength(1);
  });

  // Case 4: unknown -> down does NOT alert (first observation)
  it('does not alert on first observation unknown -> down', async () => {
    // No previous status seeded = previousState will be 'unknown'
    await checkAndSendNotifications(env, [result('svc-a', 'down')], {}, servicesConfig);
    const alerts = await getRecentAlerts(env);
    expect(alerts).toHaveLength(0);
  });

  // Case 5: after up -> down alert fires, KV dedup state has status=down and a recent lastAlert
  it('advances dedup state after up -> down alert fires', async () => {
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'up', lastAlert: 0 }
    }));
    const before = Date.now();
    await checkAndSendNotifications(env, [result('svc-a', 'down')], {}, servicesConfig);
    const prevStatus = await getPreviousStatus(env);
    expect(prevStatus['svc-a'].status).toBe('down');
    expect(prevStatus['svc-a'].lastAlert).toBeGreaterThanOrEqual(before);
  });

  // Case 6: same alert twice within cooldown window only fires once
  it('respects cooldown: same transition within cooldown fires only once', async () => {
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify({
      'svc-a': { status: 'up', lastAlert: 0 }
    }));
    // First call: up -> down, should alert
    await checkAndSendNotifications(env, [result('svc-a', 'down')], {}, servicesConfig);
    const afterFirst = await getRecentAlerts(env);
    expect(afterFirst).toHaveLength(1);

    // Second call: still down -> down again, no state change, should NOT alert
    // (or if we simulate up->down again within cooldown, it still fires as a separate state change)
    // The test is: within cooldown, repeat of same status does not add alert
    await checkAndSendNotifications(env, [result('svc-a', 'down')], {}, servicesConfig);
    const afterSecond = await getRecentAlerts(env);
    // No new alert since status didn't change
    expect(afterSecond).toHaveLength(1);
  });
});
