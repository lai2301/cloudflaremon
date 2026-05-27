import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';

describe('vitest workers pool', () => {
  it('exposes the KV binding', () => {
    expect(env.HEARTBEAT_LOGS).toBeDefined();
  });

  it('can put and get a key', async () => {
    await env.HEARTBEAT_LOGS.put('k', 'v');
    expect(await env.HEARTBEAT_LOGS.get('k')).toBe('v');
  });
});
