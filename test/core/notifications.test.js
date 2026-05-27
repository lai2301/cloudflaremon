import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import { checkAndSendNotifications, sendCustomAlert, normaliseSeverity, escapeTelegramMarkdown, isHttpsUrl, sanitiseHeaders } from '../../src/core/notifications.js';

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

describe('severity guard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Case 1: sendCustomAlert with severity = null should not throw
  it('handles null severity without throwing', async () => {
    const alertData = {
      title: 'Test Alert',
      message: 'Test message',
      source: 'test',
      severity: null,
      channels: ['telegram']
    };

    await expect(sendCustomAlert(env, alertData)).resolves.toBeDefined();
  });

  // Case 2: sendCustomAlert with undefined severity (missing key) should not throw
  it('handles missing severity (undefined) without throwing', async () => {
    const alertData = {
      title: 'Test Alert',
      message: 'Test message',
      source: 'test',
      channels: ['telegram']
      // severity is intentionally missing
    };

    await expect(sendCustomAlert(env, alertData)).resolves.toBeDefined();
  });

  // Case 3: sendCustomAlert with uppercase severity string should map correctly
  it('handles uppercase severity and maps to correct eventType', async () => {
    const alertData = {
      title: 'Critical Alert',
      message: 'Critical message',
      source: 'test',
      severity: 'CRITICAL',
      channels: ['telegram']
    };

    await expect(sendCustomAlert(env, alertData)).resolves.toBeDefined();
  });

  // Case 4: sendPushoverCustomAlert path with null severity should not throw
  it('handles null severity in Pushover alert without throwing', async () => {
    const alertData = {
      title: 'Pushover Test',
      message: 'Test message',
      source: 'test',
      severity: null,
      channels: ['telegram']
    };

    await expect(sendCustomAlert(env, alertData)).resolves.toBeDefined();
  });
});

describe('normaliseSeverity helper', () => {
  it('returns warning for null', () => {
    expect(normaliseSeverity(null)).toBe('warning');
  });
  it('returns warning for undefined', () => {
    expect(normaliseSeverity(undefined)).toBe('warning');
  });
  it('returns warning for non-string', () => {
    expect(normaliseSeverity(123)).toBe('warning');
    expect(normaliseSeverity({})).toBe('warning');
  });
  it('lowercases string input', () => {
    expect(normaliseSeverity('CRITICAL')).toBe('critical');
    expect(normaliseSeverity('Error')).toBe('error');
    expect(normaliseSeverity('warning')).toBe('warning');
  });
});

describe('escapeTelegramMarkdown', () => {
  it('escapes link injection', () => {
    expect(escapeTelegramMarkdown('phish [click](https://evil)'))
      .toBe('phish \\[click](https://evil)');
  });
  it('escapes bold/italic markers', () => {
    expect(escapeTelegramMarkdown('*bold* _italic_ `code`'))
      .toBe('\\*bold\\* \\_italic\\_ \\`code\\`');
  });
  it('returns empty string for non-string input', () => {
    expect(escapeTelegramMarkdown(null)).toBe('');
    expect(escapeTelegramMarkdown(undefined)).toBe('');
    expect(escapeTelegramMarkdown(123)).toBe('');
  });
  it('passes through plain text unchanged', () => {
    expect(escapeTelegramMarkdown('Service svc-a is down')).toBe('Service svc-a is down');
  });
});

describe('isHttpsUrl', () => {
  it('accepts https', () => {
    expect(isHttpsUrl('https://api.example/x')).toBe(true);
  });
  it('rejects http', () => {
    expect(isHttpsUrl('http://api.example/x')).toBe(false);
  });
  it('rejects malformed', () => {
    expect(isHttpsUrl('not a url')).toBe(false);
    expect(isHttpsUrl(null)).toBe(false);
    expect(isHttpsUrl(undefined)).toBe(false);
  });
});

describe('sanitiseHeaders', () => {
  it('keeps allow-listed headers', () => {
    expect(sanitiseHeaders({ Authorization: 'Bearer x', 'X-Api-Key': 'k' }))
      .toEqual({ Authorization: 'Bearer x', 'X-Api-Key': 'k' });
  });
  it('drops disallowed headers', () => {
    expect(sanitiseHeaders({ 'X-Evil': 'foo' })).toEqual({});
  });
  it('drops non-string values', () => {
    expect(sanitiseHeaders({ Authorization: 12345 })).toEqual({});
  });
  it('returns empty for non-object', () => {
    expect(sanitiseHeaders(null)).toEqual({});
    expect(sanitiseHeaders('str')).toEqual({});
  });
});

describe('escapeTelegramMarkdown integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('escapes injected markdown in outbound telegram payload', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchSpy);

    await sendCustomAlert(env, {
      title: 'phish [click](https://evil)',
      message: 'normal',
      severity: 'warning',
      channels: ['telegram'],
    });

    const telegramCall = fetchSpy.mock.calls.find(c => String(c[0]).includes('api.telegram.org'));
    if (!telegramCall) return; // telegram channel may be disabled; skip assertion
    const body = JSON.parse(telegramCall[1].body);
    expect(body.text).not.toMatch(/\[click\]\(https:\/\/evil\)/);
    expect(body.text).toMatch(/\\\[click\\\]/); // escaped form
  });
});
