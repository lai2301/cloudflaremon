import { describe, it, expect, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { appendAlert, cleanupAlerts } from '../../src/core/alertStore.js';

describe('alertStore', () => {
  describe('cleanupAlerts', () => {
    it('returns input unchanged when below cap', () => {
      expect(cleanupAlerts([1, 2, 3], 10)).toEqual([1, 2, 3]);
    });

    it('trims to the cap, keeping the head', () => {
      expect(cleanupAlerts([1, 2, 3, 4, 5], 3)).toEqual([1, 2, 3]);
    });

    it('returns exactly cap entries when array length equals cap', () => {
      expect(cleanupAlerts([1, 2, 3], 3)).toEqual([1, 2, 3]);
    });

    it('handles non-array input', () => {
      expect(cleanupAlerts(null, 10)).toEqual([]);
      expect(cleanupAlerts(undefined, 10)).toEqual([]);
    });

    it('handles empty array', () => {
      expect(cleanupAlerts([], 10)).toEqual([]);
    });
  });

  describe('appendAlert', () => {
    beforeEach(async () => {
      // Clear the KV key before each test
      await env.HEARTBEAT_LOGS.delete('recent:alerts');
    });

    it('writes a new alert at the head of recent:alerts', async () => {
      await appendAlert(env, { id: 'a', message: 'first', timestamp: new Date().toISOString() });
      await appendAlert(env, { id: 'b', message: 'second', timestamp: new Date().toISOString() });
      const raw = await env.HEARTBEAT_LOGS.get('recent:alerts');
      const list = JSON.parse(raw);
      expect(list[0].id).toBe('b');
      expect(list[1].id).toBe('a');
    });

    it('initialises the list when the KV key does not exist', async () => {
      await appendAlert(env, { id: 'x', timestamp: new Date().toISOString() });
      const raw = await env.HEARTBEAT_LOGS.get('recent:alerts');
      const list = JSON.parse(raw);
      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('x');
    });

    it('trims to the configured cap (default 100)', async () => {
      // The config sets maxAlerts=100. Append 103 entries and verify trimming occurs.
      const defaultCap = 100;
      for (let i = 0; i < defaultCap + 3; i++) {
        await appendAlert(env, { id: `x${i}`, timestamp: new Date().toISOString() });
      }
      const raw = await env.HEARTBEAT_LOGS.get('recent:alerts');
      const list = JSON.parse(raw);
      expect(list.length).toBeLessThanOrEqual(defaultCap);
    });

    it('silently no-ops when env.HEARTBEAT_LOGS is missing', async () => {
      await expect(appendAlert({}, { id: 'x', timestamp: new Date().toISOString() })).resolves.toBeUndefined();
    });

    it('silently no-ops when env is nullish', async () => {
      await expect(appendAlert(null, { id: 'y' })).resolves.toBeUndefined();
      await expect(appendAlert(undefined, { id: 'z' })).resolves.toBeUndefined();
    });
  });
});
