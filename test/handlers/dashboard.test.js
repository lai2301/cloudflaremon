import { describe, it, expect } from 'vitest';
import { env } from 'cloudflare:test';
import { handleDashboard } from '../../src/handlers/dashboard/index.js';

describe('handleDashboard', () => {
  it('returns an HTML response', async () => {
    const res = await handleDashboard(env);
    expect(res).toBeInstanceOf(Response);
    const text = await res.text();
    expect(text).toContain('<!DOCTYPE html>');
    expect(text).toContain('<title>');
  });
});
