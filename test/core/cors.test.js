// vi.mock does not work in the @cloudflare/vitest-pool-workers runtime for
// module-level imports. Config is injected directly via the optional second
// argument of corsHeaders(request, config) instead.

import { describe, it, expect } from 'vitest';
import { corsHeaders } from '../../src/core/cors.js';

const cfg = { allowedOrigins: ['https://status.pipdor.com'] };

function reqWith(origin) {
  return new Request('http://localhost', origin ? { headers: { Origin: origin } } : {});
}

describe('corsHeaders', () => {
  it('returns empty when no Origin header', () => {
    expect(corsHeaders(reqWith(null), cfg)).toEqual({});
  });
  it('echoes allowed origin', () => {
    const h = corsHeaders(reqWith('https://status.pipdor.com'), cfg);
    expect(h['Access-Control-Allow-Origin']).toBe('https://status.pipdor.com');
    expect(h['Vary']).toBe('Origin');
  });
  it('returns empty for disallowed origin', () => {
    expect(corsHeaders(reqWith('https://evil.example'), cfg)).toEqual({});
  });
});
