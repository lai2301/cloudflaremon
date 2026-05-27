import { env } from 'cloudflare:test';

export function withEnv(overrides = {}) {
  return { ...env, ...overrides };
}

export function jsonRequest(url, body, headers = {}) {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
