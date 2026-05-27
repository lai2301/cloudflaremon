import { afterEach } from 'vitest';
import { env } from 'cloudflare:test';

afterEach(async () => {
  if (!env.HEARTBEAT_LOGS) return;
  const list = await env.HEARTBEAT_LOGS.list();
  await Promise.all(list.keys.map(k => env.HEARTBEAT_LOGS.delete(k.name)));
});
