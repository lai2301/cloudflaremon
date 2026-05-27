/**
 * CORS helpers
 * Returns headers echoing the request Origin only when it is in the allow-list.
 * An empty allowedOrigins list means no CORS header is emitted (same-origin only).
 *
 * The optional second argument `config` allows callers (and tests) to inject a
 * pre-loaded config object. When omitted the cached uiConfig is used.
 */

import { uiConfig } from '../config/loader.js';

export function corsHeaders(request, config) {
  if (!request) return {};
  const cfg = config !== undefined ? config : uiConfig;
  const origin = request.headers.get('Origin');
  if (!origin) return {};
  const allowed = Array.isArray(cfg.allowedOrigins) ? cfg.allowedOrigins : [];
  if (allowed.includes(origin) || allowed.includes('*')) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
    };
  }
  return {};
}
